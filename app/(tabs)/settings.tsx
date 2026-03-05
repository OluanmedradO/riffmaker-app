import { showToast } from "@/src/shared/ui/AppToast";
import { Screen } from "@/src/shared/ui/Screen";
import { ScreenHeader } from "@/src/shared/ui/ScreenHeader";
import { useTheme } from "@/src/shared/theme/ThemeProvider";
import { useAccess } from "@/src/access/AccessProvider";
import { useAlert } from "@/src/contexts/AlertContext";
import { useProGate } from '@/src/shared/hooks/useProGate';
import { useSecretTap } from "@/src/shared/hooks/useSecretTap";
import { useTranslation } from "@/src/i18n";
import { exportFullBackup, restoreFullBackup } from "@/src/utils/backup";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import { useRouter } from "expo-router";
import {
  ArrowsClockwise,
  CaretRight,
  Crown,
  DownloadSimple,
  FileText,
  HourglassHigh,
  Info,
  ShieldCheck,
  Trash
} from "phosphor-react-native";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View
} from "react-native";

export default function Settings() {
  const theme = useTheme();
  const router = useRouter();
  const { t, language, setLanguage } = useTranslation();
  const [clearing, setClearing] = useState(false);
  const [countdownEnabled, setCountdownEnabled] = useState(false);
  const [backupLoading, setBackupLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [lastBackup, setLastBackup] = useState<string | null>(null);
  const requirePro = useProGate();
  const { showAlert } = useAlert();
  const { planEffective } = useAccess();

  useEffect(() => {
    AsyncStorage.getItem("@countdown_enabled").then((val) => {
      setCountdownEnabled(val === "true");
    });
    AsyncStorage.getItem("@last_full_backup").then((val) => {
      if (val) {
        const date = new Date(parseInt(val));
        const formatted = new Intl.DateTimeFormat(language, { 
          day: '2-digit', 
          month: 'short', 
          year: 'numeric' 
        }).format(date);
        setLastBackup(formatted);
      }
    });
  }, [language]);

  async function handleToggleCountdown(value: boolean) {
    setCountdownEnabled(value);
    await AsyncStorage.setItem("@countdown_enabled", String(value));
  }

  const [showClearModal, setShowClearModal] = useState(false);

  function handleClearData() {
    setShowClearModal(true);
  }

  async function performClearData() {
    setClearing(true);
    try {
      await AsyncStorage.clear();
      setShowClearModal(false);
      showAlert(t("settings.success_title"), t("settings.clear_success"));
      router.back();
    } catch (error) {
      showAlert(t("project.error"), t("settings.clear_error"));
    } finally {
      setClearing(false);
    }
  }

  function handlePrivacyPolicy() {
    showAlert(
      t("settings.privacy_title"),
      t("settings.privacy_body"),
    );
  }

  async function handleExportData() {
    try {
      await exportFullBackup();
    } catch (e) {
      showAlert(t("project.error"), t("settings.export_error"));
    }
  }

  async function handleExportFullBackup() {
    if (requirePro("fullBackup", t("settings.pro_backup"))) return;
    setBackupLoading(true);
    try {
      const result = await exportFullBackup();
      if (result.success) {
        showToast({ type: "success", message: result.message });
        // Update local state for immediate feedback
        const formatted = new Intl.DateTimeFormat(language, { 
          day: '2-digit', 
          month: 'short', 
          year: 'numeric' 
        }).format(new Date());
        setLastBackup(formatted);
      } else {
        showAlert(t("settings.backup_failed"), result.message);
      }
    } catch (e: any) {
      showAlert(t("project.error"), e?.message ?? t("settings.export_error"));
    } finally {
      setBackupLoading(false);
    }
  }

  async function handleRestoreBackup() {
    if (requirePro("fullBackup", t("settings.pro_restore"))) return;
    showAlert(
      t("settings.restore_backup_title"),
      t("settings.restore_backup_body"),
      [
        { text: t("recorder.cancel"), style: "cancel" },
        {
          text: t("settings.continue"),
          onPress: () => {
            // On Android: use SAF read to pick JSON file
            _pickAndRestore();
          },
        },
      ]
    );
  }

  async function _pickAndRestore() {
    setRestoreLoading(true);
    try {
      // Use SAF to request read permission and pick JSON file
      const result = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
      if (!result.granted) {
        showAlert(t("settings.permission_denied_title"), t("settings.permission_denied_body"));
        return;
      }

      // List files in chosen folder to find backup.json
      const files = await FileSystem.StorageAccessFramework.readDirectoryAsync(result.directoryUri);
      const backupFileUri = files.find((f) => f.endsWith("backup.json") || f.includes("riffmaker_backup"));

      if (!backupFileUri) {
        showAlert(t("settings.file_not_found"), t("settings.file_not_found_body"));
        return;
      }

      // Copy to cache for reading
      const cacheUri = `${FileSystem.cacheDirectory}riffmaker_restore.json`;
      const content = await FileSystem.StorageAccessFramework.readAsStringAsync(backupFileUri);
      await FileSystem.writeAsStringAsync(cacheUri, content);

      const restoreResult = await restoreFullBackup(cacheUri);
      if (restoreResult.success) {
        showToast({ type: "success", message: restoreResult.message });
      } else {
        showAlert(t("settings.restore_failed"), restoreResult.message);
      }
    } catch (e: any) {
      showAlert(t("project.error"), e?.message ?? t("settings.restore_error"));
    } finally {
      setRestoreLoading(false);
    }
  }

  const handleSecretTap = useSecretTap(() => router.push("/dev"), 5, 2500);

  function toggleLanguage() {
    setLanguage(language === "pt-BR" ? "en-US" : "pt-BR");
  }

  return (
    <Screen background={theme.background}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 140 }}>
      <Pressable onPress={handleSecretTap}>
        <ScreenHeader
          title={t("settings.title")}
          subtitle={t("settings.subtitle")}
          rightSlot={
            <View style={[styles.planBadge, { backgroundColor: planEffective === 'pro' ? theme.proPurple + '20' : theme.input, borderColor: planEffective === 'pro' ? theme.proPurple + '40' : theme.border }]}>
              <Text style={{ fontSize: 10, fontWeight: "900", color: planEffective === 'pro' ? theme.proPurple : theme.mutedForeground, letterSpacing: 0.5 }}>
                {(planEffective === 'pro' ? t("settings.plan_pro") : t("settings.plan_free")).toUpperCase()}
              </Text>
            </View>
          }
          style={{ paddingHorizontal: 0, paddingTop: 16 }}
        />
      </Pressable>

      <View style={{ paddingHorizontal: 20 }}>
        {/* PRO Banner - Premium Redesign */}
        {planEffective === 'free' && (
          <Pressable
            onPress={() => router.push("/pro")}
            style={({ pressed }) => [
              styles.proCard,
              { 
                backgroundColor: theme.proPurple + "15",
                borderColor: theme.proPurple + "30",
                transform: [{ scale: pressed ? 0.98 : 1 }]
              }
            ]}
          >
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <Crown size={22} color={theme.proPurple} weight="fill" />
                <Text style={{ fontSize: 18, fontWeight: "900", color: theme.foreground }}>{t("settings.pro_hero")}</Text>
              </View>
              <Text style={{ fontSize: 14, color: theme.mutedForeground, lineHeight: 20 }}>
                {t("settings.pro_desc")}
              </Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Text style={{ color: theme.proPurple, fontSize: 14, fontWeight: "800" }}>{t("settings.pro_cta")}</Text>
              <CaretRight size={16} color={theme.proPurple} weight="bold" />
            </View>
          </Pressable>
        )}

        <Text style={[styles.sectionTitle, { color: theme.mutedForeground }]}>
          {t("settings.recording")}
        </Text>

        <View style={[styles.item, { backgroundColor: theme.card }]}>
          <HourglassHigh size={20} color={theme.foreground} weight="regular" style={{ opacity: 0.7 }} />
          <Text style={[styles.itemText, { color: theme.foreground }]}>
            {t("settings.countdown")}
          </Text>
          <Switch
            value={countdownEnabled}
            onValueChange={handleToggleCountdown}
            trackColor={{ false: theme.border, true: theme.primary }}
          />
        </View>

        <Text style={[styles.sectionTitle, { color: theme.mutedForeground, marginTop: 32 }]}>
           {t("settings.backup_data")}
          {lastBackup && (
            <Text style={{ fontSize: 11, textTransform: 'none', fontWeight: '400', letterSpacing: 0 }}>
              {"  "}· {t("settings.last_backup", { date: lastBackup })}
            </Text>
          )}
        </Text>

        {/* Export Metadata */}
        <Pressable
          onPress={handleExportData}
          style={({ pressed }) => [styles.item, { backgroundColor: theme.card, opacity: pressed ? 0.7 : 1 }]}
        >
          <FileText size={20} color={theme.foreground} weight="regular" style={{ opacity: 0.7 }} />
          <Text style={[styles.itemText, { color: theme.foreground }]}>
            {t("settings.export_json")} (Metadata)
          </Text>
          <CaretRight size={16} color={theme.mutedForeground} weight="bold" />
        </Pressable>

        {/* Full Backup */}
        <Pressable
          onPress={handleExportFullBackup}
          disabled={backupLoading}
          style={({ pressed }) => [styles.item, { backgroundColor: theme.card, opacity: pressed ? 0.7 : 1 }]}
        >
          <DownloadSimple size={20} color={theme.foreground} weight="regular" style={{ opacity: 0.7 }} />
          <Text style={[styles.itemText, { color: theme.foreground }]}>
            {backupLoading ? t("settings.exporting") : t("settings.export_full")}
          </Text>
          {backupLoading ? (
            <ActivityIndicator size="small" color={theme.primary} />
          ) : (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
               {planEffective === 'free' && <Crown size={14} color={theme.proPurple} weight="fill" />}
               <CaretRight size={16} color={theme.mutedForeground} weight="bold" />
            </View>
          )}
        </Pressable>

        {/* Restore Backup */}
        <Pressable
          onPress={handleRestoreBackup}
          disabled={restoreLoading}
          style={({ pressed }) => [styles.item, { backgroundColor: theme.card, opacity: pressed ? 0.7 : 1 }]}
        >
          <ArrowsClockwise size={20} color={theme.foreground} weight="regular" style={{ opacity: 0.7 }} />
          <Text style={[styles.itemText, { color: theme.foreground }]}>
            {restoreLoading ? t("settings.restoring") : t("settings.restore_backup")}
          </Text>
          {restoreLoading ? (
            <ActivityIndicator size="small" color={theme.primary} />
          ) : (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
               {planEffective === 'free' && <Crown size={14} color={theme.proPurple} weight="fill" />}
               <CaretRight size={16} color={theme.mutedForeground} weight="bold" />
            </View>
          )}
        </Pressable>

        <Text style={[styles.sectionTitle, { color: theme.mutedForeground, marginTop: 32 }]}>
          {t("settings.info")}
        </Text>

        {/* Language */}
        <Pressable
          onPress={toggleLanguage}
          style={({ pressed }) => [styles.item, { backgroundColor: theme.card, opacity: pressed ? 0.7 : 1 }]}
        >
          <View style={{ flex: 1 }}>
            <Text style={[styles.itemText, { color: theme.foreground }]}>
              {t("settings.language")}
            </Text>
            <Text style={{ color: theme.mutedForeground, fontSize: 12, marginTop: 2 }}>
              {language === "pt-BR" ? "Português (Brasil)" : "English (US)"}
            </Text>
          </View>
          <CaretRight size={16} color={theme.mutedForeground} weight="bold" />
        </Pressable>

        <Pressable
          onPress={handlePrivacyPolicy}
          style={({ pressed }) => [styles.item, { backgroundColor: theme.card, opacity: pressed ? 0.7 : 1 }]}
        >
          <ShieldCheck size={20} color={theme.foreground} weight="regular" style={{ opacity: 0.7 }} />
          <Text style={[styles.itemText, { color: theme.foreground }]}>
            {t("settings.privacy")}
          </Text>
          <CaretRight size={16} color={theme.mutedForeground} weight="bold" />
        </Pressable>

        <View style={[styles.item, { backgroundColor: theme.card }]}>
          <Info size={20} color={theme.foreground} weight="regular" style={{ opacity: 0.7 }} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.itemText, { color: theme.foreground }]}>
              {t("settings.version")}
            </Text>
            <Text style={{ color: theme.mutedForeground, fontSize: 12, marginTop: 2 }}>
              v1.0.0 (Build 23)
            </Text>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { color: theme.destructive, marginTop: 40 }]}>
          {t("settings.risk_zone")}
        </Text>
        
        <Pressable
          onPress={handleClearData}
          disabled={clearing}
          style={({ pressed }) => [
            styles.item, 
            { backgroundColor: theme.destructive + "10", borderColor: theme.destructive + "30", borderWidth: 1, opacity: pressed ? 0.7 : 1 }
          ]}
        >
          <Trash size={20} color={theme.destructive} weight="fill" />
          <Text style={[styles.itemText, { color: theme.destructive, fontWeight: "bold" }]}>
            {clearing ? t("settings.clearing") : t("settings.clear_all")}
          </Text>
        </Pressable>

        <View style={{ height: 40 }} />
      </View>

      {/* CLEAR DATA MODAL */}
      <Modal visible={showClearModal} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setShowClearModal(false)}>
          <Pressable style={[styles.modalContent, { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1, padding: 24 }]}>
            <View style={{ marginBottom: 20, alignItems: "center" }}>
              <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: theme.destructive + "20", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                <Trash size={32} color={theme.destructive} weight="fill" />
              </View>
              <Text style={{ fontSize: 20, fontWeight: "900", color: theme.foreground, textAlign: "center", marginBottom: 8 }}>
                {t("clear.title")}
              </Text>
              <Text style={{ fontSize: 15, color: theme.mutedForeground, textAlign: "center", lineHeight: 22 }}>
                {t("clear.desc")}
              </Text>
            </View>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <Pressable
                style={{ flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: theme.input, alignItems: "center" }}
                onPress={() => setShowClearModal(false)}
              >
                <Text style={{ color: theme.foreground, fontWeight: "bold" }}>{t("clear.cancel")}</Text>
              </Pressable>

              <Pressable
                style={{ flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: theme.destructive, alignItems: "center" }}
                onPress={performClearData}
              >
                <Text style={{ color: "#fff", fontWeight: "bold" }}>{t("clear.confirm")}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
  },
  planBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  proCard: {
    padding: 20,
    borderRadius: 24,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 32,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 16,
    marginBottom: 10,
    gap: 12,
  },
  itemText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
  },
  versionText: {
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalContent: {
    width: "100%",
    borderRadius: 24,
    maxWidth: 400,
  },
});


