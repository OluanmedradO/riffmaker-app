import { Riff } from "@/src/types/riff";
import { PreviewPlayerManager } from "@/src/utils/AudioManager";
import { formatDate, formatTime, formatTuning } from "@/src/utils/formatters";
import {
  CaretDown, CaretUp,
  CheckCircle, Copy,
  FolderSimple,
  Gauge,
  Lightning,
  PencilSimple,
  Play,
  ShareNetwork,
  Star, Stop, Trash,
  Warning
} from "phosphor-react-native";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  LayoutAnimation,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  UIManager,
  View
} from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { useTheme } from "./ThemeProvider";

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const TYPE_COLORS: Record<string, string> = {
  Guitar: "#3b82f6", // Blue
  Beat: "#ef4444",   // Red
  Vocal: "#eab308",  // Yellow
  Melody: "#a855f7", // Purple
  Bass: "#22c55e",   // Green
  Other: "#a1a1aa",  // Gray
};

type Props = {
  riff: Riff;
  onDelete: (id: string) => void;
  onDuplicate?: (id: string) => void;
  onToggleFavorite?: (id: string) => void;
  onPress: (id: string) => void;
  onRenameRequest?: (riff: Riff) => void;
  onLongPress?: (id: string) => void;
  onMoveRequest?: (id: string) => void;
  onShareRequest?: (id: string) => void;
  projectColor?: string;
  selectionMode?: boolean;
  isSelected?: boolean;
};

