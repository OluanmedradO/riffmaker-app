import AsyncStorage from "@react-native-async-storage/async-storage";
import { Riff } from "../types/riff";

const RIFFS_KEY = "@riffmaker:riffs";

export async function getRiffs(): Promise<Riff[]> {
  const data = await AsyncStorage.getItem(RIFFS_KEY);
  if (!data) return [];

  const riffs: Riff[] = JSON.parse(data);

  return riffs.sort((a, b) => b.createdAt - a.createdAt);
}

async function saveRiffs(riffs: Riff[]) {
  await AsyncStorage.setItem(RIFFS_KEY, JSON.stringify(riffs));
}

export async function addRiff(riff: Riff) {
  const riffs = await getRiffs();
  const updated = [riff, ...riffs];
  await saveRiffs(updated);
}

export async function deleteRiff(id: string) {
  const riffs = await getRiffs();
  const filtered = riffs.filter((riff) => riff.id !== id);
  await AsyncStorage.setItem(RIFFS_KEY, JSON.stringify(filtered));
}

export async function updateRiff(updated: Riff) {
  const riffs = await getRiffs();
  const mapped = riffs.map((r) => (r.id === updated.id ? updated : r));
  await AsyncStorage.setItem(RIFFS_KEY, JSON.stringify(mapped));
}
