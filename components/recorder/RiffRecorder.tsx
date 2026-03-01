import { useHaptic } from "@/src/hooks/useHaptic";
import { useTranslation } from "@/src/i18n";
import { downsampleWaveform } from "@/src/storage/riffs";
import { formatTime } from "@/src/utils/formatters";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
    RecordingPresets,
    requestRecordingPermissionsAsync,
    setAudioModeAsync,
    useAudioPlayer,
    useAudioPlayerStatus,
    useAudioRecorder,
    useAudioRecorderState,
} from "expo-audio";
import { Microphone, Pause, Play, Repeat, Stop, Warning } from "phosphor-react-native";
import React, {
    forwardRef,
    useEffect,
    useImperativeHandle,
    useRef,
    useState,
} from "react";
import {
    ActivityIndicator,
    Alert,
    LayoutAnimation,
    Pressable,
    Animated as RNAnimated,
    StyleSheet,
    Text,
    View
} from "react-native";
import { Easing, useSharedValue, withTiming } from "react-native-reanimated";
import { Marker } from "../../src/types/riff";
import { InteractiveWaveform } from "../InteractiveWaveform";
import { useTheme } from "../ThemeProvider";
import { CountdownOverlay } from "./CountdownOverlay";
import { MeteringBars } from "./MeteringBars";



function calculateRms(levels: number[]): number {
  if (!levels || levels.length === 0) return 0;
  let sumSq = 0;
  for (let i = 0; i < levels.length; i++) sumSq += levels[i] * levels[i];
  return Math.sqrt(sumSq / levels.length);
}
function getEnergyLevel(rms: number): "low" | "medium" | "high" {
  if (rms < 0.25) return "low";
  if (rms < 0.55) return "medium";
  return "high";
}
function calculateDynamicRange(levels: number[]): number {
  if (!levels || levels.length === 0) return 0;
  const max = Math.max(...levels);
  const min = Math.min(...levels);
  return max - min;
}

type RecorderError = "permission_denied" | "no_space" | "interrupted" | "unknown";

export type RecordingResult = {
  uri: string;
  duration: number;
  levels: number[];
  averageRms?: number;
  energyLevel?: "low" | "medium" | "high";
  dynamicRange?: number;
};

type Props = {
  audioUri?: string;
  onChange: (data: {
    uri?: string;
    duration: number;
    levels: number[];
    averageRms?: number;
    energyLevel?: "low" | "medium" | "high";
    dynamicRange?: number;
  }) => void;
  maxSeconds?: number;
  markers?: Marker[];
  loopStart?: number;
  loopEnd?: number;
  loopRangeActive?: boolean;
  initialLevels?: number[];
  // Metadata to show in chips below player
  bpm?: number;
  musicalKey?: string;
};

export interface RiffRecorderRef {
  getActiveRecordingData: () => RecordingResult | null;
  getCurrentPosition: () => number;
  stopRecording: () => Promise<RecordingResult | null>;
  isRecording: () => boolean;
}



/**
 * ✅ Engine que contém o hook do recorder.
 * Ele só é montado quando recordingEngineActive=true.
 */
