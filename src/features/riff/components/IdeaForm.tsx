import { KEY_COLORS } from "@/src/shared/theme/Theme";
import { useTheme } from "@/src/shared/theme/ThemeProvider";
import { useHaptic } from "@/src/shared/hooks/useHaptic";
import { useTapBPM } from "@/src/shared/hooks/useTapBPM";
import { useTranslation } from "@/src/i18n";
import { Project } from "@/src/domain/types/project";
import { RecordingType, Riff } from "@/src/domain/types/riff";
import {
  DotsThree,
  Equalizer,
  Guitar,
  Microphone,
  MusicNote,
  Waveform
} from "phosphor-react-native";
import React, { useCallback, useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

export const SYSTEM_TAGS = [
  "Hook",
  "Beat",
  "Bass",
  "Melody",
  "Vox",
  "Intro",
  "Drop",
  "Subida",
  "Final",
];

type IdeaFormProps = {
  riff: Riff;
  projects: Project[];
  onChange: (updates: Partial<Riff>) => void;
};

const RECORDING_TYPES: { id: RecordingType; label: string; icon: string }[] = [
  { id: "Guitar", label: "Guitarra", icon: "guitar" },
  { id: "Beat", label: "Batida", icon: "beat" },
  { id: "Vocal", label: "Voz", icon: "vocal" },
  { id: "Melody", label: "Melodia", icon: "melody" },
  { id: "Bass", label: "Baixo", icon: "bass" },
  { id: "Other", label: "Outro", icon: "other" },
];

const COMMON_GENRES = [
  "Rock",
  "Metal",
  "Indie",
  "Trap",
  "Funk",
  "Lo-fi",
  "Alternativo",
  "Acústico",
  "Outro",
];

const COMMON_KEYS = [
  "C", "G", "D", "A", "E", "F", "Bb", "Eb",
  "Am", "Em", "Bm", "F#m", "C#m", "Dm", "Gm", "Cm"
];

export function IdeaForm({ riff, projects, onChange }: IdeaFormProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const { triggerHaptic } = useHaptic();

  // BPM uses a separate string state so the input stays editable while typing
  const [bpmInput, setBpmInput] = useState<string>(
    riff.bpm?.toString() ?? ""
  );

  // Intelligent BPM hook
  const { bpm: tappedBpm, tap, isTapping, reset: resetTap } = useTapBPM(riff.bpm, {
    maxTaps: 6,
    timeoutMs: 2500,
  });

  const [showTagsModal, setShowTagsModal] = useState(false);
  const [newTagInput, setNewTagInput] = useState("");
  const isCustomGenreSelected = riff.genre && !COMMON_GENRES.includes(riff.genre);

  const updateField = useCallback((key: keyof Riff, value: any) => {
    onChange({ [key]: value });
  }, [onChange]);

  // Sync tap BPM to form state and input field dynamically
  useEffect(() => {
    if (tappedBpm !== null) {
      if (riff.bpm !== tappedBpm) {
        updateField("bpm", tappedBpm);
        setBpmInput(tappedBpm.toString());
      }
      if (riff.bpmSource !== "manual") {
        updateField("bpmSource", "manual");
      }
    }
  }, [tappedBpm, riff.bpm, riff.bpmSource, updateField]);

  // Commit BPM string → number when user leaves the field
  const commitBpm = useCallback(() => {
    const trimmed = bpmInput.trim();
    if (trimmed === "") {
      updateField("bpm", undefined);
      return;
    }
    const parsed = parseInt(trimmed, 10);
    if (!isNaN(parsed) && parsed > 0 && parsed <= 400) {
      updateField("bpm", parsed);
      setBpmInput(parsed.toString());
    } else {
      // Revert to last valid value
      setBpmInput(riff.bpm?.toString() ?? "");
    }
  }, [bpmInput, riff.bpm, updateField]);


  const toggleTag = (tag: string, isSystem: boolean) => {
    if (isSystem) {
      const current = riff.systemTags || [];
      const updated = current.includes(tag)
        ? current.filter((t) => t !== tag)
        : [...current, tag];
      updateField("systemTags", updated);
    } else {
      const current = riff.customTags || [];
      const updated = current.includes(tag)
        ? current.filter((t) => t !== tag)
        : [...current, tag];
      updateField("customTags", updated);
    }
  };

  const addNewCustomTag = () => {
    if (!newTagInput.trim()) return;
    const tag = newTagInput.trim();
    if (!riff.customTags?.includes(tag)) {
      updateField("customTags", [...(riff.customTags || []), tag]);
    }
    setNewTagInput("");
  };

  const allSelectedTags = [
    ...(riff.systemTags || []),
    ...(riff.customTags || []),
  ];

  let energyBg = theme.input;
  let energyBorder = theme.border;
  let energyTextColor = theme.foreground;

  if (riff.energyLevel === "high") {
    energyBorder = theme.accentGold || "#eab308";
    energyBg = (theme.accentGold || "#eab308") + "15";
    energyTextColor = theme.accentGold || "#eab308";
  } else if (riff.energyLevel === "medium") {
    energyBorder = theme.accentBlue || "#3b82f6";
    energyBg = (theme.accentBlue || "#3b82f6") + "15";
    energyTextColor = theme.accentBlue || "#3b82f6";
  } else if (riff.energyLevel === "low") {
    energyBorder = "#10b981";
    energyBg = "#10b98115";
    energyTextColor = "#10b981"; // Emerald
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        {/* Title */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.mutedForeground }]}>
            {t("idea_form.name_label")}
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                color: theme.foreground,
                borderColor: theme.border,
                backgroundColor: theme.input,
              },
            ]}
            value={riff.name}
            onChangeText={(t) => updateField("name", t)}
            placeholder={t("idea_form.name_placeholder")}
            placeholderTextColor={theme.mutedForeground}
          />
        </View>

        {/* Project */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.mutedForeground }]}>
            {t("idea_form.project_label")}
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
          >
            <Pressable
              onPress={() => updateField("projectId", null)}
              style={[
                styles.chip,
                {
                  borderColor: theme.border,
                  backgroundColor: !riff.projectId
                    ? theme.primary + "30"
                    : theme.input,
                },
                !riff.projectId && { borderColor: theme.primary },
              ]}
            >
              <Text
                style={{
                  color: !riff.projectId ? theme.primary : theme.foreground,
                  fontSize: 13,
                  fontWeight: !riff.projectId ? "bold" : "500",
                }}
              >
                {t("idea_form.project_loose")}
              </Text>
            </Pressable>
            {projects.map((p) => {
              const isActive = riff.projectId === p.id;
              return (
                <Pressable
                  key={p.id}
                  onPress={() => updateField("projectId", p.id)}
                  style={[
                    styles.chip,
                    {
                      borderColor: theme.border,
                      backgroundColor: isActive
                        ? p.color + "30"
                        : theme.input,
                    },
                    isActive && { borderColor: p.color },
                  ]}
                >
                  <Text
                    style={{
                      color: isActive ? p.color : theme.foreground,
                      fontSize: 13,
                      fontWeight: isActive ? "bold" : "500",
                    }}
                  >
                    {p.icon || p.emoji ? `${p.icon || p.emoji} ` : ""}
                    {p.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Intelligent BPM & Energy Row */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.mutedForeground }]}>
            Informações Inteligentes do Áudio
          </Text>

          <View style={{ backgroundColor: energyBg, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: energyBorder }}>
            {/* Energy Display */}
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: theme.border }}>
              <View>
                <Text style={{ color: theme.mutedForeground, fontSize: 13, fontWeight: "600", marginBottom: 2 }}>
                  Energia do Áudio
                </Text>
                <Text style={{ color: energyTextColor, fontSize: 16, fontWeight: "800", textTransform: "capitalize" }}>
                  {riff.energyLevel === "high" ? "Alta ⚡" : riff.energyLevel === "medium" ? "Moderada 🌊" : riff.energyLevel === "low" ? "Baixa 🍃" : "Desconhecida"}
                </Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={{ color: theme.mutedForeground, fontSize: 11 }}>Dinâmica: {riff.dynamicRange ? riff.dynamicRange.toFixed(1) : "-"} dB</Text>
                <Text style={{ color: theme.mutedForeground, fontSize: 11 }}>Densidade: {riff.energyData?.onsetDensity.toFixed(1) ?? "-"} hits/s</Text>
              </View>
            </View>

            {/* BPM Detection & Input */}
            <View>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <View>
                  <Text style={{ color: theme.mutedForeground, fontSize: 13, fontWeight: "600", marginBottom: 2 }}>Tempo (BPM)</Text>

                  {riff.bpmData?.bpm ? (
                    <Text style={{ color: (riff.bpmData?.confidence ?? 0) > 0.70 ? theme.primary : theme.primary + "90", fontSize: 12, fontWeight: "600" }}>
                      {riff.bpmData.confidence > 0.70 ? "Detectado" : "Sugerido"}: {riff.bpmData.bpm} ({(riff.bpmData.confidence * 100).toFixed(0)}% conf.)
                    </Text>
                  ) : (
                    <Text style={{ color: theme.mutedForeground, fontSize: 12 }}>
                      Não detectado (Muito curto ou ambiente)
                    </Text>
                  )}
                </View>
              </View>

              <View style={{ flexDirection: "row", gap: 12 }}>
                <TextInput
                  style={[
                    styles.input,
                    {
                      color: theme.foreground,
                      borderColor: isTapping ? theme.primary : theme.border,
                      backgroundColor: isTapping ? theme.primary + "15" : theme.background,
                      flex: 1,
                      fontWeight: "700",
                      fontSize: 18,
                      textAlign: "center"
                    },
                  ]}
                  value={bpmInput}
                  onChangeText={(txt) => {
                    setBpmInput(txt);
                    updateField("bpmSource", "manual");
                  }}
                  onBlur={commitBpm}
                  placeholder="---"
                  placeholderTextColor={theme.mutedForeground}
                  keyboardType="number-pad"
                  returnKeyType="done"
                  onSubmitEditing={commitBpm}
                />

                <Pressable
                  onPress={() => {
                    tap();
                    triggerHaptic("medium");
                  }}
                  style={({ pressed }) => [
                    {
                      backgroundColor: isTapping ? theme.primary : theme.card,
                      borderWidth: 1,
                      borderColor: isTapping ? theme.primary : theme.border,
                      borderRadius: 12,
                      paddingHorizontal: 20,
                      justifyContent: "center",
                      alignItems: "center",
                      transform: [{ scale: pressed ? 0.95 : 1 }]
                    }
                  ]}
                >
                  <Text style={{ color: isTapping ? theme.primaryForeground : theme.foreground, fontWeight: "bold", fontSize: 15 }}>
                    TAP
                  </Text>
                </Pressable>
              </View>

              {/* Suggestions (Half / Double from Auto-Detection) */}
              {riff.bpmData?.suggestedHalf && riff.bpmData?.suggestedDouble && (
                <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
                  <Pressable
                    onPress={() => {
                      updateField("bpm", riff.bpmData!.suggestedHalf);
                      setBpmInput(String(riff.bpmData!.suggestedHalf));
                      updateField("bpmSource", "auto");
                    }}
                    style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: theme.background, borderWidth: 1, borderColor: theme.border }}
                  >
                    <Text style={{ color: theme.mutedForeground, fontSize: 12, fontWeight: "600" }}>Metade ({riff.bpmData.suggestedHalf})</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      updateField("bpm", riff.bpmData!.suggestedDouble);
                      setBpmInput(String(riff.bpmData!.suggestedDouble));
                      updateField("bpmSource", "auto");
                    }}
                    style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: theme.background, borderWidth: 1, borderColor: theme.border }}
                  >
                    <Text style={{ color: theme.mutedForeground, fontSize: 12, fontWeight: "600" }}>Dobro ({riff.bpmData.suggestedDouble})</Text>
                  </Pressable>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Type (Instrument) */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.mutedForeground }]}>
            {t("idea_form.type_label")}
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
          >
            {RECORDING_TYPES.map((type) => {
              const isActive = riff.type === type.id;
              const iconColor = isActive ? theme.primaryForeground : theme.foreground;
              const iconSize = 16;
              let IconEl: React.ReactNode = null;
              switch (type.icon) {
                case "guitar":
                  IconEl = <Guitar size={iconSize} color={iconColor} weight={isActive ? "fill" : "regular"} />; break;
                case "beat":
                  IconEl = <Waveform size={iconSize} color={iconColor} weight={isActive ? "fill" : "regular"} />; break;
                case "vocal":
                  IconEl = <Microphone size={iconSize} color={iconColor} weight={isActive ? "fill" : "regular"} />; break;
                case "melody":
                  IconEl = <MusicNote size={iconSize} color={iconColor} weight={isActive ? "fill" : "regular"} />; break;
                case "bass":
                  IconEl = <Equalizer size={iconSize} color={iconColor} weight={isActive ? "fill" : "regular"} />; break;
                default:
                  IconEl = <DotsThree size={iconSize} color={iconColor} weight={isActive ? "fill" : "regular"} />; break;
              }
              return (
                <Pressable
                  key={type.id}
                  onPress={() => updateField("type", type.id)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: isActive ? theme.primary : theme.input,
                      borderColor: isActive ? theme.primary : theme.border,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                    },
                  ]}
                >
                  {IconEl}
                  <Text
                    style={{
                      color: isActive ? theme.primaryForeground : theme.foreground,
                      fontSize: 13,
                      fontWeight: isActive ? "bold" : "500",
                    }}
                  >
                    {t(`types.${type.icon}` as any) || type.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Genre */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.mutedForeground }]}>
            {t("idea_form.genre_label")}
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingBottom: 8 }}
          >
            {COMMON_GENRES.map((genre) => {
              const isActive = (riff.genre === genre) || (genre === "Outro" && isCustomGenreSelected);
              return (
                <Pressable
                  key={genre}
                  onPress={() => {
                    if (genre === "Outro") {
                      // Se tem algum gênero custom, mantém. Senão apaga pra abrir pra escrita
                      if (!isCustomGenreSelected) updateField("genre", "");
                    } else {
                      updateField("genre", genre);
                    }
                  }}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: isActive ? theme.primary : theme.input,
                      borderColor: isActive ? theme.primary : theme.border,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: isActive ? theme.primaryForeground : theme.foreground,
                      fontSize: 13,
                      fontWeight: isActive ? "bold" : "500",
                    }}
                  >
                    {genre}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Custom Genre Input (shown if "Outro" is selected, aka: its generic or not in list) */}
          {(isCustomGenreSelected || (riff.genre === "" && riff.genre != null)) && (
            <TextInput
              style={[
                styles.input,
                {
                  color: theme.foreground,
                  borderColor: theme.border,
                  backgroundColor: theme.input,
                  marginTop: 4,
                },
              ]}
              value={isCustomGenreSelected ? riff.genre : ""}
              onChangeText={(txt) => updateField("genre", txt)}
              placeholder="Digite o gênero musical..."
              placeholderTextColor={theme.mutedForeground}
            />
          )}
        </View>

        {/* Tonalidade (Key) */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.mutedForeground }]}>
            Tonalidade (Tom)
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
          >
            <Pressable
              onPress={() => updateField("key", undefined)}
              style={[
                styles.chip,
                {
                  borderColor: theme.border,
                  backgroundColor: !riff.key ? theme.muted : theme.input,
                },
              ]}
            >
              <Text
                style={{
                  color: !riff.key ? theme.mutedForeground : theme.foreground,
                  fontSize: 13,
                  fontWeight: !riff.key ? "bold" : "500",
                }}
              >
                Não definido
              </Text>
            </Pressable>
            {COMMON_KEYS.map((key) => {
              const isActive = riff.key === key;
              const kColor = KEY_COLORS[key] || theme.primary;
              return (
                <Pressable
                  key={key}
                  onPress={() => updateField("key", key)}
                  style={[
                    styles.chip,
                    {
                      borderColor: isActive ? kColor : theme.border,
                      backgroundColor: isActive ? kColor + "30" : theme.input,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: isActive ? kColor : theme.foreground,
                      fontSize: 13,
                      fontWeight: isActive ? "bold" : "500",
                    }}
                  >
                    {key}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Tags */}
        <View style={styles.section}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <Text style={[styles.label, { color: theme.mutedForeground, marginBottom: 0 }]}>{t("idea_form.tags_label")}</Text>
            {allSelectedTags.length > 0 && (
              <Text style={{ color: theme.primary, fontSize: 12, fontWeight: "700" }}>{allSelectedTags.length} selecionada{allSelectedTags.length !== 1 ? "s" : ""}</Text>
            )}
          </View>
          {/* Quick suggestion chips */}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
            {SYSTEM_TAGS.map((tag) => {
              const isActive = riff.systemTags?.includes(tag);
              return (
                <Pressable
                  key={tag}
                  onPress={() => toggleTag(tag, true)}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 99,
                    backgroundColor: isActive ? theme.primary + "25" : theme.input,
                    borderWidth: 1,
                    borderColor: isActive ? theme.primary : theme.border,
                  }}
                >
                  <Text style={{ color: isActive ? theme.primary : theme.mutedForeground, fontSize: 13, fontWeight: isActive ? "700" : "500" }}>
                    #{t(`tags.${tag.toLowerCase()}` as any) || tag}
                  </Text>
                </Pressable>
              );
            })}
            {/* "+ custom" button */}
            <Pressable
              onPress={() => setShowTagsModal(true)}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 99,
                backgroundColor: "transparent",
                borderWidth: 1,
                borderColor: theme.border,
                borderStyle: "dashed",
              }}
            >
              <Text style={{ color: theme.mutedForeground, fontSize: 13 }}>+ {t("add")}</Text>
            </Pressable>
          </View>
          {/* Custom tags display */}
          {riff.customTags && riff.customTags.length > 0 && (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {riff.customTags.map((tag) => (
                <Pressable
                  key={tag}
                  onPress={() => toggleTag(tag, false)}
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 99,
                    backgroundColor: theme.primary + "25",
                    borderWidth: 1,
                    borderColor: theme.primary,
                  }}
                >
                  <Text style={{ color: theme.primary, fontSize: 13, fontWeight: "700" }}>#{tag}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* Notes */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.mutedForeground }]}>
            {t("idea_form.notes_label")}
          </Text>
          <TextInput
            style={[
              styles.input,
              styles.textArea,
              {
                color: theme.foreground,
                borderColor: theme.border,
                backgroundColor: theme.input,
              },
            ]}
            value={riff.notes || ""}
            onChangeText={(t) => updateField("notes", t)}
            placeholder={t("idea_form.notes_placeholder")}
            placeholderTextColor={theme.mutedForeground}
            multiline
            textAlignVertical="top"
          />
        </View>
      </ScrollView>

      {/* ── MODALS ────────────────────────────────────────────────────────────── */}



      {/* Tags Modal */}
      <Modal visible={showTagsModal} transparent animationType="slide">
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowTagsModal(false)}
        >
          <Pressable
            style={[
              styles.modalContent,
              {
                backgroundColor: theme.card,
                borderColor: theme.border,
                maxHeight: "80%",
              },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text
              style={{
                color: theme.foreground,
                fontSize: 18,
                fontWeight: "bold",
                marginBottom: 16,
              }}
            >
              {t("idea_form.tags_label")}
            </Text>

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                marginBottom: 16,
              }}
            >
              <TextInput
                style={[
                  styles.input,
                  {
                    flex: 1,
                    color: theme.foreground,
                    borderColor: theme.border,
                    backgroundColor: theme.input,
                  },
                ]}
                value={newTagInput}
                onChangeText={setNewTagInput}
                placeholder={t("idea_form.new_tag")}
                placeholderTextColor={theme.mutedForeground}
                onSubmitEditing={addNewCustomTag}
              />
              <Pressable
                onPress={addNewCustomTag}
                style={{
                  backgroundColor: theme.primary,
                  padding: 14,
                  borderRadius: 12,
                }}
              >
                <Text style={{ color: "#fff", fontWeight: "bold" }}>
                  {t("add")}
                </Text>
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {riff.customTags && riff.customTags.length > 0 && (
                <View style={{ marginBottom: 16 }}>
                  <Text
                    style={{
                      color: theme.mutedForeground,
                      fontSize: 12,
                      fontWeight: "bold",
                      textTransform: "uppercase",
                      marginBottom: 8,
                    }}
                  >
                    {t("idea_form.my_tags")}
                  </Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                    {riff.customTags.map((tag) => (
                      <Pressable
                        key={tag}
                        onPress={() => toggleTag(tag, false)}
                        style={{
                          backgroundColor: theme.primary,
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                          borderRadius: 8,
                        }}
                      >
                        <Text style={{ color: "#fff", fontWeight: "600" }}>
                          #{tag}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}

              <Text
                style={{
                  color: theme.mutedForeground,
                  fontSize: 12,
                  fontWeight: "bold",
                  textTransform: "uppercase",
                  marginBottom: 8,
                }}
              >
                {t("idea_form.suggested_tags")}
              </Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {SYSTEM_TAGS.map((tag) => {
                  const isActive = riff.systemTags?.includes(tag);
                  return (
                    <Pressable
                      key={tag}
                      onPress={() => toggleTag(tag, true)}
                      style={[
                        styles.modalChip,
                        {
                          backgroundColor: isActive
                            ? theme.primary
                            : theme.input,
                        },
                      ]}
                    >
                      <Text
                        style={{
                          color: isActive
                            ? theme.primaryForeground
                            : theme.foreground,
                          fontWeight: isActive ? "bold" : "600",
                        }}
                      >
                        {t(`tags.${tag.toLowerCase()}` as any) || tag}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>

            <Pressable
              onPress={() => setShowTagsModal(false)}
              style={{
                backgroundColor: theme.primary,
                padding: 16,
                borderRadius: 12,
                alignItems: "center",
                marginTop: 16,
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 16 }}>
                {t("done")}
              </Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontSize: 12,
    textTransform: "uppercase",
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  input: {
    fontFamily: "SpaceGrotesk_500Medium",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
  },
  textArea: {
    minHeight: 120,
    paddingTop: 16,
  },
  chip: {
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8, // Punk sticker style
  },
  smartBpmContainer: {
    marginTop: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  smartBpmBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    flex: 1,
    alignItems: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    borderTopWidth: 1,
  },
  modalChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8, // Punk sticker style
  },
});

