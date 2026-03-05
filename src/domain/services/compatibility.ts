import { Riff } from "@/src/domain/types/riff";

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
    const diffHalf = Math.abs(a.bpm - b.bpm * 2);
    const diffDouble = Math.abs(a.bpm * 2 - b.bpm);

    if (diff <= 3) {
      bpmLabel = "Identico";
    } else if (diffHalf <= 6 || diffDouble <= 6) {
      bpmLabel = "Dobro/Metade";
      score -= 5;
    } else if (diff <= 10) {
      bpmLabel = "BPM Próximo";
      score -= 15;
    } else if (diff <= 20) {
      bpmLabel = "Ajuste Necessário";
      score -= 30;
      warnings.push("Ajuste de BPM necessário");
    } else {
      bpmLabel = "Incompatível";
      score -= 50;
      warnings.push("BPMs muito distantes");
    }
  } else {
    bpmLabel = "Faltando BPM";
    score -= 20;
  }

const KEY_WHEEL = ["C", "G", "D", "A", "E", "B", "F#", "C#", "G#", "D#", "A#", "F"];
const RELATIVE_MINOR: Record<string, string> = {
  C: "Am", G: "Em", D: "Bm", A: "F#m", E: "C#m", B: "G#m",
  "F#": "D#m", "C#": "A#m", "G#": "Fm", "D#": "Cm", "A#": "Gm", F: "Dm",
};
const RELATIVE_MAJOR: Record<string, string> = Object.fromEntries(
  Object.entries(RELATIVE_MINOR).map(([maj, min]) => [min, maj])
);

function normalizeKey(key: string): string {
  return key.replace("b", "#").replace("Bb", "A#").replace("Eb", "D#").replace("Ab", "G#").replace("Db", "C#").replace("Gb", "F#").trim();
}

function getMajorRoot(key: string): string | null {
  const norm = normalizeKey(key);
  if (norm.endsWith("m")) {
    return RELATIVE_MAJOR[norm] ?? null;
  }
  return norm;
}

  // ─── 2. Key Compatibility ───
  let keyLabel = "Sem dados";
  const keyA = a.key || a.detectedKey;
  const keyB = b.key || b.detectedKey;

  if (keyA && keyB) {
    if (normalizeKey(keyA) === normalizeKey(keyB)) {
      keyLabel = "Mesmo Tom";
    } else {
      const relA = RELATIVE_MINOR[keyA] ?? RELATIVE_MAJOR[keyA];
      if (relA && normalizeKey(relA) === normalizeKey(keyB)) {
        keyLabel = "Tom Relativo";
      } else {
        const rootA = getMajorRoot(keyA);
        const rootB = getMajorRoot(keyB);
        if (rootA && rootB) {
          const idxA = KEY_WHEEL.indexOf(rootA);
          const idxB = KEY_WHEEL.indexOf(rootB);
          if (idxA !== -1 && idxB !== -1) {
            const dist = Math.min(Math.abs(idxA - idxB), 12 - Math.abs(idxA - idxB));
            if (dist === 1) {
              keyLabel = "Tom Vizinho";
              score -= 10;
            } else if (dist === 2) {
              keyLabel = "Aceitável";
              score -= 25;
              warnings.push("Tonalidades levemente distantes");
            } else {
              keyLabel = "Dissonante";
              score -= 40;
              warnings.push("Tons diferentes");
            }
          } else {
            keyLabel = "Diferente";
            score -= 40;
          }
        } else {
          keyLabel = "Diferente";
          score -= 40;
        }
      }
    }
  } else {
    keyLabel = "Faltando Tom";
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


