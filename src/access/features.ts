import type { FeatureKey } from "@/src/domain/types/access";

export const PRO_FEATURES = new Set<FeatureKey>([
  "voiceToMidi",
  "tabTranscription",
  "advancedExport",
  "tagTemplates",
  "compareRiffs",
  "autoCombine",
  "fullBackup",
  "projectExport",
  "advancedFilters",
  "stats",
  "longRecordings",
  "unlimitedProjects",
]);

