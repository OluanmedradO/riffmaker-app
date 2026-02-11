import { RiffCard } from "@/components/RiffCard";
import { Screen } from "@/components/Screen";
import { useTheme } from "@/components/ThemeProvider";
import { deleteRiff, getRiffs } from "@/src/storage/riffs";
import { Riff } from "@/src/types/riff";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

export default function Home() {
  const theme = useTheme();

  const [riffs, setRiffs] = useState<Riff[]>([]);
  const [search, setSearch] = useState("");
  const filteredRiffs = riffs.filter((riff) =>
    riff.title.toLowerCase().includes(search.toLowerCase()),
  );

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
      getRiffs().then((data) => {
        const ordered = [...data].sort((a, b) => b.createdAt - a.createdAt);
        setRiffs(ordered);
      });
    }, []),
  );

  return (
    <Screen background={theme.background}>
      <Text
        style={{
          fontSize: 24,
          fontWeight: "bold",
          marginBottom: 16,
          marginTop: 16,
          color: theme.primary,
        }}
      >
        Meus Riffs
      </Text>
      <TextInput
        placeholder="Buscar riff..."
        placeholderTextColor={theme.mutedForeground}
        value={search}
        onChangeText={setSearch}
        style={[
          styles.search,
          {
            backgroundColor: theme.input,
            color: theme.foreground,
          },
        ]}
      />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Criar riff"
        hitSlop={12}
        onPress={() => router.push("/create")}
        style={({ pressed }) => [
          styles.fab,
          {
            backgroundColor: theme.primary,
            opacity: pressed ? 0.85 : 1,
          },
        ]}
      >
        <FontAwesome name="plus" size={22} color={theme.primaryForeground} />
      </Pressable>

      {riffs.length === 0 ? (
        <View style={styles.empty}>
          <Text style={[styles.emptyTitle, { color: theme.primary }]}>
            Nenhum riff salvo ainda
          </Text>
          <Text style={{ color: theme.mutedForeground, textAlign: "center" }}>
            Crie seu primeiro riff e nunca mais perca uma ideia.
          </Text>
        </View>
      ) : filteredRiffs.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🔍</Text>
          <Text style={[styles.emptyTitle, { color: theme.primary }]}>
            Nenhum riff encontrado
          </Text>
          <Text style={{ color: theme.mutedForeground, textAlign: "center" }}>
            Tente outro nome ou crie um novo riff.
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredRiffs}
          contentContainerStyle={{ paddingBottom: 100 }}
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
    </Screen>
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
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8,
  },
  search: {
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
  },
  fab: {
    position: "absolute",
    zIndex: 1000,
    elevation: 10,
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
});