function RecorderEngine({
  active,
  maxSeconds,
  onMetering,
  onUri,
  onAutoStop,
  onError,
}: {
  active: boolean;
  maxSeconds: number;
  onMetering: (db: number) => void;
  onUri: (uri?: string) => void;
  onAutoStop: () => void;
  onError: (e: unknown) => void;
}) {
  const audioRecorder = useAudioRecorder({
    ...RecordingPresets.HIGH_QUALITY,
    isMeteringEnabled: true,
  });
  const recorderState = useAudioRecorderState(audioRecorder, 100);

  const secondsRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!active) return;
    if (recorderState.isRecording && recorderState.metering != null) {
      onMetering(recorderState.metering as number);
    }
  }, [active, recorderState.isRecording, recorderState.metering, onMetering]);

  useEffect(() => {
    let cancelled = false;

    async function start() {
      try {
        secondsRef.current = 0;

        await audioRecorder.prepareToRecordAsync({
          ...RecordingPresets.HIGH_QUALITY,
          isMeteringEnabled: true,
        });

        await audioRecorder.record(); // ✅ await -> captura “keep awake”
        if (cancelled) return;

        onUri(audioRecorder.uri ?? undefined);

        timerRef.current = setInterval(() => {
          secondsRef.current += 1;
          if (secondsRef.current >= maxSeconds) onAutoStop();
        }, 1000);
      } catch (e) {
        onError(e);
      }
    }

    async function stop() {
      try {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = null;

        if (recorderState.isRecording) {
          await audioRecorder.stop();
        }
        onUri(audioRecorder.uri ?? undefined);
      } catch (e) {
        onError(e);
      }
    }

    if (active) start();
    else stop();

    return () => {
      cancelled = true;
      try {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = null;
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  return null;
}

export const RiffRecorder = forwardRef<RiffRecorderRef, Props>(function RiffRecorder(
  { audioUri, onChange, maxSeconds = 60, markers = [], loopStart, loopEnd, loopRangeActive, initialLevels = [], bpm, musicalKey },
  ref
) {
  const theme = useTheme();
  const { t } = useTranslation();
  const { triggerHaptic } = useHaptic();

  // ✅ engine control
  const [recordingEngineActive, setRecordingEngineActive] = useState(false);

  // metering
  const levelsRef = useRef<number[]>([]);
  const [displayLevels, setDisplayLevels] = useState<number[]>([]);
  const [meteringContainerWidth, setMeteringContainerWidth] = useState(0);

  const flushIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  function startFlushInterval() {
    if (flushIntervalRef.current) return;
    flushIntervalRef.current = setInterval(() => setDisplayLevels([...levelsRef.current]), 150);
  }
  function stopFlushInterval() {
    if (flushIntervalRef.current) {
      clearInterval(flushIntervalRef.current);
      flushIntervalRef.current = null;
    }
  }

  // player - Throttled interval to prevent Maximum update depth crash
  const audioPlayer = useAudioPlayer(audioUri ?? null, { updateInterval: 100 });
  const playerStatus = useAudioPlayerStatus(audioPlayer);

  const playAnim = useRef(new RNAnimated.Value(0)).current;
  useEffect(() => {
    RNAnimated.timing(playAnim, {
      toValue: playerStatus.playing ? 1 : 0,
      duration: 150,
      useNativeDriver: true,
    }).start();
  }, [playerStatus.playing]);

  const pauseOpacity = playAnim;
  const playOpacity = playAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  const playScale = playAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0.5] });
  const pauseScale = playAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] });

  const [isRecording, setIsRecording] = useState(false);
  const [recorderError, setRecorderError] = useState<RecorderError | null>(null);

  const [countdownVal, setCountdownVal] = useState<number | null>(null);
  const countdownEnabledRef = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem("@countdown_enabled").then((val) => {
      countdownEnabledRef.current = val === "true";
    });
  }, []);

  const playbackPositionMs = useSharedValue(0);
  const [loopActive, setLoopActive] = useState(false);
  const isSeekingRef = useRef(false);
  const isUserScrubbingRef = useRef(false);

  const [seconds, setSeconds] = useState(0);
  const [duration, setDuration] = useState(0);
  const [displayCurrentMs, setDisplayCurrentMs] = useState(0);

  const [isProcessing, setIsProcessing] = useState(false);
  const [waveformVersion, setWaveformVersion] = useState(0);
  const [savedLevels, setSavedLevels] = useState<number[]>(initialLevels);

  const secondsRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeUriRef = useRef<string | null>(null);

  function stopTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  // Sync player position
  useEffect(() => {
    if (playerStatus.isLoaded) {
      const posMs = playerStatus.currentTime * 1000;
      
      if (!isUserScrubbingRef.current) {
        playbackPositionMs.value = withTiming(posMs, { duration: 100, easing: Easing.linear });
        setDisplayCurrentMs((prev) => {
          // Only trigger a re-render if the second has changed
          if (Math.floor(prev / 1000) !== Math.floor(posMs / 1000)) {
            return posMs;
          }
          return prev;
        });
      }

      if (duration === 0) setDuration(playerStatus.duration * 1000);

      if (loopRangeActive && loopEnd != null && !isSeekingRef.current) {
        const startMs = loopStart ?? 0;
        if (posMs >= loopEnd && loopEnd > startMs + 200) {
          isSeekingRef.current = true;
          audioPlayer.seekTo(startMs / 1000);
          audioPlayer.play();
          setTimeout(() => (isSeekingRef.current = false), 150);
        }
      }

      if (playerStatus.didJustFinish) {
        if (loopActive) {
          audioPlayer.seekTo(0);
          audioPlayer.play();
        } else {
          audioPlayer.seekTo(0);
          audioPlayer.pause();
          playbackPositionMs.value = withTiming(0, { duration: 100, easing: Easing.linear });
          setDisplayCurrentMs(0);
        }
      }
    } else {
       playbackPositionMs.value = 0;
       setDisplayCurrentMs(0);
    }
  }, [playerStatus]);

  useImperativeHandle(ref, () => ({
    getActiveRecordingData: () => {
      if (isRecording || activeUriRef.current) {
        const uri = activeUriRef.current ?? undefined;
        if (uri) {
          const levels = [...levelsRef.current];
          const rms = calculateRms(levels);
          return {
            uri,
            duration: Math.max(secondsRef.current * 1000, 1000),
            levels,
            averageRms: rms,
            energyLevel: getEnergyLevel(rms),
            dynamicRange: calculateDynamicRange(levels),
          };
        }
      }
      return null;
    },
    getCurrentPosition: () => playbackPositionMs.value || 0,
    stopRecording: async () => {
      if (!isRecording) return null;
      const immediateUri = activeUriRef.current ?? undefined;
      if (!immediateUri) return null;
      await stopRecording();
      const levels = [...levelsRef.current];
      const rms = calculateRms(levels);
      return {
        uri: immediateUri,
        duration: Math.max(secondsRef.current * 1000, 1000),
        levels,
        averageRms: rms,
        energyLevel: getEnergyLevel(rms),
        dynamicRange: calculateDynamicRange(levels),
      };
    },
    isRecording: () => !!isRecording,
  }));

  function classifyError(e: any): RecorderError {
    const msg = (e?.message ?? "").toLowerCase();
    if (msg.includes("permission") || msg.includes("denied")) return "permission_denied";
    if (msg.includes("enospc") || msg.includes("space") || msg.includes("storage")) return "no_space";
    if (msg.includes("interrupt") || msg.includes("session")) return "interrupted";
    return "unknown";
  }

  const errorMessages: Record<RecorderError, { title: string; body: string }> = {
    permission_denied: {
      title: t("recorder.err_perm_title"),
      body: t("recorder.err_perm_body"),
    },
    no_space: {
      title: t("recorder.err_space_title"),
      body: t("recorder.err_space_body"),
    },
    interrupted: {
      title: t("recorder.err_int_title"),
      body: t("recorder.err_int_body"),
    },
    unknown: {
      title: t("recorder.err_unk_title"),
      body: t("recorder.err_unk_body"),
    },
  };

  async function startRecording() {
    setRecorderError(null);

    // countdown
    if (countdownEnabledRef.current && countdownVal === null) {
      for (let i = 3; i > 0; i--) {
        setCountdownVal(i);
        triggerHaptic("light");
        await new Promise((r) => setTimeout(r, 1000));
      }
      setCountdownVal(null);
      triggerHaptic("heavy");
    }

    try {
      audioPlayer.pause();

      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        setRecorderError("permission_denied");
        return;
      }

      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
        interruptionMode: "doNotMix",
      });

      levelsRef.current = [];
      setDisplayLevels([]);
      setSavedLevels([]);
      setSeconds(0);
      secondsRef.current = 0;

      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setIsRecording(true);
      activeUriRef.current = null;

      // ✅ monta engine agora
      setRecordingEngineActive(true);
      startFlushInterval();

      // timer UI
      stopTimer();
      timerRef.current = setInterval(() => {
        secondsRef.current += 1;
        setSeconds(secondsRef.current);
      }, 1000);
    } catch (e) {
      console.error("[RiffRecorder] start error", e);
      setRecorderError(classifyError(e));
      setIsRecording(false);
      setRecordingEngineActive(false);
      stopTimer();
      stopFlushInterval();
    }
  }

  async function stopRecording() {
    if (!isRecording) return;

    // discard < 1s
    if (secondsRef.current < 1) {
      stopTimer();
      stopFlushInterval();
      setIsRecording(false);
      setRecordingEngineActive(false);
      return;
    }

    const currentLevels = [...levelsRef.current];
    let finalDuration = Math.max(secondsRef.current * 1000, 1000);

    stopTimer();
    stopFlushInterval();

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsRecording(false);
    setIsProcessing(true);

    try {
      // ✅ desmonta engine → ele faz stop internamente
      setRecordingEngineActive(false);

      // pequena espera para permitir uri atualizar no ref via onUri
      await new Promise((r) => setTimeout(r, 120));

      const immediateUri = activeUriRef.current ?? undefined;
      if (immediateUri) {
        const downsampled = downsampleWaveform(currentLevels, 800);
        const rms = calculateRms(currentLevels);
        const energy = getEnergyLevel(rms);
        const dynamic = calculateDynamicRange(currentLevels);

        setDuration(finalDuration);
        setSavedLevels(downsampled);
        setWaveformVersion((v) => v + 1);

        onChange({
          uri: immediateUri,
          duration: finalDuration,
          levels: downsampled,
          averageRms: rms,
          energyLevel: energy,
          dynamicRange: dynamic,
        });
        triggerHaptic("success");
      }
    } catch (e) {
      console.error("[RiffRecorder] stop error", e);
    } finally {
      setIsProcessing(false);
    }
  }

  async function handlePlayPause() {
    if (!audioUri) return;
    try {
      triggerHaptic("light");
      if (playerStatus.isLoaded) {
        playerStatus.playing ? audioPlayer.pause() : audioPlayer.play();
      } else {
        audioPlayer.play();
      }
    } catch (error) {
      console.error(error);
      Alert.alert(t("project.error"), t("recorder.playback_error"));
      triggerHaptic("error");
    }
  }

  function handleDelete() {
    Alert.alert(t("recorder.delete_title"), t("recorder.delete_body"), [
      { text: t("recorder.cancel"), style: "cancel" },
      {
        text: t("recorder.delete_action"),
        style: "destructive",
        onPress: () => {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          onChange({ uri: undefined, duration: 0, levels: [] });
          levelsRef.current = [];
          setSavedLevels([]);
          setDisplayLevels([]);
          setDuration(0);
          setDisplayCurrentMs(0);
          playbackPositionMs.value = 0;
          audioPlayer.remove();
        },
      },
    ]);
  }

  const waveformLevels = savedLevels.length > 0 ? savedLevels : [];
  const recordProgress = Math.min(seconds / maxSeconds, 1);

  if (recorderError) {
    const errInfo = errorMessages[recorderError];
    return (
      <View style={[styles.errorContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Warning size={32} color={theme.destructive} weight="fill" style={{ marginBottom: 8 }} />
        <Text style={{ color: theme.foreground, fontWeight: "800", fontSize: 16, marginBottom: 4, textAlign: "center" }}>
          {errInfo.title}
        </Text>
        <Text style={{ color: theme.mutedForeground, fontSize: 13, textAlign: "center", lineHeight: 20, marginBottom: 16 }}>
          {errInfo.body}
        </Text>
        <Pressable
          onPress={() => {
            setRecorderError(null);
            startRecording();
          }}
          style={{ backgroundColor: theme.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 }}
        >
          <Text style={{ color: theme.primaryForeground, fontWeight: "bold" }}>{t("recorder.retry")}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* ✅ engine (hooks) só existe enquanto recordingEngineActive */}
      {recordingEngineActive && (
        <RecorderEngine
          active={recordingEngineActive}
          maxSeconds={maxSeconds}
          onMetering={(db) => {
            const normalized = Math.max(0, (db + 160) / 160);
            levelsRef.current.push(normalized);
          }}
          onUri={(uri) => {
            if (uri) activeUriRef.current = uri;
          }}
          onAutoStop={() => {
            // quando estoura maxSeconds
            stopRecording();
          }}
          onError={(e) => {
            console.error("[RecorderEngine] error", e);
            setRecorderError(classifyError(e));
            setRecordingEngineActive(false);
            setIsRecording(false);
            stopTimer();
            stopFlushInterval();
          }}
        />
      )}

      {countdownVal !== null && <CountdownOverlay value={countdownVal} />}

      {!isRecording && !audioUri && !isProcessing && (
        <View style={{ alignItems: 'center', marginVertical: 20 }}>
          <Pressable
            style={({ pressed }) => [
              {
                width: 72,
                height: 72,
                borderRadius: 36,
                backgroundColor: theme.accent,
                alignItems: "center",
                justifyContent: "center",
                shadowColor: theme.accent,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.4,
                shadowRadius: 12,
                elevation: 8,
                opacity: pressed ? 0.8 : 1
              },
            ]}
            onPress={startRecording}
          >
            <Microphone size={32} color="#fff" weight="fill" />
          </Pressable>
          <Text style={{ marginTop: 12, fontWeight: '700', color: theme.foreground, fontSize: 15 }}>{t("recorder.record_riff")}</Text>
        </View>
      )}

      {isRecording && (
        <View style={{ width: "100%" }}>
          <View onLayout={(e) => setMeteringContainerWidth(e.nativeEvent.layout.width)} style={{ marginBottom: 14 }}>
            <MeteringBars levels={displayLevels} color={theme.primary} containerWidth={meteringContainerWidth} />
          </View>

          <View style={[styles.progressTrack, { backgroundColor: theme.border }]}>
            <View
              style={[
                styles.progressFill,
                {
                  backgroundColor: recordProgress > 0.85 ? "#ef4444" : theme.primary,
                  width: `${recordProgress * 100}%`,
                },
              ]}
            />
          </View>

          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 10 }}>
            <Text style={{ color: theme.mutedForeground, fontSize: 11 }}>{formatTime(seconds)}</Text>
            <Text style={{ color: theme.mutedForeground, fontSize: 11 }}>{formatTime(maxSeconds)}</Text>
          </View>

          <View style={{ alignItems: "center", marginTop: 20, marginBottom: 10 }}>
            <Pressable 
              style={({ pressed }) => [
                {
                  width: 72,
                  height: 72,
                  borderRadius: 36,
                  backgroundColor: "#dc2626",
                  alignItems: "center",
                  justifyContent: "center",
                  shadowColor: "#dc2626",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.4,
                  shadowRadius: 12,
                  elevation: 8,
                  opacity: pressed ? 0.8 : 1
                }
              ]} 
              onPress={stopRecording}
            >
              <Stop size={32} color="#fff" weight="fill" />
            </Pressable>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10 }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: "#dc2626" }} />
              <Text style={{ color: theme.foreground, fontWeight: "700", fontSize: 14 }}>
                {formatTime(seconds)}
              </Text>
            </View>
          </View>
        </View>
      )}

      {isProcessing && (
        <View style={[styles.processingContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <ActivityIndicator size={24} color={theme.primary} />
          <Text style={{ color: theme.mutedForeground, marginTop: 12, fontSize: 13, fontWeight: "600" }}>
            Processando áudio...
          </Text>
        </View>
      )}

      {audioUri && !isRecording && !isProcessing && (
        <>
          <View style={styles.row}>
            <Pressable style={[styles.small, { backgroundColor: theme.primary, flex: 2 }]} onPress={handlePlayPause}>
              <View style={{ width: 16, height: 16, justifyContent: "center", alignItems: "center" }}>
                <RNAnimated.View style={{ position: "absolute", opacity: playOpacity, transform: [{ scale: playScale }] }}>
                  <Play size={16} color={theme.primaryForeground} weight="fill" />
                </RNAnimated.View>
                <RNAnimated.View style={{ position: "absolute", opacity: pauseOpacity, transform: [{ scale: pauseScale }] }}>
                  <Pause size={16} color={theme.primaryForeground} weight="fill" />
                </RNAnimated.View>
              </View>
              <Text style={[styles.smallText, { color: theme.primaryForeground }]}>
                {playerStatus.playing ? "Pausar" : "Tocar"}
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.small,
                {
                  backgroundColor: "transparent",
                  flex: 1,
                  borderWidth: 1,
                  borderColor: loopActive ? theme.primary : theme.border,
                },
              ]}
              onPress={() => {
                const toggled = !loopActive;
                setLoopActive(toggled);
                triggerHaptic("light");
              }}
            >
              <Repeat size={16} color={loopActive ? theme.primary : theme.foreground} weight={loopActive ? "bold" : "regular"} />
              <Text style={[styles.smallText, { color: loopActive ? theme.primary : theme.foreground }]}>Loop</Text>
            </Pressable>
          </View>

          {/* ── Metadata chips ── */}
          {(duration > 0 || bpm || musicalKey || (loopStart != null && loopEnd != null)) && (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8, marginBottom: 4 }}>
              {duration > 0 && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: theme.muted, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 99 }}>
                  <Text style={{ color: theme.mutedForeground, fontSize: 11, fontWeight: "600" }}>
                    ⏱ {formatTime(Math.floor(duration / 1000))}
                  </Text>
                </View>
              )}
              {bpm && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: theme.muted, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 99 }}>
                  <Text style={{ color: theme.mutedForeground, fontSize: 11, fontWeight: "600" }}>🎚 {bpm} BPM</Text>
                </View>
              )}
              {musicalKey && (
                <View style={{ backgroundColor: theme.muted, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 99 }}>
                  <Text style={{ color: theme.mutedForeground, fontSize: 11, fontWeight: "600" }}>🎵 {musicalKey}</Text>
                </View>
              )}
              {loopStart != null && loopEnd != null && (
                <View style={{ backgroundColor: theme.primary + "15", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 99, borderWidth: 1, borderColor: theme.primary + "40" }}>
                  <Text style={{ color: theme.primary, fontSize: 11, fontWeight: "700" }}>
                    🔁 {((loopEnd - loopStart) / 1000).toFixed(1)}s loop
                  </Text>
                </View>
              )}
            </View>
          )}
          {waveformLevels.length > 0 && (
            <View style={{ marginTop: 12 }}>
              <InteractiveWaveform
                levels={waveformLevels}
                durationMs={duration || seconds * 1000}
                playbackPositionMs={playbackPositionMs}
                markers={markers}
                waveformVersion={waveformVersion}
                isLooping={loopActive}
                onScrubStateChange={(scrubbing) => {
                  isUserScrubbingRef.current = scrubbing;
                }}
                onSeek={(ms) => {
                  audioPlayer.seekTo(ms / 1000);
                  playbackPositionMs.value = ms;
                  setDisplayCurrentMs(ms);
                }}
              />

              {duration > 0 && (
                <View style={styles.timeRow}>
                  <Text style={[styles.timeText, { color: theme.mutedForeground }]}>
                    {formatTime(Math.floor(displayCurrentMs / 1000))}
                  </Text>
                  <Text style={[styles.timeText, { color: theme.mutedForeground }]}>
                    {formatTime(Math.floor(duration / 1000))}
                  </Text>
                </View>
              )}
            </View>
          )}

          <View style={styles.bottomActions}>
            <Pressable onPress={startRecording} style={styles.rerecordButton}>
              <View style={styles.recordDotSmall} />
              <Text style={[styles.rerecordText, { color: theme.foreground }]}>Regravar</Text>
            </Pressable>

            <View style={[styles.separator, { backgroundColor: theme.border }]} />

            <Pressable
              onPress={handleDelete}
              style={({ pressed }) => [styles.deleteButton, pressed && { backgroundColor: theme.destructive + "15" }]}
            >
              {({ pressed }) => (
                <Text style={{ color: pressed ? theme.destructive : theme.mutedForeground, fontWeight: "600", fontSize: 13 }}>
                  Apagar
                </Text>
              )}
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: { marginTop: 12, gap: 8, position: "relative" },
  errorContainer: { marginTop: 12, padding: 20, borderRadius: 12, borderWidth: 1, alignItems: "center" },
  processingContainer: { height: 100, justifyContent: "center", alignItems: "center", marginTop: 12, borderRadius: 12, borderWidth: 1 },
  recordButton: { flexDirection: "row", gap: 10, paddingVertical: 18, paddingHorizontal: 24, borderRadius: 12, alignItems: "center", justifyContent: "center", borderWidth: 1.5, backgroundColor: "rgba(230,77,77,0.08)" },
  recordDot: { width: 14, height: 14, borderRadius: 7 },
  recordText: { fontWeight: "700", fontSize: 16 },
  progressTrack: { height: 3, borderRadius: 2, overflow: "hidden", marginBottom: 6 },
  progressFill: { height: "100%", borderRadius: 2 },
  button: { flexDirection: "row", gap: 8, padding: 14, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  recording: { backgroundColor: "#dc2626" },
  recordingIndicator: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#fff" },
  text: { color: "#fff", fontWeight: "600", fontSize: 15 },
  row: { flexDirection: "row", gap: 8 },
  small: { flex: 1, flexDirection: "row", gap: 6, padding: 12, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  smallText: { fontWeight: "600", fontSize: 13 },
  timeRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 6, paddingHorizontal: 2 },
  timeText: { fontSize: 11, fontWeight: "500", fontVariant: ["tabular-nums"] },
  bottomActions: { flexDirection: "row", alignItems: "center", marginTop: 12, gap: 0 },
  rerecordButton: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8 },
  recordDotSmall: { width: 10, height: 10, borderRadius: 5, backgroundColor: "#dc2626" },
  rerecordText: { fontWeight: "600", fontSize: 13 },
  separator: { flex: 1 },
  deleteButton: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8 },
});