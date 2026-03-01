import React from "react";
import { View } from "react-native";

const BAR_COUNT = 40;

export function MeteringBars({
  levels,
  color,
  containerWidth,
}: {
  levels: number[];
  color: string;
  containerWidth: number;
}) {
  const gap = 3;
  const barWidth =
    containerWidth > 0
      ? Math.max(2, (containerWidth - (BAR_COUNT - 1) * gap) / BAR_COUNT)
      : 4;

  const bars = Array.from({ length: BAR_COUNT }, (_, i) => {
    const idx = levels.length - BAR_COUNT + i;
    return idx >= 0 ? Math.max(0.05, levels[idx]) : 0.05;
  });

  return (
    <View style={{ height: 44, flexDirection: "row", alignItems: "flex-end", gap }}>
      {bars.map((db, idx) => {
        const clampedDb = Math.max(-60, Math.min(0, db));
        const linearAplitude = Math.pow(10, clampedDb / 20);
        const normalized = Math.max(0.05, Math.min(1, linearAplitude));
        const opacity = 0.4 + normalized * 0.6;
        return (
          <View
            key={idx}
            style={{
              width: barWidth,
              height: normalized * 44,
              backgroundColor: color,
              borderRadius: 2,
              opacity,
            }}
          />
        );
      })}
    </View>
  );
}
