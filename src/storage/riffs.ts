import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import { Riff } from "../types/riff";
import { withRetry } from "../utils/async";

const RIFFS_KEY = "@riffmaker:riffs";
const RIFFS_DIR = `${FileSystem.documentDirectory || ""}riffs/`;

export function downsampleWaveform(data: number[], maxPoints: number = 800) {
  if (!data || data.length <= maxPoints) return data;
  const factor = Math.ceil(data.length / maxPoints);
  return data.filter((_, index) => index % factor === 0);
}

async function ensureDirExists() {
  const dirInfo = await FileSystem.getInfoAsync(RIFFS_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(RIFFS_DIR, { intermediates: true });
  }
}

export async function getRiffs(): Promise<Riff[]> {
  try {
    return await withRetry(async () => {
      const data = await AsyncStorage.getItem(RIFFS_KEY);
      if (!data) return [];

      const parsed = JSON.parse(data);
      const riffs: Riff[] = parsed.map((r: any) => {
        let waveform = r.waveform || [];
        const duration = r.duration || 0;
        
        // Generate fallback waveform for old riffs that don't have one
        if (waveform.length === 0 && duration > 0) {
          const pointCount = Math.min(100, Math.max(20, Math.floor(duration / 100)));
          waveform = Array(pointCount).fill(0).map((_, i) => -100 + Math.sin(i * 0.5) * 30);
        }

        return {
          ...r,
          name: r.name || r.title || "Riff sem nome",
          waveform,
          duration,
        };
      });
      return riffs.sort((a, b) => b.createdAt - a.createdAt);
    });
  } catch (error) {
    console.error("Error loading riffs:", error);
    return [];
  }
}

export async function saveRiffs(riffs: Riff[]) {
  await withRetry(async () => {
    await AsyncStorage.setItem(RIFFS_KEY, JSON.stringify(riffs));
  });
}

function getExtension(uri: string) {
  const match = uri.match(/\.([a-zA-Z0-9]+)$/);
  return match ? match[1] : "m4a";
}

export async function addRiff(riff: Riff): Promise<void> {
  await ensureDirExists();

  let finalUri = riff.audioUri;
  if (riff.audioUri && !riff.audioUri.startsWith(RIFFS_DIR)) {
    const ext = getExtension(riff.audioUri);
    const newPath = `${RIFFS_DIR}${riff.id}.${ext}`;
    await FileSystem.copyAsync({
      from: riff.audioUri,
      to: newPath,
    });
    finalUri = newPath;
  }

  const finalRiff = { 
    ...riff, 
    audioUri: finalUri, 
    waveform: downsampleWaveform(riff.waveform) 
  };
  const riffs = await getRiffs();
  const updated = [finalRiff, ...riffs];
  await saveRiffs(updated);
}

export async function deleteRiff(id: string): Promise<void> {
  const riffs = await getRiffs();
  const riff = riffs.find((r) => r.id === id);
  if (riff?.audioUri) {
    try {
      const info = await FileSystem.getInfoAsync(riff.audioUri);
      if (info.exists) {
        await FileSystem.deleteAsync(riff.audioUri);
      }
    } catch (e) {
      console.warn("Could not delete audio file", e);
    }
  }

  const filtered = riffs.filter((r) => r.id !== id);
  await saveRiffs(filtered);
}

