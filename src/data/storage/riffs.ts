import * as FileSystem from "expo-file-system/legacy";
import { Project } from '@/src/domain/types/project';
import { Riff } from '@/src/domain/types/riff';
import { withRetry } from '@/src/utils/async';
import { downsamplePeaks as downsampleWaveform } from '@/src/domain/services/waveform/downsamplePeaks';
import { mutateProjects } from "@/src/data/storage/projects";
import {
  deleteRiffRepo,
  getRiffsByProjectRepo,
  getRiffsRepo,
  getRiffsUnassignedRepo,
  saveRiffRepo,
} from '@/src/data/storage/riffs.repo';

const RIFFS_DIR = `${FileSystem.documentDirectory || ""}riffs/`;

async function ensureDirExists() {
  const dirInfo = await FileSystem.getInfoAsync(RIFFS_DIR);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(RIFFS_DIR, { intermediates: true });
  }
}

function createDefaultSection(riffId: string) {
  return {
    id: `sec-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    name: "Ideias",
    riffIds: [riffId],
  };
}

function addRiffToProject(project: Project, riffId: string): boolean {
  let changed = false;

  if (!project.riffOrder?.includes(riffId)) {
    project.riffOrder = [...(project.riffOrder || []), riffId];
    changed = true;
  }

  if (project.sections && project.sections.length > 0) {
    if (!project.sections[0].riffIds.includes(riffId)) {
      project.sections[0].riffIds.push(riffId);
      changed = true;
    }
  } else {
    project.sections = [createDefaultSection(riffId)];
    changed = true;
  }

  if (changed) {
    project.updatedAt = Date.now();
  }

  return changed;
}

function removeRiffFromProject(project: Project, riffId: string): boolean {
  let changed = false;

  if (project.riffOrder?.includes(riffId)) {
    project.riffOrder = project.riffOrder.filter((id) => id !== riffId);
    changed = true;
  }

  if (project.sections?.some((section) => section.riffIds.includes(riffId))) {
    project.sections = project.sections.map((section) => ({
      ...section,
      riffIds: section.riffIds.filter((id) => id !== riffId),
    }));
    changed = true;
  }

  if (changed) {
    project.updatedAt = Date.now();
  }

  return changed;
}

export async function getRiffs(): Promise<Riff[]> {
  try {
    return await withRetry(async () => {
      const riffs = await getRiffsRepo();

      return riffs.map((riff: Riff) => {
        let waveform = riff.waveform || [];
        const duration = riff.duration || 0;

        if (waveform.length === 0 && duration > 0) {
          const pointCount = Math.min(100, Math.max(20, Math.floor(duration / 100)));
          waveform = Array(pointCount)
            .fill(0)
            .map((_, i) => -100 + Math.sin(i * 0.5) * 30);
        }

        return {
          ...riff,
          name: riff.name || "Riff sem nome",
          waveform,
          duration,
        };
      });
    });
  } catch (error) {
    console.error("Error loading riffs:", error);
    return [];
  }
}

export async function saveRiffs(riffs: Riff[]) {
  await withRetry(async () => {
    for (const riff of riffs) {
      await saveRiffRepo(riff);
    }
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
    waveform: downsampleWaveform(riff.waveform),
  };

  await saveRiffRepo(finalRiff);

  if (finalRiff.projectId) {
    await mutateProjects((projects) => {
      const project = projects.find((p) => p.id === finalRiff.projectId);
      if (!project) return false;
      return addRiffToProject(project, finalRiff.id);
    });
  }
}

export async function deleteRiff(id: string): Promise<void> {
  const riffs = await getRiffs();
  const riff = riffs.find((item) => item.id === id);

  await deleteRiffRepo(id);

  if (riff?.audioUri) {
    try {
      const info = await FileSystem.getInfoAsync(riff.audioUri);
      if (info.exists) {
        await FileSystem.deleteAsync(riff.audioUri);
      }
    } catch (error) {
      console.warn("Could not delete audio file", error);
    }
  }

  if (riff?.projectId) {
    await mutateProjects((projects) => {
      const project = projects.find((p) => p.id === riff.projectId);
      if (!project) return false;
      return removeRiffFromProject(project, id);
    });
  }
}

export async function updateRiff(id: string, patch: Partial<Riff>): Promise<Riff | null> {
  const riffs = await getRiffs();
  const index = riffs.findIndex((riff) => riff.id === id);
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
      } catch (error) {
        console.warn("Could not delete old audio file", error);
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
    waveform: patch.waveform ? downsampleWaveform(patch.waveform) : updated.waveform,
  };

  await saveRiffRepo(finalRiff);

  if ("projectId" in patch) {
    await mutateProjects((projects) => {
      let changed = false;

      if (oldRiff.projectId && oldRiff.projectId !== patch.projectId) {
        const oldProject = projects.find((project) => project.id === oldRiff.projectId);
        if (oldProject) {
          changed = removeRiffFromProject(oldProject, id) || changed;
        }
      }

      if (patch.projectId) {
        const newProject = projects.find((project) => project.id === patch.projectId);
        if (newProject) {
          changed = addRiffToProject(newProject, id) || changed;
        }
      }

      return changed;
    });
  }

  return finalRiff;
}

export async function duplicateIdea(id: string): Promise<Riff | null> {
  const riffs = await getRiffs();
  const original = riffs.find((riff) => riff.id === id);

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
    } catch (error) {
      console.warn("Could not duplicate audio file", error);
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
  const original = riffs.find((riff) => riff.id === id);

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
    } catch (error) {
      console.warn("Could not duplicate audio file as new version", error);
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
  const riff = riffs.find((item) => item.id === id);
  if (riff) {
    await saveRiffRepo({ ...riff, favorite: !riff.favorite });
  }
}

export async function getRiffsByProject(projectId: string): Promise<Riff[]> {
  return await getRiffsByProjectRepo(projectId);
}

export async function getRiffsUnassigned(): Promise<Riff[]> {
  return await getRiffsUnassignedRepo();
}

