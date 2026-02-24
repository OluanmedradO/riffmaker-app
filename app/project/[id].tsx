import { RiffCard } from "@/components/RiffCard";
import { Screen } from "@/components/Screen";
import { useTheme } from "@/components/ThemeProvider";
import { RiffCardSkeleton } from "@/src/components/SkeletonLoader";
import { useHaptic } from "@/src/hooks/useHaptic";
import { PROJECT_COLORS, deleteProject, getProjects, updateProject } from "@/src/storage/projects";
import { deleteRiff, duplicateIdea, getRiffsByProject, toggleFavorite, updateRiff } from "@/src/storage/riffs";
import { Project } from "@/src/types/project";
import { Riff } from "@/src/types/riff";
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { FolderSimple, Microphone, MusicNote, PencilSimple } from "phosphor-react-native";
import { useCallback, useState } from "react";
import {
    Alert,
    FlatList,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

const ProjectIcon = ({ color, size = 64 }: { color?: string; size?: number }) => {
  const theme = useTheme();
  return (
    <View style={{
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: color ? color + "20" : theme.muted,
      alignItems: "center",
      justifyContent: "center",
    }}>
      <FolderSimple size={size * 0.55} color={color || theme.mutedForeground} weight={color ? "bold" : "regular"} />
    </View>
  );
};

export default function ProjectDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useTheme();
  const { triggerHaptic } = useHaptic();

  const [project, setProject] = useState<Project | null>(null);
  const [riffs, setRiffs] = useState<Riff[]>([]);
  const [loading, setLoading] = useState(true);

  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState<string | undefined>(undefined);

  const loadData = async () => {
    try {
      if (!id) return;
      
      const allProjects = await getProjects();
      const current = allProjects.find((p) => p.id === id);
      if (current) {
        setProject(current);
        setEditName(current.name);
        setEditColor(current.color);
      }

      const projectRiffs = await getRiffsByProject(id);
      setRiffs(projectRiffs);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [id])
  );

  const handleUpdateProject = async () => {
    if (!project || !id) return;
    const trimmed = editName.trim();
    if (!trimmed) {
      setIsEditing(false);
      return;
    }

    try {
      const updated = await updateProject(id, { name: trimmed, color: editColor });
      setProject(updated);
      setIsEditing(false);
      triggerHaptic("success");
    } catch (e) {
      Alert.alert("Erro", "Não foi possível atualizar o projeto.");
    }
  };

  const handleDeleteProject = () => {
    if (!project || !id) return;
    Alert.alert("Apagar projeto", `Excluir a pasta "${project.name}"?\nIsso NÃO apagará os áudios guardados nela.`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Apagar",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteProject(id);
            triggerHaptic("success");
            router.back();
          } catch (e) {
             Alert.alert("Erro", "Não foi possível excluir o projeto.");
          }
        },
      },
    ]);
  };

  const handleRemoveRiff = async (riffId: string) => {
    try {
      await updateRiff(riffId, { projectId: null });
      triggerHaptic("medium");
      await loadData();
    } catch (e) {
      Alert.alert("Erro", "Não foi possível remover do projeto.");
    }
  };

  async function handleDeleteRealRiff(riffId: string) {
    Alert.alert("Apagar ideia?", "Essa ação não pode ser desfeita.", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Apagar",
        style: "destructive",
        onPress: async () => {
          triggerHaptic("medium");
          try {
            await deleteRiff(riffId);
            await loadData();
            triggerHaptic("success");
          } catch (error) {
            Alert.alert("Erro", "Não foi possível apagar a ideia.");
            triggerHaptic("error");
          }
        },
      },
    ]);
  }

  async function handleDuplicateRiff(riffId: string) {
    try {
      triggerHaptic("light");
      const duplicate = await duplicateIdea(riffId);
      if (duplicate) {
        // Automatically put the duplicate in the same project context
        await updateRiff(duplicate.id, { projectId: id });
        await loadData();
        triggerHaptic("success");
      }
    } catch (error) {
      Alert.alert("Erro", "Não foi possível duplicar a ideia.");
      triggerHaptic("error");
    }
  }

  async function handleToggleFavorite(riffId: string) {
    try {
      triggerHaptic("light");
      await toggleFavorite(riffId);
      await loadData();
    } catch (error) {
      Alert.alert("Erro", "Não foi possível atualizar os favoritos.");
    }
  }

  if (loading || !project) {
    return (
      <>
        <Stack.Screen 
          options={{
             title: "Carregando...",
             headerStyle: { backgroundColor: theme.background },
             headerTintColor: theme.foreground,
          }} 
        />
        <Screen background={theme.background}>
          <View style={styles.loaderArea}>
            <RiffCardSkeleton />
          </View>
        </Screen>
      </>
    );
  }

  return (
    <>
      <Stack.Screen 
        options={{
           title: isEditing ? "Editando Projeto" : project.name,
           headerStyle: { backgroundColor: theme.background },
           headerTintColor: theme.foreground,
           headerRight: () => !isEditing && (
             <Pressable style={{ padding: 8 }} onPress={() => setIsEditing(!isEditing)}>
               <PencilSimple size={20} color={theme.foreground} />
             </Pressable>
           )
        }} 
      />
      <Screen background={theme.background}>
        {isEditing && (
          <View style={[styles.editBlock, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.inputsRow}>
              <View style={{ justifyContent: "center", marginRight: 12 }}>
                <ProjectIcon color={editColor} size={48} />
              </View>
              <TextInput
                style={[styles.inputName, { flex: 1, backgroundColor: theme.input, color: theme.foreground }]}
                placeholder="Nome do Projeto..."
                placeholderTextColor={theme.mutedForeground}
                value={editName}
                onChangeText={setEditName}
                autoFocus
                maxLength={30}
              />
            </View>
            
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingVertical: 4 }}>
              <Pressable
                  onPress={() => { setEditColor(undefined); triggerHaptic("light"); }}
                  style={[
                      styles.colorCircle,
                      { backgroundColor: theme.input, borderWidth: 2, borderColor: !editColor ? theme.primary : "transparent" }
                  ]}
              />
              {PROJECT_COLORS.map(c => (
                  <Pressable
                      key={c}
                      onPress={() => { setEditColor(c); triggerHaptic("light"); }}
                      style={[
                          styles.colorCircle,
                          { backgroundColor: c, borderWidth: 2, borderColor: editColor === c ? theme.foreground : "transparent" }
                      ]}
                  />
              ))}
            </ScrollView>

            <View style={styles.editActions}>
              <Pressable onPress={handleDeleteProject} style={[styles.actionBtn, { marginRight: "auto" }]}>
                <Text style={{ color: theme.destructive, fontWeight: "600" }}>Apagar</Text>
              </Pressable>
              
              <Pressable onPress={() => setIsEditing(false)} style={styles.actionBtn}>
                <Text style={{ color: theme.mutedForeground, fontWeight: "600" }}>Cancelar</Text>
              </Pressable>
              <Pressable onPress={handleUpdateProject} style={[styles.actionBtn, { backgroundColor: theme.primary }]}>
                <Text style={{ color: theme.primaryForeground, fontWeight: "bold" }}>Salvar</Text>
              </Pressable>
            </View>
          </View>
        )}

        <View style={styles.projectHeaderBanner}>
           <View style={{ marginBottom: 12 }}>
             <ProjectIcon color={project.color} size={80} />
           </View>
           <Text style={[styles.headerBannerTitle, { color: project.color || theme.foreground }]}>
              {project.name}
           </Text>
           <Text style={[styles.metaInfo, { color: theme.mutedForeground }]}>
              {riffs.length} {riffs.length === 1 ? "ideia armazenada" : "ideias armazenadas"}
           </Text>
        </View>

        <FlatList
          data={riffs}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 60 }}
          renderItem={({ item }) => (
            <RiffCard
              riff={item}
              onDelete={handleDeleteRealRiff}
              onDuplicate={handleDuplicateRiff}
              onToggleFavorite={handleToggleFavorite}
              onPress={(id) => router.push(`/riff/${id}`)}
              projectColor={project.color}
            />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <MusicNote size={48} color={theme.mutedForeground} weight="duotone" />
              <Text style={[styles.emptyTitle, { color: theme.foreground }]}>Essa pasta está vazia</Text>
              <Text style={[styles.emptyDesc, { color: theme.mutedForeground }]}>
                Navegue até a biblioteca, adicione uma Ideia e mova ela para este projeto.
              </Text>
            </View>
          }
        />
        
        {/* Floating Add Riff Button mapped to new recording shortcut! */}
        <Pressable 
          style={({ pressed }) => [
            styles.fab, 
            { backgroundColor: theme.primary },
            pressed && { opacity: 0.8 }
          ]}
          onPress={() => router.push("/create")} // Simplest way to add a new riff from here
        >
          <Microphone size={24} color={theme.primaryForeground} weight="fill" />
        </Pressable>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  loaderArea: { paddingVertical: 40 },
  projectHeaderBanner: {
    alignItems: "center",
    marginBottom: 24,
    marginTop: 10,
  },
  headerIcon: {
    fontSize: 54,
    marginBottom: 8,
  },
  headerBannerTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 4,
  },
  metaInfo: {
    fontSize: 14,
  },
  editBlock: {
    marginBottom: 20,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 16,
  },
  inputsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  inputName: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  editActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 12,
  },
  actionBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    marginHorizontal: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDesc: {
    textAlign: "center",
    fontSize: 14,
  },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  colorCircle: {
      width: 32,
      height: 32,
      borderRadius: 16,
  }
});
