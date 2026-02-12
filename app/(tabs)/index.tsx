import { RiffCard } from "@/components/RiffCard";
import { Screen } from "@/components/Screen";
import { useTheme } from "@/components/ThemeProvider";
import {
  deleteRiff,
  duplicateRiff,
  getRiffs,
  toggleFavorite,
} from "@/src/storage/riffs";
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
  Animated,
} from "react-native";
import { LoadingSpinner } from "@/src/components/LoadingSpinner";
import { RiffCardSkeleton } from "@/src/components/SkeletonLoader";
import { useHaptic } from "@/src/hooks/useHaptic";
import { searchRiffs, sortRiffs, SortOption } from "@/src/utils/riffUtils";
import { SORT_OPTIONS } from "@/src/constants/app";

export default function Home() {
  const theme = useTheme();
  const router = useRouter();
  const { triggerHaptic } = useHaptic();

  const [riffs, setRiffs] = useState<Riff[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [showSortMenu, setShowSortMenu] = useState(false);

  const filteredRiffs = sortRiffs(searchRiffs(riffs, search), sortBy);

  const fadeAnim = useState(new Animated.Value(0))[0];

  async function loadRiffs() {
    setLoading(true);
    try {
      const data = await getRiffs();
      setRiffs(data);

      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } catch (error) {
      Alert.alert("Erro", "Não foi possível carregar os riffs.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    Alert.alert("Apagar riff?", "Essa ação não pode ser desfeita.", [
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
            Alert.alert("Erro", "Não foi possível apagar o riff.");
            triggerHaptic("error");
          }
        },
      },
    ]);
  }

  async function handleDuplicate(id: string) {
    try {
      triggerHaptic("light");
      const duplicate = await duplicateRiff(id);
      if (duplicate) {
        await loadRiffs();
        triggerHaptic("success");
      }
    } catch (error) {
      Alert.alert("Erro", "Não foi possível duplicar o riff.");
      triggerHaptic("error");
    }
  }

  async function handleToggleFavorite(id: string) {
    try {
      triggerHaptic("light");
      await toggleFavorite(id);
      await loadRiffs();
    } catch (error) {
      Alert.alert("Erro", "Não foi possível favoritar o riff.");
    }
  }

  useFocusEffect(
    useCallback(() => {
      loadRiffs();
    }, []),
  );

  if (loading) {
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
        <RiffCardSkeleton />
        <RiffCardSkeleton />
        <RiffCardSkeleton />
      </Screen>
    );
  }

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

      <View style={styles.searchRow}>
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
          onPress={() => setShowSortMenu(!showSortMenu)}
          style={[
            styles.sortButton,
            { backgroundColor: theme.input, borderColor: theme.border },
          ]}
        >
          <FontAwesome name="sort" size={18} color={theme.foreground} />
        </Pressable>
      </View>

      {showSortMenu && (
        <View
          style={[
            styles.sortMenu,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
        >
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
                style={[
                  styles.sortOptionText,
                  {
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
                <FontAwesome name="check" size={16} color={theme.primary} />
              )}
            </Pressable>
          ))}
        </View>
      )}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Criar riff"
        hitSlop={12}
        onPress={() => {
          triggerHaptic("medium");
          router.push("/create");
        }}
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
          <Text style={styles.emptyIcon}>🎸</Text>
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
        <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
          <FlatList
            data={filteredRiffs}
            contentContainerStyle={{ paddingBottom: 100 }}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <RiffCard
                riff={item}
                onDelete={handleDelete}
                onDuplicate={handleDuplicate}
                onToggleFavorite={handleToggleFavorite}
                onPress={() => router.push(`/riff/${item.id}`)}
              />
            )}
            showsVerticalScrollIndicator={false}
          />
        </Animated.View>
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
  searchRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  search: {
    flex: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  sortButton: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
  sortMenu: {
    marginBottom: 12,
    borderRadius: 10,
    borderWidth: 1,
    overflow: "hidden",
  },
  sortOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sortOptionText: {
    fontSize: 14,
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
