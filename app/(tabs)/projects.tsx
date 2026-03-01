import { AnimatedHeaderTitle } from "@/components/AnimatedHeaderTitle";
import { Screen } from "@/components/Screen";
import { useTheme } from "@/components/ThemeProvider";
import { useHaptic } from "@/src/hooks/useHaptic";
import { useTranslation } from "@/src/i18n";
import { PROJECT_COLORS, createProject, getProjects } from "@/src/storage/projects";
import { getRiffs } from "@/src/storage/riffs";
import { Project } from "@/src/types/project";
import { Riff } from "@/src/types/riff";
import { useFocusEffect, useRouter } from "expo-router";
import { CaretRight, FolderOpen, FolderSimple, Plus } from "phosphor-react-native";
import { memo, useCallback, useState } from "react";
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
import Animated, { FadeInDown } from "react-native-reanimated";

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

const AnimatedProjectCard = memo(({ item, index, animKey }: { item: ProjectWithStats, index: number, animKey: number }) => {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useTranslation();
  
  const timeAgo = new Date(item.updatedAt).toLocaleDateString();
  const latestIdea = item.riffs.sort((a, b) => b.createdAt - a.createdAt)[0];

  return (
    <Animated.View
      key={`${animKey}-${item.id}`}
      entering={FadeInDown.delay(Math.min(index, 15) * 75).duration(320)}
    >
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
          {item.riffs.length} {item.riffs.length === 1 ? t("projects.idea_singular") : t("projects.ideas_count")}
        </Text>
        <Text style={[styles.metaText, { color: theme.mutedForeground }]}>•</Text>
        <Text style={[styles.metaText, { color: theme.mutedForeground }]}>
          {t("projects.edited")} {timeAgo}
        </Text>
      </View>

      {latestIdea ? (
        <View style={{ flexDirection: "row", marginTop: 6, flexShrink: 1 }}>
          <Text style={{ color: theme.mutedForeground, fontSize: 13, flexShrink: 0 }}>
            {t("projects.last_idea")}{" "}
          </Text>
          <Text style={{ color: theme.foreground, fontWeight: "500", fontSize: 13, flex: 1 }} numberOfLines={1} ellipsizeMode="tail">
            {latestIdea.name}
          </Text>
        </View>
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
});

export default function ProjectsList() {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useTranslation();
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

  const [animKey, setAnimKey] = useState(0);

  useFocusEffect(
    useCallback(() => {
      loadData();
      setAnimKey((k) => k + 1);
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
      Alert.alert("Error", t("projects.create_error"));
    }
  };

  const renderItem = useCallback(({ item, index }: { item: ProjectWithStats, index: number }) => (
    <AnimatedProjectCard item={item} index={index} animKey={animKey} />
  ), [animKey]);

  return (
    <Screen background={theme.background}>
      <View style={styles.header}>
        <AnimatedHeaderTitle title={t("projects.title")} fontSize={28} fontWeight="900" />
        
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
              placeholder={t("projects.name_placeholder")}
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
              <Text style={{ color: theme.mutedForeground, fontWeight: "600" }}>{t("cancel")}</Text>
            </Pressable>
            <Pressable onPress={handleCreate} style={[styles.actionBtn, { backgroundColor: theme.primary }]}>
              <Text style={{ color: theme.primaryForeground, fontWeight: "bold" }}>{t("projects.create")}</Text>
            </Pressable>
          </View>
        </View>
      )}

      <FlatList
        data={projects}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        initialNumToRender={8}
        maxToRenderPerBatch={6}
        windowSize={5}
        removeClippedSubviews={true}
        style={{ backgroundColor: theme.background }}
        contentContainerStyle={[styles.listContent, { backgroundColor: theme.background }]}
        ListEmptyComponent={
          !loading && !isCreating ? (
            <View style={styles.empty}>
              <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: theme.muted, alignItems: "center", justifyContent: "center", marginBottom: 20 }}>
                <FolderOpen size={44} color={theme.mutedForeground} weight="duotone" />
              </View>
              <Text style={[styles.emptyTitle, { color: theme.foreground }]}>
                {t("projects.empty_title")}
              </Text>
              <Text style={[styles.emptyDesc, { color: theme.mutedForeground, marginBottom: 28 }]}>
                {t("projects.empty_desc")}
              </Text>
              {/* Step hints */}
              {["Grave uma ideia na tab Ideias", "Toque e segure para selecionar", "Use \"Mover\" para adicionar ao projeto"].map((step, i) => (
                <View key={i} style={{ flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 8, paddingHorizontal: 8 }}>
                  <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: theme.primary, alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ color: theme.primaryForeground, fontSize: 10, fontWeight: "900" }}>{i + 1}</Text>
                  </View>
                  <Text style={{ color: theme.mutedForeground, fontSize: 13, flex: 1, lineHeight: 20 }}>{step}</Text>
                </View>
              ))}
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
