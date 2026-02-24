import { showToast } from "@/components/AppToast";
import { IdeaForm } from "@/components/IdeaForm";
import { RiffRecorder, RiffRecorderRef } from "@/components/RiffRecorder";
import { Screen } from "@/components/Screen";
import { useTheme } from "@/components/ThemeProvider";
import { APP_CONFIG } from "@/src/constants/app";
import { useHaptic } from "@/src/hooks/useHaptic";
import { getProjects } from "@/src/storage/projects";
import { addRiff } from "@/src/storage/riffs";
import { Project } from "@/src/types/project";
import { Riff } from "@/src/types/riff";
import { detectSmartBPM } from "@/src/utils/audioProcessing";
import { generateId } from "@/src/utils/formatters";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";

import {
    Alert,
    BackHandler,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View
} from "react-native";

function getDefaultRiffName(): string {
  const now = new Date();
  const day = now.getDate().toString().padStart(2, "0");
  const month = (now.getMonth() + 1).toString().padStart(2, "0");
  const hours = now.getHours().toString().padStart(2, "0");
  const mins = now.getMinutes().toString().padStart(2, "0");
  return `Ideia ${day}/${month} ${hours}:${mins}`;
}

export default function CreateRiff() {
  const [audioUri, setAudioUri] = useState<string | undefined>();
  const router = useRouter();
  const theme = useTheme();
  const { triggerHaptic } = useHaptic();

  const [saving, setSaving] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);

  const [waveform, setWaveform] = useState<number[]>([]);
  const [duration, setDuration] = useState(0);

  const initialRiff = useRef<Riff>({
    id: generateId(),
    name: getDefaultRiffName(),
    createdAt: Date.now(),
    duration: 0,
    audioUri: "",
    waveform: [],
  }).current;

  const [formData, setFormData] = useState<Riff>(initialRiff);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    getProjects().then(setProjects);
  }, []);
  
  // Refs to hold latest form values for unmount saving
  const latestAudio = useRef<{ uri?: string; duration: number; levels: number[]; averageRms?: number; energyLevel?: "low" | "medium" | "high" }>({
    uri: undefined,
    duration: 0,
    levels: [],
  });
  const latestFormData = useRef<Riff>(formData);
  const hasSaved = useRef(false);
  const recorderRef = useRef<RiffRecorderRef>(null);

  // Keep refs in sync with state
  useEffect(() => { latestFormData.current = formData; }, [formData]);

  // Prevent accidental back navigation
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (!hasSaved.current && (audioUri || recorderRef.current?.isRecording())) {
          Alert.alert(
            "Descartar Gravação?",
            "Você tem uma gravação em andamento ou não salva. Deseja mesmo sair?",
            [
              { text: "Cancelar", style: "cancel" },
              { text: "Sair e Descartar", style: "destructive", onPress: () => { router.back(); } }
            ]
          );
          return true; // prevent default behavior
        }
        return false;
      };

      const subscription = BackHandler.addEventListener("hardwareBackPress", onBackPress);
      return () => subscription.remove();
    }, [audioUri])
  );

  const nameError = formData.name.length > APP_CONFIG.MAX_RIFF_TITLE_LENGTH;
  const notesError = (formData.notes?.length || 0) > APP_CONFIG.MAX_RIFF_NOTES_LENGTH;

  async function saveRiff(autoSave = false) {
    const uri = autoSave ? latestAudio.current.uri : audioUri;
    const dur = autoSave ? latestAudio.current.duration : duration;
    const lvls = autoSave ? latestAudio.current.levels : waveform;
    const rms = autoSave ? latestAudio.current.averageRms : latestAudio.current.averageRms;
    const energy = autoSave ? latestAudio.current.energyLevel : latestAudio.current.energyLevel;

    if (!uri) return false;

    try {
      const dataToSave = autoSave ? latestFormData.current : formData;
      const finalName = dataToSave.name.trim() || getDefaultRiffName();

      const newRiff: Riff = {
        ...dataToSave,
        name: finalName,
        createdAt: Date.now(), // update precise time
        duration: dur,
        waveform: lvls,
        audioUri: uri,
        averageRms: rms ?? dataToSave.averageRms,
        energyLevel: energy ?? dataToSave.energyLevel,
        notes: dataToSave.notes?.trim() || undefined,
      };

      await addRiff(newRiff);
      return true;
    } catch {
      return false;
    }
  }

  function handleDetectBPM() {
    if (!waveform || duration <= 0) return;
    const result = detectSmartBPM(waveform, duration);
    if (result) {
      setFormData(prev => ({ ...prev, detectedBpm: result.detectedBpm, suggestedBpms: result.suggestedBpms }));
      triggerHaptic("success");
    }
  }

  async function handleSave() {
    if (recorderRef.current?.isRecording()) {
      await recorderRef.current.stopRecording();
      // Wait a tiny bit for state to commit the new URI via onChange
      await new Promise((r) => setTimeout(r, 100));
    }

    if (!audioUri && !latestAudio.current.uri) {
      showToast({ type: 'warning', title: 'Ops', message: 'Grave um áudio primeiro.' });
      triggerHaptic("warning");
      return;
    }

    if (nameError || notesError) {
      showToast({ type: 'error', title: 'Campos inválidos', message: 'Alguns campos estão muito longos.' });
      triggerHaptic("error");
      return;
    }

    setSaving(true);
    try {
      const ok = await saveRiff(false);
      if (ok) {
        hasSaved.current = true;
        triggerHaptic("success");
        router.back();
      } else {
        showToast({ type: 'error', title: 'Erro', message: 'Não foi possível salvar o riff. Tente novamente.' });
        triggerHaptic("error");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: "Nova Ideia",
          headerStyle: {
            backgroundColor: theme.background,
          },
          headerTintColor: theme.primaryForeground,
          headerTitleStyle: {
            color: theme.primary,
            fontWeight: "bold",
          },
          headerShadowVisible: true,
          headerLeft: () => (
            <Pressable
              style={{ padding: 8, marginLeft: -8 }}
              onPress={() => {
                if (!hasSaved.current && (audioUri || recorderRef.current?.isRecording())) {
                  Alert.alert(
                    "Descartar Gravação?",
                    "Você tem uma gravação não salva. Deseja mesmo sair?",
                    [
                      { text: "Cancelar", style: "cancel" },
                      { text: "Sair e Descartar", style: "destructive", onPress: () => { router.back(); } }
                    ]
                  );
                } else {
                  router.back();
                }
              }}
            >
              <FontAwesome name="chevron-left" size={20} color={theme.primaryForeground} />
            </Pressable>
          ),
        }}
      />

      <Screen background={theme.background}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>

          {/* RECORDING — CORE SECTION */}
          <View style={[styles.coreSection, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.coreSectionTitle, { color: theme.primary }]}>
              Gravação
            </Text>
            <RiffRecorder
              ref={recorderRef}
              audioUri={audioUri}
              onChange={(data) => {
                setAudioUri(data.uri);
                setDuration(data.duration);
                setWaveform(data.levels);
                latestAudio.current = { 
                  uri: data.uri, 
                  duration: data.duration, 
                  levels: data.levels,
                  averageRms: data.averageRms,
                  energyLevel: data.energyLevel
                };
              }}
              maxSeconds={60}
            />
          </View>

          {/* DETAILS SECTION via IdeaForm */}
          <IdeaForm
            initialRiff={initialRiff}
            projects={projects}
            onDirtyChange={(dirty, currentRiff) => {
              setIsDirty(dirty);
              setFormData(currentRiff);
            }}
          />

          <View style={{ paddingHorizontal: 16 }}>
            <Pressable
              onPress={handleSave}
              disabled={!audioUri || saving || nameError || notesError}
              style={[
                styles.button,
                {
                  backgroundColor: theme.primary,
                  opacity:
                    audioUri && !saving && !nameError && !notesError
                      ? 1
                      : 0.5,
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
                  fontSize: 16,
                }}
              >
                Salvar Ideia
              </Text>
            )}
            </Pressable>
          </View>
        </ScrollView>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  coreSection: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
    marginTop: 8,
  },
  coreSectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 12,
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
