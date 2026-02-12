import { RiffRecorder } from "@/components/RiffRecorder";
import { Screen } from "@/components/Screen";
import { useTheme } from "@/components/ThemeProvider";
import { getRiffs, updateRiff } from "@/src/storage/riffs";
import { Riff } from "@/src/types/riff";
import { useDebounce } from "@/src/hooks/useDebounce";
import { APP_CONFIG, TUNING_PRESETS } from "@/src/constants/app";
import { Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  ScrollView,
  Alert,
} from "react-native";
import { LoadingSpinner } from "@/src/components/LoadingSpinner";
import FontAwesome from "@expo/vector-icons/FontAwesome";

export default function EditRiff() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();

  const [form, setForm] = useState<Riff | null>(null);
  const [saving, setSaving] = useState<"idle" | "saving" | "saved">("idle");
  const [loading, setLoading] = useState(true);

  const isFirstLoad = useRef(true);
  const isMounted = useRef(true);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    async function loadRiff() {
      try {
        const riffs = await getRiffs();
        const found = riffs.find((r) => r.id === id);
        if (found && isMounted.current) {
          setForm(found);
        } else if (!found) {
          Alert.alert("Erro", "Riff não encontrado.");
        }
      } catch (error) {
        Alert.alert("Erro", "Não foi possível carregar o riff.");
      } finally {
        setLoading(false);
      }
    }

    loadRiff();
  }, [id]);

  const debouncedSave = useDebounce(async (updatedForm: Riff) => {
    if (!isMounted.current) return;

    setSaving("saving");
    try {
      await updateRiff({
        ...updatedForm,
        updatedAt: Date.now(),
      });

      if (isMounted.current) {
        setSaving("saved");
        setTimeout(() => {
          if (isMounted.current) setSaving("idle");
        }, 2000);
      }
    } catch (err) {
      console.error("Erro ao salvar riff", err);
      Alert.alert("Erro", "Não foi possível salvar as alterações.");
      if (isMounted.current) {
        setSaving("idle");
      }
    }
  }, APP_CONFIG.AUTOSAVE_DEBOUNCE_MS);

  useEffect(() => {
    if (!form) return;

    if (isFirstLoad.current) {
      isFirstLoad.current = false;
      return;
    }

    debouncedSave(form);
  }, [form, debouncedSave]);

  if (loading) {
    return (
      <Screen background={theme.background}>
        <LoadingSpinner message="Carregando riff..." />
      </Screen>
    );
  }

  if (!form) {
    return (
      <Screen background={theme.background}>
        <View style={styles.empty}>
          <Text style={[styles.emptyTitle, { color: theme.primary }]}>
            Riff não encontrado
          </Text>
        </View>
      </Screen>
    );
  }

  const tuning =
    typeof form.tuning === "string"
      ? { type: "custom" as const, value: form.tuning }
      : form.tuning;

  const titleError =
    form.title.length > APP_CONFIG.MAX_RIFF_TITLE_LENGTH;
  const notesError =
    (form.notes?.length || 0) > APP_CONFIG.MAX_RIFF_NOTES_LENGTH;

  return (
    <>
      <Stack.Screen
        options={{
          title: form.title || "Editar riff",
          headerStyle: { backgroundColor: theme.background },
          headerTintColor: theme.foreground,
          headerRight: () => (
            <View style={styles.headerRight}>
              {saving === "saving" && (
                <>
                  <FontAwesome
                    name="spinner"
                    size={14}
                    color={theme.mutedForeground}
                  />
                  <Text
                    style={[
                      styles.savingText,
                      { color: theme.mutedForeground },
                    ]}
                  >
                    Salvando...
                  </Text>
                </>
              )}
              {saving === "saved" && (
                <>
                  <FontAwesome
                    name="check"
                    size={14}
                    color={theme.primary}
                  />
                  <Text style={[styles.savingText, { color: theme.primary }]}>
                    Salvo
                  </Text>
                </>
              )}
            </View>
          ),
        }}
      />

      <Screen background={theme.background}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <Text style={[styles.label, { color: theme.mutedForeground }]}>
            Nome
          </Text>
          <TextInput
            placeholder="Nome do riff"
            placeholderTextColor={theme.mutedForeground}
            value={form.title}
            onChangeText={(text) =>
              setForm((prev) => (prev ? { ...prev, title: text } : prev))
            }
            maxLength={APP_CONFIG.MAX_RIFF_TITLE_LENGTH}
            style={[
              styles.input,
              {
                backgroundColor: theme.input,
                color: theme.foreground,
                borderColor: titleError ? theme.destructive : "transparent",
                borderWidth: titleError ? 1 : 0,
              },
            ]}
          />

          <Text style={[styles.label, { color: theme.mutedForeground }]}>
            BPM
          </Text>
          <TextInput
            placeholder="Ex: 120"
            keyboardType="numeric"
            placeholderTextColor={theme.mutedForeground}
            value={form.bpm?.toString() ?? ""}
            onChangeText={(text) =>
              setForm((prev) => {
                if (!prev) return prev;

                const cleaned = text.replace(/[^\d.,]/g, "").replace(",", ".");
                if (!cleaned) return { ...prev, bpm: undefined };

                const parsed = Number(cleaned);
                if (!Number.isFinite(parsed)) return prev;

                return { ...prev, bpm: parsed };
              })
            }
            style={[
              styles.input,
              { backgroundColor: theme.input, color: theme.foreground },
            ]}
          />

          <Text style={[styles.label, { color: theme.mutedForeground }]}>
            Afinação
          </Text>

          <View style={styles.tuningRow}>
            {TUNING_PRESETS.map((preset) => {
              const active =
                tuning?.type === "preset" && tuning.value === preset.value;

              return (
                <Pressable
                  key={preset.value}
                  accessibilityRole="button"
                  accessibilityLabel={`Selecionar afinação ${preset.label}`}
                  hitSlop={8}
                  onPress={() =>
                    setForm((prev) =>
                      prev
                        ? {
                            ...prev,
                            tuning: { type: "preset", value: preset.value },
                          }
                        : prev,
                    )
                  }
                  style={[
                    styles.tuningChip,
                    {
                      backgroundColor: active ? theme.primary : theme.input,
                    },
                  ]}
                >
                  <Text
                    style={{
                      color: active
                        ? theme.primaryForeground
                        : theme.foreground,
                      fontSize: 11,
                      fontWeight: active ? "600" : "normal",
                    }}
                  >
                    {preset.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <TextInput
            placeholder="Afinação customizada"
            placeholderTextColor={theme.mutedForeground}
            value={tuning?.type === "custom" ? tuning.value : ""}
            onChangeText={(text) =>
              setForm((prev) =>
                prev
                  ? {
                      ...prev,
                      tuning: { type: "custom", value: text },
                    }
                  : prev,
              )
            }
            style={[
              styles.input,
              { backgroundColor: theme.input, color: theme.foreground },
            ]}
          />

          <Text style={[styles.label, { color: theme.mutedForeground }]}>
            Gravação de Áudio
          </Text>
          <RiffRecorder
            audioUri={form.audioUri}
            onChange={(uri) =>
              setForm((prev) => (prev ? { ...prev, audioUri: uri } : prev))
            }
          />

          <Text style={[styles.label, { color: theme.mutedForeground }]}>
            Notas
          </Text>
          <TextInput
            placeholder="Escreva suas ideias, progressões, ou observações..."
            placeholderTextColor={theme.mutedForeground}
            value={form.notes ?? ""}
            onChangeText={(text) =>
              setForm((prev) => (prev ? { ...prev, notes: text } : prev))
            }
            maxLength={APP_CONFIG.MAX_RIFF_NOTES_LENGTH}
            multiline
            textAlignVertical="top"
            style={[
              styles.input,
              {
                height: 120,
                backgroundColor: theme.input,
                color: theme.foreground,
                borderColor: notesError ? theme.destructive : "transparent",
                borderWidth: notesError ? 1 : 0,
              },
            ]}
          />
          <View style={{ height: 40 }} />
        </ScrollView>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  input: {
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 6,
    marginTop: 8,
  },
  tuningRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  tuningChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginRight: 8,
  },
  savingText: {
    fontSize: 12,
  },
  empty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
});
