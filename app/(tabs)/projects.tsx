import { Screen } from "@/src/shared/ui/Screen";
import { useTheme } from "@/src/shared/theme/ThemeProvider";
import { useAccess } from "@/src/access/AccessProvider";
import { useAlert } from "@/src/contexts/AlertContext";
import { useHaptic } from "@/src/shared/hooks/useHaptic";
import { useProGate } from '@/src/shared/hooks/useProGate';
import { useTranslation } from "@/src/i18n";
import { PROJECT_COLORS, createProject, getProjects } from "@/src/data/storage/projects";
import { getRiffs } from "@/src/data/storage/riffs";
import { Project } from "@/src/domain/types/project";
import { Riff } from "@/src/domain/types/riff";
import { useFocusEffect, useRouter } from "expo-router";
import { CaretRight, FolderOpen, FolderSimple, Plus } from "phosphor-react-native";
import { memo, useCallback, useRef, useState } from "react";
import {
    DeviceEventEmitter,
    Pressable,
    Animated as RNAnimated,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type ProjectWithStats = Project & { riffs: Riff[] };

const ProjectIcon = ({ color, emoji, size = 40 }: { color?: string; emoji?: string; size?: number }) => {
  const theme = useTheme();
  return (
    <View style={{
      width: size,
      height: size,
      borderRadius: size / 4,
      backgroundColor: color || theme.muted,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 12,
      shadowColor: color || "#000",
      shadowOpacity: 0.3,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 3 },
      elevation: 4
    }}>
      {emoji ? (
        <Text style={{ fontSize: size * 0.5 }}>{emoji}</Text>
      ) : (
        <FolderSimple size={size * 0.55} color={theme.background} weight="bold" />
      )}
    </View>
  );
};

const AnimatedProjectCard = memo(({ item, index, animKey }: { item: ProjectWithStats, index: number, animKey: number }) => {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useTranslation();
  
  return (
    <Animated.View
      key={`${animKey}-${item.id}`}
      entering={FadeInDown.delay(Math.min(index, 15) * 75).duration(320)}
    >
      <Pressable
      style={({ pressed }) => [
        styles.projectCard,
        { 
          backgroundColor: item.color ? `${item.color}15` : theme.card, 
          borderColor: item.color ? `${item.color}30` : theme.border,
          borderWidth: 1,
        },
        pressed && { opacity: 0.8 },
      ]}
      onPress={() => router.push(`/project/${item.id}` as any)}
    >
      <View style={styles.projectHeader}>
        <View style={styles.titleRow}>
          <ProjectIcon color={item.color} emoji={item.emoji} size={36} />
          <Text style={[styles.projectName, { color: theme.foreground }]} numberOfLines={1}>
            {item.name}
          </Text>
        </View>
        <CaretRight size={16} color={theme.mutedForeground} weight="bold" />
      </View>

      <View style={styles.projectMeta}>
        <View style={[styles.riffCount, { backgroundColor: item.color ? `${item.color}25` : theme.muted }]}>
          <Text style={[styles.metaText, { color: item.color || theme.mutedForeground, fontWeight: "700" }]}>
            {item.riffs.length} {item.riffs.length === 1 ? t("projects.idea_singular") : t("projects.ideas_count")}
          </Text>
        </View>
      </View>
    </Pressable>
    </Animated.View>
  );
});

