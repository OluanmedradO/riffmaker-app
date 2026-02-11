import { Screen } from "@/components/Screen";
import { useTheme } from "@/components/ThemeProvider";
import { addRiff } from "@/src/storage/riffs";
import { Riff } from "@/src/types/riff";
import * as Haptics from "expo-haptics";
import { Stack, useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput } from "react-native";

export default function CreateRiff() {
  const router = useRouter();
  const theme = useTheme();

  const [title, setTitle] = useState("");
  const [bpm, setBpm] = useState("");
  const [tuning, setTuning] = useState("");
  const [notes, setNotes] = useState("");

  async function handleSave() {
    const parsedBpm = Number(bpm.replace(",", "."));
    if (!title.trim()) {
      Alert.alert("Ops", "Dê um nome pro riff 🎸");
      return;
    }

    const newRiff: Riff = {
      id: Date.now().toString(),
      title,
      bpm: Number.isFinite(parsedBpm) ? parsedBpm : undefined,
      tuning: tuning
        ? {
            type: "custom",
            value: tuning,
          }
        : undefined,
      notes: notes || undefined,
      createdAt: Date.now(),
    };

    await addRiff(newRiff);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.back();
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

        <TextInput
          autoFocus
          placeholder="Nome do riff"
          placeholderTextColor={theme.mutedForeground}
          value={title}
          onChangeText={setTitle}
          style={[
            styles.input,
            { backgroundColor: theme.input, color: theme.foreground },
          ]}
        />

        <TextInput
          placeholder="BPM"
          keyboardType="numeric"
          placeholderTextColor={theme.mutedForeground}
          value={bpm}
          onChangeText={setBpm}
          style={[
            styles.input,
            { backgroundColor: theme.input, color: theme.foreground },
          ]}
        />

        <TextInput
          placeholder="Afinação (ex: Drop D)"
          placeholderTextColor={theme.mutedForeground}
          value={tuning}
          onChangeText={setTuning}
          style={[
            styles.input,
            { backgroundColor: theme.input, color: theme.foreground },
          ]}
        />

        <TextInput
          placeholder="Notas / ideia"
          placeholderTextColor={theme.mutedForeground}
          value={notes}
          onChangeText={setNotes}
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

        <Pressable
          onPress={handleSave}
          disabled={!title.trim()}
          style={[
            styles.button,
            {
              backgroundColor: theme.primary,
              opacity: title.trim() ? 1 : 0.5,
            },
          ]}
        >
          <Text
            style={{
              color: theme.primaryForeground,
              fontWeight: "bold",
            }}
          >
            Salvar riff
          </Text>
        </Pressable>
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
  button: {
    marginTop: 8,
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
  },
});
