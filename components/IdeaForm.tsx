import { useTheme } from "@/components/ThemeProvider";
import { useTranslation } from "@/src/i18n";
import { Project } from "@/src/types/project";
import { RecordingType, Riff } from "@/src/types/riff";
import {
    CaretDown,
    DotsThree,
    Equalizer,
    Guitar,
    Microphone,
    MusicNote,
    Waveform
} from "phosphor-react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
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
  initialRiff: Riff;
  projects: Project[];
  onDirtyChange: (isDirty: boolean, currentData: Riff) => void;
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

export function IdeaForm({ initialRiff, projects, onDirtyChange }: IdeaFormProps) {
  const theme = useTheme();
  const { t } = useTranslation();

  const [formData, setFormData] = useState<Riff>(initialRiff);
  const lastParentSnapRef = useRef(JSON.stringify(initialRiff));

  // BPM uses a separate string state so the input stays editable while typing
  // e.g. "12" doesn't immediately commit until focus is lost
  const [bpmInput, setBpmInput] = useState<string>(
    initialRiff.bpm?.toString() ?? ""
  );

  const [showTypeModal, setShowTypeModal] = useState(false);
  const [showGenreModal, setShowGenreModal] = useState(false);
  const [showTagsModal, setShowTagsModal] = useState(false);
  const [newTagInput, setNewTagInput] = useState("");

  const onDirtyChangeRef = useRef(onDirtyChange);
  useEffect(() => {
    onDirtyChangeRef.current = onDirtyChange;
  }, [onDirtyChange]);

  useEffect(() => {
    const newSnap = JSON.stringify(initialRiff);
    if (newSnap !== lastParentSnapRef.current) {
      lastParentSnapRef.current = newSnap;
      const currentSnap = JSON.stringify(formData);
      if (newSnap !== currentSnap) {
        setFormData(initialRiff);
        setBpmInput(initialRiff.bpm?.toString() ?? "");
      }
    }
  }, [initialRiff, formData]);

  useEffect(() => {
    const currentSnap = JSON.stringify(formData);
    if (currentSnap !== lastParentSnapRef.current) {
      onDirtyChangeRef.current(true, formData);
    }
  }, [formData]);

  const updateField = useCallback((key: keyof Riff, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }, []);

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
      setBpmInput(formData.bpm?.toString() ?? "");
    }
  }, [bpmInput, formData.bpm, updateField]);

  const handleApplySmartBpm = (bpm: number) => {
    updateField("bpm", bpm);
    updateField("bpmSource", "auto");
    setBpmInput(bpm.toString());
  };

  const toggleTag = (tag: string, isSystem: boolean) => {
    if (isSystem) {
      const current = formData.systemTags || [];
      const updated = current.includes(tag)
        ? current.filter((t) => t !== tag)
        : [...current, tag];
      updateField("systemTags", updated);
    } else {
      const current = formData.customTags || [];
      const updated = current.includes(tag)
        ? current.filter((t) => t !== tag)
        : [...current, tag];
      updateField("customTags", updated);
    }
  };

  const addNewCustomTag = () => {
    if (!newTagInput.trim()) return;
    const tag = newTagInput.trim();
    if (!formData.customTags?.includes(tag)) {
      updateField("customTags", [...(formData.customTags || []), tag]);
    }
    setNewTagInput("");
  };

  const allSelectedTags = [
    ...(formData.systemTags || []),
    ...(formData.customTags || []),
  ];

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
            value={formData.name}
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
                  backgroundColor: !formData.projectId
                    ? theme.primary + "30"
                    : theme.input,
                },
                !formData.projectId && { borderColor: theme.primary },
              ]}
            >
              <Text
                style={{
                  color: !formData.projectId ? theme.primary : theme.foreground,
                  fontSize: 13,
                  fontWeight: !formData.projectId ? "bold" : "500",
                }}
              >
                {t("idea_form.project_loose")}
              </Text>
            </Pressable>
            {projects.map((p) => {
              const isActive = formData.projectId === p.id;
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

        {/* BPM — string input committed on blur */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.mutedForeground }]}>
            {t("idea_form.bpm_label")}
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
            value={bpmInput}
            onChangeText={setBpmInput}          // update string freely while typing
            onBlur={commitBpm}                  // parse + validate only on blur
            placeholder={t("idea_form.bpm_placeholder")}
            placeholderTextColor={theme.mutedForeground}
            keyboardType="number-pad"
            returnKeyType="done"
            onSubmitEditing={commitBpm}
          />

        </View>

        {/* Type & Genre */}
        <View style={{ flexDirection: "row", gap: 12, marginBottom: 24 }}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { color: theme.mutedForeground }]}>
              {t("idea_form.type_label")}
            </Text>
            <Pressable
              onPress={() => setShowTypeModal(true)}
              style={[
                styles.input,
                {
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  borderColor: theme.border,
                  backgroundColor: theme.input,
                },
              ]}
            >
              <Text
                style={{
                  color: formData.type ? theme.foreground : theme.mutedForeground,
                  flexShrink: 1,
                }}
                numberOfLines={1}
              >
                {formData.type
                  ? t(`types.${RECORDING_TYPES.find((type) => type.id === formData.type)?.icon}` as any) ||
                    formData.type
                  : t("idea_form.type_placeholder")}
              </Text>
              <CaretDown size={16} color={theme.mutedForeground} />
            </Pressable>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.label, { color: theme.mutedForeground }]}>
              {t("idea_form.genre_label")}
            </Text>
            <Pressable
              onPress={() => setShowGenreModal(true)}
              style={[
                styles.input,
                {
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                  borderColor: theme.border,
                  backgroundColor: theme.input,
                },
              ]}
            >
              <Text
                style={{
                  color: formData.genre
                    ? theme.foreground
                    : theme.mutedForeground,
                  flexShrink: 1,
                }}
                numberOfLines={1}
              >
                {formData.genre || t("idea_form.genre_placeholder")}
              </Text>
              <CaretDown size={16} color={theme.mutedForeground} />
            </Pressable>
          </View>
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
              const isActive = formData.systemTags?.includes(tag);
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
          {formData.customTags && formData.customTags.length > 0 && (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {formData.customTags.map((tag) => (
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
            value={formData.notes || ""}
            onChangeText={(t) => updateField("notes", t)}
            placeholder={t("idea_form.notes_placeholder")}
            placeholderTextColor={theme.mutedForeground}
            multiline
            textAlignVertical="top"
          />
        </View>
      </ScrollView>

      {/* ── MODALS ────────────────────────────────────────────────────────────── */}

      {/* Type Modal */}
      <Modal visible={showTypeModal} transparent animationType="slide">
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowTypeModal(false)}
        >
          <View
            style={[
              styles.modalContent,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <Text
              style={{
                color: theme.foreground,
                fontSize: 18,
                fontWeight: "bold",
                marginBottom: 16,
              }}
            >
              {t("idea_form.type_label")}
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
              {RECORDING_TYPES.map((type) => {
                const isActive = formData.type === type.id;
                const iconColor = isActive
                  ? theme.primaryForeground
                  : theme.foreground;
                const iconSize = 18;
                let IconEl: React.ReactNode = null;
                switch (type.icon) {
                  case "guitar":
                    IconEl = (
                      <Guitar
                        size={iconSize}
                        color={iconColor}
                        weight={isActive ? "fill" : "regular"}
                      />
                    );
                    break;
                  case "beat":
                    IconEl = (
                      <Waveform
                        size={iconSize}
                        color={iconColor}
                        weight={isActive ? "fill" : "regular"}
                      />
                    );
                    break;
                  case "vocal":
                    IconEl = (
                      <Microphone
                        size={iconSize}
                        color={iconColor}
                        weight={isActive ? "fill" : "regular"}
                      />
                    );
                    break;
                  case "melody":
                    IconEl = (
                      <MusicNote
                        size={iconSize}
                        color={iconColor}
                        weight={isActive ? "fill" : "regular"}
                      />
                    );
                    break;
                  case "bass":
                    IconEl = (
                      <Equalizer
                        size={iconSize}
                        color={iconColor}
                        weight={isActive ? "fill" : "regular"}
                      />
                    );
                    break;
                  default:
                    IconEl = (
                      <DotsThree
                        size={iconSize}
                        color={iconColor}
                        weight={isActive ? "fill" : "regular"}
                      />
                    );
                    break;
                }
                return (
                  <Pressable
                    key={type.id}
                    onPress={() => {
                      updateField("type", type.id);
                      setShowTypeModal(false);
                    }}
                    style={[
                      styles.modalChip,
                      {
                        backgroundColor: isActive ? theme.primary : theme.input,
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                      },
                    ]}
                  >
                    {IconEl}
                    <Text
                      style={{
                        color: isActive
                          ? theme.primaryForeground
                          : theme.foreground,
                        fontWeight: isActive ? "bold" : "600",
                      }}
                    >
                      {t(`types.${type.icon}` as any) || type.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* Genre Modal */}
      <Modal visible={showGenreModal} transparent animationType="slide">
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowGenreModal(false)}
        >
          <View
            style={[
              styles.modalContent,
              { backgroundColor: theme.card, borderColor: theme.border },
            ]}
          >
            <Text
              style={{
                color: theme.foreground,
                fontSize: 18,
                fontWeight: "bold",
                marginBottom: 16,
              }}
            >
              {t("idea_form.genre_label")}
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {COMMON_GENRES.map((genre) => (
                <Pressable
                  key={genre}
                  onPress={() => {
                    updateField("genre", genre);
                    setShowGenreModal(false);
                  }}
                  style={[
                    styles.modalChip,
                    {
                      backgroundColor:
                        formData.genre === genre ? theme.primary : theme.input,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color:
                        formData.genre === genre
                          ? theme.primaryForeground
                          : theme.foreground,
                      fontWeight: formData.genre === genre ? "bold" : "600",
                    }}
                  >
                    {genre}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </Pressable>
      </Modal>

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
              {formData.customTags && formData.customTags.length > 0 && (
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
                    {formData.customTags.map((tag) => (
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
                  const isActive = formData.systemTags?.includes(tag);
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
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  input: {
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
    borderRadius: 20,
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
    borderRadius: 20,
  },
});