export default function ProjectsList() {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useTranslation();
  const { triggerHaptic } = useHaptic();
  const requirePro = useProGate();
  const { can } = useAccess();
  const { showAlert } = useAlert();
  const insets = useSafeAreaInsets();

  const [projects, setProjects] = useState<ProjectWithStats[]>([]);
  const [recentRiffs, setRecentRiffs] = useState<Riff[]>([]);
  const [loading, setLoading] = useState(true);

  // New Project Form State
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState<string | undefined>(undefined);
  const [newEmoji, setNewEmoji] = useState("");

  const scrollY = useRef(new RNAnimated.Value(0)).current;
  const lastScrollY = useRef(0);
  const isTabBarVisible = useRef(true);

  const loadData = async () => {
    try {
      const projData = await getProjects();
      const allRiffs = await getRiffs();
      
      const enriched: ProjectWithStats[] = projData.map((p) => {
        const pRiffs = allRiffs.filter(r => r.projectId === p.id);
        return { ...p, riffs: pRiffs };
      });
      
      setProjects(enriched);

      const recent = allRiffs.filter(r => !r.projectId && !r.corrupted).sort((a,b) => b.createdAt - a.createdAt).slice(0, 3);
      setRecentRiffs(recent);
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

      // Ensure tabbar is visible when entering
      DeviceEventEmitter.emit("tabBarVisibility", true);
      isTabBarVisible.current = true;

      const scrollListenerId = scrollY.addListener(({ value }: { value: number }) => {
        const diff = value - lastScrollY.current;
        if (Math.abs(diff) < 5) return;

        if (value > 150 && diff > 0 && isTabBarVisible.current) {
          isTabBarVisible.current = false;
          DeviceEventEmitter.emit("tabBarVisibility", false);
        } else if ((value < 50 || diff < -30) && !isTabBarVisible.current) {
          isTabBarVisible.current = true;
          DeviceEventEmitter.emit("tabBarVisibility", true);
        }
        lastScrollY.current = value;
      });

      return () => {
        scrollY.removeListener(scrollListenerId);
      };
    }, [scrollY])
  );

  const handleCreate = async () => {
    const trimmed = newName.trim();
    if (!trimmed) {
      setIsCreating(false);
      return;
    }

    try {
      await createProject({ name: trimmed, color: newColor, emoji: newEmoji.trim() || undefined });
      setNewName("");
      setNewColor(undefined);
      setNewEmoji("");
      setIsCreating(false);
      triggerHaptic("success");
      loadData();
    } catch (e) {
      showAlert(t("idea.error"), t("projects.create_error"));
    }
  };

  const renderItem = useCallback(({ item, index }: { item: ProjectWithStats, index: number }) => (
    <AnimatedProjectCard item={item} index={index} animKey={animKey} />
  ), [animKey]);

  return (
    <Screen background={theme.background}>
      <View style={{ height: insets.top + 4 }} />

      {isCreating && (
        <View style={[styles.createBlock, { backgroundColor: theme.card, borderColor: theme.border }]}>
          {projects.length >= 1 && !can("unlimitedProjects") ? (
            <View style={{ padding: 16, alignItems: 'center' }}>
              <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: theme.proPurple ? theme.proPurple + '20' : '#7C3AED20', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                <FolderOpen size={24} color={theme.proPurple ?? '#7C3AED'} weight="duotone" />
              </View>
              <Text style={{ fontSize: 16, fontWeight: "800", color: theme.foreground, marginBottom: 8, textAlign: 'center' }}>
                Organize todas as suas idéias
              </Text>
              <Text style={{ fontSize: 13, color: theme.mutedForeground, textAlign: 'center', marginBottom: 16, lineHeight: 20 }}>
                O plano gratuito permite 1 projeto. Desbloqueie organização ilimitada com o RiffMaker PRO.
              </Text>
              <View style={{ flexDirection: 'row', gap: 10, width: '100%' }}>
                <Pressable style={{ flex: 1, paddingVertical: 12, borderRadius: 8, backgroundColor: theme.input, alignItems: 'center' }} onPress={() => setIsCreating(false)}>
                  <Text style={{ color: theme.foreground, fontWeight: "600" }}>Agora não</Text>
                </Pressable>
                <Pressable style={{ flex: 1, paddingVertical: 12, borderRadius: 8, backgroundColor: theme.proPurple ?? '#7C3AED', alignItems: 'center' }} onPress={() => { setIsCreating(false); requirePro(); }}>
                  <Text style={{ color: "#fff", fontWeight: "700" }}>Conhecer PRO</Text>
                </Pressable>
              </View>
            </View>
          ) : (
            <>
              <View style={styles.createInputs}>
                <View style={{ justifyContent: "center", marginRight: 12 }}>
                  <TextInput
                    style={[styles.emojiInput, { backgroundColor: theme.input, color: theme.foreground }]}
                    placeholder="📁"
                    placeholderTextColor={theme.mutedForeground}
                    value={newEmoji}
                    onChangeText={(t) => setNewEmoji(t.replace(/[\w\s]/g, '').slice(0, 2))}
                    maxLength={4} // Allow some joined emojis
                    textAlign="center"
                  />
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
            </>
          )}
        </View>
      )}

      <RNAnimated.FlatList
        data={projects}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        initialNumToRender={6}
        maxToRenderPerBatch={4}
        windowSize={5}
        updateCellsBatchingPeriod={100}
        removeClippedSubviews={true}
        onScroll={RNAnimated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
        style={{ backgroundColor: theme.background }}
        contentContainerStyle={[styles.listContent, { backgroundColor: theme.background, paddingBottom: 120 }]}
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
              <Pressable
                onPress={() => setIsCreating(true)}
                style={({ pressed }) => [{
                  marginTop: 12,
                  backgroundColor: theme.primary,
                  paddingHorizontal: 24,
                  paddingVertical: 14,
                  borderRadius: 24,
                  opacity: pressed ? 0.8 : 1,
                  shadowColor: theme.primary,
                  shadowOpacity: 0.3,
                  shadowRadius: 10,
                  shadowOffset: { width: 0, height: 4 }
                }]}
              >
                <Text style={{ color: theme.primaryForeground, fontWeight: "bold", fontSize: 16 }}>
                  Criar Projeto
                </Text>
              </Pressable>

              {recentRiffs.length > 0 && (
                <View style={{ width: '100%', marginTop: 32, paddingHorizontal: 10 }}>
                  <Text style={{ color: theme.mutedForeground, fontWeight: "bold", marginBottom: 16, textTransform: "uppercase", fontSize: 12 }}>
                    Ideias Recentes Perdidas
                  </Text>
                  {recentRiffs.map(r => (
                     <View key={r.id} style={{ flexDirection: "row", alignItems: "center", backgroundColor: theme.card, padding: 12, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: theme.border }}>
                       <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: theme.primary + "20", alignItems: "center", justifyContent: "center", marginRight: 12 }}>
                         <FolderOpen size={16} color={theme.primary} weight="bold" />
                       </View>
                       <View style={{ flex: 1 }}>
                         <Text style={{ color: theme.foreground, fontWeight: "600", fontSize: 14 }} numberOfLines={1}>{r.name}</Text>
                       </View>
                       <Pressable onPress={() => {
                           router.push({
                               pathname: "/create",
                               params: { riffId: r.id } // Just navigating to create maybe? or opening something
                           } as any);
                       }} style={{ padding: 6, backgroundColor: theme.input, borderRadius: 8 }}>
                           <Text style={{ color: theme.foreground, fontSize: 12, fontWeight: "bold" }}>Usar</Text>
                       </Pressable>
                     </View>
                  ))}
                </View>
              )}
            </View>
          ) : null
        }
      />

      {!isCreating && (
        <Animated.View entering={FadeInDown.duration(400).delay(100)} style={styles.fabContainer}>
          <Pressable
            onPress={() => {
              triggerHaptic("light");
              setIsCreating(true);
            }}
            style={({ pressed }) => [
              styles.fab,
              { backgroundColor: theme.primary },
              pressed && { opacity: 0.8, transform: [{ scale: 0.95 }] }
            ]}
          >
            <Plus size={28} color={theme.primaryForeground} weight="bold" />
          </Pressable>
        </Animated.View>
      )}
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
  riffCount: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: "flex-start",
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
  emojiInput: {
    width: 48,
    height: 48,
    borderRadius: 12,
    fontSize: 24,
    justifyContent: "center",
    alignItems: "center",
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
  },
  fabContainer: {
    position: 'absolute',
    bottom: 110, // Higher to clear the Dock
    right: 20,
    zIndex: 100,
  },
  fab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  }
});



