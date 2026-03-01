import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";
import { getProjects, saveProjects } from "../storage/projects";
import { getRiffs, saveRiffs } from "../storage/riffs";

const RIFFS_DIR = `${FileSystem.documentDirectory ?? ""}riffs/`;
const BACKUP_DIR = `${FileSystem.documentDirectory ?? ""}riffmaker_backup/`;
const APP_VERSION = "1.2.0";
const SCHEMA_VERSION = 2;

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export async function exportFullBackup(): Promise<{
  success: boolean;
  message: string;
  filesCount?: number;
}> {
  try {
    const [riffs, projects] = await Promise.all([getRiffs(), getProjects()]);

    // Build portable riff list (audioFile = basename only)
    const portableRiffs = riffs.map((r) => ({
      ...r,
      audioFile: r.audioUri ? r.audioUri.split("/").pop() : null,
      audioUri: undefined, // strip absolute path
    }));

    const backupJson = JSON.stringify(
      {
        schemaVersion: SCHEMA_VERSION,
        exportedAt: Date.now(),
        appVersion: APP_VERSION,
        projects,
        riffs: portableRiffs,
      },
      null,
      2
    );

    if (Platform.OS === "android") {
      return await _exportAndroid(backupJson, riffs.map((r) => r.audioUri).filter(Boolean) as string[]);
    } else {
      return await _exportIOS(backupJson);
    }
  } catch (error: any) {
    console.error("[Backup] exportFullBackup failed:", error);
    return { success: false, message: error?.message ?? "Erro desconhecido" };
  }
}

async function _exportAndroid(
  jsonContent: string,
  audioUris: string[]
): Promise<{ success: boolean; message: string; filesCount?: number }> {
  // Pick destination folder with SAF
  const permission = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
  if (!permission.granted) {
    return { success: false, message: "Permissão negada para a pasta de destino." };
  }

  const destDir = permission.directoryUri;
  let count = 0;

  // Write backup.json
  try {
    const jsonUri = await FileSystem.StorageAccessFramework.createFileAsync(
      destDir,
      "riffmaker_backup.json",
      "application/json"
    );
    await FileSystem.writeAsStringAsync(jsonUri, jsonContent);
    count++;
  } catch (e) {
    console.error("[Backup] Failed to write JSON:", e);
    return { success: false, message: "Falha ao escrever backup.json" };
  }

  // Copy audio files
  for (const uri of audioUris) {
    try {
      const info = await FileSystem.getInfoAsync(uri);
      if (!info.exists) continue;

      const filename = uri.split("/").pop() ?? `audio_${Date.now()}.m4a`;
      const destUri = await FileSystem.StorageAccessFramework.createFileAsync(
        destDir,
        filename,
        "audio/mp4"
      );

      // Read as base64 and write
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      await FileSystem.writeAsStringAsync(destUri, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });
      count++;
    } catch (e) {
      console.warn(`[Backup] Skipped audio file ${uri}:`, e);
    }
  }

  return {
    success: true,
    message: `Backup completo! ${count} arquivos exportados.`,
    filesCount: count,
  };
}

async function _exportIOS(
  jsonContent: string
): Promise<{ success: boolean; message: string; filesCount?: number }> {
  const jsonUri = `${FileSystem.documentDirectory}riffmaker_backup.json`;
  await FileSystem.writeAsStringAsync(jsonUri, jsonContent);

  const isAvailable = await Sharing.isAvailableAsync();
  if (!isAvailable) {
    return { success: false, message: "Compartilhamento não disponível no dispositivo." };
  }

  await Sharing.shareAsync(jsonUri, {
    dialogTitle: "Salvar Backup (Metadados)",
    mimeType: "application/json",
    UTI: "public.json",
  });

  return {
    success: true,
    message: "Backup de metadados exportado. Nota: áudios não incluídos no iOS.",
    filesCount: 1,
  };
}

// ---------------------------------------------------------------------------
// Restore
// ---------------------------------------------------------------------------

export async function restoreFullBackup(jsonUri: string): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    const jsonStr = await FileSystem.readAsStringAsync(jsonUri);
    const data = JSON.parse(jsonStr);

    // Validate
    if (!data.schemaVersion || !data.riffs || !data.projects) {
      return { success: false, message: "Arquivo de backup inválido ou corrompido." };
    }

    if (data.schemaVersion > SCHEMA_VERSION) {
      return {
        success: false,
        message: `Versão do backup (v${data.schemaVersion}) não suportada. Atualize o app.`,
      };
    }

    // Ensure riffs dir
    const dirInfo = await FileSystem.getInfoAsync(RIFFS_DIR);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(RIFFS_DIR, { intermediates: true });
    }

    // Restore projects
    await saveProjects(data.projects);

    // Restore riffs — resolve audioUri from the backup JSON location folder
    const backupFolder =
      jsonUri.substring(0, jsonUri.lastIndexOf("/") + 1);

    const restoredRiffs = await Promise.all(
      (data.riffs as any[]).map(async (r) => {
        let audioUri = r.audioUri ?? "";

        // If riff has a relative audioFile, try to find it next to the JSON
        if (!audioUri && r.audioFile) {
          const candidateUri = `${backupFolder}${r.audioFile}`;
          try {
            const info = await FileSystem.getInfoAsync(candidateUri);
            if (info.exists) {
              const destPath = `${RIFFS_DIR}${r.audioFile}`;
              await FileSystem.copyAsync({ from: candidateUri, to: destPath });
              audioUri = destPath;
            }
          } catch (e) {
            console.warn(`[Restore] Could not restore audio ${r.audioFile}:`, e);
          }
        }

        return {
          ...r,
          audioUri,
          audioFile: undefined,
          corrupted: !audioUri,
        };
      })
    );

    await saveRiffs(restoredRiffs);

    return {
      success: true,
      message: `Backup restaurado: ${restoredRiffs.length} riffs, ${data.projects.length} projetos.`,
    };
  } catch (error: any) {
    console.error("[Backup] restoreFullBackup failed:", error);
    return { success: false, message: error?.message ?? "Erro ao restaurar backup." };
  }
}