export async function updateRiff(id: string, patch: Partial<Riff>): Promise<Riff | null> {
  const riffs = await getRiffs();
  const index = riffs.findIndex((r) => r.id === id);
  if (index === -1) return null;

  const oldRiff = riffs[index];
  const updated = { ...oldRiff, ...patch, updatedAt: Date.now() };

  let finalUri = updated.audioUri;

  if (patch.audioUri && patch.audioUri !== oldRiff.audioUri) {
    await ensureDirExists();
    
    if (oldRiff.audioUri) {
      try {
        const info = await FileSystem.getInfoAsync(oldRiff.audioUri);
        if (info.exists) await FileSystem.deleteAsync(oldRiff.audioUri);
      } catch (e) {
         console.warn("Could not delete old audio file", e);
      }
    }
    
    if (!patch.audioUri.startsWith(RIFFS_DIR)) {
      const ext = getExtension(patch.audioUri);
      const newPath = `${RIFFS_DIR}${updated.id}.${ext}`;
      await FileSystem.copyAsync({
        from: patch.audioUri,
        to: newPath,
      });
      finalUri = newPath;
    }
  }

  const finalRiff = { 
    ...updated, 
    audioUri: finalUri,
    waveform: patch.waveform ? downsampleWaveform(patch.waveform) : updated.waveform
  };
  riffs[index] = finalRiff;
  await saveRiffs(riffs);

  // If the project changed, we should mark both the new and old project as updated
  if ("projectId" in patch) {
    const { touchProject } = await import("./projects");
    if (patch.projectId) await touchProject(patch.projectId);
    if (oldRiff.projectId && oldRiff.projectId !== patch.projectId) {
      await touchProject(oldRiff.projectId);
    }
  }

  return finalRiff;
}

export async function duplicateIdea(id: string): Promise<Riff | null> {
  const riffs = await getRiffs();
  const original = riffs.find((r) => r.id === id);

  if (!original) return null;

  const newId = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  let newUri = original.audioUri;

  if (original.audioUri) {
    await ensureDirExists();
    try {
      const info = await FileSystem.getInfoAsync(original.audioUri);
      if (info.exists) {
        const ext = getExtension(original.audioUri);
        newUri = `${RIFFS_DIR}${newId}.${ext}`;
        await FileSystem.copyAsync({
          from: original.audioUri,
          to: newUri,
        });
      }
    } catch (e) {
      console.warn("Could not duplicate audio file", e);
    }
  }

  let newName = original.name;
  if (!newName.endsWith("(cópia)")) {
    newName = `${newName} (cópia)`;
  }

  const duplicate: Riff = {
    ...original,
    id: newId,
    name: newName,
    audioUri: newUri,
    versionGroupId: undefined,
    versionNumber: undefined,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  await addRiff(duplicate);
  return duplicate;
}

export async function duplicateAsNewVersion(id: string): Promise<Riff | null> {
  const riffs = await getRiffs();
  const original = riffs.find((r) => r.id === id);

  if (!original) return null;

  const newId = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  let newUri = original.audioUri;

  if (original.audioUri) {
    await ensureDirExists();
    try {
      const info = await FileSystem.getInfoAsync(original.audioUri);
      if (info.exists) {
        const ext = getExtension(original.audioUri);
        newUri = `${RIFFS_DIR}${newId}.${ext}`;
        await FileSystem.copyAsync({
          from: original.audioUri,
          to: newUri,
        });
      }
    } catch (e) {
      console.warn("Could not duplicate audio file as new version", e);
    }
  }

  const groupId = original.versionGroupId || original.id;
  const newVersionStr = `(v${(original.versionNumber || 1) + 1})`;
  
  let newName = original.name;
  if (newName.match(/\(v\d+\)$/)) {
    newName = newName.replace(/\(v\d+\)$/, newVersionStr);
  } else {
    newName = `${newName} ${newVersionStr}`;
  }

  const newVersion: Riff = {
    ...original,
    id: newId,
    name: newName,
    audioUri: newUri,
    versionGroupId: groupId,
    versionNumber: (original.versionNumber || 1) + 1,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  await addRiff(newVersion);
  return newVersion;
}

export async function toggleFavorite(id: string): Promise<void> {
  const riffs = await getRiffs();
  const mapped = riffs.map((r) =>
    r.id === id ? { ...r, favorite: !r.favorite } : r,
  );
  await saveRiffs(mapped);
}



export async function getRiffsByProject(projectId: string): Promise<Riff[]> {
  const riffs = await getRiffs();
  return riffs.filter((r) => r.projectId === projectId);
}

export async function getRiffsUnassigned(): Promise<Riff[]> {
  const riffs = await getRiffs();
  return riffs.filter((r) => !r.projectId);
}
