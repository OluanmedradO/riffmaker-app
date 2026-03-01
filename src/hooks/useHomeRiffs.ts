import { getProjects } from "@/src/storage/projects";
import {
    deleteRiff,
    duplicateIdea,
    getRiffs,
    toggleFavorite,
    updateRiff
} from "@/src/storage/riffs";
import { Project } from "@/src/types/project";
import { Riff } from "@/src/types/riff";
import { useCallback, useEffect, useState } from "react";
import { Alert, DeviceEventEmitter } from "react-native";
import { useHaptic } from "./useHaptic";

export function useHomeRiffs() {
  const [riffs, setRiffs] = useState<Riff[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const { triggerHaptic } = useHaptic();

  // Multi-select state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showMoveModal, setShowMoveModal] = useState(false);

  const loadRiffs = useCallback(async (onLoaded?: () => void) => {
    setLoading(true);
    try {
      const [riffsData, projsData] = await Promise.all([
        getRiffs(),
        getProjects(),
      ]);
      setRiffs(riffsData);
      setProjects(projsData);
      onLoaded?.();
    } catch (error) {
      Alert.alert("Erro", "Não foi possível carregar as ideias.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener("riff_created", () => {
      loadRiffs();
    });
    return () => sub.remove();
  }, [loadRiffs]);

  const handleDelete = useCallback((id: string) => {
    Alert.alert("Apagar ideia?", "Essa ação não pode ser desfeita.", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Apagar",
        style: "destructive",
        onPress: async () => {
          triggerHaptic("medium");
          try {
            await deleteRiff(id);
            await loadRiffs();
            triggerHaptic("success");
          } catch (error) {
            Alert.alert("Erro", "Não foi possível apagar a ideia.");
            triggerHaptic("error");
          }
        },
      },
    ]);
  }, [loadRiffs, triggerHaptic]);

  const handleDuplicate = useCallback(async (id: string) => {
    try {
      triggerHaptic("light");
      const duplicate = await duplicateIdea(id);
      if (duplicate) {
        await loadRiffs();
        triggerHaptic("success");
      }
    } catch (error) {
      Alert.alert("Erro", "Não foi possível duplicar a ideia.");
      triggerHaptic("error");
    }
  }, [loadRiffs, triggerHaptic]);

  const handleToggleFavorite = useCallback(async (id: string) => {
    try {
      triggerHaptic("light");
      await toggleFavorite(id);
      setRiffs((prev) =>
        prev.map((r) => (r.id === id ? { ...r, favorite: !r.favorite } : r))
      );
    } catch (error) {
      Alert.alert("Erro", "Não foi possível favoritar a ideia.");
    }
  }, [triggerHaptic]);

  const handleBulkDelete = useCallback(async () => {
    Alert.alert(`Apagar ${selectedIds.size} ideia(s)?`, "Essa ação não pode ser desfeita.", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Apagar",
        style: "destructive",
        onPress: async () => {
          try {
            await Promise.all([...selectedIds].map(id => deleteRiff(id)));
            setSelectionMode(false);
            setSelectedIds(new Set());
            await loadRiffs();
            triggerHaptic("success");
          } catch {
            Alert.alert("Erro", "Falha ao apagar seleção.");
          }
        },
      },
    ]);
  }, [selectedIds, loadRiffs, triggerHaptic]);

  const handleBulkMove = useCallback(async (projectId: string | null) => {
    try {
      await Promise.all([...selectedIds].map(id => updateRiff(id, { projectId })));
      setSelectionMode(false);
      setSelectedIds(new Set());
      setShowMoveModal(false);
      await loadRiffs();
      triggerHaptic("success");
    } catch {
      Alert.alert("Erro", "Falha ao mover seleção.");
    }
  }, [selectedIds, loadRiffs, triggerHaptic]);

  return {
    riffs,
    projects,
    loading,
    loadRiffs,
    handleDelete,
    handleDuplicate,
    handleToggleFavorite,
    handleBulkDelete,
    handleBulkMove,
    selectionMode,
    setSelectionMode,
    selectedIds,
    setSelectedIds,
    showMoveModal,
    setShowMoveModal,
  };
}
