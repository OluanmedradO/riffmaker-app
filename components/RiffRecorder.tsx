import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Audio } from "expo-av";
import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

type Props = {
  audioUri?: string;
  onChange: (uri?: string) => void;
  maxSeconds?: number; // opcional (ex: 60)
};

export function RiffRecorder({ audioUri, onChange, maxSeconds = 60 }: Props) {
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

  function formatTime(total: number) {
    const m = Math.floor(total / 60)
      .toString()
      .padStart(2, "0");
    const s = (total % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }

  async function startRecording() {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        alert("Permissão de microfone é necessária para gravar.");
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
      alert("Erro ao iniciar gravação de áudio.");
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
        alert("Erro ao salvar gravação.");
        return;
      }

      setRecording(null);
      onChange(uri);
    } catch (error) {
      console.error("Erro ao parar gravação:", error);
      alert("Erro ao finalizar gravação.");
    }
  }

  async function playAudio() {
    if (!audioUri) return;

    const { sound } = await Audio.Sound.createAsync(
      { uri: audioUri },
      { shouldPlay: true },
    );

    setSound(sound);
    setIsPlaying(true);

    sound.setOnPlaybackStatusUpdate((status) => {
      if (!status.isLoaded) return;
      if (!status.isPlaying) {
        setIsPlaying(false);
        sound.unloadAsync();
      }
    });
  }

  return (
    <View style={styles.container}>
      {!recording ? (
        <Pressable style={styles.button} onPress={startRecording}>
          <FontAwesome name="microphone" size={20} color="#fff" />
          <Text style={styles.text}>Gravar</Text>
        </Pressable>
      ) : (
        <Pressable
          style={[styles.button, styles.recording]}
          onPress={stopRecording}
        >
          <FontAwesome name="stop" size={20} color="#fff" />
          <Text style={styles.text}>Gravando {formatTime(seconds)}</Text>
        </Pressable>
      )}

      {audioUri && (
        <View style={styles.row}>
          <Pressable style={styles.small} onPress={playAudio}>
            <FontAwesome
              name={isPlaying ? "pause" : "play"}
              size={16}
              color="#fff"
            />
          </Pressable>

          <Pressable
            style={[styles.small, styles.delete]}
            onPress={() => onChange(undefined)}
          >
            <FontAwesome name="trash" size={16} color="#fff" />
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
    backgroundColor: "#991c1c",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  recording: {
    backgroundColor: "#dc2626",
  },
  text: {
    color: "#fff",
    fontWeight: "bold",
  },
  row: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "center",
  },
  small: {
    padding: 10,
    borderRadius: 8,
    backgroundColor: "#374151",
  },
  delete: {
    backgroundColor: "#7f1d1d",
  },
});
