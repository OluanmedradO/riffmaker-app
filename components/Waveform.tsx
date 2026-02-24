import React, { memo } from "react";
import { Dimensions, Pressable, StyleSheet, View } from "react-native";
import Animated, { SharedValue, useAnimatedStyle } from "react-native-reanimated";
import { Marker } from "../src/types/riff";
import { Playhead } from "./Playhead";
import { useTheme } from "./ThemeProvider";

type Props = {
  levels: number[];
  durationMs: number;
  playbackPositionMs: SharedValue<number>;
  markers?: Marker[];
  onSeek?: (ms: number) => void;
  /** Increment this to force re-render when levels array reference is stable but values changed */
  waveformVersion?: number;
};

const SCREEN_WIDTH = Dimensions.get("window").width;
const BASE_BAR_SPACE = 4;

function WaveformInner({
  levels,
  durationMs,
  playbackPositionMs,
  markers = [],
  onSeek,
}: Props) {
  const theme = useTheme();

  const rawWidth = Math.max(1, levels.length * BASE_BAR_SPACE);

  const animatedStyle = useAnimatedStyle(() => {
    if (levels.length === 0 || durationMs === 0) {
      return { transform: [{ translateX: SCREEN_WIDTH / 2 }] };
    }

    const progressRatio = playbackPositionMs.value / durationMs;
    const clampedProgress = Math.max(0, Math.min(progressRatio, 1));
    const pixelPosition = clampedProgress * rawWidth;

    // Center the currently playing position under the playhead
    const containerWidth = SCREEN_WIDTH - 32;
    const translateX = containerWidth / 2 - pixelPosition;

    return {
      transform: [{ translateX }],
    };
  });

  return (
    <View style={[styles.wrapper, { backgroundColor: theme.input }]}>
      <Playhead />
      <View style={styles.container}>
        <Animated.View style={[animatedStyle, styles.track, { width: rawWidth }]}>
          {levels.map((level, i) => {
            const normalized = Math.max(0.02, level < 0 ? (level + 160) / 160 : level);
            return (
              <View
                key={i}
                style={{
                  width: BASE_BAR_SPACE - 1,
                  marginRight: 1,
                  height: normalized * 60,
                  backgroundColor: theme.primary,
                  borderRadius: 2,
                }}
              />
            );
          })}

          {/* RENDER MARKERS AS ABSOLUTE PLACEMENTS */}
          {markers.map((marker) => {
            const ratio = marker.timestampMs / (durationMs || 1);
            const xPos = ratio * rawWidth;

            return (
              <Pressable
                key={marker.id}
                hitSlop={{ top: 10, bottom: 10, left: 15, right: 15 }}
                onPress={() => onSeek?.(marker.timestampMs)}
                style={{
                  position: "absolute",
                  left: xPos,
                  top: 20,
                  bottom: 20,
                  width: 2,
                  backgroundColor: theme.primary,
                  alignItems: "center",
                  justifyContent: "center",
                  zIndex: 2,
                }}
              />
            );
          })}
        </Animated.View>
      </View>
    </View>
  );
}

/**
 * Memoized Waveform — only re-renders when levels reference changes,
 * durationMs changes, or waveformVersion increments.
 */
export const Waveform = memo(WaveformInner, (prev, next) => {
  return (
    prev.levels === next.levels &&
    prev.durationMs === next.durationMs &&
    prev.markers === next.markers &&
    prev.waveformVersion === next.waveformVersion
  );
});

const styles = StyleSheet.create({
  wrapper: {
    height: 100,
    width: "100%",
    overflow: "hidden",
    borderRadius: 8,
    position: "relative",
    marginTop: 16,
  },
  container: {
    flex: 1,
    justifyContent: "center",
  },
  track: {
    flexDirection: "row",
    alignItems: "center",
    height: "100%",
  },
});
