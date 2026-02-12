import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Audio } from "expo-av";
import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View, Alert } from "react-native";
import { useTheme } from "./ThemeProvider";
import { useHaptic } from "@/src/hooks/useHaptic";
import { formatTime } from "@/src/utils/formatters";

type Props = {
  audioUri?: string;
  onChange: (uri?: string) => void;
  maxSeconds?: number;
};

export function RiffRecorder({ audioUri, onChange, maxSeconds = 60 }: Props) {
  const theme = useTheme();
  const { triggerHaptic } = useHaptic();

  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [seconds, setSeconds] = useState(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      sound?.unloadAsync();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [sound]);

  async function startRecording() {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Permissão necessária",
          "O Riff Maker precisa acessar o microfone para gravar áudio. Por favor, permita o acesso nas configurações.",
          [{ text: "OK" }],
        );
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const rec = new Audio.Recording();
      await rec.prepareToRecordAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );
      await rec.startAsync();

      setRecording(rec);
      setSeconds(0);
      triggerHaptic("medium");

      timerRef.current = setInterval(() => {
        setSeconds((prev) => {
          if (prev + 1 >= maxSeconds) {
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (error) {
      console.error("Erro ao iniciar gravação:", error);
      Alert.alert(
        "Erro",
        "Não foi possível iniciar a gravação. Tente novamente.",
      );
      triggerHaptic("error");
    }
  }

  async function stopRecording() {
    if (!recording) return;

    try {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }

      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();

      if (!uri) {
        Alert.alert("Erro", "Não foi possível salvar a gravação.");
        triggerHaptic("error");
        return;
      }

      setRecording(null);
      onChange(uri);
      triggerHaptic("success");
    } catch (error) {
      console.error("Erro ao parar gravação:", error);
      Alert.alert("Erro", "Não foi possível finalizar a gravação.");
      triggerHaptic("error");
    }
  }

  async function playAudio() {
    if (!audioUri) return;

    try {
      triggerHaptic("light");
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: audioUri },
        { shouldPlay: true },
      );

      setSound(newSound);
      setIsPlaying(true);

      newSound.setOnPlaybackStatusUpdate((status) => {
        if (!status.isLoaded) return;
        if (!status.isPlaying) {
          setIsPlaying(false);
          newSound.unloadAsync();
        }
      });
    } catch (error) {
      console.error("Erro ao reproduzir áudio:", error);
      Alert.alert("Erro", "Não foi possível reproduzir o áudio.");
      triggerHaptic("error");
    }
  }

  async function handleDelete() {
    Alert.alert(
      "Apagar gravação?",
      "Esta ação não pode ser desfeita.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Apagar",
          style: "destructive",
          onPress: () => {
            onChange(undefined);
            triggerHaptic("medium");
          },
        },
      ],
    );
  }

  return (
    <View style={styles.container}>
      {!recording ? (
        <Pressable
          style={[
            styles.button,
            { backgroundColor: theme.primary },
          ]}
          onPress={startRecording}
        >
          <FontAwesome name="microphone" size={20} color="#fff" />
          <Text style={styles.text}>
            {audioUri ? "Gravar novamente" : "Gravar áudio"}
          </Text>
        </Pressable>
      ) : (
        <Pressable
          style={[styles.button, styles.recording]}
          onPress={stopRecording}
        >
          <View style={styles.recordingIndicator} />
          <Text style={styles.text}>Gravando {formatTime(seconds)}</Text>
          <FontAwesome name="stop" size={20} color="#fff" />
        </Pressable>
      )}

      {audioUri && !recording && (
        <View style={styles.row}>
          <Pressable
            style={[styles.small, { backgroundColor: theme.secondary }]}
            onPress={playAudio}
          >
            <FontAwesome
              name={isPlaying ? "pause" : "play"}
              size={16}
              color="#fff"
            />
            <Text style={styles.smallText}>
              {isPlaying ? "Pausar" : "Tocar"}
            </Text>
          </Pressable>

          <Pressable
            style={[styles.small, { backgroundColor: theme.destructive }]}
            onPress={handleDelete}
          >
            <FontAwesome name="trash" size={16} color="#fff" />
            <Text style={styles.smallText}>Apagar</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 12,
    gap: 8,
  },
  button: {
    flexDirection: "row",
    gap: 8,
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  recording: {
    backgroundColor: "#dc2626",
  },
  recordingIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#fff",
  },
  text: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
  },
  row: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
  },
  small: {
    flex: 1,
    flexDirection: "row",
    gap: 6,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  smallText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 13,
  },
});
