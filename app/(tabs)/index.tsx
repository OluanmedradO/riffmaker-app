import { RiffCard } from "@/components/RiffCard";
import { useTheme } from "@/components/ThemeProvider";
import { RiffCardSkeleton } from "@/src/components/SkeletonLoader";
import { SORT_OPTIONS } from "@/src/constants/app";
import { useHaptic } from "@/src/hooks/useHaptic";
import { getProjects } from "@/src/storage/projects";
import {
    deleteRiff,
    duplicateIdea,
    getRiffs,
    toggleFavorite,
    updateRiff,
} from "@/src/storage/riffs";
import { Project } from "@/src/types/project";
import { RecordingType, Riff } from "@/src/types/riff";
import {
    calculateStreak,
    getFavoritesThisWeek,
    getInboxRiffs,
    getRiffsWithMarkers,
    getUnnamedRiffs,
    getWeeklyProgress,
    searchRiffs,
    SortOption,
    sortRiffs
} from "@/src/utils/riffUtils";
import { BlurView } from "expo-blur";
import { useFocusEffect, useRouter } from "expo-router";
import {
    BookmarkSimple,
    CaretDown,
    CaretUp,
    Check,
    DotsThree,
    FolderSimple,
    Guitar,
    MagnifyingGlass,
    Microphone,
    Play,
    SlidersHorizontal,
    Sparkle,
    SpeakerHifi,
    Star,
    Tag,
    Trash,
    Waveform,
    X
} from "phosphor-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    Alert,
    Animated,
    Easing,
    Modal,
    Pressable,
    ScrollView,
    SectionList,
    StyleSheet,
    Text,
    TextInput,
    View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);

const PRODUCER_TAGS = [
  "Refrão", "Batida", "Baixo", "Melodia", "Voz", "Intro", "Drop", "Subida", "Final"
];

const RECORDING_TYPES: { id: RecordingType; label: string; icon: any }[] = [
  { id: "Guitar", label: "Guitarra", icon: Guitar },
  { id: "Beat", label: "Batida", icon: Waveform },
  { id: "Vocal", label: "Voz", icon: Microphone },
  { id: "Melody", label: "Melodia", icon: Play },
  { id: "Bass", label: "Baixo", icon: SpeakerHifi },
  { id: "Other", label: "Outro", icon: DotsThree },
];

const AnimatedSectionList = Animated.createAnimatedComponent(SectionList<Riff>);

function groupRiffsByDate(riffs: Riff[], sortBy: SortOption) {
  if (sortBy !== "newest" && sortBy !== "oldest") {
    return [{ title: "IDEIAS", data: riffs }];
  }

  const groups: Record<string, Riff[]> = {
    "HOJE": [],
    "ONTEM": [],
    "ESTA SEMANA": [],
    "MAIS ANTIGAS": []
  };
  
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterday = today - 86400000;
  const thisWeek = today - 86400000 * 7;
  
  for (const r of riffs) {
    if (r.createdAt >= today) groups["HOJE"].push(r);
    else if (r.createdAt >= yesterday) groups["ONTEM"].push(r);
    else if (r.createdAt >= thisWeek) groups["ESTA SEMANA"].push(r);
    else groups["MAIS ANTIGAS"].push(r);
  }
  
  const sections = [];
  if (sortBy === "oldest") {
    if (groups["MAIS ANTIGAS"].length) sections.push({ title: "MAIS ANTIGAS", data: groups["MAIS ANTIGAS"] });
    if (groups["ESTA SEMANA"].length) sections.push({ title: "ESTA SEMANA", data: groups["ESTA SEMANA"] });
    if (groups["ONTEM"].length) sections.push({ title: "ONTEM", data: groups["ONTEM"] });
    if (groups["HOJE"].length) sections.push({ title: "HOJE", data: groups["HOJE"] });
  } else {
    if (groups["HOJE"].length) sections.push({ title: "HOJE", data: groups["HOJE"] });
    if (groups["ONTEM"].length) sections.push({ title: "ONTEM", data: groups["ONTEM"] });
    if (groups["ESTA SEMANA"].length) sections.push({ title: "ESTA SEMANA", data: groups["ESTA SEMANA"] });
    if (groups["MAIS ANTIGAS"].length) sections.push({ title: "MAIS ANTIGAS", data: groups["MAIS ANTIGAS"] });
  }
  
  return sections;
}

