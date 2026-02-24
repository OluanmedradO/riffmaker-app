import { showToast } from "@/components/AppToast";
import { Screen } from "@/components/Screen";
import { useTheme } from "@/components/ThemeProvider";
import { useSecretTap } from "@/src/hooks/useSecretTap";
import { exportFullBackup, restoreFullBackup } from "@/src/utils/backup";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import { useRouter } from "expo-router";
import {
    ArrowCounterClockwise,
    CaretRight,
    Crown,
    DownloadSimple,
    HourglassHigh,
    Info,
    Package,
    ShieldCheck,
    Trash,
} from "phosphor-react-native";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    View,
} from "react-native";

export default function Settings() {
  const theme = useTheme();
  const router = useRouter();
  const [clearing, setClearing] = useState(false);
  const [countdownEnabled, setCountdownEnabled] = useState(false);
  const [backupLoading, setBackupLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem("@countdown_enabled").then((val) => {
      setCountdownEnabled(val === "true");
    });
  }, []);

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
      Alert.alert("Sucesso", "Todos os dados foram removidos.");
      router.back();
    } catch (error) {
      Alert.alert("Erro", "Não foi possível limpar os dados.");
    } finally {
      setClearing(false);
    }
  }

  function handlePrivacyPolicy() {
    Alert.alert(
      "Política de Privacidade",
      "O Riff Maker não coleta ou compartilha seus dados. Tudo fica armazenado localmente no seu dispositivo.",
    );
  }

  async function handleExportData() {
    try {
      await exportFullBackup();
    } catch (e) {
      Alert.alert("Erro", "Falha ao exportar backup.");
    }
  }

  async function handleExportFullBackup() {
    setBackupLoading(true);
    try {
      const result = await exportFullBackup();
      if (result.success) {
        showToast({ type: "success", message: result.message });
      } else {
        Alert.alert("Backup Falhou", result.message);
      }
    } catch (e: any) {
      Alert.alert("Erro", e?.message ?? "Falha ao exportar backup completo.");
    } finally {
      setBackupLoading(false);
    }
  }

  async function handleRestoreBackup() {
    Alert.alert(
      "Restaurar Backup",
      "Escolha o arquivo backup.json. Os dados atuais serão sobrescritos.\n\nNo seu gerenciador de arquivos, localize o backup.json exportado e forneça o caminho.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Continuar",
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
        Alert.alert("Permissão Negada", "Acesso à pasta cancelado.");
        return;
      }

      // List files in chosen folder to find backup.json
      const files = await FileSystem.StorageAccessFramework.readDirectoryAsync(result.directoryUri);
      const backupFileUri = files.find((f) => f.endsWith("backup.json") || f.includes("riffmaker_backup"));

      if (!backupFileUri) {
        Alert.alert("Arquivo não encontrado", "Não encontrei um arquivo backup.json na pasta selecionada. Certifique-se de selecionar a pasta onde foi salvo o backup.");
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
        Alert.alert("Restauração Falhou", restoreResult.message);
      }
    } catch (e: any) {
      Alert.alert("Erro", e?.message ?? "Falha ao restaurar backup.");
    } finally {
      setRestoreLoading(false);
    }
  }

  const handleSecretTap = useSecretTap(() => router.push("/dev"), 5, 2500);

  return (
    <Screen background={theme.background}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>
      <Pressable onPress={handleSecretTap}>
        <Text
          style={[
            styles.title,
            { color: theme.foreground, marginTop: 16 },
          ]}
        >
          Configurações
        </Text>
      </Pressable>

      <Text
        style={[
          styles.sectionTitle,
          { color: theme.mutedForeground, marginTop: 24 },
        ]}
      >
        Gravação
      </Text>

      <View style={[styles.item, { backgroundColor: theme.card }]}>
        <HourglassHigh size={20} color={theme.foreground} weight="regular" />
        <Text style={[styles.itemText, { color: theme.foreground }]}>
          Contagem regressiva 3..2..1
        </Text>
        <Switch
          value={countdownEnabled}
          onValueChange={handleToggleCountdown}
          trackColor={{ false: theme.border, true: theme.primary }}
        />
      </View>

      <Text
        style={[
          styles.sectionTitle,
          { color: theme.mutedForeground, marginTop: 24 },
        ]}
      >
        Backup & Dados
      </Text>

      {/* Export Metadata (legacy) */}
      <Pressable
        onPress={handleExportData}
        style={[styles.item, { backgroundColor: theme.card }]}
      >
        <DownloadSimple size={20} color={theme.foreground} weight="regular" />
        <Text style={[styles.itemText, { color: theme.foreground }]}>
          Exportar metadados (JSON)
        </Text>
        <CaretRight size={16} color={theme.mutedForeground} weight="bold" />
      </Pressable>

      {/* Full Backup */}
      <Pressable
        onPress={handleExportFullBackup}
        disabled={backupLoading}
        style={[styles.item, { backgroundColor: theme.card }]}
      >
        <Package size={20} color={theme.primary} weight="regular" />
        <Text style={[styles.itemText, { color: theme.foreground }]}>
          {backupLoading ? "Exportando..." : "Exportar Backup Completo"}
        </Text>
        {backupLoading ? (
          <ActivityIndicator size="small" color={theme.primary} />
        ) : (
          <CaretRight size={16} color={theme.mutedForeground} weight="bold" />
        )}
      </Pressable>

      {/* Restore Backup */}
      <Pressable
        onPress={handleRestoreBackup}
        disabled={restoreLoading}
        style={[styles.item, { backgroundColor: theme.card }]}
      >
        <ArrowCounterClockwise size={20} color={theme.primary} weight="regular" />
        <Text style={[styles.itemText, { color: theme.foreground }]}>
          {restoreLoading ? "Restaurando..." : "Restaurar Backup"}
        </Text>
        {restoreLoading ? (
          <ActivityIndicator size="small" color={theme.primary} />
        ) : (
          <CaretRight size={16} color={theme.mutedForeground} weight="bold" />
        )}
      </Pressable>

      <Pressable
        onPress={handleClearData}
        disabled={clearing}
        style={[styles.item, { backgroundColor: theme.card }]}
      >
        <Trash size={20} color={theme.destructive} weight="fill" />
        <Text style={[styles.itemText, { color: theme.destructive, fontWeight: "bold" }]}>
          {clearing ? "Limpando..." : "Limpar todos os dados"}
        </Text>
      </Pressable>

      <Text style={[styles.sectionTitle, { color: theme.mutedForeground }]}>
        Informações
      </Text>

      {/* PRO Banner */}
      <Pressable
        onPress={() => router.push("/pro")}
        style={[styles.item, {
          backgroundColor: theme.proPurple + "12",
          borderWidth: 1,
          borderColor: theme.proPurple + "30",
        }]}
      >
        <Crown size={20} color={theme.proPurple} weight="fill" />
        <Text style={[styles.itemText, { color: theme.foreground, fontWeight: "bold" }]}>
          Riff Maker PRO
        </Text>
        <Text style={{ color: theme.proPurple, fontSize: 13, fontWeight: "bold" }}>Ver</Text>
        <CaretRight size={16} color={theme.proPurple} weight="bold" />
      </Pressable>

      <Pressable
        onPress={handlePrivacyPolicy}
        style={[styles.item, { backgroundColor: theme.card }]}
      >
        <ShieldCheck size={20} color={theme.foreground} weight="regular" />
        <Text style={[styles.itemText, { color: theme.foreground }]}>
          Política de Privacidade
        </Text>
        <CaretRight size={16} color={theme.mutedForeground} weight="bold" />
      </Pressable>

      <View style={[styles.item, { backgroundColor: theme.card }]}>
        <Info size={20} color={theme.foreground} weight="regular" />
        <Text style={[styles.itemText, { color: theme.foreground }]}>
          Versão
        </Text>
        <Text style={[styles.versionText, { color: theme.mutedForeground }]}>
          1.0.0
        </Text>
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
                Deletar tudo?
              </Text>
              <Text style={{ fontSize: 15, color: theme.mutedForeground, textAlign: "center", lineHeight: 22 }}>
                Esta ação apagará permanentemente todos os seus Projetos, Ideias, e Áudios gravados.{"\n\n"}Não pode ser desfeita.
              </Text>
            </View>
            <View style={{ flexDirection: "row", gap: 12 }}>
              <Pressable
                style={{ flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: theme.input, alignItems: "center" }}
                onPress={() => setShowClearModal(false)}
              >
                <Text style={{ color: theme.foreground, fontWeight: "bold" }}>Cancelar</Text>
              </Pressable>

              <Pressable
                style={{ flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: theme.destructive, alignItems: "center" }}
                onPress={performClearData}
              >
                <Text style={{ color: "#fff", fontWeight: "bold" }}>Apagar Tudo</Text>
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
  sectionTitle: {
    fontSize: 14,
    fontWeight: "bold",
    marginTop: 24,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    gap: 12,
  },
  itemText: {
    flex: 1,
    fontSize: 15,
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
