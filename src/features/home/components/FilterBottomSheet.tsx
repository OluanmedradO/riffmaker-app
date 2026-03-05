import { useTheme } from "@/src/shared/theme/ThemeProvider";
import { useTranslation } from "@/src/i18n";
import { Project } from "@/src/domain/types/project";
import { RecordingType } from "@/src/domain/types/riff";
import { AdvancedFilters } from "@/src/domain/types/riffQuery";
import { CaretDown, CaretUp, FolderSimple, Guitar, Tag, X } from "phosphor-react-native";
import React, { useState } from "react";
import { LayoutAnimation, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

interface FilterBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  projects: Project[];
  producerTags: string[];
  recordingTypes: { id: RecordingType; label: string; icon: any }[];
  initialFilters: AdvancedFilters;
  onApply: (filters: AdvancedFilters) => void;
}

export function FilterBottomSheet({
  visible,
  onClose,
  projects,
  producerTags,
  recordingTypes,
  initialFilters,
  onApply,
}: FilterBottomSheetProps) {
  const theme = useTheme();
  const { t } = useTranslation();

  const [draft, setDraft] = useState<AdvancedFilters>(initialFilters);
  const [expandedSection, setExpandedSection] = useState<"projects" | "tags" | "types" | null>(null);

  const handleOpen = () => setDraft(initialFilters);

  const toggleSection = (section: "projects" | "tags" | "types") => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedSection((prev) => (prev === section ? null : section));
  };

  const handleApply = () => {
    onApply(draft);
    onClose();
  };

  const handleClear = () => {
    setDraft({});
    onApply({});
    onClose();
  };

  const activeCount =
    (draft.folder !== undefined && draft.folder !== null ? 1 : 0) +
    (draft.tags?.length ?? 0) +
    (draft.types?.length ?? 0) +
    (draft.mustHaveMarkers ? 1 : 0);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} onShow={handleOpen}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <View style={[styles.sheet, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.foreground }]}>{t("home.filters_and_sort")}</Text>
            <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
              {activeCount > 0 && (
                <Pressable onPress={handleClear} style={[styles.clearBtn, { borderColor: theme.border }]}>
                  <Text style={{ color: theme.mutedForeground, fontSize: 13 }}>{t("home.clear_filters" as any)}</Text>
                </Pressable>
              )}
              <Pressable onPress={onClose} style={styles.closeBtn}>
                <X size={22} color={theme.foreground} />
              </Pressable>
            </View>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            <Pressable onPress={() => toggleSection("projects")} style={styles.accordionHeader}>
              <View style={styles.accordionLeft}>
                <FolderSimple size={20} color={theme.foreground} />
                <Text style={{ fontSize: 15, fontWeight: "600", color: theme.foreground }}>
                  {t("home.filter_projects")}
                </Text>
                {draft.folder !== undefined && draft.folder !== null && (
                  <View style={[styles.badge, { backgroundColor: theme.primary }]}>
                    <Text style={{ color: theme.primaryForeground, fontSize: 10, fontWeight: "bold" }}>1</Text>
                  </View>
                )}
              </View>
              {expandedSection === "projects" ? (
                <CaretUp size={18} color={theme.mutedForeground} />
              ) : (
                <CaretDown size={18} color={theme.mutedForeground} />
              )}
            </Pressable>
            {expandedSection === "projects" && (
              <View style={styles.accordionBody}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingBottom: 16 }}
                >
                  <Pressable
                    onPress={() => setDraft((prev) => ({ ...prev, folder: undefined }))}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: draft.folder === undefined ? theme.primary : theme.input,
                        borderColor: draft.folder === undefined ? theme.primary : theme.border,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        color: draft.folder === undefined ? theme.primaryForeground : theme.foreground,
                        fontWeight: "500",
                      }}
                    >
                      {t("home.filter_all")}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setDraft((prev) => ({ ...prev, folder: "none" }))}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: draft.folder === "none" ? theme.primary : theme.input,
                        borderColor: draft.folder === "none" ? theme.primary : theme.border,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        color: draft.folder === "none" ? theme.primaryForeground : theme.foreground,
                        fontWeight: "500",
                      }}
                    >
                      {t("home.filter_loose")}
                    </Text>
                  </Pressable>
                  {projects.map((project) => {
                    const isActive = draft.folder === project.id;
                    return (
                      <Pressable
                        key={project.id}
                        onPress={() => setDraft((prev) => ({ ...prev, folder: project.id }))}
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
                            fontSize: 13,
                            color: isActive ? theme.primaryForeground : theme.foreground,
                            fontWeight: "500",
                          }}
                        >
                          {project.name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            <View style={[styles.divider, { backgroundColor: theme.border }]} />

            <Pressable onPress={() => toggleSection("tags")} style={styles.accordionHeader}>
              <View style={styles.accordionLeft}>
                <Tag size={20} color={theme.foreground} />
                <Text style={{ fontSize: 15, fontWeight: "600", color: theme.foreground }}>{t("home.filter_tags")}</Text>
                {((draft.tags?.length ?? 0) > 0 || draft.mustHaveMarkers) && (
                  <View style={[styles.badge, { backgroundColor: theme.primary }]}>
                    <Text style={{ color: theme.primaryForeground, fontSize: 10, fontWeight: "bold" }}>
                      {(draft.tags?.length ?? 0) + (draft.mustHaveMarkers ? 1 : 0)}
                    </Text>
                  </View>
                )}
              </View>
              {expandedSection === "tags" ? (
                <CaretUp size={18} color={theme.mutedForeground} />
              ) : (
                <CaretDown size={18} color={theme.mutedForeground} />
              )}
            </Pressable>
            {expandedSection === "tags" && (
              <View style={styles.accordionBody}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingBottom: 16 }}
                >
                  <Pressable
                    onPress={() => setDraft((prev) => ({ ...prev, mustHaveMarkers: !prev.mustHaveMarkers }))}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: draft.mustHaveMarkers ? theme.accent : theme.input,
                        borderColor: draft.mustHaveMarkers ? theme.accent : theme.border,
                      },
                    ]}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        color: draft.mustHaveMarkers ? theme.primaryForeground : theme.foreground,
                        fontWeight: "500",
                      }}
                    >
                      {t("home.filter_marks")}
                    </Text>
                  </Pressable>
                  {producerTags.map((tag) => {
                    const isActive = draft.tags?.includes(tag) ?? false;
                    return (
                      <Pressable
                        key={tag}
                        onPress={() =>
                          setDraft((prev) => {
                            const tags = prev.tags ?? [];
                            return {
                              ...prev,
                              tags: isActive ? tags.filter((existing) => existing !== tag) : [...tags, tag],
                            };
                          })
                        }
                        style={[
                          styles.chip,
                          {
                            backgroundColor: isActive ? theme.secondary : theme.input,
                            borderColor: isActive ? theme.secondary : theme.border,
                          },
                        ]}
                      >
                        <Text
                          style={{ fontSize: 13, color: isActive ? "#fff" : theme.foreground, fontWeight: "500" }}
                        >
                          {tag}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            <View style={[styles.divider, { backgroundColor: theme.border }]} />

            <Pressable onPress={() => toggleSection("types")} style={styles.accordionHeader}>
              <View style={styles.accordionLeft}>
                <Guitar size={20} color={theme.foreground} />
                <Text style={{ fontSize: 15, fontWeight: "600", color: theme.foreground }}>
                  {t("home.filter_types")}
                </Text>
                {(draft.types?.length ?? 0) > 0 && (
                  <View style={[styles.badge, { backgroundColor: theme.primary }]}>
                    <Text style={{ color: theme.primaryForeground, fontSize: 10, fontWeight: "bold" }}>
                      {draft.types!.length}
                    </Text>
                  </View>
                )}
              </View>
              {expandedSection === "types" ? (
                <CaretUp size={18} color={theme.mutedForeground} />
              ) : (
                <CaretDown size={18} color={theme.mutedForeground} />
              )}
            </Pressable>
            {expandedSection === "types" && (
              <View style={styles.accordionBody}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 8, paddingHorizontal: 16, paddingBottom: 16 }}
                >
                  {recordingTypes.map((type) => {
                    const isActive = draft.types?.includes(type.id) ?? false;
                    return (
                      <Pressable
                        key={type.id}
                        onPress={() =>
                          setDraft((prev) => {
                            const types = prev.types ?? [];
                            return {
                              ...prev,
                              types: isActive ? types.filter((existing) => existing !== type.id) : [...types, type.id],
                            };
                          })
                        }
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
                        <type.icon
                          weight="fill"
                          size={13}
                          color={isActive ? theme.primaryForeground : theme.mutedForeground}
                        />
                        <Text
                          style={{
                            fontSize: 13,
                            color: isActive ? theme.primaryForeground : theme.foreground,
                            fontWeight: "500",
                          }}
                        >
                          {t(`types.${type.id.toLowerCase()}` as any) || type.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            <View style={{ height: 24 }} />
          </ScrollView>

          <Pressable
            onPress={handleApply}
            style={({ pressed }) => ({
              margin: 16,
              padding: 16,
              borderRadius: 14,
              backgroundColor: theme.primary,
              opacity: pressed ? 0.85 : 1,
              alignItems: "center",
            })}
          >
            <Text style={{ color: theme.primaryForeground, fontWeight: "800", fontSize: 15 }}>
              {activeCount > 0
                ? t("home.apply_filters_count" as any, { count: String(activeCount) })
                : t("home.apply" as any)}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheet: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    borderWidth: 1,
    maxHeight: "86%",
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
  },
  closeBtn: { padding: 4 },
  clearBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  content: { maxHeight: "100%" },
  accordionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  accordionLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  accordionBody: {
    paddingBottom: 2,
  },
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  divider: { height: StyleSheet.hairlineWidth },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
});

