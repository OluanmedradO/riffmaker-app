import AsyncStorage from "@react-native-async-storage/async-storage";
import type { AccessState } from "@/src/domain/types/access";

const KEY = "riffmaker_access_v1";

const DEFAULT_ACCESS: AccessState = {
  role: "user",
  plan: "free",
  simulatePlan: undefined,
};

export async function loadAccess(): Promise<AccessState> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return DEFAULT_ACCESS;

  try {
    const parsed = JSON.parse(raw) as Partial<AccessState>;
    return {
      role: parsed.role === "admin" ? "admin" : "user",
      plan: parsed.plan === "pro" ? "pro" : "free",
      simulatePlan:
        parsed.simulatePlan === "pro"
          ? "pro"
          : parsed.simulatePlan === "free"
            ? "free"
            : undefined,
    };
  } catch {
    return DEFAULT_ACCESS;
  }
}

export async function saveAccess(next: AccessState) {
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
}

export async function resetAccess() {
  await AsyncStorage.removeItem(KEY);
}

