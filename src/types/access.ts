// src/types/access.ts
export type Plan = "free" | "pro";
export type Role = "user" | "admin";

export type AccessState = {
  role: Role;
  plan: Plan;
  simulatePlan?: Plan;
};

export type FeatureKey =
  | "projects"
  | "loopMode"
  | "voiceToMidi"
  | "tabTranscription"
  | "advancedExport"
  | "tagTemplates"
  | "compareRiffs";
