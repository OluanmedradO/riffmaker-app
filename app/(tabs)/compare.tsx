import { Screen } from "@/components/Screen";
import { useTheme } from "@/components/ThemeProvider";
import { LoadingSpinner } from "@/src/components/LoadingSpinner";
import { useHaptic } from "@/src/hooks/useHaptic";
import { useProGate } from "@/src/hooks/useProGate";
import { getRiffs } from "@/src/storage/riffs";
import { Riff } from "@/src/types/riff";
import { formatTime } from "@/src/utils/formatters";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { useFocusEffect } from "expo-router";
import { ArrowsLeftRight, CheckCircle, Crown, Info, Pause, Play, Plus, X } from "phosphor-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
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
  
  const [riffs, setRiffs] = useState<Riff[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [riffA, setRiffA] = useState<Riff | null>(null);
  const [riffB, setRiffB] = useState<Riff | null>(null);

  const [pickingFor, setPickingFor] = useState<"A" | "B" | null>(null);
  const [abMode, setAbMode] = useState(false);
  const abAnim = useRef(new Animated.Value(0)).current;
  const { triggerHaptic } = useHaptic();
  const requirePro = useProGate();

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
      fetchRiffs();
    }, [fetchRiffs])
  );

  // Audio players
  const playerA = useAudioPlayer(riffA?.audioUri ?? null, { updateInterval: 100 });
  const statusA = useAudioPlayerStatus(playerA);
  
  const playerB = useAudioPlayer(riffB?.audioUri ?? null, { updateInterval: 100 });
  const statusB = useAudioPlayerStatus(playerB);

  // Sync Start
  async function handleSyncStart() {
    triggerHaptic("medium");
    setAbMode(false);
    playerA.pause();
    playerB.pause();
    playerA.seekTo(0);
    playerB.seekTo(0);
    playerA.play();
    playerB.play();
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

  // Calculate BPM compatibility (diff <= 5)
  const isBpmCompatible = Boolean(
    riffA?.bpm && riffB?.bpm && Math.abs(riffA.bpm - riffB.bpm) <= 5
  );

  const colorA = riffA?.type ? (TYPE_COLORS[riffA.type] || theme.primary) : theme.primary;
  const colorB = riffB?.type ? (TYPE_COLORS[riffB.type] || theme.secondary) : theme.secondary;

  if (loading) {
    return (
      <Screen background={theme.background}>
        <LoadingSpinner message="Carregando riffs..." />
      </Screen>
    );
  }

  return (
    <Screen background={theme.background}>
      <Text style={[styles.title, { color: theme.primary, marginTop: 16 }]}>Comparar Ideias</Text>
      <Text style={[styles.subtitle, { color: theme.mutedForeground }]}>
        Selecione duas ideias para compará-las lado a lado.
      </Text>

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
        <Crown size={20} color={theme.proPurple} weight="fill" />
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
          onPress={() => { if (!requirePro("compareRiffs")) setPickingFor("A"); }}
        >
          {riffA ? (
            <View style={styles.slotContent}>
              <View style={styles.slotHeader}>
                <Text style={{ fontSize: 10, color: colorA, fontWeight: '900', letterSpacing: 1 }}>IDEIA A</Text>
                <Pressable onPress={() => { setRiffA(null); playerA.remove(); }} hitSlop={10} style={{ padding: 4, backgroundColor: theme.muted, borderRadius: 12 }}>
                  <X size={12} color={theme.foreground} weight="bold" />
                </Pressable>
              </View>
              <Text style={[styles.riffName, { color: theme.foreground }]} numberOfLines={1}>{riffA.name}</Text>
              {riffA.bpm && <Text style={[styles.metaText, { color: theme.mutedForeground }]}>{riffA.bpm} BPM</Text>}
              {riffA.type && <Text style={[styles.metaText, { color: colorA }]}>{riffA.type}</Text>}

              {/* Mini waveform for slot A */}
              {(riffA.waveform?.length ?? 0) > 0 && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, height: 24, marginTop: 8, opacity: 0.7, overflow: 'hidden' }}>
                  {riffA.waveform!.slice(0, 24).map((lvl, i) => (
                    <View key={i} style={{ width: 3, height: Math.max(2, (lvl < 0 ? (lvl + 160) / 160 : lvl) * 24), backgroundColor: colorA, borderRadius: 2 }} />
                  ))}
                </View>
              )}

              <View style={{ flex: 1 }} />
              
              <Pressable 
                onPress={handlePlayA}
                style={[styles.playButton, { backgroundColor: statusA.playing ? colorA : theme.input }]}
              >
                {statusA.playing ? <Pause size={16} color="#fff" weight="fill" /> : <Play size={16} color={theme.foreground} weight="fill" />}
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
          onPress={() => { if (!requirePro("compareRiffs")) setPickingFor("B"); }}
        >
          {riffB ? (
            <View style={styles.slotContent}>
              <View style={styles.slotHeader}>
                <Text style={{ fontSize: 10, color: colorB, fontWeight: '900', letterSpacing: 1 }}>IDEIA B</Text>
                <Pressable onPress={() => { setRiffB(null); playerB.remove(); }} hitSlop={10} style={{ padding: 4, backgroundColor: theme.muted, borderRadius: 12 }}>
                  <X size={12} color={theme.foreground} weight="bold" />
                </Pressable>
              </View>
              <Text style={[styles.riffName, { color: theme.foreground }]} numberOfLines={1}>{riffB.name}</Text>
              {riffB.bpm && <Text style={[styles.metaText, { color: theme.mutedForeground }]}>{riffB.bpm} BPM</Text>}
              {riffB.type && <Text style={[styles.metaText, { color: colorB }]}>{riffB.type}</Text>}

              {/* Mini waveform for slot B */}
              {(riffB.waveform?.length ?? 0) > 0 && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, height: 24, marginTop: 8, opacity: 0.7, overflow: 'hidden' }}>
                  {riffB.waveform!.slice(0, 24).map((lvl, i) => (
                    <View key={i} style={{ width: 3, height: Math.max(2, (lvl < 0 ? (lvl + 160) / 160 : lvl) * 24), backgroundColor: colorB, borderRadius: 2 }} />
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
                <Plus size={24} color={theme.secondary} weight="regular" />
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
          <View style={[styles.compatibilityBanner, { backgroundColor: isBpmCompatible ? theme.primary + "20" : theme.input }]}>
            {isBpmCompatible ? (
              <>
                <CheckCircle size={20} color={theme.primary} weight="fill" />
                <Text style={{ color: theme.primary, fontWeight: 'bold', marginLeft: 8 }}>BPMs compatíveis!</Text>
              </>
            ) : (
               <>
                <Info size={20} color={theme.mutedForeground} weight="fill" />
                <Text style={{ color: theme.mutedForeground, marginLeft: 8 }}>BPMs muito diferentes.</Text>
              </>
            )}
          </View>
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
