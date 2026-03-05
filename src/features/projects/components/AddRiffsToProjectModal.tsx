import { useTheme } from "@/src/shared/theme/ThemeProvider";
import { Waveform } from "@/src/features/riff/components/Waveform";
import { useAlert } from "@/src/contexts/AlertContext";
import { useHaptic } from "@/src/shared/hooks/useHaptic";
import { useTranslation } from "@/src/i18n";
import { mutateProjects } from "@/src/data/storage/projects";
import { getRiffsUnassigned, updateRiff } from "@/src/data/storage/riffs";
import { Riff } from "@/src/domain/types/riff";
import { formatTime } from "@/src/utils/formatters";
import { useFocusEffect } from "expo-router";
import { Check, X } from "phosphor-react-native";
import { useCallback, useState } from "react";
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useSharedValue } from "react-native-reanimated";

interface AddRiffsToProjectModalProps {
  isVisible: boolean;
  projectId: string;
  sectionId?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddRiffsToProjectModal({
  isVisible,
  projectId,
  sectionId,
  onClose,
  onSuccess,
}: AddRiffsToProjectModalProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const { triggerHaptic } = useHaptic();
  const { showAlert } = useAlert();

  const [unassignedRiffs, setUnassignedRiffs] = useState<Riff[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSaving, setIsSaving] = useState(false);

  const fallbackPlaybackPosition = useSharedValue(0);

  useFocusEffect(
    useCallback(() => {
      if (isVisible) {
        loadData();
        setSelectedIds(new Set());
      }
    }, [isVisible])
  );

  const loadData = async () => {
    try {
      const riffs = await getRiffsUnassigned();
      setUnassignedRiffs(riffs.sort((a, b) => b.createdAt - a.createdAt));
    } catch (error) {
      console.error("Failed to load unassigned riffs", error);
    }
  };

  const handleToggleSelection = (id: string) => {
    triggerHaptic("light");
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleAddSelected = async () => {
    if (selectedIds.size === 0) return;

    setIsSaving(true);
    triggerHaptic("medium");

    try {
      for (const id of selectedIds) {
        await updateRiff(id, { projectId });
      }

      if (sectionId) {
        await mutateProjects((projects) => {
          const project = projects.find((item) => item.id === projectId);
          if (!project?.sections) return false;

          const section = project.sections.find((item) => item.id === sectionId);
          if (!section) return false;

          const idsToMove = Array.from(selectedIds);
          project.sections.forEach((existingSection) => {
            existingSection.riffIds = existingSection.riffIds.filter((id) => !idsToMove.includes(id));
          });

          const merged = new Set([...section.riffIds, ...idsToMove]);
          section.riffIds = Array.from(merged);
          project.updatedAt = Date.now();

          return true;
        });
      }

      triggerHaptic("success");
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Failed to add riffs to project", error);
      showAlert(t("project.error"), "Falha ao adicionar ideias ao projeto.");
    } finally {
      setIsSaving(false);
    }
  };

  const renderItem = ({ item }: { item: Riff }) => {
    const isSelected = selectedIds.has(item.id);

    return (
      <Pressable
        onPress={() => handleToggleSelection(item.id)}
        style={({ pressed }) => [
          styles.card,
          {
            backgroundColor: isSelected ? theme.primary + "15" : theme.card,
            borderColor: isSelected ? theme.primary : theme.border,
          },
          pressed && { opacity: 0.8 },
        ]}
      >
        <View style={styles.cardContent}>
          <Text style={[styles.cardTitle, { color: theme.foreground }]} numberOfLines={1}>
            {item.name}
          </Text>
          <View style={styles.cardMeta}>
            <Text style={[styles.durationText, { color: theme.mutedForeground }]}>
              {formatTime(Math.floor((item.duration || 0) / 1000))}
            </Text>
            <View style={{ flex: 1, paddingHorizontal: 16 }}>
              {!isSelected && (item.waveform?.length || 0) > 0 && (
                <View style={{ height: 24, justifyContent: "center", opacity: 0.5, pointerEvents: "none" }}>
                  <Waveform
                    levels={item.waveform || []}
                    durationMs={item.duration || 0}
                    playbackPositionMs={fallbackPlaybackPosition}
                  />
                </View>
              )}
            </View>
          </View>
        </View>

        <View
          style={[
            styles.checkbox,
            {
              borderColor: isSelected ? theme.primary : theme.mutedForeground,
              backgroundColor: isSelected ? theme.primary : "transparent",
            },
          ]}
        >
          {isSelected && <Check size={14} color={theme.primaryForeground} weight="bold" />}
        </View>
      </Pressable>
    );
  };

  return (
    <Modal visible={isVisible} animationType="slide" presentationStyle="formSheet" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: theme.foreground }]}>Adicionar Ideias</Text>
          <Pressable
            onPress={onClose}
            hitSlop={16}
            style={({ pressed }) => [
              styles.closeButton,
              { backgroundColor: theme.muted },
              pressed && { opacity: 0.7 },
            ]}
          >
            <X size={20} color={theme.foreground} />
          </Pressable>
        </View>

        <FlatList
          data={unassignedRiffs}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={{ color: theme.mutedForeground, textAlign: "center" }}>
                Não há ideias soltas na sua biblioteca.
              </Text>
            </View>
          }
        />

        <View style={[styles.footer, { borderTopColor: theme.border }]}>
          <Pressable
            onPress={handleAddSelected}
            disabled={selectedIds.size === 0 || isSaving}
            style={({ pressed }) => [
              styles.addButton,
              {
                backgroundColor: theme.primary,
                opacity: selectedIds.size === 0 || isSaving ? 0.5 : pressed ? 0.8 : 1,
              },
            ]}
          >
            <Text style={[styles.addButtonText, { color: theme.primaryForeground }]}>Adicionar {selectedIds.size > 0 ? `(${selectedIds.size})` : ""}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 12,
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  cardContent: {
    flex: 1,
    marginRight: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
  },
  cardMeta: {
    flexDirection: "row",
    alignItems: "center",
  },
  durationText: {
    fontSize: 13,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingBottom: 34,
  },
  addButton: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: "bold",
  },
});

