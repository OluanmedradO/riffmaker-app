import * as Application from "expo-application";
import Constants from "expo-constants";
import * as Updates from "expo-updates";

const expoConfig = Constants.expoConfig;

export const publicConfig = {
  sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN?.trim() ?? "",
  posthogApiKey: process.env.EXPO_PUBLIC_POSTHOG_KEY?.trim() ?? "",
  posthogHost:
    process.env.EXPO_PUBLIC_POSTHOG_HOST?.trim() ??
    "https://us.i.posthog.com",
  privacyPolicyUrl: process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL?.trim() ?? "",
} as const;

export const appInfo = {
  name: Application.applicationName ?? expoConfig?.name ?? "Riff Maker",
  slug: expoConfig?.slug ?? "riffmaker",
  version: Application.nativeApplicationVersion ?? expoConfig?.version ?? "0.0.0",
  build:
    Application.nativeBuildVersion ??
    expoConfig?.ios?.buildNumber ??
    expoConfig?.android?.versionCode?.toString() ??
    "1",
  channel: Updates.channel ?? (__DEV__ ? "development" : "embedded"),
  runtimeVersion: Updates.runtimeVersion ?? "unconfigured",
  updateId: Updates.updateId,
  isEmbeddedLaunch: Updates.isEmbeddedLaunch,
} as const;

export function hasPrivacyPolicyUrl(): boolean {
  return publicConfig.privacyPolicyUrl.length > 0;
}

