import { IdeaForm } from "@/components/IdeaForm";
import { MusicalCompatibility } from "@/components/MusicalCompatibility";
import { RiffRecorder } from "@/components/recorder/RiffRecorder";
import { Screen } from "@/components/Screen";
import { StructureTimeline } from "@/components/StructureTimeline";
import { useTheme } from "@/components/ThemeProvider";
import { LoadingSpinner } from "@/src/components/LoadingSpinner";
import { SaveStatusIndicator } from "@/src/components/SaveStatusIndicator";
import { APP_CONFIG } from "@/src/constants/app";
import { useHaptic } from "@/src/hooks/useHaptic";
import { useProGate } from "@/src/hooks/useProGate";
import { useTranslation } from "@/src/i18n";
import { getProjects } from "@/src/storage/projects";
import { duplicateAsNewVersion, duplicateIdea, getRiffs, updateRiff } from "@/src/storage/riffs";
import { Project } from "@/src/types/project";
import { Riff } from "@/src/types/riff";
import { exportRiffStructure } from "@/src/utils/exportUtils";
import { formatDate } from "@/src/utils/formatters";
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import { CaretDown, CaretLeft, Check, Copy, Export, NotePencil, Plus, ShareNetwork, X } from "phosphor-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import {
    Alert,
    Animated,
    BackHandler,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    View
} from "react-native";

function getDefaultRiffName(t: any): string {
  const now = new Date();
  const day = now.getDate().toString().padStart(2, "0");
  const month = (now.getMonth() + 1).toString().padStart(2, "0");
  const hours = now.getHours().toString().padStart(2, "0");
  const mins = now.getMinutes().toString().padStart(2, "0");
  const dateStr = `${day}/${month} ${hours}:${mins}`;
  return t("idea.default_name", { date: dateStr });
}

