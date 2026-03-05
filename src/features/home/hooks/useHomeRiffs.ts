import { showToast } from "@/src/shared/ui/AppToast";
import { getProjects } from "@/src/data/storage/projects";
import { deleteRiff, duplicateIdea, getRiffs, toggleFavorite, updateRiff } from "@/src/data/storage/riffs";
import { Project } from "@/src/domain/types/project";
import { Riff } from "@/src/domain/types/riff";
import { useCallback, useEffect, useState } from "react";
import { DeviceEventEmitter } from "react-native";
import { useAlert } from "@/src/contexts/AlertContext";
import { useHaptic } from "@/src/shared/hooks/useHaptic";

export function useHomeRiffs() {
  const [riffs, setRiffs] = useState<Riff[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const { triggerHaptic } = useHaptic();

  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showMoveModal, setShowMoveModal] = useState(false);
  const { showAlert } = useAlert();

  const loadRiffs = useCallback(
    async (onLoaded?: () => void) => {
      setLoading(true);
      try {
        const [riffsData, projsData] = await Promise.all([getRiffs(), getProjects()]);
        setRiffs(riffsData);
        setProjects(projsData);
        onLoaded?.();
      } catch {
        showAlert("Erro", "Não foi possível carregar as ideias.");
      } finally {
        setLoading(false);
      }
    },
    [showAlert]
  );

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener("riff_created", () => {
      loadRiffs();
    });
    return () => sub.remove();
  }, [loadRiffs]);

  const handleDelete = useCallback(
    (id: string) => {
      showAlert("Apagar ideia?", "Essa ação não pode ser desfeita.", [
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
              showToast({ type: "success", message: "Ideia apagada." });
            } catch {
              showAlert("Erro", "Não foi possível apagar a ideia.");
              triggerHaptic("error");
            }
          },
        },
      ]);
    },
    [loadRiffs, triggerHaptic, showAlert]
  );

  const handleDuplicate = useCallback(
    async (id: string) => {
      try {
        triggerHaptic("light");
        const duplicate = await duplicateIdea(id);
        if (duplicate) {
          await loadRiffs();
          triggerHaptic("success");
          showToast({ type: "success", message: "Ideia duplicada!" });
        }
      } catch {
        showAlert("Erro", "Não foi possível duplicar a ideia.");
        triggerHaptic("error");
      }
    },
    [loadRiffs, triggerHaptic, showAlert]
  );

  const handleToggleFavorite = useCallback(
    async (id: string) => {
      try {
        triggerHaptic("light");
        await toggleFavorite(id);
        setRiffs((prev) => prev.map((riff) => (riff.id === id ? { ...riff, favorite: !riff.favorite } : riff)));
      } catch {
        showAlert("Erro", "Não foi possível favoritar a ideia.");
      }
    },
    [triggerHaptic, showAlert]
  );

  const handleBulkDelete = useCallback(async () => {
    showAlert(`Apagar ${selectedIds.size} ideia(s)?`, "Essa ação não pode ser desfeita.", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Apagar",
        style: "destructive",
        onPress: async () => {
          try {
            for (const id of selectedIds) {
              await deleteRiff(id);
            }
            setSelectionMode(false);
            setSelectedIds(new Set());
            await loadRiffs();
            triggerHaptic("success");
            showToast({ type: "success", message: "Ideias apagadas." });
          } catch {
            showAlert("Erro", "Falha ao apagar seleção.");
          }
        },
      },
    ]);
  }, [selectedIds, loadRiffs, triggerHaptic, showAlert]);

  const handleBulkMove = useCallback(
    async (projectId: string | null) => {
      try {
        for (const id of selectedIds) {
          await updateRiff(id, { projectId });
        }
        setSelectionMode(false);
        setSelectedIds(new Set());
        setShowMoveModal(false);
        await loadRiffs();
        triggerHaptic("success");
        const isSingular = selectedIds.size === 1;
        showToast({
          type: "success",
          message: isSingular ? "Ideia movida ao projeto!" : "Ideias movidas ao projeto!",
        });
      } catch {
        showAlert("Erro", "Falha ao mover seleção.");
      }
    },
    [selectedIds, loadRiffs, triggerHaptic, showAlert]
  );

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

