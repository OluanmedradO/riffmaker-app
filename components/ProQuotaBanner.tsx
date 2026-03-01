import { useTheme } from "@/components/ThemeProvider";
import { ArrowRight, Crown } from "phosphor-react-native";
import React, { useMemo } from "react";
import { Pressable, Text, View } from "react-native";

const FREE_RIFF_LIMIT = 20; // soft limit — nudge when approaching

type Props = {
  riffCount: number;
  onUpgradePress: () => void;
};

/**
 * ProQuotaBanner
 * A subtle progress bar shown on the Home screen when the user is approaching
 * the soft free limit. Nudges organically without being aggressive.
 */
export function ProQuotaBanner({ riffCount, onUpgradePress }: Props) {
  const theme = useTheme();
  const purple = "#7C3AED";

  const ratio = Math.min(riffCount / FREE_RIFF_LIMIT, 1);
  const remaining = Math.max(FREE_RIFF_LIMIT - riffCount, 0);
  const show = riffCount >= FREE_RIFF_LIMIT * 0.6; // nudge past 60%

  const fillColor = useMemo(() => {
    if (ratio >= 1) return "#ef4444";
    if (ratio >= 0.85) return "#f97316";
    return purple;
  }, [ratio]);

  if (!show) return null;

  return (
    <Pressable
      onPress={onUpgradePress}
      style={({ pressed }) => ({
        marginHorizontal: 20,
        marginBottom: 12,
        padding: 14,
        borderRadius: 16,
        backgroundColor: theme.card,
        borderWidth: 1,
        borderColor: fillColor + "40",
        opacity: pressed ? 0.85 : 1,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
      })}
    >
      <Crown size={20} color={fillColor} weight="fill" />

      <View style={{ flex: 1 }}>
        <Text style={{ color: theme.foreground, fontWeight: "700", fontSize: 13, marginBottom: 6 }}>
          {ratio >= 1
            ? "Limite gratuito atingido"
            : `${remaining} ideia${remaining !== 1 ? "s" : ""} restante${remaining !== 1 ? "s" : ""} no plano gratuito`}
        </Text>
        {/* Progress bar */}
        <View style={{ height: 4, borderRadius: 2, backgroundColor: theme.border }}>
          <View
            style={{
              height: 4,
              borderRadius: 2,
              backgroundColor: fillColor,
              width: `${Math.round(ratio * 100)}%`,
            }}
          />
        </View>
        <Text style={{ color: theme.mutedForeground, fontSize: 11, marginTop: 5 }}>
          {riffCount}/{FREE_RIFF_LIMIT} ideias · Seja PRO para ideias ilimitadas
        </Text>
      </View>

      <ArrowRight size={16} color={fillColor} weight="bold" />
    </Pressable>
  );
}
