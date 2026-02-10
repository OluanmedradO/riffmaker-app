import { getRiffs } from "@/src/storage/riffs";
import { Riff } from "@/src/types/riff";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

export default function EditRiff() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [riff, setRiff] = useState<Riff | null>(null);

  useEffect(() => {
    getRiffs().then((riffs) => {
      const found = riffs.find((r) => r.id === id);
      if (found) setRiff(found);
    });
  }, [id]);

  if (!riff) return null;

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <TextInput
        value={riff.title}
        onChangeText={(text) => setRiff({ ...riff, title: text })}
      />

      <Pressable
        onPress={() => {
          router.back();
        }}
      >
        <Text>Salvar alterações</Text>
      </Pressable>
    </View>
  );
}