export default function Home() {
  const theme = useTheme();
  const router = useRouter();
  const { triggerHaptic } = useHaptic();
  const insets = useSafeAreaInsets();

  const [riffs, setRiffs] = useState<Riff[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [showSortMenu, setShowSortMenu] = useState(false);

  const [projects, setProjects] = useState<Project[]>([]);
  const [activeFolder, setActiveFolder] = useState<string | null>(null);
  const [activeTags, setActiveTags] = useState<string[]>([]);
  const [activeTypes, setActiveTypes] = useState<RecordingType[]>([]);
  const [mustHaveMarkers, setMustHaveMarkers] = useState(false);
  const [mustHaveFavorite, setMustHaveFavorite] = useState(false);
  const [expandedFilter, setExpandedFilter] = useState<"projects" | "tags" | "types" | null>(null);
  const [riffToRename, setRiffToRename] = useState<Riff | null>(null);
  const [activeSmartList, setActiveSmartList] = useState<"inbox" | "markers" | "favorites-week" | "unnamed" | null>(null);

  // Multi-select
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showMoveModal, setShowMoveModal] = useState(false);

  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchScaleAnim = useRef(new Animated.Value(1)).current;
  const searchGlowAnim = useRef(new Animated.Value(0)).current;

  const fadeAnim = useState(new Animated.Value(0))[0];
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const overlayOpacityAnim = useRef(new Animated.Value(0)).current;
  const scrollY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.03, duration: 2500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 2500, useNativeDriver: true }),
      ])
    ).start();
  }, [pulseAnim]);

  async function loadRiffs() {
    setLoading(true);
    try {
      const data = await getRiffs();
      setRiffs(data);
      
      const projs = await getProjects();
      setProjects(projs);

      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 250,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    } catch (error) {
      Alert.alert("Erro", "Não foi possível carregar as ideias.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
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
  }

  async function handleDuplicate(id: string) {
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
  }

  async function handleToggleFavorite(id: string) {
    try {
      triggerHaptic("light");
      await toggleFavorite(id);
      setRiffs((prev) =>
        prev.map((r) => (r.id === id ? { ...r, favorite: !r.favorite } : r)),
      );
    } catch (error) {
      Alert.alert("Erro", "Não foi possível favoritar a ideia.");
    }
  }

  useFocusEffect(
    useCallback(() => {
      loadRiffs();
      overlayOpacityAnim.setValue(0); // reset immersion overlay when returning
    }, []),
  );

  const handleImmersiveRecord = () => {
    triggerHaptic("medium");
    Animated.timing(overlayOpacityAnim, {
      toValue: 1,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      router.push("/create");
    });
  };

  const advancedFiltered = useMemo(() => riffs.filter((r) => {
    if (activeFolder === "none" && r.projectId) return false;
    if (activeFolder !== null && activeFolder !== "none" && r.projectId !== activeFolder) return false;
    if (mustHaveMarkers && (!r.markers || r.markers.length === 0)) return false;
    if (mustHaveFavorite && !r.favorite) return false;
    if (activeTags.length > 0) {
      if (!r.tags) return false;
      const hasAllTags = activeTags.every(t => r.tags!.includes(t));
      if (!hasAllTags) return false;
    }
    if (activeTypes.length > 0) {
      if (!r.type || !activeTypes.includes(r.type)) return false;
    }
    return true;
  }), [riffs, activeFolder, mustHaveMarkers, mustHaveFavorite, activeTags, activeTypes]);

  // Smart list computed values
  const smartListCounts = useMemo(() => ({
    inbox: getInboxRiffs(riffs).length,
    markers: getRiffsWithMarkers(riffs).length,
    favWeek: getFavoritesThisWeek(riffs).length,
    unnamed: getUnnamedRiffs(riffs).length,
  }), [riffs]);

  const filteredBySmartList = useMemo(() => {
    if (!activeSmartList) return advancedFiltered;
    switch (activeSmartList) {
      case "inbox": return getInboxRiffs(advancedFiltered);
      case "markers": return getRiffsWithMarkers(advancedFiltered);
      case "favorites-week": return getFavoritesThisWeek(advancedFiltered);
      case "unnamed": return getUnnamedRiffs(advancedFiltered);
      default: return advancedFiltered;
    }
  }, [advancedFiltered, activeSmartList]);

  const filteredRiffs = useMemo(
    () => sortRiffs(searchRiffs(filteredBySmartList, search), sortBy),
    [filteredBySmartList, search, sortBy]
  );
  const sections = useMemo(() => groupRiffsByDate(filteredRiffs, sortBy), [filteredRiffs, sortBy]);

  const totalIdeias = riffs.length;
  const totalFavoritas = riffs.filter(r => r.favorite).length;
  const totalIdeiasAgrupados = riffs.filter(r => {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    return r.createdAt >= startOfDay;
  }).length;

  const hasIdeasToday = totalIdeiasAgrupados > 0;
  const streak = useMemo(() => calculateStreak(riffs), [riffs]);
  const weeklyProgress = useMemo(() => getWeeklyProgress(riffs), [riffs]);

  const renderListHeader = useCallback(() => {
    return null;
  }, []);

  const headerHeight = scrollY.interpolate({
    inputRange: [0, 60],
    outputRange: [100, 64],
    extrapolate: 'clamp',
  });

  const headerTitleScale = scrollY.interpolate({
    inputRange: [0, 60],
    outputRange: [1, 0.82],
    extrapolate: 'clamp',
  });
  
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 30],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const headerBgOpacity = scrollY.interpolate({
    inputRange: [0, 60],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const handleSearchFocus = () => {
    setIsSearchFocused(true);
    Animated.parallel([
      Animated.timing(searchScaleAnim, { toValue: 1.01, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(searchGlowAnim, { toValue: 1, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: false })
    ]).start();
  };

  const handleSearchBlur = () => {
    setIsSearchFocused(false);
    Animated.parallel([
      Animated.timing(searchScaleAnim, { toValue: 1, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(searchGlowAnim, { toValue: 0, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: false })
    ]).start();
  };

  const handleDeleteRiff = useCallback((id: string) => handleDelete(id), []);

  const handlePressRiff = useCallback((id: string) => {
    if (selectionMode) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id); else next.add(id);
        return next;
      });
      return;
    }
    triggerHaptic("light");
    Animated.timing(overlayOpacityAnim, {
      toValue: 1,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      router.push(`/riff/${id}`);
    });
  }, [router, triggerHaptic, overlayOpacityAnim, selectionMode]);

  const handleLongPressCard = useCallback((id: string) => {
    if (!selectionMode) {
      triggerHaptic("medium");
      setSelectionMode(true);
    }
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, [selectionMode, triggerHaptic]);

  async function handleBulkDelete() {
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
  }

  async function handleBulkMove(projectId: string | null) {
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
  }

  const getProjectColor = useCallback((projectId?: string | null) => {
    return projects.find(p => p.id === projectId)?.color;
  }, [projects]);

  const renderItem = useCallback(({ item, index, section }: { item: Riff, index: number, section: any }) => {
    const isFirstOfDay = index === 0 && section.title === "Hoje";
    return (
      <View style={{ paddingHorizontal: 20 }}>
        {/* Timeline connector visual line on the left behind the cards */}
        <View style={{ position: "absolute", left: 30, top: 0, bottom: 0, width: 2, backgroundColor: theme.border, zIndex: -1, opacity: 0.5 }} />
        <View style={isFirstOfDay ? { transform: [{ scale: 1.02 }], zIndex: 10 } : undefined}>
          <RiffCard
            riff={item}
            onDelete={handleDeleteRiff}
            onDuplicate={handleDuplicate}
            onToggleFavorite={handleToggleFavorite}
            onPress={handlePressRiff}
            onLongPress={handleLongPressCard}
            onRenameRequest={selectionMode ? undefined : (r) => setRiffToRename(r)}
            onMoveRequest={selectionMode ? undefined : (id) => {
              setSelectedIds(new Set([id]));
              setShowMoveModal(true);
            }}
            onShareRequest={selectionMode ? undefined : () => Alert.alert("Compartilhar", "Em breve...")}
            projectColor={getProjectColor(item.projectId)}
            selectionMode={selectionMode}
            isSelected={selectedIds.has(item.id)}
          />
        </View>
      </View>
    );
  }, [handleToggleFavorite, getProjectColor, handleDeleteRiff, handlePressRiff, handleLongPressCard, selectionMode, selectedIds, theme]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.background, paddingTop: insets.top + 12 }}>
        <View style={{ paddingTop: 24, paddingBottom: 16, paddingHorizontal: 20 }}>
           <Text style={{ fontSize: 28, fontWeight: "900", color: theme.foreground }}>Minhas Idéias</Text>
        </View>
        <View style={{ paddingHorizontal: 20 }}>
          <RiffCardSkeleton />
          <RiffCardSkeleton />
          <RiffCardSkeleton />
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.background, paddingTop: insets.top + 12 }}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: "#000", zIndex: 9999, opacity: overlayOpacityAnim }]} pointerEvents="none" />
      
      {/* Collapsible & Static Insights Header */}
      <Animated.View style={{ height: headerHeight, justifyContent: "flex-end", paddingBottom: 8, paddingHorizontal: 20, paddingTop: insets.top, zIndex: 10 }}>
        <AnimatedBlurView 
          intensity={80} 
          tint="dark"
          style={[StyleSheet.absoluteFill, { opacity: headerBgOpacity }]} 
        />
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" }}>
          <View>
            <Animated.Text style={{ 
              fontSize: 32, 
              fontWeight: "900", 
              color: theme.foreground, 
              marginBottom: 2,
              transform: [
                { scale: headerTitleScale },
                { translateX: scrollY.interpolate({ inputRange: [0, 60], outputRange: [0, -18], extrapolate: 'clamp' }) },
                { translateY: scrollY.interpolate({ inputRange: [0, 60], outputRange: [0, 8], extrapolate: 'clamp' }) }
              ]
            }}>
              Minhas Idéias
            </Animated.Text>
            {totalIdeias > 0 && (
              <Animated.View style={{ opacity: headerOpacity, overflow: 'hidden' }}>
                <Text style={{ fontSize: 13, color: theme.mutedForeground }}>
                  {totalIdeiasAgrupados} hoje • {totalFavoritas} favoritas
                </Text>
              </Animated.View>
            )}
          </View>
          
          <Pressable
            onPress={() => {
              setMustHaveFavorite(!mustHaveFavorite);
              triggerHaptic("light");
            }}
            style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingVertical: 4, opacity: mustHaveFavorite ? 1 : 0.6, marginBottom: 2 }}
          >
            <Star weight={mustHaveFavorite ? "fill" : "regular"} size={16} color={mustHaveFavorite ? theme.accent : theme.foreground} style={{ marginRight: 4 }} />
            <Text style={{ color: mustHaveFavorite ? theme.accent : theme.foreground, fontWeight: mustHaveFavorite ? "bold" : "600", fontSize: 13 }}>
              Favoritas
            </Text>
          </Pressable>
        </View>
      </Animated.View>

      <View style={[styles.searchRow, { paddingHorizontal: 20 }]}>
        <Animated.View 
          style={{ 
            flex: 1, 
            transform: [{ scale: searchScaleAnim }],
            borderColor: searchGlowAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [theme.border, theme.accentBlue + "80"]
            }),
            borderWidth: 1,
            borderRadius: 14,
            shadowColor: theme.accentBlue,
            shadowOpacity: searchGlowAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.15] }),
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 0 },
            elevation: isSearchFocused ? 4 : 0,
            backgroundColor: theme.input,
          }}
        >
          <TextInput
            placeholder="Buscar idéia..."
            placeholderTextColor={theme.mutedForeground + "99"}
            value={search}
            onChangeText={setSearch}
            onFocus={handleSearchFocus}
            onBlur={handleSearchBlur}
            style={[
              styles.search,
              { color: theme.foreground }
            ]}
          />
        </Animated.View>

        <Pressable
          onPress={() => setShowSortMenu(!showSortMenu)}
          style={[
            styles.sortButton,
            { backgroundColor: theme.input, borderColor: theme.border },
          ]}
        >
          <SlidersHorizontal size={24} color={theme.foreground} weight="regular" />
        </Pressable>
      </View>

      <View style={{ marginBottom: 12, borderBottomWidth: 1, borderBottomColor: theme.border, paddingBottom: 12, paddingHorizontal: 20 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          <Pressable
            onPress={() => {
              setExpandedFilter(expandedFilter === "projects" ? null : "projects");
              triggerHaptic("light");
            }}
            style={[styles.filterChip, expandedFilter === "projects" ? { backgroundColor: theme.primary, borderColor: theme.primary } : { backgroundColor: theme.input, borderColor: theme.border }]}
          >
            <FolderSimple size={14} color={expandedFilter === "projects" ? theme.primaryForeground : theme.foreground} weight={expandedFilter === "projects" ? "bold" : "regular"} style={{ marginRight: 6 }} />
            <Text style={{ color: expandedFilter === "projects" ? theme.primaryForeground : theme.foreground, fontWeight: expandedFilter === "projects" ? "600" : "normal" }}>
              Projetos {activeFolder !== null ? "• 1" : ""}
            </Text>
            {expandedFilter === "projects" ? <CaretUp size={12} color={theme.primaryForeground} weight="bold" style={{ marginLeft: 6 }} /> : <CaretDown size={12} color={theme.foreground} weight="bold" style={{ marginLeft: 6 }} />}
          </Pressable>

          <Pressable
            onPress={() => {
              setExpandedFilter(expandedFilter === "tags" ? null : "tags");
              triggerHaptic("light");
            }}
            style={[styles.filterChip, expandedFilter === "tags" ? { backgroundColor: theme.primary, borderColor: theme.primary } : { backgroundColor: theme.input, borderColor: theme.border }]}
          >
            <Tag size={14} color={expandedFilter === "tags" ? theme.primaryForeground : theme.foreground} weight={expandedFilter === "tags" ? "bold" : "regular"} style={{ marginRight: 6 }} />
            <Text style={{ color: expandedFilter === "tags" ? theme.primaryForeground : theme.foreground, fontWeight: expandedFilter === "tags" ? "600" : "normal" }}>
              Tags {activeTags.length > 0 || mustHaveMarkers ? `• ${activeTags.length + (mustHaveMarkers ? 1 : 0)}` : ""}
            </Text>
            {expandedFilter === "tags" ? <CaretUp size={12} color={theme.primaryForeground} weight="bold" style={{ marginLeft: 6 }} /> : <CaretDown size={12} color={theme.foreground} weight="bold" style={{ marginLeft: 6 }} />}
          </Pressable>

          <Pressable
            onPress={() => {
              setExpandedFilter(expandedFilter === "types" ? null : "types");
              triggerHaptic("light");
            }}
            style={[styles.filterChip, expandedFilter === "types" ? { backgroundColor: theme.primary, borderColor: theme.primary } : { backgroundColor: theme.input, borderColor: theme.border }]}
          >
            <Guitar size={14} color={expandedFilter === "types" ? theme.primaryForeground : theme.foreground} weight={expandedFilter === "types" ? "bold" : "regular"} style={{ marginRight: 6 }} />
            <Text style={{ color: expandedFilter === "types" ? theme.primaryForeground : theme.foreground, fontWeight: expandedFilter === "types" ? "600" : "normal" }}>
              Tipos {activeTypes.length > 0 ? `• ${activeTypes.length}` : ""}
            </Text>
            {expandedFilter === "types" ? <CaretUp size={12} color={theme.primaryForeground} weight="bold" style={{ marginLeft: 6 }} /> : <CaretDown size={12} color={theme.foreground} weight="bold" style={{ marginLeft: 6 }} />}
          </Pressable>
        </ScrollView>
      </View>

      {expandedFilter === "projects" && (
        <View style={{ marginBottom: 16 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            <Pressable
              onPress={() => { setActiveFolder(null); triggerHaptic("light"); }}
              style={[
                styles.filterChip,
                activeFolder === null 
                  ? { backgroundColor: theme.primary, borderColor: theme.primary } 
                  : { backgroundColor: theme.input, borderColor: theme.border }
              ]}
            >
              <Text style={{ color: activeFolder === null ? theme.primaryForeground : theme.foreground, fontWeight: activeFolder === null ? "bold" : "normal" }}>
                Todos
              </Text>
            </Pressable>

            <Pressable
              onPress={() => { setActiveFolder("none"); triggerHaptic("light"); }}
              style={[
                styles.filterChip,
                activeFolder === "none" 
                 ? { backgroundColor: theme.primary, borderColor: theme.primary } 
                 : { backgroundColor: theme.input, borderColor: theme.border }
              ]}
            >
              <Text style={{ color: activeFolder === "none" ? theme.primaryForeground : theme.foreground, fontWeight: activeFolder === "none" ? "bold" : "normal" }}>
                Avulsos
              </Text>
            </Pressable>

            {projects.map(p => {
               const isActive = activeFolder === p.id;
               return (
                 <Pressable
                   key={p.id}
                   onPress={() => { setActiveFolder(p.id); triggerHaptic("light"); }}
                   style={[
                     styles.filterChip,
                     isActive 
                      ? { backgroundColor: theme.primary, borderColor: theme.primary } 
                      : { backgroundColor: theme.input, borderColor: theme.border }
                   ]}
                 >
                   <Text style={{ color: isActive ? theme.primaryForeground : theme.foreground, fontWeight: isActive ? "bold" : "normal" }}>
                     {p.name}
                   </Text>
                 </Pressable>
               );
            })}
          </ScrollView>
        </View>
      )}

      {expandedFilter === "tags" && (
        <View style={{ marginBottom: 16 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            <Pressable
              onPress={() => {
                setMustHaveMarkers(!mustHaveMarkers);
                triggerHaptic("light");
              }}
              style={[
                styles.filterChip,
                mustHaveMarkers 
                  ? { backgroundColor: theme.accent, borderColor: theme.accent } 
                  : { backgroundColor: theme.input, borderColor: theme.border }
              ]}
            >
              <BookmarkSimple size={14} color={mustHaveMarkers ? "#fff" : theme.foreground} weight={mustHaveMarkers ? "bold" : "regular"} style={{ marginRight: 6 }} />
              <Text style={{ color: mustHaveMarkers ? "#fff" : theme.foreground, fontWeight: mustHaveMarkers ? "bold" : "normal" }}>
                Marcações
              </Text>
            </Pressable>

            {PRODUCER_TAGS.map(tag => {
               const isActive = activeTags.includes(tag);
               return (
                 <Pressable
                   key={tag}
                   onPress={() => {
                     setActiveTags(prev => 
                       prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
                     );
                     triggerHaptic("light");
                   }}
                   style={[
                     styles.filterChip,
                     isActive 
                      ? { backgroundColor: theme.secondary, borderColor: theme.secondary } 
                      : { backgroundColor: theme.input, borderColor: theme.border }
                   ]}
                 >
                   <Text style={{ color: isActive ? "#fff" : theme.foreground, fontWeight: isActive ? "bold" : "normal" }}>
                     {tag}
                   </Text>
                 </Pressable>
               );
            })}
          </ScrollView>
        </View>
      )}

      {expandedFilter === "types" && (
        <View style={{ marginBottom: 16 }}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {RECORDING_TYPES.map(type => {
               const isActive = activeTypes.includes(type.id);
               return (
                 <Pressable
                   key={type.id}
                   onPress={() => {
                     setActiveTypes(prev => 
                       prev.includes(type.id) ? prev.filter(t => t !== type.id) : [...prev, type.id]
                     );
                     triggerHaptic("light");
                   }}
                   style={[
                     styles.filterChip,
                     isActive 
                      ? { backgroundColor: theme.primary, borderColor: theme.primary } 
                      : { backgroundColor: theme.input, borderColor: theme.border }
                   ]}
                 >
                   <type.icon weight="fill" size={14} color={isActive ? theme.primaryForeground : theme.mutedForeground} style={{ marginRight: 6 }} />
                   <Text style={{ color: isActive ? theme.primaryForeground : theme.foreground, fontWeight: isActive ? "bold" : "normal" }}>
                     {type.label}
                   </Text>
                 </Pressable>
               );
            })}
          </ScrollView>
        </View>
      )}

      {showSortMenu && (
        <Pressable 
          style={[StyleSheet.absoluteFill, { zIndex: 10, elevation: 10 }]} 
          onPress={() => setShowSortMenu(false)} 
        />
      )}

      {showSortMenu && (
        <View
          style={[
            styles.sortMenu,
            { backgroundColor: theme.card, borderColor: theme.border, zIndex: 11, elevation: 11 },
          ]}
        >
          <ScrollView style={{ maxHeight: 320, width: "100%" }} nestedScrollEnabled showsVerticalScrollIndicator={false}>
            {SORT_OPTIONS.map((option) => (
              <Pressable
                key={option.value}
                onPress={() => {
                  setSortBy(option.value as SortOption);
                  setShowSortMenu(false);
                  triggerHaptic("light");
                }}
                style={[
                  styles.sortOption,
                  sortBy === option.value && {
                    backgroundColor: theme.primary + "20",
                  },
                ]}
              >
                <Text
                  numberOfLines={1}
                  style={[
                    styles.sortOptionText,
                    {
                      flex: 1,
                      color:
                        sortBy === option.value
                          ? theme.primary
                          : theme.foreground,
                    },
                  ]}
                >
                  {option.label}
                </Text>
                {sortBy === option.value && (
                  <Check size={18} color={theme.primary} weight="bold" />
                )}
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}


      {/* Multi-select action bar */}
      {selectionMode && (
        <View style={[
          styles.selectionBar,
          { backgroundColor: theme.card, borderTopColor: theme.border }
        ]}>
          <Text style={{ color: theme.foreground, fontWeight: "700", fontSize: 13 }}>
            {selectedIds.size} selecionado(s)
          </Text>
          <Pressable
            onPress={() => setShowMoveModal(true)}
            style={{ padding: 8, backgroundColor: theme.input, borderRadius: 8 }}
          >
            <FolderSimple size={18} color={theme.foreground} />
          </Pressable>
          <Pressable
            onPress={handleBulkDelete}
            style={{ padding: 8, backgroundColor: theme.destructive + "20", borderRadius: 8 }}
          >
            <Trash size={18} color={theme.destructive} />
          </Pressable>
          <Pressable
            onPress={() => { setSelectionMode(false); setSelectedIds(new Set()); }}
            style={{ padding: 8 }}
          >
            <X size={18} color={theme.mutedForeground} />
          </Pressable>
        </View>
      )}

      {/* Bulk Move Modal */}
      <Modal visible={showMoveModal} transparent animationType="slide">
        <Pressable style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)" }} onPress={() => setShowMoveModal(false)}>
          <Pressable style={[{ backgroundColor: theme.card, borderRadius: 16, margin: 20, padding: 20, marginTop: 'auto' }]}>
            <Text style={{ color: theme.foreground, fontSize: 16, fontWeight: "800", marginBottom: 16 }}>Mover para Projeto</Text>
            <Pressable
              onPress={() => handleBulkMove(null)}
              style={{ padding: 12, borderRadius: 8, backgroundColor: theme.input, marginBottom: 8 }}
            >
              <Text style={{ color: theme.foreground }}>Sem projeto (Avulso)</Text>
            </Pressable>
            {projects.map(p => (
              <Pressable
                key={p.id}
                onPress={() => handleBulkMove(p.id)}
                style={{ padding: 12, borderRadius: 8, backgroundColor: theme.input, marginBottom: 8, flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: p.color }} />
                <Text style={{ color: theme.foreground }}>{p.name}</Text>
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>

      {riffs.length === 0 ? (
        <View style={styles.empty}>
          <Sparkle size={64} color={theme.mutedForeground} weight="duotone" style={{ marginBottom: 20 }} />
          <Text style={[styles.emptyTitle, { color: theme.foreground }]}>
            Sua lousa em branco
          </Text>
          <Text style={{ color: theme.mutedForeground, textAlign: "center", marginBottom: 32, fontSize: 15, lineHeight: 22 }}>
            A próxima ideia pode mudar tudo.
          </Text>
          <Pressable 
            onPress={handleImmersiveRecord}
            style={({ pressed }) => [{
              backgroundColor: theme.primary, 
              paddingHorizontal: 28, 
              paddingVertical: 16, 
              borderRadius: 30,
              opacity: pressed ? 0.8 : 1,
              shadowColor: theme.primary,
              shadowOpacity: 0.3,
              shadowRadius: 10,
              shadowOffset: { width: 0, height: 4 }
            }]}
          >
            <Text style={{ color: theme.primaryForeground, fontWeight: "900", fontSize: 16 }}>GRAVAR AGORA</Text>
          </Pressable>
        </View>
      ) : sections.length === 0 ? (
        <View style={styles.empty}>
          <MagnifyingGlass size={64} color={theme.mutedForeground} weight="duotone" style={{ marginBottom: 20 }} />
          <Text style={[styles.emptyTitle, { color: theme.foreground }]}>
            Nenhuma idéia encontrada
          </Text>
          <Text style={{ color: theme.mutedForeground, textAlign: "center", fontSize: 15 }}>
            Tente mudar o filtro ou crie uma nova idéia.
          </Text>
        </View>
      ) : (
        <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
          <AnimatedSectionList
            sections={sections}
            contentContainerStyle={{ paddingBottom: 160, paddingTop: 8, backgroundColor: theme.background }}
            style={{ backgroundColor: theme.background }}
            keyExtractor={(item: Riff) => item.id}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { y: scrollY } } }],
              { useNativeDriver: false }
            )}
            scrollEventThrottle={16}
            renderItem={renderItem}
            ListHeaderComponent={renderListHeader}
            renderSectionHeader={({ section: { title } }) => (
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 20,
                paddingVertical: 12,
                backgroundColor: theme.background,
              }}>
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: theme.primary, marginRight: 12, borderWidth: 2, borderColor: theme.background, zIndex: 2 }} />
                <Text style={{ 
                  fontSize: 13, 
                  fontWeight: "800", 
                  color: theme.foreground, 
                  letterSpacing: 0.5,
                  textTransform: 'uppercase',
                }}>
                  {title}
                </Text>
                <View style={{ flex: 1, height: 1, backgroundColor: theme.border, marginLeft: 16 }} />
              </View>
            )}
            showsVerticalScrollIndicator={false}
            stickySectionHeadersEnabled={true}
          />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    marginTop: -80, // shift up visually
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 8,
  },
  searchRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  search: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 16,
  },
  sortButton: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
  sortMenu: {
    marginBottom: 12,
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  sortOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  sortOptionText: {
    fontSize: 15,
  },
  fabWrapper: {
    position: "absolute",
    zIndex: 1000,
    right: 24,
    bottom: 32,
  },
  fab: {
    elevation: 8,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center"
  },
  selectionBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    paddingBottom: 32,
    gap: 12,
    borderTopWidth: 1,
    zIndex: 999,
  },
});
