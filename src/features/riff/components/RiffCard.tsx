import { useTranslation } from "@/src/i18n";
import { Riff } from "@/src/domain/types/riff";
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
import { Animated, LayoutAnimation, Pressable, StyleSheet, Text, View } from "react-native";
import Reanimated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { useTheme } from '@/src/shared/theme/ThemeProvider';

// If you have these globally, remove this local definition.
const ANIMATION_FAST = 180;
const EASING_STANDARD = undefined as any; // replace if you export EASING_STANDARD from Theme.ts

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
  onDrag?: () => void;
  isDragging?: boolean;
  isHighlighted?: boolean;
};

export const RiffCard = memo(function RiffCard({
  riff,
  onDelete, // kept for API compatibility
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
  onDrag,
  isDragging,
  isHighlighted,
}: Props) {
  const theme = useTheme();
  const { t } = useTranslation();

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

  const handleCardPress = useCallback(() => {
    if (selectionMode) {
      onLongPress?.(riff.id);
      return;
    }
    onPress?.(riff.id);
  }, [selectionMode, onLongPress, onPress, riff.id]);

  const handleLongPress = useCallback(() => {
    if (selectionMode) return;

    if (onLongPress) {
      onLongPress(riff.id);
    } else if (onDrag) {
      onDrag();
    } else if (onRenameRequest) {
      onRenameRequest(riff);
    }
  }, [selectionMode, onLongPress, onDrag, onRenameRequest, riff]);

  const toggleExpanded = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded((v) => !v);
  }, []);

  // ⭐ Favorite micro animation (Snap)
  const starScale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (riff.favorite) {
      Animated.sequence([
        Animated.timing(starScale, { toValue: 0.92, duration: 40, useNativeDriver: true }),
        Animated.timing(starScale, { toValue: 1.15, duration: 60, useNativeDriver: true }),
        Animated.timing(starScale, { toValue: 1, duration: 60, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.timing(starScale, { toValue: 1, duration: 100, useNativeDriver: true }).start();
    }
  }, [riff.favorite, starScale]);

  // 🃏 Card press scale animation (Snap)
  const cardScale = useSharedValue(1);
  const cardAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: cardScale.value }],
  }));

  const handlePressIn = useCallback(() => {
    cardScale.value = withTiming(0.96, { duration: 80 });
  }, [cardScale]);

  const handlePressOut = useCallback(() => {
    cardScale.value = withTiming(1, { duration: 110 });
  }, [cardScale]);

  // 🔊 Play button glow pulse while previewing (NO setInterval)
  const playGlow = useSharedValue(0);
  useEffect(() => {
    if (isPreviewing) {
      playGlow.value = withRepeat(
        withTiming(1, { duration: 700, easing: EASING_STANDARD }),
        -1,
        true
      );
      return () => cancelAnimation(playGlow);
    }
    cancelAnimation(playGlow);
    playGlow.value = withTiming(0, { duration: 180, easing: EASING_STANDARD });
  }, [isPreviewing, playGlow]);

  const playGlowStyle = useAnimatedStyle(() => ({
    shadowOpacity: 0.35 * playGlow.value,
    shadowRadius: 10 + 10 * playGlow.value,
    transform: [{ scale: 1 + 0.02 * playGlow.value }],
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
    [riff.notes, riff.tags, riff.loopStart, riff.tuning, riff.bpm, riff.waveform]
  );

  const typeColor = theme.mutedForeground;
  const isPinned = !!riff.pinned;
  const loopLengthMs =
    riff.loopStart != null && riff.loopEnd != null ? riff.loopEnd - riff.loopStart : null;

  // Energy: monochrome punk (no rainbow)
  const energyColor =
    riff.energyLevel === "high"
      ? theme.primary
      : riff.energyLevel === "medium"
        ? theme.foreground
        : theme.mutedForeground;

  // Precompute mini bars only when expanded (reduces work)
  const miniBars = useMemo(() => {
    if (!isExpanded) return null;
    const wf = riff.waveform;
    if (!wf || wf.length === 0) return null;

    return wf.slice(0, 30).map((level, i) => {
      const db = level * 160 - 160;
      const minDb = -45;
      let ratio = 0.04;
      if (db > minDb) ratio = (db - minDb) / -minDb;
      const normalized = Math.max(0.04, Math.min(1, ratio));
      return { key: i, height: normalized * 50 };
    });
  }, [isExpanded, riff.waveform]);

  const cardPressableStyle = useCallback(
    ({ pressed }: { pressed: boolean }) => {
      const borderColor = pressed
        ? theme.primary
        : isSelected || isPinned
          ? theme.primary
          : theme.borderSubtle;

      return [
        styles.card,
        {
          backgroundColor: theme.card,
          borderColor,
          borderWidth: 1,
          opacity: 1, // avoid "soft" pressed opacity
          elevation: 0,
          shadowColor: "#000",
          shadowOpacity: 0.15,
          shadowRadius: 15,
          shadowOffset: { width: 0, height: 8 },
        },
      ];
    },
    [theme, isSelected, isPinned]
  );

  const selectionCheckboxStyle = useMemo(
    () => [styles.checkbox, isSelected && { backgroundColor: theme.primary, borderColor: theme.primary }],
    [isSelected, theme.primary]
  );

  const playButtonStyle = useMemo(
    () => [
      styles.iconButton,
      {
        backgroundColor: canPreview
          ? isPreviewing
            ? theme.primary
            : theme.secondary
          : theme.mutedForeground + "15",
        borderRadius: 10, // punk radius
        width: 34,
        height: 34,
        opacity: canPreview ? 1 : 0.45,
      },
    ],
    [theme.primary, theme.secondary, theme.mutedForeground, canPreview, isPreviewing]
  );

  const ghostIconButton = useMemo(
    () => [
      styles.iconButton,
      {
        backgroundColor: "transparent",
        borderRadius: 10, // punk radius
        width: 34,
        height: 34,
      },
    ],
    []
  );

  const titleText = useMemo(() => {
    const prefix = riff.emoji ? `${riff.emoji} ` : "";

    // Punk rule: title should be the idea name; type lives in badges
    const computed = riff.name;
    return prefix + computed;
  }, [riff.emoji, riff.name]);

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
              borderTopLeftRadius: 10,
              borderBottomLeftRadius: 10,
            }}
          />
        )}

        <View style={styles.header}>
          {selectionMode && (
            <View style={selectionCheckboxStyle}>
              {isSelected && <CheckCircle size={14} color="#fff" weight="fill" />}
            </View>
          )}

          {/* Play Button */}
          {riff.audioUri ? (
            <Reanimated.View
              style={[
                playGlowStyle,
                { shadowColor: theme.primary, borderRadius: 10, marginRight: 12 },
              ]}
            >
              <Pressable
                onPress={handleTogglePreview}
                disabled={!canPreview}
                hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
                style={playButtonStyle}
                accessibilityRole="button"
                accessibilityLabel={isPreviewing ? "Parar preview" : "Tocar preview"}
              >
                {isPreviewing ? (
                  <Stop size={16} color={theme.primaryForeground} weight="fill" />
                ) : (
                  <Play size={16} color={theme.foreground} weight="fill" />
                )}
              </Pressable>
            </Reanimated.View>
          ) : null}

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
            {onToggleFavorite && (
              <Pressable
                onPress={() => onToggleFavorite(riff.id)}
                hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
                style={ghostIconButton}
                accessibilityRole="button"
                accessibilityLabel={riff.favorite ? t("riff.favorite_remove" as any) : t("riff.favorite_add" as any)}
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
                style={ghostIconButton}
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

        {/* Mini Waveform always visible */}
        {riff.waveform && riff.waveform.length > 0 && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 2, marginVertical: 8, marginHorizontal: 4 }}>
            {riff.waveform.slice(0, 42).map((level, i) => {
              const db = level * 160 - 160;
              const minDb = -50;
              const ratio = db > minDb ? (db - minDb) / -minDb : 0.05;
              const normalized = Math.max(0.08, Math.min(1, ratio));

              return (
                <View
                  key={i}
                  style={{
                    width: 3,
                    height: normalized * 24,
                    backgroundColor: isPreviewing ? theme.primary : theme.mutedForeground + "55",
                    borderRadius: 1,
                  }}
                />
              );
            })}
          </View>
        )}

        {/* Micro-Badges Row */}
        <View style={[styles.metaRow, { gap: 8 }]}>
          {riff.type ? (
            <View style={styles.microBadge}>
              <View style={[styles.moodDot, { backgroundColor: typeColor }]} />
              <Text style={[styles.microBadgeText, { color: typeColor }]}>{riff.type}</Text>
            </View>
          ) : null}

          {riff.key || riff.detectedKey ? (
            <View style={styles.microBadge}>
              <Text style={[styles.microBadgeText, { color: theme.foreground }]}>
                {riff.key || riff.detectedKey}
              </Text>
            </View>
          ) : null}

          {riff.bpm ? (
            <View style={styles.microBadge}>
              <Gauge size={12} color={theme.mutedForeground} weight="thin" />
              <Text style={[styles.microBadgeText, { color: theme.mutedForeground }]}>{riff.bpm} BPM</Text>
            </View>
          ) : null}

          {riff.energyLevel ? (
            <View style={styles.microBadge}>
              <Lightning size={12} color={energyColor} weight="thin" />
              <Text style={[styles.microBadgeText, { color: energyColor }]}>
                {riff.energyLevel === "high" ? "ALTA" : riff.energyLevel === "medium" ? "MÉDIA" : "BAIXA"} ENERGIA
              </Text>
            </View>
          ) : null}

          {riff.draft ? (
            <View style={styles.microBadge}>
              <NotePencil size={12} color={theme.foreground} weight="thin" />
              <Text style={[styles.microBadgeText, { color: theme.foreground }]}>RASCUNHO</Text>
            </View>
          ) : null}

          {riff.loopStart != null && riff.loopEnd != null ? (
            <View style={styles.microBadge}>
              <Repeat size={12} color={theme.primary} weight="thin" />
              <Text style={[styles.microBadgeText, { color: theme.primary }]}>LOOP</Text>
            </View>
          ) : null}

          {projectName ? (
            <View style={[styles.microBadge, { maxWidth: 100 }]}>
              <FolderSimple size={12} color={theme.mutedForeground} weight="thin" />
              <Text style={[styles.microBadgeText, { color: theme.mutedForeground }]} numberOfLines={1}>
                {projectName}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Expanded content */}
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
                        borderRadius: 1,
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
                    TÉCNICO
                  </Text>
                </View>

                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                  {riff.bpm && (
                    <View style={{ backgroundColor: theme.input, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                      <Text style={{ color: theme.foreground, fontSize: 12 }}>{riff.bpm} BPM</Text>
                    </View>
                  )}

                  {(riff.key || riff.detectedKey) && (
                    <View style={{ backgroundColor: theme.input, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                      <Text style={{ color: theme.foreground, fontSize: 12 }}>
                        Tom {riff.key || riff.detectedKey}
                      </Text>
                    </View>
                  )}

                  {riff.tuning && (
                    <View style={{ backgroundColor: theme.input, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                      <Text style={{ color: theme.foreground, fontSize: 12 }}>{formatTuning(riff.tuning.value)}</Text>
                    </View>
                  )}

                  {loopLengthMs != null && loopLengthMs > 0 && (
                    <View style={{ backgroundColor: theme.input, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
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
                    CONTEXTO
                  </Text>
                </View>

                {(riff.tags && riff.tags.length > 0) && (
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: riff.notes ? 8 : 0 }}>
                    {riff.tags.map((tag) => (
                      <View
                        key={tag}
                        style={{
                          backgroundColor: "rgba(255,255,255,0.02)",
                          borderWidth: 1,
                          borderColor: "rgba(255,255,255,0.08)",
                          paddingHorizontal: 8,
                          paddingVertical: 4,
                          borderRadius: 6,
                        }}
                      >
                        <Text style={{ color: theme.foreground, fontSize: 11, fontWeight: "700" }}>#{tag}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {riff.notes && <Text style={{ color: theme.foreground, fontSize: 14, lineHeight: 20 }}>{riff.notes}</Text>}
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
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    overflow: "visible",
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
    fontFamily: "SpaceGrotesk_700Bold",
    fontWeight: "800",
    fontSize: 20,
    textTransform: "uppercase",
    letterSpacing: -0.2,
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: "SpaceGrotesk_400Regular",
    fontWeight: "400",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 2,
  },
  iconButton: {
    padding: 6,
    borderRadius: 10,
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
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.02)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    gap: 4,
    marginTop: 3,
    marginBottom: 5,
  },
  microBadgeText: {
    fontFamily: "SpaceGrotesk_700Bold",
    fontWeight: "600",
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 1.5,
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
    borderRadius: 1,
  },
});