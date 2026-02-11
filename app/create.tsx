import { Screen } from "@/components/Screen";
import { useTheme } from "@/components/ThemeProvider";
import { addRiff } from "@/src/storage/riffs";
import { Riff } from "@/src/types/riff";
import { useHaptic } from "@/src/hooks/useHaptic";
import { APP_CONFIG, TUNING_PRESETS } from "@/src/constants/app";
import { generateId } from "@/src/utils/formatters";
import { Stack, useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  ScrollView,
} from "react-native";
import FontAwesome from "@expo/vector-icons/FontAwesome";

export default function CreateRiff() {
  const router = useRouter();
  const theme = useTheme();
  const { triggerHaptic } = useHaptic();

  const [title, setTitle] = useState("");
  const [bpm, setBpm] = useState("");
  const [tuning, setTuning] = useState<{
    type: "preset" | "custom";
    value: string;
  } | null>(null);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const titleError = title.length > APP_CONFIG.MAX_RIFF_TITLE_LENGTH;
  const notesError = notes.length > APP_CONFIG.MAX_RIFF_NOTES_LENGTH;

  async function handleSave() {
    if (!title.trim()) {
      Alert.alert("Ops", "Dê um nome pro riff 🎸");
      triggerHaptic("warning");
      return;
    }

    if (titleError || notesError) {
      Alert.alert("Ops", "Alguns campos estão muito longos.");
      triggerHaptic("error");
      return;
    }

    setSaving(true);
    try {
      const parsedBpm = Number(bpm.replace(",", "."));
      const newRiff: Riff = {
        id: generateId(),
        title: title.trim(),
        bpm: Number.isFinite(parsedBpm) && parsedBpm > 0 ? parsedBpm : undefined,
        tuning: tuning || undefined,
        notes: notes.trim() || undefined,
        createdAt: Date.now(),
      };

      await addRiff(newRiff);
      triggerHaptic("success");
      router.back();
    } catch (error) {
      Alert.alert("Erro", "Não foi possível salvar o riff. Tente novamente.");
      triggerHaptic("error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: "Novo Riff",
          headerStyle: {
            backgroundColor: theme.background,
          },
          headerTintColor: theme.primaryForeground,
          headerTitleStyle: {
            color: theme.primary,
            fontWeight: "bold",
          },
          headerShadowVisible: false,
        }}
      />

      <Screen background={theme.background}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <Text
            style={{
              fontSize: 22,
              fontWeight: "bold",
              marginBottom: 16,
              color: theme.primary,
            }}
          >
            Novo riff
          </Text>

          <Text style={[styles.label, { color: theme.mutedForeground }]}>
            Nome *
          </Text>
          <TextInput
            autoFocus
            placeholder="Nome do riff"
            placeholderTextColor={theme.mutedForeground}
            value={title}
            onChangeText={setTitle}
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
          {titleError && (
            <Text style={[styles.errorText, { color: theme.destructive }]}>
              Muito longo ({title.length}/{APP_CONFIG.MAX_RIFF_TITLE_LENGTH})
            </Text>
          )}

          <Text style={[styles.label, { color: theme.mutedForeground }]}>
            BPM
          </Text>
          <TextInput
            placeholder="Ex: 120"
            keyboardType="numeric"
            placeholderTextColor={theme.mutedForeground}
            value={bpm}
            onChangeText={setBpm}
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
                  onPress={() => {
                    setTuning({ type: "preset", value: preset.value });
                    triggerHaptic("light");
                  }}
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
            placeholder="Afinação customizada (ex: Drop C#)"
            placeholderTextColor={theme.mutedForeground}
            value={tuning?.type === "custom" ? tuning.value : ""}
            onChangeText={(text) =>
              setTuning({ type: "custom", value: text })
            }
            style={[
              styles.input,
              { backgroundColor: theme.input, color: theme.foreground },
            ]}
          />

          <Text style={[styles.label, { color: theme.mutedForeground }]}>
            Notas / Ideia
          </Text>
          <TextInput
            placeholder="Escreva suas ideias, progressões, ou observações..."
            placeholderTextColor={theme.mutedForeground}
            value={notes}
            onChangeText={setNotes}
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
          {notesError && (
            <Text style={[styles.errorText, { color: theme.destructive }]}>
              Muito longo ({notes.length}/{APP_CONFIG.MAX_RIFF_NOTES_LENGTH})
            </Text>
          )}

          <Pressable
            onPress={handleSave}
            disabled={!title.trim() || saving || titleError || notesError}
            style={[
              styles.button,
              {
                backgroundColor: theme.primary,
                opacity: title.trim() && !saving && !titleError && !notesError ? 1 : 0.5,
              },
            ]}
          >
            {saving ? (
              <>
                <FontAwesome
                  name="spinner"
                  size={16}
                  color={theme.primaryForeground}
                />
                <Text
                  style={{
                    color: theme.primaryForeground,
                    fontWeight: "bold",
                  }}
                >
                  Salvando...
                </Text>
              </>
            ) : (
              <Text
                style={{
                  color: theme.primaryForeground,
                  fontWeight: "bold",
                }}
              >
                Salvar riff
              </Text>
            )}
          </Pressable>
        </ScrollView>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 6,
    marginTop: 8,
  },
  input: {
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
  },
  errorText: {
    fontSize: 11,
    marginBottom: 8,
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
  button: {
    marginTop: 16,
    marginBottom: 24,
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
});
