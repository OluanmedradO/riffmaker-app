import { Riff } from "@/src/types/riff";
import { PreviewPlayerManager } from "@/src/utils/AudioManager";
import { formatDate, formatTime, formatTuning } from "@/src/utils/formatters";
import {
    CaretDown,
    CheckCircle,
    FolderSimple,
    Gauge,
    Lightning,
    MusicNotes,
    NotePencil,
    Play,
    Repeat,
    Star,
    Stop,
    Tag,
    Warning,
} from "phosphor-react-native";
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, LayoutAnimation, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import Reanimated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from "react-native-reanimated";
import { useTheme } from "./ThemeProvider";

const TYPE_COLORS: Record<string, string> = {
  Guitar: "#3b82f6",
  Beat: "#ef4444",
  Vocal: "#eab308",
  Melody: "#a855f7",
  Bass: "#22c55e",
  Other: "#a1a1aa",
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
  projectName?: string;
  selectionMode?: boolean;
  isSelected?: boolean;
};

export const RiffCard = memo(function RiffCard({
  riff,
  onDelete, // kept for API compatibility, not used inside the card UI currently
  onDuplicate,
  onToggleFavorite,
  onPress,
  onRenameRequest,
  onLongPress,
  onMoveRequest,
  onShareRequest,
  projectColor,
  projectName,
  selectionMode,
  isSelected,
}: Props) {
  const theme = useTheme();

  const [isPreviewing, setPreviewing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const canPreview = !!riff.audioUri && !riff.corrupted;

  /**
   * ✅ IMPORTANT:
   * Do NOT stop audio on unmount of the card.
   * Cards can unmount due to FlatList virtualization while preview is playing.
   * Stopping should be managed at screen-level or by the manager itself.
   */
  useEffect(() => {
    if (!riff.audioUri) return;

    const unsubscribe = PreviewPlayerManager.subscribe((uri, isPlaying) => {
      setPreviewing(uri === riff.audioUri && isPlaying);
    });

    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, [riff.audioUri]);

  const handleTogglePreview = useCallback(() => {
    if (!riff.audioUri || riff.corrupted) return;
    PreviewPlayerManager.toggle(riff.audioUri, { loop: true });
  }, [riff.audioUri, riff.corrupted]);

  const handleCardPress = React.useCallback(() => {
  if (selectionMode) {
    onLongPress?.(riff.id);
    return;
  }

  onPress?.(riff.id);
}, [selectionMode, onLongPress, onPress, riff.id]);

  const handleLongPress = useCallback(() => {
    if (selectionMode) return;

    if (onLongPress) onLongPress(riff.id);
    else if (onRenameRequest) onRenameRequest(riff);
  }, [selectionMode, onLongPress, onRenameRequest, riff]);

  const toggleExpanded = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded((v) => !v);
  }, []);

  // ⭐ Favorite micro animation
  const starScale = useRef(new Animated.Value(riff.favorite ? 1.2 : 1)).current;
  useEffect(() => {
    Animated.spring(starScale, {
      toValue: riff.favorite ? 1.2 : 1,
      friction: 4,
      useNativeDriver: true,
    }).start();
  }, [riff.favorite, starScale]);

  // 🃏 Card press scale animation
  const cardScale = useSharedValue(1);
  const cardAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
  }));

  const handlePressIn = useCallback(() => {
    cardScale.value = withSpring(0.975, { mass: 0.4, stiffness: 200, damping: 15 });
  }, [cardScale]);

  const handlePressOut = useCallback(() => {
    cardScale.value = withSpring(1, { mass: 0.4, stiffness: 200, damping: 15 });
  }, [cardScale]);

  // 🔊 Play button glow pulse while previewing
  const playGlow = useSharedValue(0);
  useEffect(() => {
    if (isPreviewing) {
      playGlow.value = withSequence(
        withTiming(1, { duration: 500 }),
        withTiming(0.4, { duration: 500 }),
      );
      const interval = setInterval(() => {
        playGlow.value = withSequence(
          withTiming(1, { duration: 500 }),
          withTiming(0.4, { duration: 500 }),
        );
      }, 1000);
      return () => clearInterval(interval);
    } else {
      playGlow.value = withTiming(0, { duration: 200 });
    }
  }, [isPreviewing]);

  const playGlowStyle = useAnimatedStyle(() => ({
    shadowOpacity: playGlow.value * 0.8,
    shadowRadius: 12 * playGlow.value,
    elevation: isPreviewing ? 6 : 1,
  }));



  const hasExpandableContent = useMemo(
    () =>
      !!(
        riff.notes ||
        (riff.tags && riff.tags.length > 0) ||
        riff.loopStart != null ||
        riff.tuning != null ||
        riff.bpm != null ||
        (riff.waveform && riff.waveform.length > 0)
      ),
    [
      riff.notes,
      riff.tags,
      riff.loopStart,
      riff.tuning,
      riff.bpm,
      riff.waveform,
    ]
  );

  const typeColor = riff.type ? TYPE_COLORS[riff.type] || theme.primary : theme.primary;
  const isPinned = !!riff.pinned;
  const loopLengthMs =
    riff.loopStart != null && riff.loopEnd != null ? riff.loopEnd - riff.loopStart : null;

  // Precompute mini bars only when expanded (reduces work)
  const miniBars = useMemo(() => {
    if (!isExpanded) return null;
    const wf = riff.waveform;
    if (!wf || wf.length === 0) return null;

    return wf.slice(0, 30).map((level, i) => {
      const db = (level * 160) - 160;
      const minDb = -45;
      let ratio = 0.04;
      if (db > minDb) {
        ratio = (db - minDb) / (-minDb);
      }
      const normalized = Math.max(0.04, Math.min(1, ratio));
      return { key: i, height: normalized * 50 };
    });
  }, [isExpanded, riff.waveform]);

  const cardPressableStyle = useCallback(
    ({ pressed }: { pressed: boolean }) => {
      const base: any = {
        backgroundColor: theme.card,
        borderColor: isSelected
          ? theme.primary
          : isPinned
          ? theme.accent
          : riff.favorite
          ? theme.accent + "30"
          : theme.border,
        borderWidth: isSelected || isPinned ? 2 : 1,
        opacity: pressed ? 0.92 : 1,
        elevation: isPinned ? 3 : 1,
      };

      // Avoid iOS shadow weirdness + keep perf
      if (Platform.OS === "ios") {
        base.shadowColor = "#000";
        base.shadowOpacity = 0.08;
        base.shadowRadius = 8;
        base.shadowOffset = { width: 0, height: 2 };
      }

      return [styles.card, base];
    },
    [theme, isSelected, isPinned, riff.favorite]
  );

  const selectionCheckboxStyle = useMemo(
    () => [styles.checkbox, isSelected && { backgroundColor: theme.primary, borderColor: theme.primary }],
    [isSelected, theme.primary]
  );

  const playButtonStyle = useMemo(
    () => [
      styles.iconButton,
      {
        backgroundColor: canPreview ? theme.primary : theme.mutedForeground + "15",
        borderRadius: 20,
        width: 36,
        height: 36,
        opacity: canPreview ? 1 : 0.45,
      },
    ],
    [theme.primary, theme.mutedForeground, canPreview]
  );

  const favButtonStyle = useMemo(
    () => [
      styles.iconButton,
      {
        backgroundColor: "transparent",
        borderRadius: 20,
        width: 36,
        height: 36,
      },
    ],
    []
  );

  const expandButtonStyle = useMemo(
    () => [
      styles.iconButton,
      {
        backgroundColor: "transparent",
        borderRadius: 20,
        width: 36,
        height: 36,
      },
    ],
    []
  );

  const titleText = useMemo(() => {
    const prefix = riff.emoji ? `${riff.emoji} ` : "";
    const computed =
      riff.name.startsWith("Ideia ")
        ? riff.type
          ? `${riff.type} em ${riff.tuning ? formatTuning(riff.tuning.value) : "Padrão"}`
          : riff.name
        : riff.name;

    return prefix + computed;
  }, [riff.emoji, riff.name, riff.type, riff.tuning]);

  return (
    <Reanimated.View style={cardAnimStyle}>
    <Pressable
      onPress={handleCardPress}
      onLongPress={handleLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={cardPressableStyle}
      accessibilityRole="button"
      accessibilityLabel={`Abrir ${riff.name}`}
      accessibilityState={{ selected: !!isSelected }}
    >
      {/* Project color strip — full card height */}
      {projectColor && (
        <View
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: 5,
            backgroundColor: projectColor,
            borderTopLeftRadius: 20,
            borderBottomLeftRadius: 20,
          }}
        />
      )}

      <View style={styles.header}>
        {selectionMode && (
          <View style={selectionCheckboxStyle}>
            {isSelected && <CheckCircle size={14} color="#fff" weight="fill" />}
          </View>
        )}

        <View style={styles.titleArea}>
          {riff.corrupted && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 4 }}>
              <Warning size={12} color="#f59e0b" weight="fill" />
              <Text style={{ fontSize: 10, color: "#f59e0b", fontWeight: "700" }}>
                Áudio não encontrado
              </Text>
            </View>
          )}

          {isPinned && (
            <Text
              style={{
                fontSize: 10,
                color: theme.accent,
                fontWeight: "800",
                textTransform: "uppercase",
                marginBottom: 2,
              }}
            >
              Fixado
            </Text>
          )}

          <Text
            style={[
              styles.title,
              { color: riff.corrupted ? theme.mutedForeground : theme.foreground, paddingHorizontal: 2, marginHorizontal: -2 },
            ]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {titleText}
          </Text>

          <Text style={[styles.subtitle, { color: theme.mutedForeground, paddingHorizontal: 2, marginHorizontal: -2 }]}>
            {formatDate(riff.createdAt)} • {formatTime(Math.floor(riff.duration / 1000))}
          </Text>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          {riff.audioUri ? (
            <Reanimated.View style={[playGlowStyle, { shadowColor: theme.primary, borderRadius: 20 }]}>
              <Pressable
                onPress={handleTogglePreview}
                disabled={!canPreview}
                hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
                style={playButtonStyle}
                accessibilityRole="button"
                accessibilityLabel={isPreviewing ? "Parar preview" : "Tocar preview"}
              >
                {isPreviewing ? (
                  <Stop size={18} color={theme.primaryForeground} weight="fill" />
                ) : (
                  <Play size={18} color={theme.primaryForeground} weight="fill" />
                )}
              </Pressable>
            </Reanimated.View>
          ) : null}

          {onToggleFavorite && (
            <Pressable
              onPress={() => onToggleFavorite(riff.id)}
              hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
              style={favButtonStyle}
              accessibilityRole="button"
              accessibilityLabel={riff.favorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
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
              onPress={toggleExpanded}
              hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
              style={expandButtonStyle}
              accessibilityRole="button"
              accessibilityLabel={isExpanded ? "Recolher detalhes" : "Expandir detalhes"}
            >
              <View style={{ transform: [{ rotate: isExpanded ? "180deg" : "0deg" }] }}>
                <CaretDown size={18} color={theme.mutedForeground} />
              </View>
            </Pressable>
          )}
        </View>
      </View>

      {/* Micro-Badges Row */}
      <View style={[styles.metaRow, { gap: 8 }]}>
        {riff.type ? (
          <View style={[styles.microBadge, { backgroundColor: typeColor + "15" }]}>
            <View style={[styles.moodDot, { backgroundColor: typeColor }]} />
            <Text
              style={{
                color: typeColor,
                fontSize: 10,
                fontWeight: "700",
                textTransform: "uppercase",
              }}
            >
              {riff.type}
            </Text>
          </View>
        ) : null}

        {riff.key || riff.detectedKey ? (
          <View style={[styles.microBadge, { backgroundColor: theme.muted }]}>
            <Text style={{ fontSize: 10, fontWeight: "700", color: theme.foreground }}>
              {riff.key || riff.detectedKey}
            </Text>
          </View>
        ) : null}

        {riff.bpm ? (
          <View style={[styles.microBadge, { backgroundColor: theme.muted }]}>
            <Gauge size={12} color={theme.mutedForeground} weight="regular" />
            <Text style={[styles.microBadgeText, { color: theme.mutedForeground }]}>
              {riff.bpm} BPM
            </Text>
          </View>
        ) : null}

        {riff.energyLevel ? (
          <View
            style={[
              styles.microBadge,
              {
                backgroundColor:
                  riff.energyLevel === "high"
                    ? "#ef444415"
                    : riff.energyLevel === "medium"
                    ? "#eab30815"
                    : "#3b82f615",
              },
            ]}
          >
            <Lightning
              size={10}
              color={
                riff.energyLevel === "high"
                  ? "#ef4444"
                  : riff.energyLevel === "medium"
                  ? "#eab308"
                  : "#3b82f6"
              }
              weight="fill"
            />
            <Text
              style={[
                styles.microBadgeText,
                {
                  color:
                    riff.energyLevel === "high"
                      ? "#ef4444"
                      : riff.energyLevel === "medium"
                      ? "#eab308"
                      : "#3b82f6",
                },
              ]}
            >
              {riff.energyLevel === "high"
                ? "Alta"
                : riff.energyLevel === "medium"
                ? "Média"
                : "Baixa"}
            </Text>
          </View>
        ) : null}
        {/* Draft chip */}
        {riff.draft ? (
          <View style={[styles.microBadge, { backgroundColor: "#eab30815", borderColor: "#eab30840", borderWidth: 1 }]}>
            <NotePencil size={10} color="#eab308" weight="fill" />
            <Text style={[styles.microBadgeText, { color: "#eab308" }]}>Rascunho</Text>
          </View>
        ) : null}

        {/* Loop chip - shown when loop region is set */}
        {riff.loopStart != null && riff.loopEnd != null ? (
          <View style={[styles.microBadge, { backgroundColor: theme.primary + "15" }]}>
            <Repeat size={10} color={theme.primary} weight="bold" />
            <Text style={[styles.microBadgeText, { color: theme.primary }]}>Loop</Text>
          </View>
        ) : null}

        {/* Project chip */}
        {projectName ? (
          <View style={[styles.microBadge, { backgroundColor: theme.muted, flexShrink: 1, maxWidth: 100 }]}>
            <FolderSimple size={10} color={theme.mutedForeground} weight="bold" />
            <Text style={[styles.microBadgeText, { color: theme.mutedForeground }]} numberOfLines={1}>{projectName}</Text>
          </View>
        ) : null}
      </View>

      {/* Expanded content: waveform + details */}
      {isExpanded && (
        <View
          style={{
            marginTop: 12,
            borderTopWidth: 1,
            borderTopColor: theme.border,
            paddingTop: 16,
            gap: 16,
          }}
        >
          {/* Waveform (render only when open) */}
          {miniBars && (
            <View style={styles.miniWaveform}>
              {miniBars.map((b) => (
                <View
                  key={b.key}
                  style={[
                    styles.miniWaveformBar,
                    {
                      backgroundColor: typeColor,
                      height: b.height,
                    },
                  ]}
                />
              ))}
            </View>
          )}

          {/* Technical Block */}
          {(riff.bpm || riff.tuning || riff.loopStart != null) && (
            <View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 }}>
                <MusicNotes size={14} color={theme.mutedForeground} weight="bold" />
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "800",
                    color: theme.mutedForeground,
                    textTransform: "uppercase",
                  }}
                >
                  Técnico
                </Text>
              </View>

              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                {riff.bpm && (
                  <View
                    style={{
                      backgroundColor: theme.input,
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 8,
                    }}
                  >
                    <Text style={{ color: theme.foreground, fontSize: 12 }}>{riff.bpm} BPM</Text>
                  </View>
                )}

                {(riff.key || riff.detectedKey) && (
                  <View
                    style={{
                      backgroundColor: theme.input,
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 8,
                    }}
                  >
                    <Text style={{ color: theme.foreground, fontSize: 12 }}>
                      Tom {riff.key || riff.detectedKey}
                    </Text>
                  </View>
                )}

                {riff.tuning && (
                  <View
                    style={{
                      backgroundColor: theme.input,
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 8,
                    }}
                  >
                    <Text style={{ color: theme.foreground, fontSize: 12 }}>
                      {formatTuning(riff.tuning.value)}
                    </Text>
                  </View>
                )}

                {loopLengthMs != null && loopLengthMs > 0 && (
                  <View
                    style={{
                      backgroundColor: theme.input,
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      borderRadius: 8,
                    }}
                  >
                    <Text style={{ color: theme.foreground, fontSize: 12 }}>
                      Loop de {formatTime(Math.floor(loopLengthMs / 1000))}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Context Block */}
          {(riff.notes || (riff.tags && riff.tags.length > 0)) && (
            <View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 }}>
                <Tag size={14} color={theme.mutedForeground} weight="bold" />
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: "800",
                    color: theme.mutedForeground,
                    textTransform: "uppercase",
                  }}
                >
                  Contexto
                </Text>
              </View>

              {(riff.tags && riff.tags.length > 0) && (
                <View
                  style={{
                    flexDirection: "row",
                    flexWrap: "wrap",
                    gap: 6,
                    marginBottom: riff.notes ? 8 : 0,
                  }}
                >
                  {riff.tags.map((tag) => (
                    <View
                      key={tag}
                      style={{
                        backgroundColor: theme.secondary + "20",
                        paddingHorizontal: 8,
                        paddingVertical: 4,
                        borderRadius: 8,
                      }}
                    >
                      <Text style={{ color: theme.secondaryForeground, fontSize: 11, fontWeight: "600" }}>
                        #{tag}
                      </Text>
                    </View>
                  ))}
                </View>
              )}

              {riff.notes && (
                <Text style={{ color: theme.foreground, fontSize: 14, lineHeight: 20 }}>
                  {riff.notes}
                </Text>
              )}
            </View>
          )}
        </View>
      )}
    </Pressable>
    </Reanimated.View>
  );
});

const styles = StyleSheet.create({
  card: {
    padding: 18,
    paddingBottom: 8,
    borderRadius: 20,
    marginBottom: 16,
    overflow: "hidden",
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
    paddingHorizontal: 4,
    overflow: "hidden",
  },
  miniWaveformBar: {
    width: 5,
    borderRadius: 2.5,
  },
});