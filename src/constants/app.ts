export const APP_CONFIG = {
  MAX_RECORDING_SECONDS: 60,
  AUTOSAVE_DEBOUNCE_MS: 1000,
  MAX_RIFF_TITLE_LENGTH: 100,
  MAX_RIFF_NOTES_LENGTH: 500,
  ANIMATION_DURATION: 300,
} as const;

export const STORAGE_KEYS = {
  RIFFS: "@riffmaker:riffs",
  PREFERENCES: "@riffmaker:preferences",
  ONBOARDING_COMPLETED: "@riffmaker:onboarding",
} as const;

export const TUNING_PRESETS = [
  { label: "Standard (E-A-D-G-B-E)", value: "E-A-D-G-B-E" },
  { label: "Drop D (D-A-D-G-B-E)", value: "D-A-D-G-B-E" },
  { label: "Half Step Down (Eb-Ab-Db-Gb-Bb-Eb)", value: "Eb-Ab-Db-Gb-Bb-Eb" },
  { label: "Drop C (C-G-C-F-A-D)", value: "C-G-C-F-A-D" },
  { label: "Open D (D-A-D-F#-A-D)", value: "D-A-D-F#-A-D" },
  { label: "Open G (D-G-D-G-B-D)", value: "D-G-D-G-B-D" },
] as const;

export const SORT_OPTIONS = [
  { label: "Mais recentes", value: "newest" },
  { label: "Mais antigos", value: "oldest" },
  { label: "Nome (A-Z)", value: "name-asc" },
  { label: "Nome (Z-A)", value: "name-desc" },
  { label: "BPM (crescente)", value: "bpm-asc" },
  { label: "BPM (decrescente)", value: "bpm-desc" },
] as const;