export default function EditRiff() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useTheme();
  const { t } = useTranslation();
  const { triggerHaptic } = useHaptic();
  const requirePro = useProGate();

  const [form, setForm] = useState<Riff | null>(null);
  const [saving, setSaving] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [loading, setLoading] = useState(true);
  const saveOpacity = useRef(new Animated.Value(0)).current;
  const saveScale = useRef(new Animated.Value(0.9)).current;
  const [projects, setProjects] = useState<Project[]>([]);
  const [allRiffs, setAllRiffs] = useState<Riff[]>([]);
  const [showVersionsModal, setShowVersionsModal] = useState(false);
  const [snapToBPM, setSnapToBPM] = useState(false);
  const [versions, setVersions] = useState<Riff[]>([]);
  const [loopRangeActive, setLoopRangeActive] = useState(false);

  const recorderRef = useRef<any>(null);
  const isFirstLoad = useRef(true);
  const isMounted = useRef(true);
  const formRef = useRef<Riff | null>(null); // always holds latest form for stable save
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    async function loadRiff() {
      try {
        const riffs = await getRiffs();
        const found = riffs.find((r) => r.id === id);
        if (found && isMounted.current) {
          setForm(found);
        } else if (!found) {
          Alert.alert(t("idea.error"), t("idea.not_found"));
        }
        const allProjects = await getProjects();
        if (isMounted.current) {
          setProjects(allProjects);
          setAllRiffs(riffs);
        }

      } catch (error) {
        Alert.alert(t("idea.error"), t("idea.load_failed"));
      } finally {
        if (isMounted.current) setLoading(false);
      }
    }

    loadRiff();
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      // Refresh projects when returning to screen
      getProjects().then(setProjects).catch(console.error);
    }, [])
  );

  useEffect(() => {
    async function loadVersions() {
      if (!form?.versionGroupId) return;
      const allRiffs = await getRiffs();
      const groupVersions = allRiffs.filter(r => r.versionGroupId === form.versionGroupId).sort((a,b) => (a.versionNumber || 1) - (b.versionNumber || 1));
      setVersions(groupVersions);
    }
    loadVersions();
  }, [form?.versionGroupId]);

  // Keep formRef in sync with state for stable save closure
  useEffect(() => { formRef.current = form; }, [form]);

  const triggerSave = useCallback(async () => {
    const current = formRef.current;
    if (!current || !isMounted.current) return;
    setSaving("saving");
    Animated.parallel([
      Animated.timing(saveOpacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.timing(saveScale,   { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start();
    try {
      await updateRiff(current.id, { ...current, updatedAt: Date.now() });
      if (isMounted.current) {
        setSaving("saved");
        setTimeout(() => {
          if (isMounted.current) {
            Animated.parallel([
              Animated.timing(saveOpacity, { toValue: 0, duration: 220, useNativeDriver: true }),
              Animated.timing(saveScale,   { toValue: 0.9, duration: 220, useNativeDriver: true }),
            ]).start(() => { if (isMounted.current) setSaving("idle"); });
          }
        }, 2000);
      }
    } catch (err) {
      console.error("Erro ao salvar ideia", err);
      if (isMounted.current) setSaving("error");
    }
  }, [saveOpacity, saveScale]);

  const scheduleSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(triggerSave, APP_CONFIG.AUTOSAVE_DEBOUNCE_MS);
  }, [triggerSave]);

  useEffect(() => {
    if (!form) return;
    if (isFirstLoad.current) {
      isFirstLoad.current = false;
      return;
    }
    scheduleSave();
  // Only fire when form changes – scheduleSave is stable
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form]);

  // Prevent accidental back navigation if actively recording
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (recorderRef.current?.isRecording()) {
          Alert.alert(
            t("idea.discard_title"),
            t("idea.discard_recording"),
            [
              { text: t("cancel"), style: "cancel" },
              { text: t("idea.discard_action"), style: "destructive", onPress: () => { router.back(); } }
            ]
          );
          return true; // prevent default behavior
        }
        return false;
      };

      const subscription = BackHandler.addEventListener("hardwareBackPress", onBackPress);
      return () => subscription.remove();
    }, [])
  );

  async function handleShare() {
    if (!form?.audioUri) {
      Alert.alert(t("idea.warning"), t("idea.no_audio_share"));
      return;
    }

    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert(t("idea.error"), t("idea.share_unavailable"));
        return;
      }
      
      await Sharing.shareAsync(form.audioUri, {
        dialogTitle: `${t("idea.share_title")} ${form.name}`,
        mimeType: "audio/mp4",
      });
    } catch (error) {
      console.error(error);
      Alert.alert(t("idea.error"), t("idea.share_failed"));
    }
  }

  async function handleDuplicate() {
    Alert.alert(t("idea.duplicate_title"), t("idea.duplicate_desc"), [
      { text: t("cancel"), style: "cancel" },
      {
        text: t("idea.new_version"),
        onPress: async () => {
          try {
            setLoading(true);
            const duplicated = await duplicateAsNewVersion(id);
            if (duplicated) {
              triggerHaptic("success");
              router.replace(`/riff/${duplicated.id}`);
            } else {
              Alert.alert(t("idea.error"), t("idea.version_failed"));
              setLoading(false);
            }
          } catch (e) {
            console.error(e);
            Alert.alert(t("idea.error"), t("idea.version_error"));
            setLoading(false);
          }
        }
      },
      {
        text: t("idea.independent_copy"),
        onPress: async () => {
          try {
            setLoading(true);
            const duplicated = await duplicateIdea(id);
            if (duplicated) {
              triggerHaptic("success");
              router.replace(`/riff/${duplicated.id}`);
            } else {
              Alert.alert(t("idea.error"), t("idea.duplicate_failed"));
              setLoading(false);
            }
          } catch (e) {
            console.error(e);
            Alert.alert(t("idea.error"), t("idea.duplicate_error"));
            setLoading(false);
          }
        }
      }
    ]);
  }

  function handleAddMarker() {
    if (!recorderRef.current || !form) return;
    let ms = recorderRef.current.getCurrentPosition();
    
    if (snapToBPM && form.bpm) {
      const beatMs = 60000 / form.bpm;
      const snapInterval = beatMs / 2; // 1/8 note quantization (half a beat)
      ms = Math.round(ms / snapInterval) * snapInterval;
    }
    
    // Minimal debounce/spam protection
    const existsNear = form.markers?.some(m => Math.abs(m.timestampMs - ms) < 500);
    if (existsNear) {
      triggerHaptic("error");
      return;
    }

    const newMarker = {
      id: Math.random().toString(36).substring(7),
      label: `${t("idea.marker_prefix")} ${(form.markers?.length || 0) + 1}`,
      timestampMs: ms,
    };

    setForm(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        markers: [...(prev.markers || []), newMarker].sort((a,b) => a.timestampMs - b.timestampMs),
      };
    });
    triggerHaptic("success");
  }

  function handleDeleteMarker(id: string) {
    setForm(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        markers: (prev.markers || []).filter(m => m.id !== id),
      };
    });
    triggerHaptic("light");
  }

  function handleUpdateMarker(id: string, newLabel: string) {
    setForm(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        markers: (prev.markers || []).map(m => m.id === id ? { ...m, label: newLabel } : m),
      };
    });
  }

  if (loading) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <Screen background={theme.background}>
          <LoadingSpinner message={t("idea.loading")} />
        </Screen>
      </>
    );
  }

  if (!form) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <Screen background={theme.background}>
          <View style={styles.empty}>
            <Text style={[styles.emptyTitle, { color: theme.primary }]}>
              {t("idea.not_found")}
            </Text>
          </View>
        </Screen>
      </>
    );
  }

  // Auto-save on navigate away: ensure name fallback + save
  async function forceSaveNow(currentForm: Riff) {
    const finalName = currentForm.name?.trim() || getDefaultRiffName(t);
    try {
      await updateRiff(currentForm.id, { ...currentForm, name: finalName, updatedAt: Date.now() });
    } catch {}
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false
        }}
      />

      <Screen background={theme.background}>
        {/* Custom Header */}
        <View style={[styles.customHeader, { paddingTop: 12, paddingBottom: 12 }]}>
          <Pressable 
            onPress={() => router.back()} 
            style={({pressed}) => [styles.backButton, pressed && { opacity: 0.7 }]}
          >
            <CaretLeft size={24} color={theme.foreground} />
          </Pressable>
          
          <View style={styles.headerRight}>
              <SaveStatusIndicator status={saving} />
              {form?.audioUri ? (
                <>
                  <Pressable onPress={() => { if (!requirePro("advancedExport")) exportRiffStructure(form); }} style={{ marginLeft: 16 }} hitSlop={8}>
                    <Export size={24} color={theme.foreground} />
                  </Pressable>
                  <Pressable onPress={handleDuplicate} style={{ marginLeft: 16 }} hitSlop={8}>
                    <Copy size={24} color={theme.foreground} />
                  </Pressable>
                  <Pressable onPress={handleShare} style={{ marginLeft: 16 }} hitSlop={8}>
                    <ShareNetwork size={24} color={theme.primary} />
                  </Pressable>
                  <Pressable 
                    onPress={() => {
                      setForm(prev => prev ? { ...prev, draft: !prev.draft } : prev);
                      triggerHaptic("light");
                    }} 
                    style={{ marginLeft: 16 }} 
                    hitSlop={8}
                  >
                    <NotePencil 
                      size={24} 
                      color={form.draft ? "#eab308" : theme.mutedForeground} 
                      weight={form.draft ? "fill" : "regular"} 
                    />
                  </Pressable>
                </>
              ) : null}
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120, paddingHorizontal: 20 }}>

          <View style={{ marginBottom: 32, marginTop: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <TextInput
                placeholder={t("idea.name_placeholder")}
                placeholderTextColor={theme.mutedForeground}
                value={form.name}
                onChangeText={(text) =>
                  setForm((prev) => (prev ? { ...prev, name: text } : prev))
                }
                maxLength={APP_CONFIG.MAX_RIFF_TITLE_LENGTH}
                style={{
                  fontSize: 28,
                  fontWeight: "900",
                  color: theme.foreground,
                  paddingHorizontal: 4,
                  marginHorizontal: -4,
                  flex: 1,
                }}
              />
              {form.versionNumber || versions.length > 1 ? (
                <Pressable 
                  onPress={() => versions.length > 1 && setShowVersionsModal(true)}
                  style={{ backgroundColor: theme.primary + "20", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, marginLeft: 8, flexDirection: "row", alignItems: "center" }}
                >
                  <Text style={{ color: theme.primary, fontWeight: "bold", fontSize: 13 }}>v{form.versionNumber || 1}</Text>
                  {versions.length > 1 && <CaretDown size={12} color={theme.primary} weight="bold" style={{ marginLeft: 6 }} />}
                </Pressable>
              ) : null}
            </View>
            {form.draft && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8, paddingHorizontal: 4 }}>
                <View style={{ backgroundColor: "#eab30820", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99, borderWidth: 1, borderColor: "#eab30850", flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <NotePencil size={12} color="#eab308" weight="fill" />
                  <Text style={{ color: "#eab308", fontSize: 11, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.5 }}>Rascunho</Text>
                </View>
              </View>
            )}
            <Text style={{ color: theme.mutedForeground, fontSize: 13, marginTop: 4, paddingHorizontal: 4 }}>
              {new Date(form.createdAt).toLocaleDateString()} • {new Date(form.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>

          {/* VERSIONS MODAL */}
          <Modal visible={showVersionsModal} transparent animationType="fade">
            <Pressable style={styles.modalOverlay} onPress={() => setShowVersionsModal(false)}>
               <Pressable style={[styles.modalContent, { backgroundColor: theme.background }]}>
                  <View style={styles.modalHeader}>
                    <Text style={[styles.modalTitle, { color: theme.foreground }]}>{t("idea.version_history")}</Text>
                    <Pressable onPress={() => setShowVersionsModal(false)}>
                      <X size={24} color={theme.mutedForeground} weight="bold" />
                    </Pressable>
                  </View>

                  <ScrollView style={{ maxHeight: 300 }}>
                    {versions.map(v => (
                      <Pressable 
                        key={v.id}
                        style={[
                          styles.projectOption, 
                          { borderBottomColor: theme.border },
                          form.id === v.id && { backgroundColor: theme.card }
                        ]}
                        onPress={() => {
                          setShowVersionsModal(false);
                          if (form.id !== v.id) {
                            triggerHaptic("light");
                            router.replace(`/riff/${v.id}`);
                          }
                        }}
                      >
                        <Text style={[styles.projectOptionText, { color: theme.foreground, fontWeight: form.id === v.id ? "bold" : "normal" }]}>
                          v{v.versionNumber || 1} - {formatDate(v.createdAt)}
                        </Text>
                        {form.id === v.id && (
                          <Check size={16} color={theme.primary} weight="bold" />
                        )}
                      </Pressable>
                    ))}
                  </ScrollView>
               </Pressable>
            </Pressable>
          </Modal>

          {/* RECORDING — CORE SECTION */}
          <View style={[styles.coreSection, { 
            backgroundColor: theme.card, 
            borderColor: theme.primary + "40",
            borderWidth: 1,
            shadowColor: theme.primary,
            shadowOpacity: 0.15,
            shadowRadius: 24,
            elevation: 6
          }]}>
            <Text style={[styles.coreSectionTitle, { color: theme.primary }]}>
              {t("idea.audio_recording")}
            </Text>
            <RiffRecorder
              ref={recorderRef}
              audioUri={form.audioUri}
              markers={form.markers}
              loopStart={form.loopStart}
              loopEnd={form.loopEnd}
              loopRangeActive={loopRangeActive}
              initialLevels={form.waveform}
              bpm={form.bpm}
              musicalKey={form.key || form.detectedKey}
              onChange={(data) => {
                setForm((prev) => {
                  if (!prev) return prev;
                  return {
                    ...prev,
                    audioUri: data.uri || "",
                    duration: data.uri ? data.duration : prev.duration,
                    waveform: data.uri ? data.levels : prev.waveform,
                    averageRms: data.uri ? data.averageRms : prev.averageRms,
                    energyLevel: data.uri ? data.energyLevel : prev.energyLevel,
                  };
                });
              }}
            />
            {/* Loop Region Controls */}
            {form.audioUri && form.duration > 0 && (
              <View style={{ marginTop: 12, flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <Pressable
                  onPress={() => {
                    const pos = recorderRef.current?.getCurrentPosition() ?? 0;
                    setForm(prev => prev ? { ...prev, loopStart: pos } : prev);
                    triggerHaptic("light");
                  }}
                  style={[{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: theme.input, borderWidth: 1, borderColor: theme.border }]}
                >
                  <Text style={{ color: theme.foreground, fontSize: 12, fontWeight: "600" }}>
                    {t("idea.set_in")}{form.loopStart != null ? ` (${(form.loopStart / 1000).toFixed(1)}s)` : ""}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    const pos = recorderRef.current?.getCurrentPosition() ?? 0;
                    setForm(prev => prev ? { ...prev, loopEnd: pos } : prev);
                    triggerHaptic("light");
                  }}
                  style={[{ paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: theme.input, borderWidth: 1, borderColor: theme.border }]}
                >
                  <Text style={{ color: theme.foreground, fontSize: 12, fontWeight: "600" }}>
                    {t("idea.set_out")}{form.loopEnd != null ? ` (${(form.loopEnd / 1000).toFixed(1)}s)` : ""}
                  </Text>
                </Pressable>
                {form.loopStart != null && form.loopEnd != null && (
                  <Pressable
                    onPress={() => {
                      setLoopRangeActive(v => !v);
                      triggerHaptic("light");
                    }}
                    style={[{
                      paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8,
                      backgroundColor: loopRangeActive ? theme.primary + "20" : theme.input,
                      borderWidth: 1,
                      borderColor: loopRangeActive ? theme.primary : theme.border,
                    }]}
                  >
                    <Text style={{ color: loopRangeActive ? theme.primary : theme.foreground, fontSize: 12, fontWeight: "700" }}>
                      {t("idea.loop_region")}
                    </Text>
                  </Pressable>
                )}
                {(form.loopStart != null || form.loopEnd != null) && (
                  <Pressable
                    onPress={() => {
                      setForm(prev => prev ? { ...prev, loopStart: undefined, loopEnd: undefined } : prev);
                      setLoopRangeActive(false);
                    }}
                    style={{ padding: 8 }}
                  >
                    <Text style={{ color: theme.mutedForeground, fontSize: 11 }}>{t("idea.clear")}</Text>
                  </Pressable>
                )}
              </View>
            )}
            {form.audioUri && form.duration > 0 && form.markers && form.markers.length > 0 && (
              <StructureTimeline 
                durationMs={form.duration} 
                markers={form.markers}
                onSeek={(ms) => {
                  recorderRef.current?.getCurrentPosition(); // Ensure ref exists
                  if (recorderRef.current?.seekTo) {
                    recorderRef.current.seekTo(ms);
                  }
                  triggerHaptic("light");
                }}
              />
            )}
          </View>

          {/* MARKERS SECTION */}
          {form.audioUri ? (
            <View style={{ marginBottom: 20 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <Text style={[styles.label, { color: theme.primary, marginTop: 0, marginBottom: 0 }]}>
                  {t("idea.markers")} ({form.markers?.length || 0})
                </Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={handleAddMarker}
                  style={{ flexDirection: "row", alignItems: "center", backgroundColor: theme.primary + "20", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}
                >
                  <Plus size={12} color={theme.primary} weight="bold" style={{ marginRight: 6 }} />
                  <Text style={{ color: theme.primary, fontSize: 12, fontWeight: "bold" }}>{t("idea.mark_current")}</Text>
                </Pressable>
              </View>

              {form.bpm ? (
                 <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12, paddingHorizontal: 4 }}>
                   <Text style={{ color: theme.foreground, fontSize: 14 }}>{t("idea.snap_bpm")}</Text>
                   <Switch 
                     value={snapToBPM} 
                     onValueChange={setSnapToBPM} 
                     trackColor={{ false: theme.border, true: theme.primary }}
                   />
                 </View>
              ) : null}

              {form.markers && form.markers.length > 0 && (
                <View style={{ backgroundColor: theme.input, borderRadius: 10, overflow: "hidden" }}>
                  {form.markers.map((marker, index) => {
                    const totalSecs = Math.floor(marker.timestampMs / 1000);
                    const mins = Math.floor(totalSecs / 60);
                    const secs = totalSecs % 60;
                    const timeStr = `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;

                    return (
                      <View key={marker.id} style={{ flexDirection: "row", alignItems: "center", padding: 12, borderBottomWidth: index === form.markers!.length - 1 ? 0 : StyleSheet.hairlineWidth, borderBottomColor: theme.border }}>
                        <Pressable 
                          onPress={() => {
                            if (recorderRef.current?.seekTo) {
                              recorderRef.current.seekTo(marker.timestampMs);
                              triggerHaptic("light");
                            }
                          }}
                        >
                          <Text style={{ color: theme.primary, fontWeight: "bold", fontSize: 14, marginRight: 12, textDecorationLine: "underline" }}>
                            {timeStr}
                          </Text>
                        </Pressable>
                        <TextInput
                          value={marker.label}
                          onChangeText={(txt) => handleUpdateMarker(marker.id, txt)}
                          placeholder={t("idea.marker_name")}
                          placeholderTextColor={theme.mutedForeground}
                          style={{ flex: 1, color: theme.foreground, fontSize: 14 }}
                        />
                        <Pressable onPress={() => handleDeleteMarker(marker.id)} hitSlop={10} style={{ padding: 4 }}>
                          <X size={16} color={theme.mutedForeground} weight="bold" />
                        </Pressable>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          ) : null}

          {/* FULL UNIFIED FORM */}
          <IdeaForm
            initialRiff={form}
            projects={projects}
            onDirtyChange={(dirty, current) => {
              if (dirty) {
                setForm(current);
              }
            }}
          />

          {/* Musical Compatibility Indicator */}
          {(form.key || form.detectedKey || form.bpm) && allRiffs.length > 1 && (
            <View style={{ paddingHorizontal: 20, marginBottom: 24 }}>
              <MusicalCompatibility
                currentRiff={form}
                otherRiffs={allRiffs}
              />
            </View>
          )}

        </ScrollView>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  coreSection: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
    marginTop: 8,
  },
  coreSectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 12,
  },
  input: {
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 6,
    marginTop: 8,
  },
  tuningRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  tuningChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginRight: 8,
  },
  savingText: {
    fontSize: 12,
    fontWeight: "600",
  },
  saveIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  customHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginTop: 8,
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
  },
  empty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
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
  projectOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  projectOptionEmoji: {
    fontSize: 20,
    marginRight: 12,
  },
  projectOptionText: {
    fontSize: 16,
    flex: 1,
  },
});
