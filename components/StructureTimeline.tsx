import React from "react";
import { Dimensions, Pressable, StyleSheet, Text, View } from "react-native";
import { Marker } from "@/src/domain/types/riff";
import { useTheme } from "@/src/shared/theme/ThemeProvider";

type Props = {
  durationMs: number;
  markers?: Marker[];
  onSeek?: (ms: number) => void;
};

const SCREEN_WIDTH = Dimensions.get("window").width;

export function StructureTimeline({ durationMs, markers = [], onSeek }: Props) {
  const theme = useTheme();

  if (durationMs <= 0) return null;

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: theme.primary }]}>Estrutura</Text>
      <View style={[styles.barWrapper, { backgroundColor: theme.input }]}>
        {/* Main timeline bar */}
        <View style={[styles.bar, { backgroundColor: theme.primary + "40" }]} />
        
        {/* Markers as ticks */}
        {markers.map((marker, index) => {
          const ratio = marker.timestampMs / durationMs;
          const xPos = ratio * 100; // percentage

          // Simple logic to give basic sections if multiple markers exist
          // Usually a producer drops a marker at "Intro", "Verse", "Chorus"
          // We can label the block between marker N and N+1
          const nextMarker = markers[index + 1];
          const nextRatio = nextMarker ? (nextMarker.timestampMs / durationMs) : 1;
          const widthPercent = (nextRatio - ratio) * 100;

          return (
            <React.Fragment key={marker.id}>
              {/* The tick itself */}
              <Pressable
                onPress={() => onSeek?.(marker.timestampMs)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={[
                  styles.tick,
                  {
                    left: `${xPos}%`,
                    backgroundColor: theme.primary,
                  },
                  // The following properties are not part of the original styles.tick and
                  // would override existing properties or be redundant.
                  // top: 10,
                  // bottom: 10,
                  // alignItems: "center",
                ]}
              />
              {/* Optional Section Label Box (only if it fits) */}
              {widthPercent > 10 && (
                <View
                  style={[
                    styles.sectionBlock,
                    {
                      left: `${xPos}%`,
                      width: `${widthPercent}%`,
                      backgroundColor: theme.primary + "10",
                      borderColor: theme.primary + "30",
                    }
                  ]}
                >
                  <Text style={[styles.sectionLabel, { color: theme.foreground }]} numberOfLines={1}>
                    {marker.label || `M${index + 1}`}
                  </Text>
                </View>
              )}
            </React.Fragment>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 8,
  },
  barWrapper: {
    height: 36,
    borderRadius: 6,
    overflow: "hidden",
    position: "relative",
    justifyContent: "center",
  },
  bar: {
    height: 4,
    width: "100%",
    borderRadius: 2,
  },
  tick: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 2,
    zIndex: 10,
  },
  sectionBlock: {
    position: "absolute",
    top: 0,
    bottom: 0,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  sectionLabel: {
    fontSize: 10,
    opacity: 0.8,
  },
});

