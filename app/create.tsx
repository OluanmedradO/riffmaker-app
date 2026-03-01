import { showToast } from "@/components/AppToast";
import { IdeaForm } from "@/components/IdeaForm";
import { RecordingResult, RiffRecorder, RiffRecorderRef } from "@/components/recorder/RiffRecorder";
import { Screen } from "@/components/Screen";
import { useTheme } from "@/components/ThemeProvider";
import { APP_CONFIG } from "@/src/constants/app";
import { useHaptic } from "@/src/hooks/useHaptic";
import { useTranslation } from "@/src/i18n";
import { getProjects } from "@/src/storage/projects";
import { addRiff } from "@/src/storage/riffs";
import { Project } from "@/src/types/project";
import { Riff } from "@/src/types/riff";
import { generateId } from "@/src/utils/formatters";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Stack, useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    AppState,
    AppStateStatus,
    BackHandler,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function getDefaultRiffName(t: any): string {
  const now = new Date();
  const day = now.getDate().toString().padStart(2, "0");
  const month = (now.getMonth() + 1).toString().padStart(2, "0");
  const hours = now.getHours().toString().padStart(2, "0");
  const mins = now.getMinutes().toString().padStart(2, "0");
  const dateStr = `${day}/${month} ${hours}:${mins}`;
  return t("idea.default_name", { date: dateStr });
}

// AudioSnapshot matches RecordingResult from RiffRecorder — use locally for the ref
type AudioSnapshot = {
  uri?: string;
  duration: number;
  levels: number[];
  averageRms?: number;
  energyLevel?: "low" | "medium" | "high";
  dynamicRange?: number;
};

