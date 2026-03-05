import { Riff } from "@/src/domain/types/riff";
import { db } from "@/src/data/storage/db";

function parseRowToRiff(r: any): Riff {
  return {
    id: r.id,
    name: r.name,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    duration: r.duration,
    audioUri: r.audioUri,
    type: r.type || undefined,
    genre: r.genre || undefined,
    emoji: r.emoji || undefined,
    favorite: r.favorite === 1,
    pinned: r.pinned === 1,
    corrupted: r.corrupted === 1,
    energyLevel: r.energyLevel || undefined,
    bpm: r.bpm || undefined,
    detectedBpm: r.detectedBpm || undefined,
    key: r.key || undefined,
    detectedKey: r.detectedKey || undefined,
    projectId: r.projectId || null,
    
    // JSON arrays/objects parsing
    waveform: r.waveformJson ? JSON.parse(r.waveformJson) : [],
    markers: r.markersJson ? JSON.parse(r.markersJson) : [],
    
    loopStart: r.loopStart !== null ? r.loopStart : undefined,
    loopEnd: r.loopEnd !== null ? r.loopEnd : undefined,
    
    versionGroupId: r.versionGroupId || undefined,
    versionNumber: r.versionNumber || undefined,
    analysisVersion: r.analysisVersion || undefined,
    
    // New fields added in Migration 2
    suggestedBpms: r.suggestedBpmsJson ? JSON.parse(r.suggestedBpmsJson) : undefined,
    bpmSource: r.bpmSource || undefined,
    tags: r.tagsJson ? JSON.parse(r.tagsJson) : undefined,
    systemTags: r.systemTagsJson ? JSON.parse(r.systemTagsJson) : undefined,
    customTags: r.customTagsJson ? JSON.parse(r.customTagsJson) : undefined,
    averageRms: r.averageRms !== null ? r.averageRms : undefined,
    dynamicRange: r.dynamicRange !== null ? r.dynamicRange : undefined,
    energyData: r.energyDataJson ? JSON.parse(r.energyDataJson) : undefined,
    bpmData: r.bpmDataJson ? JSON.parse(r.bpmDataJson) : undefined,
    notes: r.notes || undefined,
    hourOfDay: r.hourOfDay !== null ? r.hourOfDay : undefined,
    dayOfWeek: r.dayOfWeek !== null ? r.dayOfWeek : undefined,
    midiData: r.midiDataJson ? JSON.parse(r.midiDataJson) : undefined,
    tuning: r.tuningJson ? JSON.parse(r.tuningJson) : undefined,
    draft: r.draft === 1,
  };
}

export async function getRiffsRepo(): Promise<Riff[]> {
  const rows = await db.getAllAsync("SELECT * FROM riffs ORDER BY createdAt DESC;");
  return rows.map(parseRowToRiff);
}

export async function saveRiffRepo(riff: Riff): Promise<void> {
  const waveformJson = JSON.stringify(riff.waveform || []);
  const markersJson = riff.markers ? JSON.stringify(riff.markers) : null;
  
  // JSONs for new Migration 2 arrays/objects
  const suggestedBpmsJson = riff.suggestedBpms ? JSON.stringify(riff.suggestedBpms) : null;
  const tagsJson = riff.tags ? JSON.stringify(riff.tags) : null;
  const systemTagsJson = riff.systemTags ? JSON.stringify(riff.systemTags) : null;
  const customTagsJson = riff.customTags ? JSON.stringify(riff.customTags) : null;
  const energyDataJson = riff.energyData ? JSON.stringify(riff.energyData) : null;
  const bpmDataJson = riff.bpmData ? JSON.stringify(riff.bpmData) : null;
  const midiDataJson = riff.midiData ? JSON.stringify(riff.midiData) : null;
  const tuningJson = riff.tuning ? JSON.stringify(riff.tuning) : null;

  await db.runAsync(
    `INSERT OR REPLACE INTO riffs (
      id, name, createdAt, updatedAt, duration, audioUri,
      type, genre, emoji, favorite, pinned, corrupted,
      energyLevel, bpm, detectedBpm, key, detectedKey,
      projectId, waveformJson, markersJson, loopStart, loopEnd,
      versionGroupId, versionNumber, analysisVersion,
      suggestedBpmsJson, bpmSource, tagsJson, systemTagsJson, customTagsJson,
      averageRms, dynamicRange, energyDataJson, bpmDataJson, notes,
      hourOfDay, dayOfWeek, midiDataJson, tuningJson, draft
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
    );`,
    [
      riff.id,
      riff.name,
      riff.createdAt,
      riff.updatedAt || riff.createdAt,
      riff.duration,
      riff.audioUri,
      riff.type || null,
      riff.genre || null,
      riff.emoji || null,
      riff.favorite ? 1 : 0,
      riff.pinned ? 1 : 0,
      riff.corrupted ? 1 : 0,
      riff.energyLevel || null,
      riff.bpm || null,
      riff.detectedBpm || null,
      riff.key || null,
      riff.detectedKey || null,
      riff.projectId || null,
      waveformJson,
      markersJson,
      riff.loopStart ?? null,
      riff.loopEnd ?? null,
      riff.versionGroupId || null,
      riff.versionNumber || null,
      riff.analysisVersion || null,
      
      suggestedBpmsJson,
      riff.bpmSource || null,
      tagsJson,
      systemTagsJson,
      customTagsJson,
      riff.averageRms !== undefined ? riff.averageRms : null,
      riff.dynamicRange !== undefined ? riff.dynamicRange : null,
      energyDataJson,
      bpmDataJson,
      riff.notes || null,
      riff.hourOfDay !== undefined ? riff.hourOfDay : null,
      riff.dayOfWeek !== undefined ? riff.dayOfWeek : null,
      midiDataJson,
      tuningJson,
      riff.draft ? 1 : 0,
    ]
  );
}

export async function deleteRiffRepo(id: string): Promise<void> {
  await db.runAsync(`DELETE FROM riffs WHERE id = ?;`, [id]);
}

export async function getRiffsByProjectRepo(projectId: string): Promise<Riff[]> {
  const rows = await db.getAllAsync("SELECT * FROM riffs WHERE projectId = ? ORDER BY createdAt ASC;", [projectId]);
  return rows.map(parseRowToRiff);
}

export async function getRiffsUnassignedRepo(): Promise<Riff[]> {
  const rows = await db.getAllAsync("SELECT * FROM riffs WHERE projectId IS NULL ORDER BY createdAt DESC;");
  return rows.map(parseRowToRiff);
}