export const RiffCard = memo(function RiffCard({
  riff,
  onDelete,
  onDuplicate,
  onToggleFavorite,
  onPress,
  onRenameRequest,
  onLongPress,
  onMoveRequest,
  onShareRequest,
  projectColor,
  selectionMode,
  isSelected,
}: Props) {
  const theme = useTheme();
  
  const [isPreviewing, setPreviewing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const unsubscribe = PreviewPlayerManager.subscribe((uri, isPlaying) => {
      setPreviewing(uri === riff.audioUri && isPlaying);
    });
    return () => {
      unsubscribe();
      // Stop audio when card unmounts (tab switch, navigation away)
      if (PreviewPlayerManager.getCurrentUri() === riff.audioUri) {
        PreviewPlayerManager.stop();
      }
    };
  }, [riff.audioUri]);

  function handleTogglePreview() {
    PreviewPlayerManager.toggle(riff.audioUri, { loop: true });
  }

  // Entry Animations
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(10)).current;

  // Interaction Animations
  const scale = useRef(new Animated.Value(1)).current;
  const starScale = useRef(new Animated.Value(riff.favorite ? 1.2 : 1)).current;
  const waveformAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isPreviewing) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(waveformAnim, { toValue: 1.2, duration: 300, useNativeDriver: true }),
          Animated.timing(waveformAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        ])
      ).start();
    } else {
      waveformAnim.setValue(1);
    }
  }, [isPreviewing, waveformAnim]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, translateY]);
  
  useEffect(() => {
    Animated.spring(starScale, {
      toValue: riff.favorite ? 1.2 : 1,
      friction: 4,
      useNativeDriver: true,
    }).start();
  }, [riff.favorite, starScale]);

  function handlePressIn() {
    Animated.spring(scale, {
      toValue: 1.01,
      useNativeDriver: true,
    }).start();
  }

  function handlePressOut() {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
    }).start();
  }
  
  function handleCardPress() {
    if (selectionMode) {
      onLongPress?.(riff.id);
      return;
    }
    // Navigate directly to editor
    onPress(riff.id);
  }

  function handleExpandPress() {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded(!isExpanded);
  }

  const suggestionChips = useMemo(() => {
    const chips = [];
    if (riff.bpm) {
      if (riff.bpm < 90) chips.push("Groove lento");
      else if (riff.bpm > 130) chips.push("Riff rápido");
      else chips.push("Riff médio");
    }
    if (riff.type === "Guitar" && riff.tuning && riff.tuning.value !== "E Standard") {
      chips.push("Drop tuning");
    }
    return chips;
  }, [riff.bpm, riff.type, riff.tuning]);

  const hasExpandableContent = !!(riff.notes || (riff.tags && riff.tags.length > 0) || suggestionChips.length > 0);

  // Swipe Actions
  // Swipe Right: Reveals Left Actions (Favoritar, Compartilhar, Apagar)
  function renderLeftActions() {
    return (
      <View style={styles.leftActionsContainer}>
        {onShareRequest && (
          <Pressable onPress={() => onShareRequest(riff.id)} style={[styles.actionBtn, { backgroundColor: "#8b5cf6" }]}>
             <ShareNetwork size={20} color="#fff" />
          </Pressable>
        )}
        <Pressable onPress={() => onDelete(riff.id)} style={[styles.actionBtn, { backgroundColor: theme.destructive }]}>
           <Trash size={20} color="#fff" />
        </Pressable>
      </View>
    );
  }

  // Swipe Left: Reveals Right Actions (Editar, Duplicar, Mover)
  function renderRightActions() {
    return (
      <View style={styles.rightActionsContainer}>
        <Pressable onPress={() => onPress(riff.id)} style={[styles.actionBtn, { backgroundColor: "#f59e0b" }]}>
           <PencilSimple size={20} color="#fff" />
        </Pressable>
        {onDuplicate && (
          <Pressable onPress={() => onDuplicate(riff.id)} style={[styles.actionBtn, { backgroundColor: "#3b82f6" }]}>
             <Copy size={20} color="#fff" />
          </Pressable>
        )}
        {onMoveRequest && (
          <Pressable onPress={() => onMoveRequest(riff.id)} style={[styles.actionBtn, { backgroundColor: "#10b981" }]}>
             <FolderSimple size={20} color="#fff" />
          </Pressable>
        )}
      </View>
    );
  }

  const typeColor = riff.type ? (TYPE_COLORS[riff.type] || theme.primary) : theme.primary;
  const isPinned = riff.pinned; // Assuming we add this property to sorting later

  return (
    <Swipeable
      renderLeftActions={selectionMode ? undefined : renderLeftActions}
      renderRightActions={selectionMode ? undefined : renderRightActions}
      failOffsetY={[-5, 5]}
      activeOffsetX={[-10, 10]}
    >
      <Animated.View
        style={{
          opacity,
          transform: [{ translateY }, { scale }],
        }}
      >
        <Pressable
          onPress={handleCardPress}
          onLongPress={() => {
            if (selectionMode) return;
            if (onLongPress) onLongPress(riff.id);
            else if (onRenameRequest) onRenameRequest(riff);
          }}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={({ pressed }) => [
            styles.card,
            {
              backgroundColor: theme.card,
              shadowColor: isPinned ? theme.accent : (riff.favorite ? theme.accent : "#000"),
              shadowOpacity: isPinned ? 0.25 : (riff.favorite ? 0.15 : 0.08),
              shadowRadius: isPinned ? 30 : (riff.favorite ? 24 : 12),
              shadowOffset: { width: 0, height: 4 },
              elevation: isPinned ? 6 : (riff.favorite ? 4 : 2),
              borderColor: isSelected
                ? theme.primary
                : isPinned ? theme.accent : (riff.favorite ? (theme.accent + "30") : theme.border),
              borderWidth: isSelected || isPinned ? 2 : 1,
              borderLeftWidth: projectColor ? 4 : (isSelected || isPinned ? 2 : 1),
              borderLeftColor: isSelected
                ? theme.primary
                : projectColor || (isPinned ? theme.accent : (riff.favorite ? (theme.accent + "30") : theme.border)),
              opacity: pressed ? 0.92 : 1,
            },
          ]}
        >
          <View style={styles.header}>
            {selectionMode && (
              <View style={[styles.checkbox, isSelected && { backgroundColor: theme.primary, borderColor: theme.primary }]}>
                {isSelected && <CheckCircle size={14} color="#fff" weight="fill" />}
              </View>
            )}
            <View style={styles.titleArea}>
              {riff.corrupted && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 4 }}>
                  <Warning size={12} color="#f59e0b" weight="fill" />
                  <Text style={{ fontSize: 10, color: "#f59e0b", fontWeight: "700" }}>Áudio não encontrado</Text>
                </View>
              )}
              {isPinned && (
                 <Text style={{ fontSize: 10, color: theme.accent, fontWeight: "800", textTransform: "uppercase", marginBottom: 2 }}>Fixado</Text>
              )}
              <Text style={[styles.title, { color: riff.corrupted ? theme.mutedForeground : theme.foreground }]} numberOfLines={1} ellipsizeMode="tail">
                {riff.emoji ? `${riff.emoji} ` : ""}
                {riff.name.startsWith("Ideia ")
                  ? (riff.type ? `${riff.type} em ${riff.tuning ? formatTuning(riff.tuning.value) : "Padrão"}` : riff.name)
                  : riff.name}
              </Text>
              <Text style={[styles.subtitle, { color: theme.mutedForeground }]}>
                {formatDate(riff.createdAt)} • {formatTime(Math.floor(riff.duration / 1000))}
              </Text>
            </View>

            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              {riff.audioUri ? (
                <Pressable
                  onPress={handleTogglePreview}
                  hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
                  style={[
                    styles.iconButton, 
                    { 
                       backgroundColor: isPreviewing ? theme.primary : (theme.mutedForeground + "15"),
                       borderRadius: 20,
                       width: 36,
                       height: 36,
                    }
                  ]}
                >
                  {isPreviewing ? (
                    <Stop size={18} color={theme.primaryForeground} weight="fill" />
                  ) : (
                    <Play size={18} color={theme.foreground} weight="fill" />
                  )}
                </Pressable>
              ) : null}

              {onToggleFavorite && (
                <Pressable
                  onPress={() => onToggleFavorite(riff.id)}
                  hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
                  style={[
                    styles.iconButton, 
                    { 
                      backgroundColor: riff.favorite ? theme.accent + "20" : "transparent",
                      borderRadius: 20,
                      width: 36,
                      height: 36,
                    }
                  ]}
                >
                  <Animated.View style={{ transform: [{ scale: starScale }] }}>
                    <Star
                      size={18}
                      color={riff.favorite ? theme.accent : theme.mutedForeground}
                      weight={riff.favorite ? "fill" : "regular"}
                    />
                    </Animated.View>
                </Pressable>
              )}

              {hasExpandableContent && (
                <Pressable
                  onPress={handleExpandPress}
                  hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
                  style={[
                    styles.iconButton, 
                    { 
                      backgroundColor: isExpanded ? theme.border : "transparent",
                      borderRadius: 20,
                      width: 36,
                      height: 36,
                    }
                  ]}
                >
                  {isExpanded ? <CaretUp size={18} color={theme.foreground} /> : <CaretDown size={18} color={theme.foreground} />}
                </Pressable>
              )}
            </View>
          </View>

          {/* Micro-Badges Row */}
          <View style={[styles.metaRow, { gap: 8 }]}>
            {riff.type ? (
              <View style={[styles.microBadge, { backgroundColor: typeColor + "15" }]}>
                <View style={[styles.moodDot, { backgroundColor: typeColor }]} />
                <Text style={{ color: typeColor, fontSize: 10, fontWeight: "700", textTransform: "uppercase" }}>{riff.type}</Text>
              </View>
            ) : null}

            {riff.key || riff.detectedKey ? (
              <View style={[styles.microBadge, { backgroundColor: theme.muted }]}>
                <Text style={{ fontSize: 10, fontWeight: "700", color: theme.foreground }}>{riff.key || riff.detectedKey}</Text>
              </View>
            ) : null}

            {riff.bpm ? (
              <View style={[styles.microBadge, { backgroundColor: theme.muted }]}>
                <Gauge size={12} color={theme.mutedForeground} weight="regular" />
                <Text style={[styles.microBadgeText, { color: theme.mutedForeground }]}>{riff.bpm} BPM</Text>
              </View>
            ) : null}

            {riff.energyLevel ? (
              <View style={[styles.microBadge, { backgroundColor: riff.energyLevel === "high" ? "#ef444415" : riff.energyLevel === "medium" ? "#eab30815" : "#3b82f615" }]}>
                <Lightning size={10} color={riff.energyLevel === "high" ? "#ef4444" : riff.energyLevel === "medium" ? "#eab308" : "#3b82f6"} weight="fill" />
                <Text style={[styles.microBadgeText, { color: riff.energyLevel === "high" ? "#ef4444" : riff.energyLevel === "medium" ? "#eab308" : "#3b82f6" }]}>
                  {riff.energyLevel === "high" ? "Alta" : riff.energyLevel === "medium" ? "Média" : "Baixa"}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Waveform */}
          {(riff.waveform?.length ?? 0) > 0 && (
            <View style={styles.miniWaveform}>
              {riff.waveform!.slice(0, 50).map((level, i) => {
                const normalized = Math.max(0.1, level < 0 ? (level + 160) / 160 : level);
                return (
                  <Animated.View
                    key={i}
                    style={[
                      styles.miniWaveformBar,
                      {
                        backgroundColor: typeColor,
                        height: normalized * 50,
                        transform: [{ scaleY: waveformAnim }]
                      },
                    ]}
                  />
                );
              })}
            </View>
          )}

          {/* Smart Expand Inline */}
          {isExpanded && (
            <View style={{ marginTop: 12, borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 16 }}>
              {/* Notes */}
              {riff.notes ? (
                <View style={{ marginBottom: 12 }}>
                   <Text style={{ fontSize: 11, fontWeight: "800", color: theme.mutedForeground, textTransform: "uppercase", marginBottom: 4 }}>Notas</Text>
                   <Text style={{ color: theme.foreground, fontSize: 14, lineHeight: 20 }}>{riff.notes}</Text>
                </View>
              ) : null}

              {/* Suggestion Chips */}
              {suggestionChips.length > 0 && (
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                  {suggestionChips.map(chip => (
                    <View key={chip} style={{ backgroundColor: theme.primary + "20", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                       <Text style={{ color: theme.primary, fontSize: 11, fontWeight: "600" }}>{chip}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Tags */}
              {(riff.tags && riff.tags.length > 0) && (
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
                  {riff.tags.map(tag => (
                    <View key={tag} style={{ backgroundColor: theme.secondary + "20", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                       <Text style={{ color: theme.secondaryForeground, fontSize: 11, fontWeight: "600" }}>#{tag}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}
        </Pressable>
      </Animated.View>
    </Swipeable>
  );
});

const styles = StyleSheet.create({
  card: {
    padding: 18,
    paddingBottom: 8,
    borderRadius: 20,
    marginBottom: 16,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#555",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
    marginTop: 2,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  titleArea: {
    flex: 1,
    paddingRight: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
  },
  iconButton: {
    padding: 6,
    borderRadius: 8,
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  microBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
  },
  microBadgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  moodDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  miniWaveform: {
    flexDirection: "row",
    alignItems: "center",
    height: 48,
    gap: 3,
    opacity: 0.9,
    marginTop: 16,
    paddingHorizontal: 4,
    overflow: "hidden",
  },
  miniWaveformBar: {
    width: 5,
    borderRadius: 2.5,
  },
  leftActionsContainer: {
    flexDirection: "row",
    paddingRight: 12,
    marginBottom: 16,
  },
  rightActionsContainer: {
    flexDirection: "row",
    paddingLeft: 12,
    marginBottom: 16,
  },
  actionBtn: {
    justifyContent: "center",
    alignItems: "center",
    width: 60,
    borderRadius: 20,
    marginHorizontal: 4,
  },
});
