import { useTheme } from "@/components/ThemeProvider";
import { Riff } from "@/src/types/riff";
import { ArrowsHorizontal, CheckCircle, WarningCircle, XCircle } from "phosphor-react-native";
import React, { useMemo } from "react";
import { Text, View } from "react-native";

// Musical key compatibility based on Circle of Fifths
// Compatible = same key, relative key, adjacent on circle (perfect 4th/5th)
const KEY_WHEEL = ["C", "G", "D", "A", "E", "B", "F#", "C#", "G#", "D#", "A#", "F"];
const RELATIVE_MINOR: Record<string, string> = {
  C: "Am", G: "Em", D: "Bm", A: "F#m", E: "C#m", B: "G#m",
  "F#": "D#m", "C#": "A#m", "G#": "Fm", "D#": "Cm", "A#": "Gm", F: "Dm",
};
const RELATIVE_MAJOR: Record<string, string> = Object.fromEntries(
  Object.entries(RELATIVE_MINOR).map(([maj, min]) => [min, maj])
);

function normalizeKey(key: string): string {
  return key.replace("b", "#").replace("Bb", "A#").replace("Eb", "D#").replace("Ab", "G#")
    .replace("Db", "C#").replace("Gb", "F#").trim();
}

function getMajorRoot(key: string): string | null {
  const norm = normalizeKey(key);
  if (norm.endsWith("m")) {
    return RELATIVE_MAJOR[norm] ?? null;
  }
  return norm;
}

type CompatLevel = "perfect" | "good" | "ok" | "avoid";

function getCompatibility(keyA: string, keyB: string): CompatLevel {
  if (!keyA || !keyB) return "ok";
  if (normalizeKey(keyA) === normalizeKey(keyB)) return "perfect";
  
  const relA = RELATIVE_MINOR[keyA] ?? RELATIVE_MAJOR[keyA];
  if (relA && normalizeKey(relA) === normalizeKey(keyB)) return "perfect";

  const rootA = getMajorRoot(keyA);
  const rootB = getMajorRoot(keyB);
  
  if (!rootA || !rootB) return "ok";
  
  const idxA = KEY_WHEEL.indexOf(rootA);
  const idxB = KEY_WHEEL.indexOf(rootB);
  
  if (idxA === -1 || idxB === -1) return "ok";
  
  const dist = Math.min(
    Math.abs(idxA - idxB),
    12 - Math.abs(idxA - idxB)
  );
  
  if (dist === 1) return "good";  // Adjacent on circle of 5ths
  if (dist === 2) return "ok";
  return "avoid";
}

const COMPAT_CONFIG: Record<CompatLevel, { label: string; color: string; icon: React.ElementType }> = {
  perfect: { label: "Compatível", color: "#22c55e", icon: CheckCircle },
  good:    { label: "Boa combinação", color: "#84cc16", icon: CheckCircle },
  ok:      { label: "Pode funcionar", color: "#f59e0b", icon: WarningCircle },
  avoid:   { label: "Dissonante", color: "#ef4444", icon: XCircle },
};

type Props = {
  currentRiff: Riff;
  otherRiffs: Riff[];
};

/**
 * MusicalCompatibility
 * Shows a compact compatibility indicator for the current riff vs. the rest of the collection.
 * Based on circle of fifths proximity.
 */
export function MusicalCompatibility({ currentRiff, otherRiffs }: Props) {
  const theme = useTheme();

  const myKey = currentRiff.key || currentRiff.detectedKey;
  const myBpm = currentRiff.bpm;

  const compatibleRiffs = useMemo(() => {
    if (!myKey && !myBpm) return [];
    return otherRiffs
      .filter(r => r.id !== currentRiff.id)
      .filter(r => {
        const theirKey = r.key || r.detectedKey;
        if (myKey && theirKey) {
          const compat = getCompatibility(myKey, theirKey);
          return compat === "perfect" || compat === "good";
        }
        if (myBpm && r.bpm) {
          const diff = Math.abs(myBpm - r.bpm);
          return diff <= 5 || Math.abs(myBpm - r.bpm * 2) <= 5 || Math.abs(myBpm * 2 - r.bpm) <= 5;
        }
        return false;
      })
      .slice(0, 3);
  }, [currentRiff, myKey, myBpm, otherRiffs]);

  // Key-based compat for the my key
  const keyCompat: { riff: Riff; level: CompatLevel }[] = useMemo(() => {
    if (!myKey) return [];
    return otherRiffs
      .filter(r => r.id !== currentRiff.id && !!(r.key || r.detectedKey))
      .map(r => ({
        riff: r,
        level: getCompatibility(myKey, (r.key || r.detectedKey)!),
      }))
      .filter(c => c.level === "perfect" || c.level === "good")
      .slice(0, 4);
  }, [myKey, otherRiffs, currentRiff.id]);

  if (!myKey && !myBpm) return null;
  if (otherRiffs.filter(r => r.id !== currentRiff.id).length === 0) return null;

  return (
    <View style={{
      marginTop: 8,
      padding: 14,
      borderRadius: 14,
      backgroundColor: theme.card,
      borderWidth: 1,
      borderColor: theme.border,
      gap: 10,
    }}>
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <ArrowsHorizontal size={16} color={theme.primary} weight="bold" />
        <Text style={{ color: theme.foreground, fontWeight: "700", fontSize: 13 }}>
          Compatibilidade Musical
        </Text>
      </View>

      {/* Key compat results */}
      {keyCompat.length > 0 ? (
        <View style={{ gap: 8 }}>
          {keyCompat.map(({ riff, level }) => {
            const cfg = COMPAT_CONFIG[level];
            const Icon = cfg.icon;
            return (
              <View key={riff.id} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Icon size={14} color={cfg.color} weight="fill" />
                <Text style={{ color: theme.foreground, fontSize: 12, flex: 1 }} numberOfLines={1}>
                  {riff.name}
                </Text>
                <View style={{ backgroundColor: cfg.color + "20", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 99 }}>
                  <Text style={{ color: cfg.color, fontSize: 10, fontWeight: "700" }}>
                    {(riff.key || riff.detectedKey)} · {cfg.label}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      ) : (
        <Text style={{ color: theme.mutedForeground, fontSize: 12 }}>
          Nenhuma ideia compatível encontrada na sua coleção.
        </Text>
      )}

      {/* BPM compat hint */}
      {myBpm && (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 }}>
          <Text style={{ color: theme.mutedForeground, fontSize: 11 }}>
            BPM compatível: {myBpm} BPM · dobro {myBpm * 2} · metade {Math.floor(myBpm / 2)}
          </Text>
        </View>
      )}
    </View>
  );
}
