import { Riff } from "../types/riff";

export type CompatibilityResult = {
  score: number; // 0..100
  bpmLabel: string;
  keyLabel: string;
  chipLabel: "Boa combinação" | "Ok com ajustes" | "Distante";
  chipColor: string; // Used for UI badge mapping
  warnings: string[];
};

export function calculateCompatibility(a: Riff | null, b: Riff | null): CompatibilityResult {
  if (!a || !b) {
    return {
      score: 0,
      bpmLabel: "N/A",
      keyLabel: "N/A",
      chipLabel: "Distante",
      chipColor: "#a1a1aa",
      warnings: [],
    };
  }

  let score = 100;
  const warnings: string[] = [];

  // ─── 1. BPM Compatibility ───
  let bpmLabel = "Sem dados";
  if (a.bpm && b.bpm) {
    const diff = Math.abs(a.bpm - b.bpm);
    if (diff <= 5) {
      bpmLabel = "Perfeito";
    } else if (diff <= 10) {
      bpmLabel = "Bom";
      score -= 10;
    } else if (diff <= 20) {
      bpmLabel = "Ajuste recomendado";
      score -= 30;
      warnings.push("Ajuste de BPM necessário");
    } else {
      bpmLabel = "Distante";
      score -= 50;
      warnings.push("BPMs muito distantes");
    }
  } else {
    bpmLabel = "Faltando BPM em A ou B";
    score -= 20;
  }

  // ─── 2. Key Compatibility ───
  let keyLabel = "Sem dados";
  const keyA = a.key || a.detectedKey;
  const keyB = b.key || b.detectedKey;

  if (keyA && keyB) {
    if (keyA === keyB) {
      keyLabel = "Perfeito";
    } else {
      // Basic relative key logic for this scope (A major / F# minor etc would be nice, but simple exact matching / mismatch for MVP)
      // Since advanced circle of fifths is out of scope for "Inteligência leve", we'll do exact or different.
      keyLabel = "Diferente";
      score -= 40;
      warnings.push("Tons diferentes");
    }
  } else {
    keyLabel = "Faltando Tom em A ou B";
    score -= 20;
  }

  // ─── 3. Final Score Mapping ───
  score = Math.max(0, score); // clamp to 0..100

  let chipLabel: "Boa combinação" | "Ok com ajustes" | "Distante" = "Distante";
  let chipColor = "#ef4444"; // danger red

  if (score >= 80) {
    chipLabel = "Boa combinação";
    chipColor = "#22c55e"; // success green
  } else if (score >= 50) {
    chipLabel = "Ok com ajustes";
    chipColor = "#eab308"; // warning yellow
  }

  return {
    score,
    bpmLabel,
    keyLabel,
    chipLabel,
    chipColor,
    warnings,
  };
}
