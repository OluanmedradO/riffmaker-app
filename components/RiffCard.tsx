import { Riff } from "@/src/types/riff";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { Swipeable } from "react-native-gesture-handler";

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

          <View style={styles.meta}>
            <Text style={styles.metaText}>{riff.tuning || "Afinação —"}</Text>
            <Text style={styles.metaText}>
              {riff.bpm ? `${riff.bpm} BPM` : "BPM —"}
            </Text>
          </View>

          {riff.notes ? (
            <Text style={styles.notes} numberOfLines={2}>
              {riff.notes}
            </Text>
          ) : null}
        </Pressable>
      </Animated.View>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#111827",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  title: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 6,
  },
  meta: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  metaText: {
    color: "#9ca3af",
    fontSize: 12,
  },
  notes: {
    color: "#d1d5db",
    fontSize: 13,
  },
  delete: {
    backgroundColor: "#dc2626",
    justifyContent: "center",
    alignItems: "center",
    width: 72,
  },
});
