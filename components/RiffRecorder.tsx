import { useHaptic } from "@/src/hooks/useHaptic";
import { downsampleWaveform } from "@/src/storage/riffs";
import { formatTime } from "@/src/utils/formatters";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Slider from "@react-native-community/slider";
import {
    RecordingPresets,
    requestRecordingPermissionsAsync,
    setAudioModeAsync,
    useAudioPlayer,
    useAudioPlayerStatus,
    useAudioRecorder,
    useAudioRecorderState
} from "expo-audio";
import { Pause, Play, Repeat, Stop, Warning } from "phosphor-react-native";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Pressable,
    Animated as RNAnimated,
    StyleSheet,
    Text,
    View
} from "react-native";
import { useSharedValue } from "react-native-reanimated";
import { Marker } from "../src/types/riff";
import { InteractiveWaveform } from "./InteractiveWaveform";
import { useTheme } from "./ThemeProvider";

// Quick helpers for Energy
function calculateRms(levels: number[]): number {
  if (!levels || levels.length === 0) return 0;
  let sumSq = 0;
  for (let i = 0; i < levels.length; i++) {
    sumSq += levels[i] * levels[i];
  }
  return Math.sqrt(sumSq / levels.length);
}

function getEnergyLevel(rms: number): "low" | "medium" | "high" {
  if (rms < 0.25) return "low";
  if (rms < 0.55) return "medium";
  return "high";
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type RecorderError = "permission_denied" | "no_space" | "interrupted" | "unknown";

type Props = {
  audioUri?: string;
  onChange: (data: { uri?: string; duration: number; levels: number[]; averageRms?: number; energyLevel?: "low" | "medium" | "high" }) => void;
  maxSeconds?: number;
  markers?: Marker[];
  /** Loop region — milliseconds */
  loopStart?: number;
  loopEnd?: number;
  loopRangeActive?: boolean;
};

export interface RiffRecorderRef {
  getActiveRecordingData: () => { uri?: string; duration: number; levels: number[]; averageRms?: number; energyLevel?: "low" | "medium" | "high" } | null;
  getCurrentPosition: () => number;
  stopRecording: () => Promise<void>;
  isRecording: () => boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const RiffRecorder = forwardRef<RiffRecorderRef, Props>(function RiffRecorder(
  { audioUri, onChange, maxSeconds = 60, markers = [], loopStart, loopEnd, loopRangeActive },
  ref
) {
  const theme = useTheme();
  const { triggerHaptic } = useHaptic();

  // expo-audio hooks
  const audioRecorder = useAudioRecorder({ ...RecordingPresets.HIGH_QUALITY, isMeteringEnabled: true });
  const recorderState = useAudioRecorderState(audioRecorder, 100);

  // ---------------------------------------------------------------------------
  // Metering: decouple capture from render
  // levelsRef accumulates every tick; a 100ms interval flushes to state for render
  // ---------------------------------------------------------------------------
  const levelsRef = useRef<number[]>([]);

  useEffect(() => {
    if (recorderState.isRecording && recorderState.metering != null) {
      const rawDb = recorderState.metering as number;
      const normalized = Math.max(0, (rawDb + 160) / 160);
      levelsRef.current = [...levelsRef.current, normalized];
    }
  }, [recorderState.metering, recorderState.isRecording]);

  // 100ms flush interval — only runs while recording
  const flushIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [displayLevels, setDisplayLevels] = useState<number[]>([]);

  function startFlushInterval() {
    if (flushIntervalRef.current) return;
    flushIntervalRef.current = setInterval(() => {
      setDisplayLevels([...levelsRef.current]);
    }, 100);
  }

  function stopFlushInterval() {
    if (flushIntervalRef.current) {
      clearInterval(flushIntervalRef.current);
      flushIntervalRef.current = null;
    }
  }

  // Player
  const audioPlayer = useAudioPlayer(audioUri ?? null, { updateInterval: 16 });
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

  useEffect(() => {
    if (audioUri && !isRecording && !playerStatus.isLoaded) {
      try { audioPlayer.replace(audioUri); } catch (_) {}
    }
  }, [audioUri, isRecording, playerStatus.isLoaded]);

  const [countdownVal, setCountdownVal] = useState<number | null>(null);
  const countdownEnabledRef = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem("@countdown_enabled").then(val => {
      countdownEnabledRef.current = val === "true";
    });
  }, []);

  const isPreparingRef = useRef(false);
  const playbackPositionMs = useSharedValue(0);

  // Simple loop state (full loop from start)
  const isLoopingShared = useSharedValue(false);
  const [loopActive, setLoopActive] = useState(false);

  // Seek spam guard for loop region
  const isSeekingRef = useRef(false);

  const [seconds, setSeconds] = useState(0);
  const [duration, setDuration] = useState(0);

  const isStartingRef = useRef(false);
  const isProcessingRef = useRef(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const isDraggingRef = useRef(false);
  const [sliderValue, setSliderValue] = useState(0);
  const [waveformVersion, setWaveformVersion] = useState(0);

  // levels for the saved waveform display (downsampled)
  const [savedLevels, setSavedLevels] = useState<number[]>([]);

  const secondsRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const activeUriRef = useRef<string | null>(null);

  function stopTimer() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  // Sync player position + loop region handling
  useEffect(() => {
    if (playerStatus.isLoaded) {
      if (!isDraggingRef.current) {
        playbackPositionMs.value = playerStatus.currentTime * 1000;
        setSliderValue(playerStatus.currentTime * 1000);
      }
      if (duration === 0) setDuration(playerStatus.duration * 1000);

      // Loop region (loopStart / loopEnd override)
      if (loopRangeActive && loopEnd != null && !isSeekingRef.current) {
        const posMs = playerStatus.currentTime * 1000;
        const startMs = loopStart ?? 0;
        if (posMs >= loopEnd && loopEnd > startMs + 200) {
          isSeekingRef.current = true;
          audioPlayer.seekTo(startMs / 1000);
          audioPlayer.play();
          setTimeout(() => { isSeekingRef.current = false; }, 150);
        }
      }

      // Full-track loop or end-of-track handling
      if (playerStatus.didJustFinish) {
        if (loopActive) {
          audioPlayer.seekTo(0);
          audioPlayer.play();
        } else {
          audioPlayer.seekTo(0);
          audioPlayer.pause();
          playbackPositionMs.value = 0;
          setSliderValue(0);
        }
      }
    }
  }, [playerStatus]);

  useEffect(() => {
    if (recorderState.isRecording && audioRecorder.uri) {
      activeUriRef.current = audioRecorder.uri;
    }
  }, [recorderState.isRecording, audioRecorder.uri]);

  useImperativeHandle(ref, () => ({
    getActiveRecordingData: () => {
      if (recorderState.isRecording || activeUriRef.current) {
        const uri = audioRecorder.uri ?? activeUriRef.current ?? undefined;
        if (uri) {
          return {
            uri,
            duration: Math.max(secondsRef.current * 1000, 1000),
            levels: [...levelsRef.current],
            averageRms: calculateRms([...levelsRef.current]),
            energyLevel: getEnergyLevel(calculateRms([...levelsRef.current])),
          };
        }
      }
      return null;
    },
    getCurrentPosition: () => playbackPositionMs.value || 0,
    stopRecording: async () => {
      if (recorderState.isRecording) {
        await stopRecording();
      }
    },
    isRecording: () => !!recorderState.isRecording,
  }));

  async function cleanupRecording() {
    stopTimer();
    stopFlushInterval();
    setIsRecording(false);
    if (recorderState.isRecording) {
      try { await audioRecorder.stop(); } catch (e) {}
    }
  }

  function classifyError(e: any): RecorderError {
    const msg = (e?.message ?? "").toLowerCase();
    if (msg.includes("permission") || msg.includes("denied")) return "permission_denied";
    if (msg.includes("enospc") || msg.includes("space") || msg.includes("storage")) return "no_space";
    if (msg.includes("interrupt") || msg.includes("session")) return "interrupted";
    return "unknown";
  }

  const errorMessages: Record<RecorderError, { title: string; body: string }> = {
    permission_denied: {
      title: "Sem Permissão de Microfone",
      body: "Vá em Configurações → Permissões → Microfone e autorize o RiffMaker.",
    },
    no_space: {
      title: "Armazenamento Insuficiente",
      body: "Libere espaço no dispositivo e tente novamente.",
    },
    interrupted: {
      title: "Gravação Interrompida",
      body: "Outro app assumiu o áudio do sistema. Feche-o e tente novamente.",
    },
    unknown: {
      title: "Erro Desconhecido",
      body: "Não foi possível iniciar a gravação. Tente novamente.",
    },
  };

  async function startRecording() {
    if (isStartingRef.current) return;
    setRecorderError(null);

    if (countdownEnabledRef.current && countdownVal === null) {
      isStartingRef.current = true;
      for (let i = 3; i > 0; i--) {
        setCountdownVal(i);
        triggerHaptic("light");
        await new Promise(r => setTimeout(r, 1000));
      }
      setCountdownVal(null);
      triggerHaptic("heavy");
      isStartingRef.current = false;
    }

    if (isStartingRef.current) return;
    isStartingRef.current = true;
    try {
      await cleanupRecording();
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
      playbackPositionMs.value = 0;
      stopTimer();

      setIsRecording(true);
      activeUriRef.current = null;

      await audioRecorder.prepareToRecordAsync({
        ...RecordingPresets.HIGH_QUALITY,
        isMeteringEnabled: true,
      });

      audioRecorder.record();

      // Start render flush interval (100ms = 10fps)
      startFlushInterval();

      // Smooth timer for UI
      timerRef.current = setInterval(() => {
        secondsRef.current += 1;
        setSeconds(secondsRef.current);

        // Auto-stop at max
        if (secondsRef.current >= maxSeconds) {
          stopRecording();
        }
      }, 1000);
    } catch (e) {
      console.error("[RiffRecorder] startRecording error:", e);
      setRecorderError(classifyError(e));
      await cleanupRecording();
    } finally {
      isStartingRef.current = false;
    }
  }

  async function stopRecording() {
    if (!recorderState.isRecording) return;

    // Guard: discard recordings shorter than 1 second
    if (secondsRef.current < 1) {
      await cleanupRecording();
      return;
    }

    const immediateUri = audioRecorder.uri ?? activeUriRef.current ?? undefined;
    const currentLevels = [...levelsRef.current];
    let finalDuration = Math.max(secondsRef.current * 1000, 1000);

    stopTimer();
    stopFlushInterval();
    setIsRecording(false);
    setIsProcessing(true);
    isProcessingRef.current = true;

    try {
      await audioRecorder.stop();

      const realDuration = recorderState.durationMillis;
      if (realDuration && realDuration > 0) {
        finalDuration = realDuration;
      }

      setDuration(finalDuration);

      if (immediateUri) {
        const downsampled = downsampleWaveform(currentLevels, 800);
        const rms = calculateRms(currentLevels);
        const energy = getEnergyLevel(rms);
        
        setSavedLevels(downsampled);
        setWaveformVersion(v => v + 1);
        onChange({ 
          uri: immediateUri, 
          duration: finalDuration, 
          levels: downsampled,
          averageRms: rms,
          energyLevel: energy
        });
        triggerHaptic("success");
      }
    } catch (e) {
      console.error("[RiffRecorder] stopRecording error:", e);
    } finally {
      setIsProcessing(false);
      isProcessingRef.current = false;
    }
  }

  async function handlePlayPause() {
    if (!audioUri) return;
    try {
      triggerHaptic("light");
      if (playerStatus.isLoaded) {
        if (playerStatus.playing) {
          audioPlayer.pause();
        } else {
          audioPlayer.play();
        }
      } else {
        audioPlayer.play();
      }
    } catch (error) {
      console.error(error);
      Alert.alert("Erro", "Não foi possível reproduzir.");
      triggerHaptic("error");
    }
  }

  function handleDelete() {
    Alert.alert("Apagar gravação?", "Essa ação não pode ser desfeita.", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Apagar",
        style: "destructive",
        onPress: () => {
          onChange({ uri: undefined, duration: 0, levels: [] });
          levelsRef.current = [];
          setSavedLevels([]);
          setDisplayLevels([]);
          setDuration(0);
          playbackPositionMs.value = 0;
          audioPlayer.remove();
        },
      },
    ]);
  }

  // The levels to show in the waveform component (saved, downsampled)
  const waveformLevels = savedLevels.length > 0 ? savedLevels : [];

  // ---------------------------------------------------------------------------
  // Error UI
  // ---------------------------------------------------------------------------
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
          onPress={() => { setRecorderError(null); startRecording(); }}
          style={{ backgroundColor: theme.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 }}
        >
          <Text style={{ color: theme.primaryForeground, fontWeight: "bold" }}>Tentar novamente</Text>
        </Pressable>
      </View>
    );
  }

  // ---------------------------------------------------------------------------
  // Main UI
  // ---------------------------------------------------------------------------
  return (
    <View style={styles.container}>
      {countdownVal !== null && (
        <View style={styles.countdownOverlay}>
          <Text style={styles.countdownText}>{countdownVal}</Text>
        </View>
      )}

      {!isRecording ? (
        <Pressable
          style={[styles.button, styles.primaryRecordButton]}
          onPress={startRecording}
        >
          <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: "#dc2626" }} />
          <Text style={styles.recordText}>
            {audioUri ? "Gravar novamente" : "Gravar Riff"}
          </Text>
        </Pressable>
      ) : (
        <View style={{ alignItems: "center", width: "100%" }}>
          {/* Live metering preview — last 40 bars from displayLevels */}
          <View style={{ height: 40, flexDirection: "row", alignItems: "flex-end", gap: 3, marginBottom: 16, overflow: "hidden", width: "100%", justifyContent: "center" }}>
            {displayLevels.slice(-40).map((lvl, idx) => {
              const normalized = Math.max(0.05, lvl < 0 ? (lvl + 160) / 160 : lvl);
              return <View key={idx} style={{ width: 4, height: normalized * 40, backgroundColor: theme.primary, borderRadius: 2 }} />;
            })}
          </View>
          <Pressable
            style={[styles.button, styles.recording, { width: "100%" }]}
            onPress={stopRecording}
          >
            <View style={styles.recordingIndicator} />
            <Text style={styles.text}>Gravando {formatTime(seconds)}</Text>
            <Stop size={20} color="#fff" weight="fill" />
          </Pressable>
        </View>
      )}

      {isProcessing && (
        <View style={{ height: 100, justifyContent: "center", alignItems: "center", marginTop: 12, backgroundColor: theme.card, borderRadius: 12, borderWidth: 1, borderColor: theme.border }}>
          <ActivityIndicator size={24} color={theme.primary} />
          <Text style={{ color: theme.mutedForeground, marginTop: 12, fontSize: 13, fontWeight: "600" }}>Processando áudio...</Text>
        </View>
      )}

      {audioUri && !isRecording && !isProcessing && (
        <>
          <View style={styles.row}>
            <Pressable
              style={[styles.small, { backgroundColor: theme.primary, flex: 2 }]}
              onPress={handlePlayPause}
            >
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
                { backgroundColor: loopActive ? theme.primary + "20" : theme.input, flex: 1, borderWidth: 1, borderColor: loopActive ? theme.primary : "transparent" },
              ]}
              onPress={() => {
                const toggled = !loopActive;
                setLoopActive(toggled);
                isLoopingShared.value = toggled;
                triggerHaptic("light");
              }}
            >
              <Repeat size={16} color={loopActive ? theme.primary : theme.foreground} weight={loopActive ? "bold" : "regular"} />
              <Text style={[styles.smallText, { color: loopActive ? theme.primary : theme.foreground }]}>Loop</Text>
            </Pressable>
          </View>

          {duration > 0 && (
            <Slider
              style={{ width: "100%", marginTop: 10 }}
              minimumValue={0}
              maximumValue={duration}
              value={sliderValue}
              minimumTrackTintColor={theme.primary}
              maximumTrackTintColor="#ccc"
              thumbTintColor={theme.primary}
              onSlidingStart={() => { isDraggingRef.current = true; }}
              onValueChange={(val) => { setSliderValue(val); }}
              onSlidingComplete={(value) => {
                isDraggingRef.current = false;
                audioPlayer.seekTo(value / 1000);
                playbackPositionMs.value = value;
              }}
            />
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
                onSeek={(ms) => {
                  audioPlayer.seekTo(ms / 1000);
                  playbackPositionMs.value = ms;
                }}
              />
            </View>
          )}

          <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 16, alignItems: "center" }}>
            <Pressable onPress={startRecording} style={{ padding: 8, flexDirection: "row", alignItems: "center", gap: 6 }}>
              <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: "#dc2626" }} />
              <Text style={{ color: theme.foreground, fontWeight: "600", fontSize: 13 }}>Regravar</Text>
            </Pressable>

            <Pressable
              onPress={handleDelete}
              style={({ pressed }) => [
                { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
                pressed && { backgroundColor: theme.destructive + "20" },
              ]}
            >
              {({ pressed }) => (
                <Text style={{ color: pressed ? theme.destructive : theme.mutedForeground, fontWeight: "600", fontSize: 13 }}>
                  Apagar gravação
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
  container: {
    marginTop: 12,
    gap: 8,
    position: "relative",
  },
  errorContainer: {
    marginTop: 12,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  countdownOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.7)",
    zIndex: 50,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
  },
  countdownText: {
    fontSize: 72,
    fontWeight: "bold",
    color: "#fff",
  },
  button: {
    flexDirection: "row",
    gap: 8,
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  recording: {
    backgroundColor: "#dc2626",
  },
  recordingIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#fff",
  },
  text: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
  },
  row: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
  },
  small: {
    flex: 1,
    flexDirection: "row",
    gap: 6,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  smallText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 13,
  },
  primaryRecordButton: {
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#333",
    paddingVertical: 16,
  },
  recordText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
});
