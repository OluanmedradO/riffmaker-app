import { Screen } from "@/src/shared/ui/Screen";
import { ScreenHeader } from "@/src/shared/ui/ScreenHeader";
import { useTheme } from "@/src/shared/theme/ThemeProvider";
import { LoadingSpinner } from "@/src/shared/ui/LoadingSpinner";
import { useHaptic } from "@/src/shared/hooks/useHaptic";
import { useProGate } from '@/src/shared/hooks/useProGate';
import { useTranslation } from "@/src/i18n";
import { getRiffs } from "@/src/data/storage/riffs";
import { Riff } from "@/src/domain/types/riff";
import { PreviewPlayerManager } from "@/src/utils/AudioManager";
import { calculateCompatibility } from "@/src/domain/services/compatibility";
import { formatTime } from "@/src/utils/formatters";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { ArrowsLeftRight, CheckCircle, Crown, CrownIcon, Info, Pause, PauseIcon, Play, PlayIcon, Plus, PlusIcon, X } from "phosphor-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

const TYPE_COLORS: Record<string, string> = {
  Guitar: "#3b82f6",
  Beat: "#ef4444",
  Vocal: "#eab308",
  Melody: "#a855f7",
  Bass: "#22c55e",
  Other: "#a1a1aa",
};

export default function Compare() {
  const theme = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const { ids } = useLocalSearchParams<{ ids?: string }>();
  
  const [riffs, setRiffs] = useState<Riff[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [riffA, setRiffA] = useState<Riff | null>(null);
  const [riffB, setRiffB] = useState<Riff | null>(null);

  const [pickingFor, setPickingFor] = useState<"A" | "B" | null>(null);
  const [abMode, setAbMode] = useState(false);
  const abAnim = useRef(new Animated.Value(0)).current;
  const { triggerHaptic } = useHaptic();
  const requirePro = useProGate();

  const [countIn, setCountIn] = useState<number | null>(null);
  const countScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(abAnim, {
      toValue: abMode ? 1 : 0,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [abMode, abAnim]);

  // Load riffs
  const fetchRiffs = useCallback(async () => {
    try {
      const data = await getRiffs();
      setRiffs(data.filter(r => r.audioUri && r.duration > 0)); 
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      PreviewPlayerManager.stop();
      fetchRiffs();
    }, [fetchRiffs])
  );

  useEffect(() => {
    if (ids && riffs.length > 0) {
      const parts = ids.split(",");
      if (parts.length >= 1) {
        const foundA = riffs.find(r => r.id === parts[0]);
        if (foundA) setRiffA(foundA);
      }
      if (parts.length >= 2) {
        const foundB = riffs.find(r => r.id === parts[1]);
        if (foundB) setRiffB(foundB);
      }
    }
  }, [ids, riffs]);

  // Audio players
  const playerA = useAudioPlayer(riffA?.audioUri ?? null, { updateInterval: 100 });
  const statusA = useAudioPlayerStatus(playerA);
  
  const playerB = useAudioPlayer(riffB?.audioUri ?? null, { updateInterval: 100 });
  const statusB = useAudioPlayerStatus(playerB);

// Sync Start with Count-In
async function handleSyncStart() {
  triggerHaptic("medium");
  setAbMode(false);
  playerA.pause();
  playerB.pause();
  await playerA.seekTo(0);
  await playerB.seekTo(0);
  
  let count = 4;
  setCountIn(count);
  
  // Initial animation
  countScale.setValue(0.5);
  Animated.spring(countScale, { toValue: 1, friction: 5, useNativeDriver: true }).start();

  const interval = setInterval(() => {
    count--;
    if (count > 0) {
       setCountIn(count);
       triggerHaptic("light");
       countScale.setValue(0.5);
       Animated.spring(countScale, { toValue: 1, friction: 5, useNativeDriver: true }).start();
    } else {
       clearInterval(interval);
       setCountIn(null);
       playerA.play();
       playerB.play();
       triggerHaptic("success");
    }
  }, 600); // about 100 BPM count-in
}
  function handlePlayA() {
    triggerHaptic("light");
    if (abMode) {
      if (!statusA.playing) {
        playerB.pause();
        playerA.seekTo(playerB.currentTime);
        playerA.play();
      } else {
        playerA.pause();
      }
    } else {
      if (statusA.playing) playerA.pause();
      else playerA.play();
    }
  }

  function handlePlayB() {
    triggerHaptic("light");
    if (abMode) {
      if (!statusB.playing) {
        playerA.pause();
        playerB.seekTo(playerA.currentTime);
        playerB.play();
      } else {
        playerB.pause();
      }
    } else {
      if (statusB.playing) playerB.pause();
      else playerB.play();
    }
  }

  // Calculate compatibility
  const compatibility = useMemo(() => calculateCompatibility(riffA, riffB), [riffA, riffB]);

  const colorA = riffA?.type ? (TYPE_COLORS[riffA.type] || theme.primary) : theme.primary;
  const colorB = riffB?.type ? (TYPE_COLORS[riffB.type] || theme.secondary) : theme.secondary;
  const normalizeWaveform = (lvl: number) => {
    if (lvl <= 0) return Math.min(1, Math.max(0, (lvl + 160) / 160));
    return Math.min(1, lvl);
  };
  if (loading) {
    return (
      <Screen background={theme.background}>
        <LoadingSpinner message={t("compare.loading")} />
      </Screen>
    );
  }

  return (
    <Screen background={theme.background}>
      <ScreenHeader 
        title={t("compare.title")} 
        subtitle="Selecione duas idéias para compará-las lado a lado." 
        style={{ paddingHorizontal: 0 }} 
        onBack={() => router.back()}
      />

      {/* PRO Banner */}
      <Pressable
        onPress={() => requirePro("compareRiffs")}
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: theme.proPurple + "15",
          padding: 14,
          borderRadius: 14,
          marginBottom: 16,
          gap: 10,
        }}
      >
        <CrownIcon size={20} color={theme.proPurple} weight="fill" />
        <Text style={{ color: theme.foreground, fontSize: 14, flex: 1, fontWeight: "600" }}>
          Recurso PRO — Compare e combine riffs
        </Text>
        <Text style={{ color: theme.proPurple, fontSize: 13, fontWeight: "bold" }}>Ver PRO</Text>
      </Pressable>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        <View style={styles.compareContainer}>
        {/* SLOT A */}
        <Pressable 
          style={[styles.slot, { 
            backgroundColor: theme.card, 
            borderColor: riffA ? (colorA + "60") : theme.border, 
            borderWidth: riffA ? 1 : 1,
            shadowColor: riffA ? colorA : "#000",
            shadowOpacity: riffA ? 0.2 : 0.1,
            shadowRadius: riffA ? 16 : 10,
          }]}
          onPress={() => { if (requirePro("compareRiffs")) return; setPickingFor("A"); }}
        >
          {riffA ? (
            <View style={styles.slotContent}>
              <View style={styles.slotHeader}>
                <Text style={{ fontSize: 10, color: colorA, fontWeight: '900', letterSpacing: 1 }}>IDEIA A</Text>
                <Pressable onPress={() => setRiffA(null)} hitSlop={10} style={{ padding: 4, backgroundColor: theme.muted, borderRadius: 12 }}>
                  <X size={12} color={theme.foreground} weight="bold" />
                </Pressable>
              </View>
              <Text style={[styles.riffName, { color: theme.foreground }]} numberOfLines={1}>{riffA.name}</Text>
              {riffA.bpm && <Text style={[styles.metaText, { color: theme.mutedForeground }]}>{riffA.bpm} BPM</Text>}
              {(riffA.key || riffA.detectedKey) && <Text style={[styles.metaText, { color: theme.mutedForeground }]}>Tom {riffA.key || riffA.detectedKey}</Text>}
              {riffA.type && <Text style={[styles.metaText, { color: colorA }]}>{riffA.type}</Text>}

            {statusA.duration > 0 && (
  <View style={{ height: 3, backgroundColor: colorA + "30", borderRadius: 2, marginTop: 8 }}>
    <View style={{ 
      width: `${(statusA.currentTime / statusA.duration) * 100}%`, 
      height: 3, 
      backgroundColor: colorA, 
      borderRadius: 2 
    }} />
  </View>
)}

{/* Mini waveform */}
{(riffA.waveform?.length ?? 0) > 0 && (
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, height: 24, marginTop: 4, opacity: 0.7, overflow: 'hidden' }}>
    {riffA.waveform!.slice(0, 24).map((lvl, i) => (
      <View key={i} style={{ width: 3, height: Math.max(2, normalizeWaveform(lvl) * 24), backgroundColor: colorA, borderRadius: 2 }} />
    ))}
  </View>
)}  

              <View style={{ flex: 1 }} />
              
              <Pressable 
                onPress={handlePlayA}
                style={[styles.playButton, { backgroundColor: statusA.playing ? colorA : theme.input }]}
              >
                {statusA.playing ? <PauseIcon size={16} color="#fff" weight="fill" /> : <PlayIcon size={16} color={theme.foreground} weight="fill" />}
                <Text style={[styles.playText, { color: statusA.playing ? "#fff" : theme.foreground }]}>
                  {statusA.playing ? "Pausar" : "Tocar"}
                </Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.emptySlot}>
              <View style={[styles.addIconCircle, { backgroundColor: theme.primary + "15" }]}>
                <Plus size={24} color={theme.primary} weight="regular" />
              </View>
              <Text style={{ color: theme.mutedForeground, marginTop: 12, fontWeight: "600", fontSize: 13 }}>Selecionar A</Text>
            </View>
          )}
        </Pressable>

        <View style={styles.separator}>
          <Text style={{ color: theme.mutedForeground, fontWeight: 'bold' }}>VS</Text>
        </View>

        {/* SLOT B */}
        <Pressable 
          style={[styles.slot, { 
            backgroundColor: theme.card, 
            borderColor: riffB ? (colorB + "60") : theme.border, 
            borderWidth: riffB ? 1 : 1,
            shadowColor: riffB ? colorB : "#000",
            shadowOpacity: riffB ? 0.2 : 0.1,
            shadowRadius: riffB ? 16 : 10,
          }]}
          onPress={() => { if (requirePro("compareRiffs")) return; setPickingFor("B"); }}
        >
          {riffB ? (
            <View style={styles.slotContent}>
              <View style={styles.slotHeader}>
                <Text style={{ fontSize: 10, color: colorB, fontWeight: '900', letterSpacing: 1 }}>IDEIA B</Text>
                <Pressable onPress={() => { setRiffB(null); }} hitSlop={10} style={{ padding: 4, backgroundColor: theme.muted, borderRadius: 12 }}>
                  <X size={12} color={theme.foreground} weight="bold" />
                </Pressable>  
              </View>
              <Text style={[styles.riffName, { color: theme.foreground }]} numberOfLines={1}>{riffB.name}</Text>
              {riffB.bpm && <Text style={[styles.metaText, { color: theme.mutedForeground }]}>{riffB.bpm} BPM</Text>}
              {(riffB.key || riffB.detectedKey) && <Text style={[styles.metaText, { color: theme.mutedForeground }]}>Tom {riffB.key || riffB.detectedKey}</Text>}
              {riffB.type && <Text style={[styles.metaText, { color: colorB }]}>{riffB.type}</Text>}

              {/* Mini waveform for slot B */}
              {(riffB.waveform?.length ?? 0) > 0 && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, height: 24, marginTop: 8, opacity: 0.7, overflow: 'hidden' }}>
                  {riffB.waveform!.slice(0, 24).map((lvl, i) => (
                    <View key={i} style={{ width: 3, height: Math.max(2, normalizeWaveform(lvl) * 24), backgroundColor: colorB, borderRadius: 2 }} />
                  ))}
                </View>
              )}
              
              <View style={{ flex: 1 }} />
              
              <Pressable 
                onPress={handlePlayB}
                style={[styles.playButton, { backgroundColor: statusB.playing ? colorB : theme.input }]}
              >
                {statusB.playing ? <Pause size={16} color="#fff" weight="fill" /> : <Play size={16} color={theme.foreground} weight="fill" />}
                <Text style={[styles.playText, { color: statusB.playing ? "#fff" : theme.foreground }]}>
                  {statusB.playing ? "Pausar" : "Tocar"}
                </Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.emptySlot}>
              <View style={[styles.addIconCircle, { backgroundColor: theme.secondary + "15" }]}>
                <PlusIcon size={24} color={theme.secondary} weight="regular" />
              </View>
              <Text style={{ color: theme.mutedForeground, marginTop: 12, fontWeight: "600", fontSize: 13 }}>Selecionar B</Text>
            </View>
          )}
        </Pressable>
        </View>

        {/* CONTROLS */}
        {riffA && riffB && (
          <View style={styles.controlsRow}>
            <Pressable 
              style={[styles.controlButton, { backgroundColor: theme.primary, flex: 1 }]}
              onPress={handleSyncStart}
            >
              <Play size={14} color={theme.primaryForeground} weight="fill" />
              <Text style={{ color: theme.primaryForeground, fontWeight: 'bold', marginLeft: 8 }}>Sync Start (Ambos)</Text>
            </Pressable>
            
            <Pressable 
              onPress={() => { triggerHaptic("light"); setAbMode(!abMode); }}
              style={{ flex: 1 }}
            >
              <Animated.View style={[
                  styles.controlButton, 
                  { 
                    flex: 1, 
                    borderWidth: 1, 
                    backgroundColor: abAnim.interpolate({ inputRange: [0, 1], outputRange: [theme.input, theme.accent] }),
                    borderColor: abAnim.interpolate({ inputRange: [0, 1], outputRange: [theme.border, theme.accent] }),
                  }
                ]}
              >
                <ArrowsLeftRight size={14} color={abMode ? "#fff" : theme.foreground} weight="bold" />
                <Text style={{ color: abMode ? "#fff" : theme.foreground, fontWeight: 'bold', marginLeft: 8 }}>
                  Modo A/B {abMode ? "ON" : "OFF"}
                </Text>
              </Animated.View>
            </Pressable>
          </View>
        )}

        {/* COMPATIBILITY INDICATOR */}
        {riffA && riffB && (
          <View style={[styles.compatibilityBanner, { backgroundColor: theme.card, borderWidth: 1, borderColor: compatibility.chipColor + "50", flexDirection: "column", alignItems: "stretch", gap: 12, overflow: "hidden" }]}>
            
            {/* Soft Glow Background using Absolute View */}
            <View style={{ position: "absolute", left: -50, top: -50, width: 200, height: 200, backgroundColor: compatibility.chipColor, opacity: 0.1, borderRadius: 100, transform: [{ scale: 2 }] }} />

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, zIndex: 2 }}>
              {compatibility.score >= 80 ? (
                <CheckCircle size={20} color={compatibility.chipColor} weight="fill" />
              ) : (
                <Info size={20} color={compatibility.chipColor} weight="fill" />
              )}
              <Text style={{ color: compatibility.chipColor, fontWeight: '900', fontSize: 16 }}>
                {compatibility.score}% {compatibility.chipLabel}
              </Text>
            </View>

            {/* Dynamic Visual Bar */}
            <View style={{ height: 8, backgroundColor: theme.input, borderRadius: 4, overflow: 'hidden', zIndex: 2 }}>
              <View style={{ height: '100%', width: `${compatibility.score}%`, backgroundColor: compatibility.chipColor, borderRadius: 4, shadowColor: compatibility.chipColor, shadowOpacity: 0.8, shadowRadius: 8, elevation: 4 }} />
            </View>

            <View style={{ flexDirection: "row", justifyContent: "space-between", backgroundColor: theme.input, padding: 12, borderRadius: 12, zIndex: 2 }}>
              <View style={{ alignItems: "center", flex: 1 }}>
                <Text style={{ fontSize: 10, color: theme.mutedForeground, fontWeight: "800", textTransform: "uppercase", marginBottom: 4 }}>BPM</Text>
                <Text style={{ color: theme.foreground, fontSize: 14, fontWeight: "bold" }}>{compatibility.bpmLabel}</Text>
              </View>
              <View style={{ width: 1, backgroundColor: theme.border }} />
              <View style={{ alignItems: "center", flex: 1 }}>
                <Text style={{ fontSize: 10, color: theme.mutedForeground, fontWeight: "800", textTransform: "uppercase", marginBottom: 4 }}>TOM</Text>
                <Text style={{ color: theme.foreground, fontSize: 14, fontWeight: "bold" }}>{compatibility.keyLabel}</Text>
              </View>
            </View>
          </View>
        )}

        {/* COMBINE PRO BUTTON */}
        {riffA && riffB && (
          <Pressable 
            style={{ 
              backgroundColor: theme.proPurple, 
              paddingVertical: 14, 
              borderRadius: 12, 
              alignItems: 'center', 
              marginTop: 12,
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 8,
              shadowColor: theme.proPurple,
              shadowOpacity: 0.4,
              shadowRadius: 12,
              shadowOffset: { width: 0, height: 4 },
              elevation: 6,
            }}
            onPress={() => {
              if (requirePro("autoCombine", "Combine duas idéias e gere uma versão pronta em 1 toque.")) return;
              // TODO: V1 Combine Logic (Normalizar volume, Crossfade 300ms, A 2x, B 2x)
              console.log("Combinando riffs...", riffA.name, riffB.name);
            }}
          >
            <Crown size={18} color="#fff" weight="fill" />
            <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 16 }}>Combinar Automaticamente</Text>
          </Pressable>
        )}

        <Text style={[styles.subtitle, { color: theme.foreground, fontWeight: "bold", marginTop: 32, marginBottom: 12 }]}>
          Recentes
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingRight: 20 }}>
          {riffs.slice(0, 10).map(item => (
            <Pressable 
              key={item.id}
              style={[styles.recentCard, { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }]}
              onPress={() => {
                if (!riffA) setRiffA(item);
                else if (!riffB) setRiffB(item);
                else setRiffB(item); 
                triggerHaptic("light");
              }}
            >
              <Text style={{ color: theme.foreground, fontWeight: 'bold', marginBottom: 4 }} numberOfLines={1}>{item.name}</Text>
               <Text style={{ color: theme.mutedForeground, fontSize: 12 }}>{formatTime(Math.floor((item.duration || 0) / 1000))}</Text>
               {item.type && (
                 <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                   <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: TYPE_COLORS[item.type] ?? theme.mutedForeground }} />
                   <Text style={{ color: TYPE_COLORS[item.type] ?? theme.mutedForeground, fontSize: 11, fontWeight: '600' }}>{item.type}</Text>
                 </View>
               )}
            </Pressable>
          ))}
        </ScrollView>
      </ScrollView>

      {/* PICKER MODAL */}
      <Modal visible={pickingFor !== null} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setPickingFor(null)}>
          <Pressable style={[styles.modalContent, { backgroundColor: theme.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.foreground }]}>
                Selecionar Ideia {pickingFor}
              </Text>
              <Pressable onPress={() => setPickingFor(null)} hitSlop={10}>
                <X size={24} color={theme.mutedForeground} weight="bold" />
              </Pressable>
            </View>
            <FlatList 
              data={riffs}
              keyExtractor={item => item.id}
              contentContainerStyle={{ gap: 8 }}
              initialNumToRender={8}
              maxToRenderPerBatch={6}
              windowSize={5}
              removeClippedSubviews={true}
              renderItem={({ item }) => (
                <Pressable
                  style={[styles.pickerItem, { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }]}
                  onPress={() => {
                    if (pickingFor === "A") setRiffA(item);
                    else setRiffB(item);
                    setPickingFor(null);
                  }}
                >
                  <Text style={{ color: theme.foreground, fontWeight: 'bold' }}>{item.name}</Text>
                  <Text style={{ color: theme.mutedForeground, fontSize: 12 }}>
                    Dur: {formatTime(Math.floor((item.duration || 0) / 1000))} | {item.bpm ? `${item.bpm} BPM` : 'BPM ?'}
                  </Text>
                </Pressable>
              )}
            />
          </Pressable>
        </Pressable>
      </Modal>

      {/* COUNT-IN OVERLAY */}
      {countIn !== null && (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center", zIndex: 999 }]}>
          <Animated.Text style={{ 
            fontSize: 120, 
            fontWeight: "900", 
            color: theme.primary,
            transform: [{ scale: countScale }]
          }}>
            {countIn}
          </Animated.Text>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 20,
  },
  compareContainer: {
    flexDirection: 'row',
    height: 240,
    gap: 8,
  },
  slot: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  slotContent: {
    flex: 1,
    padding: 16,
  },
  slotHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  emptySlot: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  riffName: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 8,
  },
  metaText: {
    fontSize: 12,
    fontWeight: "500",
    marginBottom: 2,
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  playText: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  separator: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  compatibilityBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginTop: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: "70%",
    padding: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  pickerItem: {
    padding: 16,
    borderRadius: 12,
  },
  controlsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  controlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 12,
  },
  recentCard: {
    width: 140,
    padding: 12,
    borderRadius: 12,
  }
});


