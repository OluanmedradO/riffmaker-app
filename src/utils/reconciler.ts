import * as FileSystem from "expo-file-system/legacy";
import { getRiffs, saveRiffs } from "@/src/data/storage/riffs";

const RIFFS_DIR = `${FileSystem.documentDirectory ?? ""}riffs/`;

/**
 * Reconciles AsyncStorage metadata with actual files on disk.
 * - Marks riffs as `corrupted: true` if their audio file is missing
 * - Normalizes stale audioUri paths
 * - Gera waveform de fallback para riffs que estão sem
 * - Remove arquivos órfãos no disco (limpeza de cache)
 *
 * Should be called with InteractionManager.runAfterInteractions to avoid blocking the UI.
 */
export async function reconcileStorage(): Promise<void> {
  try {
    const riffs = await getRiffs();
    if (riffs.length === 0) return;

    let changed = false;
    const knownUris = new Set<string>();

    const updatedRiffs = await Promise.all(
      riffs.map(async (riff) => {
        let patched = { ...riff };

        // 1. Check physical existence of audio file
        if (riff.audioUri) {
          knownUris.add(riff.audioUri);
          try {
            const info = await FileSystem.getInfoAsync(riff.audioUri);
            if (!info.exists) {
              if (!riff.corrupted) {
                console.warn(`[Reconciler] Missing audio for riff "${riff.name}" (${riff.id})`);
                patched = { ...patched, corrupted: true };
                changed = true;
              }
            } else if (riff.corrupted) {
              // File exists again (e.g., restore) — un-corrupt
              patched = { ...patched, corrupted: false };
              changed = true;
            }
          } catch (e) {
            console.warn(`[Reconciler] Error checking file for riff ${riff.id}:`, e);
          }
        } else if (!riff.corrupted) {
          // No URI at all — mark corrupted
          patched = { ...patched, corrupted: true };
          changed = true;
        }

        // 2. Generate waveform fallback for riffs that have none
        if ((!patched.waveform || patched.waveform.length === 0) && patched.duration > 0) {
          const pointCount = Math.min(100, Math.max(20, Math.floor(patched.duration / 100)));
          patched = {
            ...patched,
            waveform: Array(pointCount)
              .fill(0)
              .map((_, i) => -100 + Math.sin(i * 0.5) * 30),
          };
          changed = true;
        }

        return patched;
      })
    );

    if (changed) {
      await saveRiffs(updatedRiffs);
    }

    // 3. Detect orphan files on disk and safely delete them to free up space
    try {
      const dirInfo = await FileSystem.getInfoAsync(RIFFS_DIR);
      if (dirInfo.exists) {
        const files = await FileSystem.readDirectoryAsync(RIFFS_DIR);
        for (const filename of files) {
          const fullUri = `${RIFFS_DIR}${filename}`;
          if (!knownUris.has(fullUri)) {
            try {
              await FileSystem.deleteAsync(fullUri, { idempotent: true });
              console.log(`[Reconciler] Removed orphan file: ${fullUri}`);
            } catch (delError) {
              console.warn(`[Reconciler] Failed to remove orphan: ${fullUri}`, delError);
            }
          }
        }
      }
    } catch (e) {
      // Non-critical — ignore readDirectory errors
    }
  } catch (error) {
    console.error("[Reconciler] Fatal error:", error);
  }
}


