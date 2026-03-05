import { showToast } from "@/src/shared/ui/AppToast";
import { useTheme } from "@/src/shared/theme/ThemeProvider";
import { useHaptic } from "@/src/shared/hooks/useHaptic";
import { useTranslation } from "@/src/i18n";
import { addRiff } from "@/src/data/storage/riffs";
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
} from "expo-audio";
import { LockKey, Microphone, PaperPlaneRight, Trash } from "phosphor-react-native";
import React, { useEffect, useRef, useState } from "react";
import { DeviceEventEmitter, StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle } from "react-native-svg";

type Props = {
  onTap: () => void;
  onQuickSave?: () => void;
  style?: any;
  buttonStyle?: any;
  iconSize?: number;
};

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const CIRCLE_RADIUS = 36;
const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS;
const MAX_SECONDS = 60;

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

  const isRecordingRef = useRef(false);
  const isPreparingRef = useRef(false);
  const startTimeRef = useRef(0);
  const secondsRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [seconds, setSeconds] = useState(0);

  // Animations
  const buttonScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const progressAnim = useSharedValue(0);
  const recBlinkAnim = useSharedValue(1);

  useEffect(() => {
    if (isRecording) {
      progressAnim.value = withTiming(1, { duration: MAX_SECONDS * 1000, easing: Easing.linear });
      buttonScale.value = withRepeat(
        withSequence(
          withTiming(1.03, { duration: 1200 }),
          withTiming(1, { duration: 1200 })
        ),
        -1,
        true
      );
      recBlinkAnim.value = withRepeat(
        withSequence(
          withTiming(0, { duration: 500 }),
          withTiming(1, { duration: 500 })
        ),
        -1,
        true
      );
    } else {
      progressAnim.value = 0;
      recBlinkAnim.value = 1;
      buttonScale.value = withSpring(1, { damping: 15, mass: 0.8 });
    }
  }, [isRecording, progressAnim, buttonScale, recBlinkAnim]);

  useEffect(() => {
    if (isLocked) {
      buttonScale.value = withSpring(1, { damping: 15, mass: 0.8 });
      recBlinkAnim.value = withRepeat(
        withSequence(
          withTiming(0.2, { duration: 500 }),
          withTiming(1, { duration: 500 })
        ),
        -1,
        true
      );
    }
  }, [isLocked, buttonScale, recBlinkAnim]);

  async function doStartRecording() {
    if (isRecordingRef.current || isPreparingRef.current) return;
    isPreparingRef.current = true;
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        showToast({ type: "error", message: "Permissão de microfone negada." });
        isPreparingRef.current = false;
        return false;
      }

      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
        interruptionMode: "doNotMix",
      });

      secondsRef.current = 0;
      startTimeRef.current = Date.now();
      isRecordingRef.current = true;

      await audioRecorder.prepareToRecordAsync(RecordingPresets.HIGH_QUALITY);
      if (!isPreparingRef.current) return false;

      audioRecorder.record();

      setIsRecording(true);
      DeviceEventEmitter.emit("recording_state_change", true);
      // We don't overwrite isLocked to false in case the user already dragged up to lock during preparation
      setSeconds(0);

      triggerHaptic("light");

      timerRef.current = setInterval(() => {
        const elapsedSecs = Math.floor((Date.now() - startTimeRef.current) / 1000);
        secondsRef.current = Math.min(elapsedSecs, MAX_SECONDS);
        setSeconds(secondsRef.current);

        if (secondsRef.current >= MAX_SECONDS && isRecordingRef.current) {
          runOnJS(doStopAndSave)();
        }
      }, 500);

      isPreparingRef.current = false;
      return true;
    } catch (e) {
      console.error("[QuickRecord] start error:", e);
      showToast({ type: "error", message: "Não foi possível iniciar a gravação." });
      isPreparingRef.current = false;
      return false;
    }
  }

  async function doStopAndSave() {
    if (!isRecordingRef.current && !isPreparingRef.current) return;
    isPreparingRef.current = false;
    cleanupRecordingState();

    const elapsed = (Date.now() - startTimeRef.current) / 1000;
    try {
      await audioRecorder.stop();
    } catch (e) { }

    if (elapsed < 1 || secondsRef.current < 1) {
      return; // discard silently
    }

    const uri = audioRecorder.uri;
    if (!uri) {
      showToast({ type: "error", message: t("quick.no_uri") });
      return;
    }
    saveAudioFile(uri, Math.max(secondsRef.current * 1000, 1000));
  }

  async function doDiscard() {
    if (!isRecordingRef.current && !isPreparingRef.current) return;
    isPreparingRef.current = false;
    cleanupRecordingState();
    triggerHaptic("heavy");
    try {
      await audioRecorder.stop();
    } catch (e) { }
    // No toast for discard to keep it minimalistic.
  }

  function cleanupRecordingState() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    isRecordingRef.current = false;
    setIsRecording(false);
    DeviceEventEmitter.emit("recording_state_change", false);
    setIsLocked(false);
    translateX.value = withSpring(0);
    translateY.value = withSpring(0);
  }

  async function saveAudioFile(uri: string, durationMs: number) {
    try {
      await addRiff({
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        name: generateQuickName(t),
        createdAt: Date.now(),
        duration: durationMs,
        audioUri: uri,
        waveform: [],
      });

      triggerHaptic("success");
      showToast({ type: "success", message: "Ideia capturada 🎸", duration: 2500 });
      DeviceEventEmitter.emit("riff_created");
      onQuickSave?.();
    } catch (e: any) {
      console.error("[QuickRecord] save error:", e);
      showToast({ type: "error", message: "Não foi possível salvar a gravação." });
    }
  }

  const panGesture = Gesture.Pan()
    .minDistance(5)
    .runOnJS(true)
    .onStart(() => {
      doStartRecording();
    })
    .onUpdate((event) => {
      if ((!isRecordingRef.current && !isPreparingRef.current) || isLocked) return;

      if (event.translationX < 0 && Math.abs(event.translationX) > Math.abs(event.translationY)) {
        translateX.value = event.translationX;
        translateY.value = 0;
      } else if (event.translationY < 0 && Math.abs(event.translationY) > Math.abs(event.translationX)) {
        translateY.value = event.translationY;
        translateX.value = 0;
      }
    })
    .onEnd((event) => {
      if ((!isRecordingRef.current && !isPreparingRef.current) || isLocked) return;

      if (translateX.value < -80) {
        doDiscard();
      } else if (translateY.value < -80) {
        triggerHaptic("medium");
        setIsLocked(true);
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
      } else {
        doStopAndSave();
      }
    });

  const tapGesture = Gesture.Tap()
    .maxDuration(200)
    .runOnJS(true)
    .onEnd(() => {
      onTap();
    });

  const composedGesture = Gesture.Exclusive(panGesture, tapGesture);

  const wrapperStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
  }));

  const mainButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }]
  }));

  const lockIconStyle = useAnimatedStyle(() => {
    // Reveal lock icon earlier visually when sliding
    const opacity = interpolate(translateY.value, [0, -40], [0, 1], Extrapolation.CLAMP);
    const scale = interpolate(translateY.value, [0, -60], [0.8, 1.2], Extrapolation.CLAMP);
    return {
      opacity: isRecording && !isLocked ? opacity : 0,
      transform: [{ translateY: -100 }, { scale }],
      position: "absolute",
    };
  });

  const trashIconStyle = useAnimatedStyle(() => {
    const opacity = interpolate(translateX.value, [0, -40], [0, 1], Extrapolation.CLAMP);
    const scale = interpolate(translateX.value, [0, -80], [0.8, 1.3], Extrapolation.CLAMP);
    return {
      opacity: isRecording && !isLocked ? opacity : 0,
      transform: [{ translateX: -100 }, { scale }],
      position: "absolute",
    };
  });

  const animatedCircleProps = useAnimatedProps(() => {
    return {
      strokeDashoffset: CIRCLE_CIRCUMFERENCE * (1 - progressAnim.value),
    };
  });

  const timerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progressAnim.value, [0, 0.05], [0, 1], Extrapolation.CLAMP)
  }));

  const blinkAnimatedStyle = useAnimatedStyle(() => ({
    opacity: recBlinkAnim.value
  }));

  if (isLocked) {
    return (
      <View style={[style, styles.lockedWrapper, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.lockedControls}>
          <View style={{ flexDirection: "row", alignItems: "center", marginRight: 'auto', gap: 8 }}>
            <Animated.View style={blinkAnimatedStyle}>
              <LockKey size={18} color={theme.destructive} weight="bold" />
            </Animated.View>
            <Text style={[styles.timer, { color: theme.destructive }]}>
              {Math.floor(seconds / 60)}:{(seconds % 60).toString().padStart(2, '0')}
            </Text>
          </View>

          <View style={{ flexDirection: "row", gap: 12 }}>
            <GestureDetector gesture={Gesture.Tap().onEnd(() => runOnJS(doDiscard)())}>
              <View style={[styles.lockedBtn, { backgroundColor: theme.input }]}>
                <Trash size={20} color={theme.foreground} weight="light" />
              </View>
            </GestureDetector>
            <GestureDetector gesture={Gesture.Tap().onEnd(() => runOnJS(doStopAndSave)())}>
              <View style={[styles.lockedBtn, { backgroundColor: theme.primary }]}>
                <PaperPlaneRight size={20} color={theme.primaryForeground} weight="fill" />
              </View>
            </GestureDetector>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[style, styles.container]}>
      {/* Target icons for swipe gestures */}
      <Animated.View style={lockIconStyle} pointerEvents="none">
        <View style={styles.iconFloatClean}>
          <LockKey size={26} color={theme.foreground} weight="light" />
        </View>
      </Animated.View>

      <Animated.View style={trashIconStyle} pointerEvents="none">
        <View style={[styles.iconFloatClean, { backgroundColor: theme.destructive + "1A" }]}>
          <Trash size={26} color={theme.destructive} weight="light" />
        </View>
      </Animated.View>

      <GestureDetector gesture={composedGesture}>
        <Animated.View style={[wrapperStyle, { zIndex: 10 }]}>
          {isRecording && !isLocked && (
            <Animated.View
              style={[
                styles.editorialTimerWrapper,
                timerAnimatedStyle
              ]}
              pointerEvents="none"
            >
              <Animated.Text style={[styles.recIndicator, blinkAnimatedStyle, { color: theme.destructive }]}>
                ● REC
              </Animated.Text>
              <Text style={[styles.editorialTimer, { color: theme.foreground }]}>
                {Math.floor(seconds / 60).toString().padStart(2, '0')}:{(seconds % 60).toString().padStart(2, '0')}
              </Text>
            </Animated.View>
          )}
          {isRecording && (
            <View style={styles.progressRing}>
              <Svg width={84} height={84} viewBox="0 0 84 84">
                <Circle
                  cx="42"
                  cy="42"
                  r={CIRCLE_RADIUS}
                  stroke={theme.destructive + "30"}
                  strokeWidth="3"
                  fill="none"
                />
                <AnimatedCircle
                  cx="42"
                  cy="42"
                  r={CIRCLE_RADIUS}
                  stroke={theme.destructive}
                  strokeWidth="3"
                  fill="none"
                  strokeDasharray={CIRCLE_CIRCUMFERENCE}
                  animatedProps={animatedCircleProps}
                  strokeLinecap="round"
                  transform="rotate(-90 42 42)"
                />
              </Svg>
            </View>
          )}

          <Animated.View
            style={[
              buttonStyle || styles.fab,
              mainButtonStyle,
              {
                backgroundColor: theme.primary,
                borderColor: 0,
                borderWidth: 0,
                shadowColor: theme.primary,
                shadowOpacity: isRecording ? 0.7 : 0,
                shadowRadius: isRecording ? 24 : 0,
                shadowOffset: { width: 0, height: 0 },
                elevation: isRecording ? 10 : 0,
              },
            ]}
          >
            <Microphone
              size={iconSize}
              color={theme.primaryForeground}
              weight={isRecording ? "fill" : "bold"}
            />
          </Animated.View>
        </Animated.View>
      </GestureDetector>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  fab: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: "center",
    justifyContent: "center",
    elevation: 8,
  },
  progressRing: {
    position: "absolute",
    top: -8, // Center the 84x84 svg over the 68x68 button
    left: -8,
    zIndex: -1,
  },
  timer: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 16,
    letterSpacing: 1,
  },
  editorialTimerWrapper: {
    position: 'absolute',
    top: -74,
    width: 200,
    alignItems: 'center',
    gap: 4,
  },
  recIndicator: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 2,
  },
  editorialTimer: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: 5,
  },
  iconFloatClean: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
  },
  lockedWrapper: {
    position: 'absolute',
    bottom: -6,
    left: -120, // stretch over tabbar approx
    right: -120,
    height: 74,
    borderWidth: 1,
    borderRadius: 37,
    paddingHorizontal: 24,
    justifyContent: 'center',
    shadowColor: "#000",
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
    zIndex: 999,
  },
  lockedControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    flex: 1,
  },
  lockedBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  }
});