export default function CreateRiff() {
  const [audioUri, setAudioUri] = useState<string | undefined>();
  const router = useRouter();
  const theme = useTheme();
  const { t } = useTranslation();
  const { triggerHaptic } = useHaptic();
  const insets = useSafeAreaInsets();

  const [saving, setSaving] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [waveform, setWaveform] = useState<number[]>([]);
  const [duration, setDuration] = useState(0);

  // Capture creation time once — never overwrite
  const createdAt = useRef(Date.now()).current;

  const initialRiff = useRef<Riff>({
    id: generateId(),
    name: getDefaultRiffName(t),
    createdAt,
    duration: 0,
    audioUri: "",
    waveform: [],
  }).current;

  const [formData, setFormData] = useState<Riff>(initialRiff);

  useEffect(() => {
    getProjects().then(setProjects);
  }, []);

  // Refs to hold latest values — safe to read from unmount / background handlers
  const latestAudio = useRef<AudioSnapshot>({ uri: undefined, duration: 0, levels: [] });
  const latestFormData = useRef<Riff>(formData);
  const hasSaved = useRef(false);
  const recorderRef = useRef<RiffRecorderRef>(null);

  useEffect(() => {
    latestFormData.current = formData;
  }, [formData]);

  // ─── Auto-save when app goes to background ──────────────────────────────────
  useEffect(() => {
    const handleAppStateChange = async (nextState: AppStateStatus) => {
      if (nextState === "background" && latestAudio.current.uri && !hasSaved.current) {
        const saved = await saveRiff();
        if (saved) hasSaved.current = true;
      }
    };

    const subscription = AppState.addEventListener("change", handleAppStateChange);
    return () => subscription.remove();
  }, []);

  // ─── Confirm discard (shared between back button and header) ─────────────────
  const confirmDiscard = useCallback(
    (onConfirm: () => void) => {
      const hasUnsaved = !hasSaved.current && (!!audioUri || recorderRef.current?.isRecording());
      if (!hasUnsaved) {
        onConfirm();
        return;
      }
      Alert.alert(
        t("idea.discard_title"),
        t("idea.discard_unsaved"),
        [
          { text: t("cancel"), style: "cancel" },
          { text: t("idea.discard_action"), style: "destructive", onPress: onConfirm },
        ]
      );
    },
    [audioUri, t]
  );

  // Hardware back (Android)
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        confirmDiscard(() => router.back());
        return true; // always intercept — confirmDiscard decides whether to navigate
      };
      const subscription = BackHandler.addEventListener("hardwareBackPress", onBackPress);
      return () => subscription.remove();
    }, [confirmDiscard])
  );

  const nameError = formData.name.length > APP_CONFIG.MAX_RIFF_TITLE_LENGTH;
  const notesError = (formData.notes?.length || 0) > APP_CONFIG.MAX_RIFF_NOTES_LENGTH;

  // ─── Core save logic ─────────────────────────────────────────────────────────
  async function saveRiff(): Promise<boolean> {
    const { uri, duration: dur, levels, averageRms, energyLevel, dynamicRange } = latestAudio.current;
    if (!uri) return false;

    try {
      const data = latestFormData.current;
      const now = new Date();

      const newRiff: Riff = {
        ...data,
        name: data.name.trim() || getDefaultRiffName(t),
        createdAt, // preserve original creation time
        duration: dur,
        waveform: levels,
        audioUri: uri,
        averageRms,
        energyLevel,
        dynamicRange,
        notes: data.notes?.trim() || undefined,
        hourOfDay: now.getHours(),
        dayOfWeek: now.getDay(),
      };

      await addRiff(newRiff);
      return true;
    } catch {
      return false;
    }
  }

  // ─── Manual save (save button) ───────────────────────────────────────────────
  async function handleSave() {
    if (recorderRef.current?.isRecording()) {
      const result: RecordingResult | null = await recorderRef.current.stopRecording();
      if (result?.uri) {
        latestAudio.current = { ...latestAudio.current, ...result };
      }
    }

    if (!latestAudio.current.uri) {
      showToast({ type: "warning", title: t("idea.oops"), message: t("idea.record_first") });
      triggerHaptic("warning");
      return;
    }

    if (nameError || notesError) {
      showToast({ type: "error", title: t("idea.invalid_fields"), message: t("idea.fields_too_long") });
      triggerHaptic("error");
      return;
    }

    setSaving(true);
    try {
      const ok = await saveRiff();
      if (ok) {
        hasSaved.current = true;
        triggerHaptic("success");
        router.back();
      } else {
        showToast({ type: "error", title: t("idea.error"), message: t("idea.save_failed") });
        triggerHaptic("error");
      }
    } finally {
      setSaving(false);
    }
  }

  // ─── Render ──────────────────────────────────────────────────────────────────
  const saveDisabled = !audioUri || saving || nameError || notesError;

  return (
    <>
      <Stack.Screen
        options={{
          title: t("idea.new_title"),
          headerStyle: { backgroundColor: theme.background },
          headerTintColor: theme.primaryForeground,
          headerTitleStyle: { color: theme.primary, fontWeight: "bold" },
          headerShadowVisible: true,
          headerLeft: () => (
            <Pressable
              style={{ padding: 8, marginLeft: -8 }}
              onPress={() => confirmDiscard(() => router.back())}
            >
              <FontAwesome name="chevron-left" size={20} color={theme.primaryForeground} />
            </Pressable>
          ),
        }}
      />

      <Screen background={theme.background}>
        {/* Scrollable content */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        >
          {/* RECORDING */}
          <View style={[styles.coreSection, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.coreSectionTitle, { color: theme.primary }]}>{t("idea.recording")}</Text>
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
                  energyLevel: data.energyLevel,
                  dynamicRange: data.dynamicRange,
                };
              }}
              maxSeconds={60}
            />
          </View>

          {/* FORM */}
          <IdeaForm
            initialRiff={initialRiff}
            projects={projects}
            onDirtyChange={(_dirty, currentRiff) => setFormData(currentRiff)}
          />
        </ScrollView>

        {/* ── Sticky save button — always visible above keyboard / tab bar ── */}
        <View
          style={[
            styles.stickyFooter,
            {
              backgroundColor: theme.background,
              borderTopColor: theme.border,
              paddingBottom: insets.bottom + 8,
            },
          ]}
        >
          {/* Hint line */}
          {!audioUri && !saving && (
            <Text style={[styles.saveHint, { color: theme.mutedForeground }]}>
              {t("idea.record_to_save")}
            </Text>
          )}
          {(nameError || notesError) && (
            <Text style={[styles.saveHint, { color: theme.danger ?? "#ef4444" }]}>
              {nameError ? t("idea.name_too_long") : t("idea.notes_too_long")}
            </Text>
          )}

          <Pressable
            onPress={handleSave}
            disabled={saveDisabled}
            style={({ pressed }) => [
              styles.button,
              {
                backgroundColor: theme.primary,
                opacity: saveDisabled ? 0.45 : pressed ? 0.85 : 1,
              },
            ]}
          >
            {saving ? (
              <>
                <ActivityIndicator size="small" color={theme.primaryForeground} />
                <Text style={{ color: theme.primaryForeground, fontWeight: "bold", fontSize: 16 }}>
                  {t("idea.saving")}
                </Text>
              </>
            ) : (
              <Text style={{ color: theme.primaryForeground, fontWeight: "bold", fontSize: 16 }}>
                {t("idea.save_button")}
              </Text>
            )}
          </Pressable>
        </View>
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
    marginHorizontal: 16,
  },
  coreSectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 12,
  },
  stickyFooter: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  button: {
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  saveHint: {
    textAlign: "center",
    fontSize: 12,
    marginBottom: 6,
  },
});