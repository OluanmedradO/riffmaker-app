import type { FeatureKey } from "../types/access";

export const PRO_FEATURES = new Set<FeatureKey>([
  "projects",
  "loopMode",
  "voiceToMidi",
  "tabTranscription",
  "advancedExport",
  "tagTemplates",
  "compareRiffs",
]);
