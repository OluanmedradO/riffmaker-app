import { Riff } from "@/src/types/riff";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useEffect, useRef } from "react";
import {
  Animated,
  Pressable,
  StyleSheet,
  Text,
  View,
  Alert,
} from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { useTheme } from "./ThemeProvider";
import { formatDate } from "@/src/utils/formatters";

type Props = {
  riff: Riff;
  onDelete: (id: string) => void;
  onDuplicate?: (id: string) => void;
  onToggleFavorite?: (id: string) => void;
  onPress: () => void;
};

export function RiffCard({
  riff,
  onDelete,
  onDuplicate,
  onToggleFavorite,
  onPress,
}: Props) {
  const theme = useTheme();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  function renderRightActions() {
    return (
      <View style={styles.actionsContainer}>
        {onDuplicate && (
          <Pressable
            onPress={() => onDuplicate(riff.id)}
            style={[styles.action, { backgroundColor: "#3b82f6" }]}
          >
            <FontAwesome name="copy" size={20} color="#fff" />
          </Pressable>
        )}
        <Pressable
          onPress={() => onDelete(riff.id)}
          style={[styles.action, { backgroundColor: theme.destructive }]}
        >
          <FontAwesome name="trash" size={20} color="#fff" />
        </Pressable>
      </View>
    );
  }

  return (
    <Swipeable renderRightActions={renderRightActions}>
      <Animated.View
        style={{
          opacity,
          transform: [{ translateY }],
        }}
      >
        <Pressable
          onPress={onPress}
          style={({ pressed }) => [
            styles.card,
            {
              backgroundColor: theme.card,
              opacity: pressed ? 0.85 : 1,
              shadowColor: "#000",
              shadowOpacity: 0.1,
              shadowRadius: 6,
              shadowOffset: { width: 0, height: 2 },
              elevation: 3,
            },
          ]}
        >
          <View style={styles.header}>
            <Text style={[styles.title, { color: theme.primary }]}>
              {riff.title}
            </Text>
            {onToggleFavorite && (
              <Pressable
                onPress={() => onToggleFavorite(riff.id)}
                hitSlop={8}
              >
                <FontAwesome
                  name={riff.favorite ? "star" : "star-o"}
                  size={20}
                  color={riff.favorite ? "#fbbf24" : theme.mutedForeground}
                />
              </Pressable>
            )}
          </View>

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <FontAwesome
                name="music"
                size={12}
                color={theme.mutedForeground}
              />
              <Text style={[styles.metaText, { color: theme.mutedForeground }]}>
                {riff.tuning?.value || "—"}
              </Text>
            </View>

            <View style={styles.metaItem}>
              <FontAwesome
                name="tachometer"
                size={12}
                color={theme.mutedForeground}
              />
              <Text style={[styles.metaText, { color: theme.mutedForeground }]}>
                {riff.bpm ? `${riff.bpm} BPM` : "—"}
              </Text>
            </View>

            {riff.audioUri && (
              <View style={styles.metaItem}>
                <FontAwesome
                  name="microphone"
                  size={12}
                  color={theme.primary}
                />
                <Text style={[styles.metaText, { color: theme.primary }]}>
                  Áudio
                </Text>
              </View>
            )}
          </View>

          {riff.notes ? (
            <Text
              style={[styles.notes, { color: theme.foreground }]}
              numberOfLines={2}
            >
              {riff.notes}
            </Text>
          ) : null}

          <Text style={[styles.date, { color: theme.mutedForeground }]}>
            {formatDate(riff.createdAt)}
          </Text>
        </Pressable>
      </Animated.View>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    flex: 1,
  },
  metaRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 8,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 12,
  },
  notes: {
    fontSize: 13,
    marginBottom: 8,
    lineHeight: 18,
  },
  date: {
    fontSize: 11,
  },
  actionsContainer: {
    flexDirection: "row",
  },
  action: {
    justifyContent: "center",
    alignItems: "center",
    width: 72,
  },
});
