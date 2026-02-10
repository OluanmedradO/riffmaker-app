import { RiffCard } from "@/components/RiffCard";
import { deleteRiff, getRiffs } from "@/src/storage/riffs";
import { Riff } from "@/src/types/riff";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, FlatList, StyleSheet, Text, View } from "react-native";

export default function Home() {
  const [riffs, setRiffs] = useState<Riff[]>([]);

  const router = useRouter();

  async function handleDelete(id: string) {
    Alert.alert("Apagar riff?", "Essa ação não pode ser desfeita.", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Apagar",
        style: "destructive",
        onPress: async () => {
          await deleteRiff(id);
          const updated = await getRiffs();
          setRiffs(updated);
        },
      },
    ]);
  }

  useFocusEffect(
    useCallback(() => {
      getRiffs().then(setRiffs);
    }, []),
  );

  return (
    <View style={{ flex: 1, padding: 20, backgroundColor: "#ffffff" }}>
      <Text
        style={{
          fontSize: 24,
          fontWeight: "bold",
          marginBottom: 16,
          color: "black",
        }}
      >
        Meus Riffs
      </Text>

      {riffs.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🎸</Text>
          <Text style={styles.emptyTitle}>Nenhum riff salvo ainda</Text>
          <Text style={styles.emptyText}>
            Crie seu primeiro riff e nunca mais perca uma ideia.
          </Text>
        </View>
      ) : (
        <FlatList
          data={riffs}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <RiffCard
              riff={item}
              onDelete={handleDelete}
              onPress={() => router.push(`/riff/${item.id}`)}
            />
          )}
          showsVerticalScrollIndicator={false}
        />
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
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8,
  },
  emptyText: {
    color: "#9ca3af",
    textAlign: "center",
  },
});
