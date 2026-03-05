import { useTheme } from "@/src/shared/theme/ThemeProvider";
import { Riff } from "@/src/domain/types/riff";
import { MusicNote, Star, TrendUp } from "phosphor-react-native";
import React, { useMemo } from "react";
import { ScrollView, Text, View } from "react-native";

type Props = {
  riffs: Riff[];
};

/**
 * Creative Insights Banner
 * Ultra-subtle badge strip — low visual weight, high info density.
 */
export function CreativeInsightsBanner({ riffs }: Props) {
  const theme = useTheme();

  const stats = useMemo(() => {
    const today = new Date().toDateString();
    const thisWeek = Date.now() - 7 * 24 * 60 * 60 * 1000;

    const todayRiffs = riffs.filter(r => new Date(r.createdAt).toDateString() === today);
    const favorites = riffs.filter(r => r.favorite).length;

    let streak = 0;
    const daySet = new Set(riffs.map(r => new Date(r.createdAt).toDateString()));
    for (let i = 0; i < 30; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      if (daySet.has(d.toDateString())) streak++;
      else break;
    }

    return { today: todayRiffs.length, favorites, streak };
  }, [riffs]);

  if (riffs.length === 0) return null;

  // Muted, neutral badge color — no saturated greens/reds
  const mutedPrimary = theme.primary + "CC";

  const items = [
    {
      icon: <MusicNote size={12} color={theme.mutedForeground} weight="fill" />,
      value: stats.today,
      label: "hoje",
    },
    {
      icon: <Star size={12} color={theme.mutedForeground} weight="fill" />,
      value: stats.favorites,
      label: "favoritas",
    },
    ...(stats.streak > 1 ? [{
      icon: <TrendUp size={12} color={theme.mutedForeground} weight="bold" />,
      value: stats.streak,
      label: `dia${stats.streak !== 1 ? "s" : ""}`,
    }] : []),
  ];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{
        flexDirection: "row",
        gap: 8,
        paddingHorizontal: 20,
        paddingBottom: 10,
        paddingTop: 2,
      }}
    >
      {items.map((item, i) => (
        <View
          key={i}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            backgroundColor: theme.muted,
            paddingHorizontal: 9,
            paddingVertical: 4,
            borderRadius: 99,
          }}
        >
          {item.icon}
          <Text style={{ color: theme.foreground, fontWeight: "700", fontSize: 12 }}>
            {item.value}
          </Text>
          <Text style={{ color: theme.mutedForeground, fontSize: 12, fontWeight: "500" }}>
            {item.label}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
}


