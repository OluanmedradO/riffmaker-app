import { useTheme } from "@/components/ThemeProvider";
import { Riff } from "@/src/types/riff";
import { Lightning, MusicNote, Star, TrendUp } from "phosphor-react-native";
import React, { useMemo } from "react";
import { Text, View } from "react-native";

type Props = {
  riffs: Riff[];
};

/**
 * Creative Insights Banner
 * Shows a compact strip with today's stats: ideas recorded, favorites, and energy streak.
 * Designed to be placed just below the Home header.
 */
export function CreativeInsightsBanner({ riffs }: Props) {
  const theme = useTheme();

  const stats = useMemo(() => {
    const today = new Date().toDateString();
    const thisWeek = Date.now() - 7 * 24 * 60 * 60 * 1000;

    const todayRiffs = riffs.filter(r => new Date(r.createdAt).toDateString() === today);
    const weekRiffs = riffs.filter(r => r.createdAt >= thisWeek);
    const favorites = riffs.filter(r => r.favorite).length;
    const highEnergy = weekRiffs.filter(r => r.energyLevel === "high").length;

    // Consecutive day streak
    let streak = 0;
    const daySet = new Set(riffs.map(r => new Date(r.createdAt).toDateString()));
    for (let i = 0; i < 30; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      if (daySet.has(d.toDateString())) {
        streak++;
      } else {
        break;
      }
    }

    return { today: todayRiffs.length, favorites, highEnergy, streak, weekTotal: weekRiffs.length };
  }, [riffs]);

  if (riffs.length === 0) return null;

  const items = [
    {
      icon: <MusicNote size={14} color={theme.primary} weight="fill" />,
      value: stats.today,
      label: "hoje",
      color: theme.primary,
    },
    {
      icon: <Star size={14} color="#eab308" weight="fill" />,
      value: stats.favorites,
      label: "favoritas",
      color: "#eab308",
    },
    ...(stats.streak > 1 ? [{
      icon: <TrendUp size={14} color="#22c55e" weight="bold" />,
      value: stats.streak,
      label: `dia${stats.streak !== 1 ? "s" : ""} seguido${stats.streak !== 1 ? "s" : ""}`,
      color: "#22c55e",
    }] : []),
    ...(stats.highEnergy > 0 ? [{
      icon: <Lightning size={14} color="#ef4444" weight="fill" />,
      value: stats.highEnergy,
      label: "energia alta",
      color: "#ef4444",
    }] : []),
  ];

  return (
    <View
      style={{
        flexDirection: "row",
        gap: 12,
        paddingHorizontal: 20,
        paddingVertical: 12,
        flexWrap: "wrap",
      }}
    >
      {items.map((item, i) => (
        <View
          key={i}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 5,
            backgroundColor: item.color + "12",
            paddingHorizontal: 10,
            paddingVertical: 6,
            borderRadius: 99,
            borderWidth: 1,
            borderColor: item.color + "30",
          }}
        >
          {item.icon}
          <Text style={{ color: item.color, fontWeight: "800", fontSize: 13 }}>
            {item.value}
          </Text>
          <Text style={{ color: theme.mutedForeground, fontSize: 12 }}>
            {item.label}
          </Text>
        </View>
      ))}
    </View>
  );
}
