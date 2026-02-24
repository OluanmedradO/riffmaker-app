import { Screen } from "@/components/Screen";
import { useTheme } from "@/components/ThemeProvider";
import { useHaptic } from "@/src/hooks/useHaptic";
import { PROJECT_COLORS, createProject, getProjects } from "@/src/storage/projects";
import { getRiffs } from "@/src/storage/riffs";
import { Project } from "@/src/types/project";
import { Riff } from "@/src/types/riff";
import { useFocusEffect, useRouter } from "expo-router";
import { CaretRight, FolderOpen, FolderSimple, Plus } from "phosphor-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import {
    Alert,
    Animated,
    Easing,
    FlatList,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

type ProjectWithStats = Project & { riffs: Riff[] };

const ProjectIcon = ({ color, size = 40 }: { color?: string; size?: number }) => {
  const theme = useTheme();
  return (
    <View style={{
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: color ? color + "20" : theme.muted,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 10
    }}>
      <FolderSimple size={size * 0.55} color={color || theme.mutedForeground} weight={color ? "bold" : "regular"} />
    </View>
  );
};

export default function ProjectsList() {
  const theme = useTheme();
  const router = useRouter();
  const { triggerHaptic } = useHaptic();

  const [projects, setProjects] = useState<ProjectWithStats[]>([]);
  const [loading, setLoading] = useState(true);

  // New Project Form State
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState<string | undefined>(undefined);

  const loadData = async () => {
    try {
      const projData = await getProjects();
      const allRiffs = await getRiffs();
      
      const enriched: ProjectWithStats[] = projData.map((p) => {
        const pRiffs = allRiffs.filter(r => r.projectId === p.id);
        return { ...p, riffs: pRiffs };
      });
      
      setProjects(enriched);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const handleCreate = async () => {
    const trimmed = newName.trim();
    if (!trimmed) {
      setIsCreating(false);
      return;
    }

    try {
      await createProject({ name: trimmed, color: newColor });
      setNewName("");
      setNewColor(undefined);
      setIsCreating(false);
      triggerHaptic("success");
      loadData();
    } catch (e) {
      Alert.alert("Erro", "Não foi possível criar o projeto.");
    }
  };

  const AnimatedProjectCard = ({ item, index }: { item: ProjectWithStats, index: number }) => {
    const timeAgo = new Date(item.updatedAt).toLocaleDateString();
    
    // Animação cascata
    const opacityAnim = useRef(new Animated.Value(0)).current;
    const translateYAnim = useRef(new Animated.Value(15)).current;

    useEffect(() => {
      Animated.parallel([
        Animated.timing(opacityAnim, { toValue: 1, duration: 250, delay: index * 60, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(translateYAnim, { toValue: 0, duration: 250, delay: index * 60, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]).start();
    }, [index]);

    const latestIdea = item.riffs.sort((a, b) => b.createdAt - a.createdAt)[0];

    return (
      <Animated.View style={{ opacity: opacityAnim, transform: [{ translateY: translateYAnim }] }}>
        <Pressable
        style={({ pressed }) => [
          styles.projectCard,
          { 
            backgroundColor: theme.card, 
            borderColor: theme.border,
            borderWidth: 1,
          },
          pressed && { opacity: 0.8 },
        ]}
        onPress={() => router.push(`/project/${item.id}` as any)}
      >
        <View style={styles.projectHeader}>
          <View style={styles.titleRow}>
            <ProjectIcon color={item.color} size={36} />
            <Text style={[styles.projectName, { color: theme.foreground }]} numberOfLines={1}>
              {item.name}
            </Text>
          </View>
          <CaretRight size={16} color={theme.mutedForeground} weight="bold" />
        </View>

        <View style={styles.projectMeta}>
          <Text style={[styles.metaText, { color: theme.mutedForeground }]}>
            {item.riffs.length} {item.riffs.length === 1 ? "ideia" : "ideias"}
          </Text>
          <Text style={[styles.metaText, { color: theme.mutedForeground }]}>•</Text>
          <Text style={[styles.metaText, { color: theme.mutedForeground }]}>
            Editado {timeAgo}
          </Text>
        </View>

        {latestIdea ? (
          <Text style={{ color: theme.mutedForeground, fontSize: 13, marginTop: 6 }} numberOfLines={1}>
            Última: <Text style={{ color: theme.foreground, fontWeight: "500" }}>{latestIdea.name}</Text>
          </Text>
        ) : null}
        
        {/* Mini Waveform */}
        {item.riffs.length > 0 && item.riffs.some(r => r.waveform && r.waveform.length > 0) && (
           <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 14, opacity: 0.25, height: 16 }}>
             {item.riffs.find(r => r.waveform && r.waveform.length > 0)?.waveform?.slice(10, 30).map((lvl, idx) => (
               <View key={idx} style={{ width: 3, height: Math.max(0.1, lvl < 0 ? (lvl + 160)/160 : lvl) * 16, backgroundColor: theme.mutedForeground, borderRadius: 2 }} />
             ))}
           </View>
        )}
      </Pressable>
      </Animated.View>
    );
  };

  const renderItem = ({ item, index }: { item: ProjectWithStats, index: number }) => (
    <AnimatedProjectCard item={item} index={index} />
  );

  return (
    <Screen background={theme.background}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.foreground }]}>Projetos</Text>
        
        {!isCreating && (
          <Pressable 
            onPress={() => {
              triggerHaptic("light");
              setIsCreating(true);
            }} 
            style={styles.addButton}
            hitSlop={15}
          >
            <Plus size={20} color={theme.primary} weight="bold" />
          </Pressable>
        )}
      </View>

      {isCreating && (
        <View style={[styles.createBlock, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.createInputs}>
            <View style={{ justifyContent: "center" }}>
              <ProjectIcon color={newColor} size={48} />
            </View>
            <TextInput
              style={[styles.inputName, { flex: 1, backgroundColor: theme.input, color: theme.foreground }]}
              placeholder="Nome do Projeto..."
              placeholderTextColor={theme.mutedForeground}
              value={newName}
              onChangeText={setNewName}
              autoFocus
              maxLength={30}
              onSubmitEditing={handleCreate}
            />
          </View>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingVertical: 4 }}>
            <Pressable
                onPress={() => { setNewColor(undefined); triggerHaptic("light"); }}
                style={[
                    styles.colorCircle,
                    { backgroundColor: theme.input, borderWidth: 2, borderColor: !newColor ? theme.primary : "transparent" }
                ]}
            />
            {PROJECT_COLORS.map(c => (
                <Pressable
                    key={c}
                    onPress={() => { setNewColor(c); triggerHaptic("light"); }}
                    style={[
                        styles.colorCircle,
                        { backgroundColor: c, borderWidth: 2, borderColor: newColor === c ? theme.foreground : "transparent" }
                    ]}
                />
            ))}
          </ScrollView>

          <View style={styles.createActions}>
            <Pressable onPress={() => setIsCreating(false)} style={styles.actionBtn}>
              <Text style={{ color: theme.mutedForeground, fontWeight: "600" }}>Cancelar</Text>
            </Pressable>
            <Pressable onPress={handleCreate} style={[styles.actionBtn, { backgroundColor: theme.primary }]}>
              <Text style={{ color: theme.primaryForeground, fontWeight: "bold" }}>Criar</Text>
            </Pressable>
          </View>
        </View>
      )}

      <FlatList
        data={projects}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          !loading && !isCreating ? (
            <View style={styles.empty}>
              <FolderOpen size={64} color={theme.mutedForeground} weight="duotone" />
              <Text style={[styles.emptyTitle, { color: theme.foreground }]}>
                Nenhum projeto ainda
              </Text>
              <Text style={[styles.emptyDesc, { color: theme.mutedForeground }]}>
                Crie um projeto para organizar suas ideias.
              </Text>
            </View>
          ) : null
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
  },
  addButton: {
    padding: 8,
  },
  listContent: {
    padding: 20,
    paddingTop: 0,
    paddingBottom: 40,
  },
  projectCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  projectHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  emoji: {
    fontSize: 22,
  },
  fallbackIcon: {
    marginRight: 2,
  },
  projectName: {
    fontSize: 18,
    fontWeight: "bold",
  },
  projectMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaText: {
    fontSize: 13,
  },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDesc: {
    textAlign: "center",
    fontSize: 14,
  },
  createBlock: {
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 16,
  },
  createInputs: {
    flexDirection: "row",
    gap: 12,
  },
  inputName: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  createActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  actionBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  colorCircle: {
      width: 32,
      height: 32,
      borderRadius: 16,
  }
});
