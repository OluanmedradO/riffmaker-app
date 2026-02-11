import { Riff } from "@/src/types/riff";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { darkTheme } from "./Theme";
type Props = {
  riff: Riff;
  onDelete: (id: string) => void;
  onPress: () => void;
};

export function RiffCard({ riff, onDelete, onPress }: Props) {
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
      <Pressable onPress={() => onDelete(riff.id)} style={styles.delete}>
        <FontAwesome name="trash" size={20} color="#fff" />
      </Pressable>
    );
  }

  function formatDate(timestamp: number) {
    return new Date(timestamp).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
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
            { opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Text style={styles.title}>{riff.title}</Text>

          <View style={styles.metaRow}>
            <Text style={styles.metaText}>
              {riff.tuning?.value || "Afinação —"}
            </Text>

            <Text style={styles.metaText}>
              {riff.bpm ? (
                <>
                  {riff.bpm} <Text style={{ opacity: 0.6 }}>BPM</Text>
                </>
              ) : (
                "BPM —"
              )}
            </Text>
          </View>

          {riff.notes ? (
            <Text style={styles.notes} numberOfLines={2}>
              {riff.notes}
            </Text>
          ) : null}

          <Text style={styles.date}>
            Criado em {formatDate(riff.createdAt)}
          </Text>
        </Pressable>
      </Animated.View>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: darkTheme.card,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  title: {
    color: darkTheme.primary,
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 6,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },

  metaText: {
    color: darkTheme.mutedForeground,
    fontSize: 12,
  },
  notes: {
    color: darkTheme.foreground,
    fontSize: 13,
  },
  delete: {
    backgroundColor: darkTheme.primary,
    justifyContent: "center",
    alignItems: "center",
    width: 72,
  },
  date: {
    fontSize: 11,
    color: darkTheme.mutedForeground,
    paddingTop: 8,
  },
});
