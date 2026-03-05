import { useTheme } from "@/src/shared/theme/ThemeProvider";
import { Crown } from "phosphor-react-native";
import React, { useMemo } from "react";
import { Pressable, Text } from "react-native";

const FREE_RIFF_LIMIT = 20;

type Props = {
  riffCount: number;
  onUpgradePress: () => void;
};

/**
 * ProQuotaBanner
 * Compact inline pill — never dominates, just nudges.
 */
export function ProQuotaBanner({ riffCount, onUpgradePress }: Props) {
  const theme = useTheme();

  const ratio = Math.min(riffCount / FREE_RIFF_LIMIT, 1);
  const show = riffCount >= FREE_RIFF_LIMIT * 0.6;

  const accentColor = useMemo(() => {
    if (ratio >= 1) return "#f97316"; // orange — noticeable but not alarming
    if (ratio >= 0.85) return "#eab308"; // amber
    return "#7C3AED"; // purple default
  }, [ratio]);

  if (!show) return null;

  return (
    <Pressable
      onPress={onUpgradePress}
      style={({ pressed }) => ({
        marginHorizontal: 20,
        marginBottom: 8,
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 99,
        backgroundColor: accentColor + "08",
        borderWidth: 1,
        borderColor: accentColor + "25",
        opacity: pressed ? 0.75 : 1,
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        alignSelf: "flex-start",
      })}
    >
      <Crown size={13} color={accentColor} weight="fill" />
      <Text style={{ color: accentColor, fontWeight: "700", fontSize: 12 }}>
        {riffCount}/{FREE_RIFF_LIMIT} ideias
      </Text>
      <Text style={{ color: theme.mutedForeground, fontSize: 12, fontWeight: "500" }}>
        · Atualizar para PRO →
      </Text>
    </Pressable>
  );
}


