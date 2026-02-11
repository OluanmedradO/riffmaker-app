import { RiffRecorder } from "@/components/RiffRecorder";
import { Screen } from "@/components/Screen";
import { useTheme } from "@/components/ThemeProvider";
import { getRiffs, updateRiff } from "@/src/storage/riffs";
import { Riff } from "@/src/types/riff";
import { Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

const TUNING_PRESETS = [
  "E Standard",
  "Drop D",
  "D Standard",
  "C Standard",
  "Open G",
  "Open D",
];

export default function EditRiff() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();

  const [form, setForm] = useState<Riff | null>(null);
  const [saving, setSaving] = useState<"idle" | "saving" | "saved">("idle");

  const isFirstLoad = useRef(true);
  const isMounted = useRef(true);

  // evita setState após unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  // carrega riff
  useEffect(() => {
    getRiffs().then((riffs) => {
      const found = riffs.find((r) => r.id === id);
      if (found && isMounted.current) {
        setForm(found);
      }
    });
  }, [id]);

  // autosave com debounce
  useEffect(() => {
    if (!form) return;

    if (isFirstLoad.current) {
      isFirstLoad.current = false;
      return;
    }


    const timeout = setTimeout(async () => {
      try {
        await updateRiff({
          ...form,
          updatedAt: Date.now(),
        });

        if (isMounted.current) {
          setSaving("saved");
        }
      } catch (err) {
        console.error("Erro ao salvar riff", err);
        if (isMounted.current) {
          setSaving("idle");
        }
      }
    }, 500);

    return () => clearTimeout(timeout);
  }, [form]);

  if (!form) return null;

  // normaliza tuning antigo (string)
  const tuning =
    typeof form.tuning === "string"
      ? { type: "custom" as const, value: form.tuning }
      : form.tuning;

  return (
    <>
      {/* HEADER */}
      <Stack.Screen
        options={{
          title: form.title || "Editar riff",
          headerStyle: { backgroundColor: theme.background },
          headerTintColor: theme.foreground,
        }}
      />

      <Screen background={theme.background}>
        {/* Nome */}
        <TextInput
          placeholder="Nome do riff"
          placeholderTextColor={theme.mutedForeground}
          value={form.title}
          onChangeText={(text) =>
            setForm((prev) => (prev ? { ...prev, title: text } : prev))
          }
          style={[
            styles.input,
            { backgroundColor: theme.input, color: theme.foreground },
          ]}
        />

        {/* BPM */}
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

        {/* Afinação presets */}
        <Text style={[styles.label, { color: theme.mutedForeground }]}>
          Afinação
        </Text>

        <View style={styles.tuningRow}>
          {TUNING_PRESETS.map((preset) => {
            const active = tuning?.type === "preset" && tuning.value === preset;

            return (
              <Pressable
                key={preset}
                accessibilityRole="button"
                accessibilityLabel={`Selecionar afinação ${preset}`}
                hitSlop={8}
                onPress={() =>
                  setForm((prev) =>
                    prev
                      ? {
                          ...prev,
                          tuning: { type: "preset", value: preset },
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
                    color: active ? theme.primaryForeground : theme.foreground,
                    fontSize: 12,
                  }}
                >
                  {preset}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Afinação custom */}
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

        {/* Gravador */}
        <RiffRecorder
          audioUri={form.audioUri}
          onChange={(uri) =>
            setForm((prev) => (prev ? { ...prev, audioUri: uri } : prev))
          }
        />

        {/* Notas */}
        <TextInput
          placeholder="Notas..."
          placeholderTextColor={theme.mutedForeground}
          value={form.notes ?? ""}
          onChangeText={(text) =>
            setForm((prev) => (prev ? { ...prev, notes: text } : prev))
          }
          multiline
          style={[
            styles.input,
            {
              height: 100,
              backgroundColor: theme.input,
              color: theme.foreground,
            },
          ]}
        />

        {/* Status */}
        <Text
          style={{
            color: theme.mutedForeground,
            fontSize: 12,
            marginTop: 8,
          }}
        >
          {saving === "saving"
            ? "Salvando…"
            : saving === "saved"
              ? "Salvo"
              : ""}
        </Text>
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
    marginBottom: 6,
  },
  tuningRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  tuningChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },
});
