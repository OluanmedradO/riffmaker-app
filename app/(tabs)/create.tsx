import { addRiff } from "@/src/storage/riffs";
import { Riff } from "@/src/types/riff";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

export default function CreateRiff() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [bpm, setBpm] = useState("");
  const [tuning, setTuning] = useState("");
  const [notes, setNotes] = useState("");

  async function handleSave() {
    if (!title.trim()) return;

    const newRiff: Riff = {
      id: Date.now().toString(),
      title,
      bpm: bpm ? Number(bpm) : undefined,
      tuning,
      notes,
      createdAt: Date.now(),
    };

    await addRiff(newRiff);

    Alert.alert("Riff salvo 🎸", "Sua ideia está segura.");
    router.replace("/(tabs)");

    setTitle("");
    setBpm("");
    setTuning("");
    setNotes("");

    router.replace("/(tabs)");
  }

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <TextInput
        placeholder="Nome do riff"
        value={title}
        onChangeText={setTitle}
        style={styles.input}
      />

      <TextInput
        placeholder="BPM"
        keyboardType="numeric"
        value={bpm}
        onChangeText={setBpm}
        style={styles.input}
      />

      <TextInput
        placeholder="Afinação (ex: Drop D)"
        value={tuning}
        onChangeText={setTuning}
        style={styles.input}
      />

      <TextInput
        placeholder="Notas / ideia"
        value={notes}
        onChangeText={setNotes}
        style={[styles.input, { height: 100 }]}
        multiline
      />

      <Pressable onPress={handleSave} style={styles.button}>
        <Text style={{ color: "#fff", fontWeight: "bold" }}>Salvar riff</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  button: {
    backgroundColor: "#d62316",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
  },
});
