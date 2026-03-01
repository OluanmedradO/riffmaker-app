/**
 *
 * Tap  → navigates to /create (normal flow)
 * Hold → records inline; release auto-saves; < 1s discards
 */

import { showToast } from "@/components/AppToast";
import { useTheme } from "@/components/ThemeProvider";
import { useHaptic } from "@/src/hooks/useHaptic";
import { useTranslation } from "@/src/i18n";
import { addRiff } from "@/src/storage/riffs";
import { RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder, useAudioRecorderState } from "expo-audio";
import { Microphone } from "phosphor-react-native";
import { useCallback, useRef, useState } from "react";
import { Animated, DeviceEventEmitter, StyleSheet, Text, View } from "react-native";
import { LongPressGestureHandler, State } from "react-native-gesture-handler";

type Props = {
  onTap: () => void;
  onQuickSave?: () => void;
  style?: any;
  buttonStyle?: any;
  iconSize?: number;
};

function generateQuickName(t: any): string {
  const now = new Date();
  const day = now.getDate().toString().padStart(2, "0");
  const month = (now.getMonth() + 1).toString().padStart(2, "0");
  const hours = now.getHours().toString().padStart(2, "0");
  const mins = now.getMinutes().toString().padStart(2, "0");
  return t("idea.default_name", { date: `${day}/${month} ${hours}:${mins}` });
}

export function QuickRecordButton({ onTap, onQuickSave, style, buttonStyle, iconSize = 24 }: Props) {
  const theme = useTheme();
  const { t } = useTranslation();
  const { triggerHaptic } = useHaptic();

  const audioRecorder = useAudioRecorder({ ...RecordingPresets.HIGH_QUALITY, isMeteringEnabled: false });
  const recorderState = useAudioRecorderState(audioRecorder, 200);

  const isRecordingRef = useRef(false);
  const startTimeRef = useRef(0);
  const levelsRef = useRef<number[]>([]);
  const secondsRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);

  // Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;

  function startRecordingAnimation() {
    pulseAnim.stopAnimation();
    Animated.spring(pulseAnim, {
      toValue: 1.35,
      friction: 5,
      useNativeDriver: true,
    }).start();
  }

  function stopRecordingAnimation() {
    pulseAnim.stopAnimation();
    Animated.spring(pulseAnim, {
      toValue: 1,
      friction: 5,
      useNativeDriver: true,
    }).start();
  }

  async function doStartRecording() {
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        showToast({ type: "error", message: "Permissão de microfone negada." });
        return false;
      }

      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
        interruptionMode: "doNotMix",
      });

      levelsRef.current = [];
      secondsRef.current = 0;
      startTimeRef.current = Date.now();
      isRecordingRef.current = true;

      await audioRecorder.prepareToRecordAsync({
        ...RecordingPresets.HIGH_QUALITY,
        isMeteringEnabled: true,
      });
      audioRecorder.record();

      setIsRecording(true);
      setSeconds(0);
      timerRef.current = setInterval(() => {
        const elapsedSecs = Math.floor((Date.now() - startTimeRef.current) / 1000);
        secondsRef.current = elapsedSecs;
        setSeconds(elapsedSecs);
      }, 250);

      return true;
    } catch (e) {
      console.error("[QuickRecord] start error:", e);
      showToast({ type: "error", message: "Não foi possível iniciar a gravação." });
      return false;
    }
  }

  async function doStopAndSave() {
    if (!isRecordingRef.current) return;

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    isRecordingRef.current = false;
    setIsRecording(false);
    stopRecordingAnimation();

    const elapsed = (Date.now() - startTimeRef.current) / 1000;

    try {
      await audioRecorder.stop();
    } catch (e) {}

    // Discard if too short
    if (elapsed < 1 || secondsRef.current < 1) {
      showToast({ type: "info", message: t("quick.too_short") });
      return;
    }

    const uri = audioRecorder.uri;
    if (!uri) {
      showToast({ type: "error", message: t("quick.no_uri") });
      return;
    }

    try {
      const finalDuration = Math.max(secondsRef.current * 1000, 1000);
      await addRiff({
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        name: generateQuickName(t),
        createdAt: Date.now(),
        duration: finalDuration,
        audioUri: uri,
        waveform: [],
      });

      triggerHaptic("success");
      showToast({ type: "success", message: t("quick.saved"), duration: 2000 });
      DeviceEventEmitter.emit("riff_created");
      onQuickSave?.();
    } catch (e: any) {
      console.error("[QuickRecord] save error:", e);
      showToast({ type: "error", message: "Não foi possível salvar a gravação." });
    }
  }

  const handleGesture = useCallback(async (event: any) => {
    const { nativeEvent } = event;

    if (nativeEvent.state === State.BEGAN) {
      triggerHaptic("heavy");
      startRecordingAnimation();
    } else if (nativeEvent.state === State.ACTIVE) {
      // Long press fired — start recording
      await doStartRecording();
    } else if (
      nativeEvent.state === State.END ||
      nativeEvent.state === State.CANCELLED ||
      nativeEvent.state === State.FAILED
    ) {
      triggerHaptic("heavy");
      stopRecordingAnimation();
      if (isRecordingRef.current) {
        // Was recording — stop and save
        await doStopAndSave();
      } else if (
        nativeEvent.state === State.FAILED ||
        nativeEvent.state === State.END
      ) {
        // Short tap (no long press activated) — navigate to create
        onTap();
      }
    }
  }, [onTap]);

  return (
    <LongPressGestureHandler
      onHandlerStateChange={handleGesture}
      minDurationMs={300}
    >
      <Animated.View style={[style ? style : styles.fabWrapper, { transform: [{ scale: pulseAnim }] }]}>
        <View
          style={[
            buttonStyle || styles.fab,
            { backgroundColor: isRecording ? "#dc2626" : theme.accent },
          ]}
        >
          <Microphone
            size={iconSize}
            color={theme.primaryForeground}
            weight={isRecording ? "fill" : "fill"}
          />
        </View>
        {isRecording && (
          <View style={styles.timerBadge}>
            <Text style={styles.timer}>{seconds}s</Text>
          </View>
        )}
      </Animated.View>
    </LongPressGestureHandler>
  );
}

const styles = StyleSheet.create({
  fabWrapper: {
    position: "absolute",
    bottom: 32,
    right: 24,
    alignItems: "center",
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  timerBadge: {
    position: "absolute",
    top: -28,
    backgroundColor: "#dc2626",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  timer: {
    fontSize: 12,
    fontWeight: "800",
    color: "#fff",
  },
});
