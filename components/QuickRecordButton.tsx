/**
 * QuickRecordButton
 *
 * Tap  → navigates to /create (normal flow)
 * Hold → records inline; release auto-saves; < 1s discards
 */

import { showToast } from "@/components/AppToast";
import { useTheme } from "@/components/ThemeProvider";
import { useHaptic } from "@/src/hooks/useHaptic";
import { addRiff } from "@/src/storage/riffs";
import { RecordingPresets, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioRecorder, useAudioRecorderState } from "expo-audio";
import { Microphone } from "phosphor-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { LongPressGestureHandler, State } from "react-native-gesture-handler";

type Props = {
  onTap: () => void;
  onQuickSave?: () => void;
};

function generateQuickName(): string {
  const now = new Date();
  const day = now.getDate().toString().padStart(2, "0");
  const month = (now.getMonth() + 1).toString().padStart(2, "0");
  const hours = now.getHours().toString().padStart(2, "0");
  const mins = now.getMinutes().toString().padStart(2, "0");
  return `Ideia ${day}/${month} ${hours}:${mins}`;
}

export function QuickRecordButton({ onTap, onQuickSave }: Props) {
  const theme = useTheme();
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
  const ringAnim = useRef(new Animated.Value(0)).current;
  const pulseLoop = useRef<Animated.CompositeAnimation | null>(null);

  // Idle pulse (always)
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 2000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
      ])
    );
    loop.start();
    pulseLoop.current = loop;
    return () => loop.stop();
  }, []);

  function startRecordingAnimation() {
    pulseLoop.current?.stop();
    pulseAnim.setValue(1);
    Animated.loop(
      Animated.sequence([
        Animated.timing(ringAnim, { toValue: 1, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(ringAnim, { toValue: 0.6, duration: 600, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  }

  function stopRecordingAnimation() {
    ringAnim.setValue(0);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 2000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
      ])
    );
    loop.start();
    pulseLoop.current = loop;
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
        secondsRef.current += 1;
        setSeconds(secondsRef.current);
      }, 1000);

      triggerHaptic("heavy");
      startRecordingAnimation();
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
      showToast({ type: "info", message: "Muito curto — gravação descartada." });
      return;
    }

    const uri = audioRecorder.uri;
    if (!uri) {
      showToast({ type: "error", message: "Sem URI de áudio — gravação perdida." });
      return;
    }

    try {
      const finalDuration = Math.max(secondsRef.current * 1000, 1000);
      await addRiff({
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        name: generateQuickName(),
        createdAt: Date.now(),
        duration: finalDuration,
        audioUri: uri,
        waveform: [],
      });

      triggerHaptic("success");
      showToast({ type: "success", message: "Ideia salva!", duration: 2000 });
      onQuickSave?.();
    } catch (e: any) {
      console.error("[QuickRecord] save error:", e);
      showToast({ type: "error", message: "Não foi possível salvar a gravação." });
    }
  }

  const handleGesture = useCallback(async (event: any) => {
    const { nativeEvent } = event;

    if (nativeEvent.state === State.ACTIVE) {
      // Long press fired — start recording
      await doStartRecording();
    } else if (
      nativeEvent.state === State.END ||
      nativeEvent.state === State.CANCELLED ||
      nativeEvent.state === State.FAILED
    ) {
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

  const ringOpacity = ringAnim;
  const ringScale = ringAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.4] });

  return (
    <LongPressGestureHandler
      onHandlerStateChange={handleGesture}
      minDurationMs={300}
    >
      <Animated.View style={[styles.fabWrapper, { transform: [{ scale: pulseAnim }] }]}>
        {/* Pulsing ring when recording */}
        {isRecording && (
          <Animated.View
            style={[
              styles.recordingRing,
              {
                borderColor: "#dc2626",
                opacity: ringOpacity,
                transform: [{ scale: ringScale }],
              },
            ]}
          />
        )}
        <View
          style={[
            styles.fab,
            { backgroundColor: isRecording ? "#dc2626" : theme.primary },
          ]}
        >
          <Microphone
            size={24}
            color={theme.primaryForeground}
            weight={isRecording ? "fill" : "fill"}
          />
        </View>
        {isRecording && (
          <Text style={styles.timer}>{seconds}s</Text>
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
  recordingRing: {
    position: "absolute",
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
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
  timer: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: "700",
    color: "#dc2626",
  },
});
