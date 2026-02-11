import AsyncStorage from "@react-native-async-storage/async-storage";
import { Riff } from "../types/riff";
import { withRetry } from "../utils/async";

const RIFFS_KEY = "@riffmaker:riffs";

export async function getRiffs(): Promise<Riff[]> {
  try {
    return await withRetry(async () => {
      const data = await AsyncStorage.getItem(RIFFS_KEY);
      if (!data) return [];

      const riffs: Riff[] = JSON.parse(data);
      return riffs.sort((a, b) => b.createdAt - a.createdAt);
    });
  } catch (error) {
    console.error("Error loading riffs:", error);
    return [];
  }
}

async function saveRiffs(riffs: Riff[]) {
  await withRetry(async () => {
    await AsyncStorage.setItem(RIFFS_KEY, JSON.stringify(riffs));
  });
}

export async function addRiff(riff: Riff): Promise<void> {
  const riffs = await getRiffs();
  const updated = [riff, ...riffs];
  await saveRiffs(updated);
}

export async function deleteRiff(id: string): Promise<void> {
  const riffs = await getRiffs();
  const filtered = riffs.filter((riff) => riff.id !== id);
  await saveRiffs(filtered);
}

export async function updateRiff(updated: Riff): Promise<void> {
  const riffs = await getRiffs();
  const mapped = riffs.map((r) => (r.id === updated.id ? updated : r));
  await saveRiffs(mapped);
}

export async function duplicateRiff(id: string): Promise<Riff | null> {
  const riffs = await getRiffs();
  const original = riffs.find((r) => r.id === id);

  if (!original) return null;

  const duplicate: Riff = {
    ...original,
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    title: `${original.title} (cópia)`,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  await addRiff(duplicate);
  return duplicate;
}

export async function toggleFavorite(id: string): Promise<void> {
  const riffs = await getRiffs();
  const mapped = riffs.map((r) =>
    r.id === id ? { ...r, favorite: !r.favorite } : r,
  );
  await saveRiffs(mapped);
}
