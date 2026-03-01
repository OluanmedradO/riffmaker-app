import React, { memo, useMemo } from "react";
import { Pressable, StyleSheet, View, useWindowDimensions } from "react-native";
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
  waveformVersion?: number;
  markersVersion?: number; // ✅ opcional (recomendado)
};

const BAR_W = 3;
const GAP = 1;
const MAX_H = 60;
const H_PADDING = 16; // wrapper padding total (se você tiver 16+16)
const MARKER_W = 2;

function clamp01(n: number) {
  "worklet";
  return Math.max(0, Math.min(n, 1));
}

function WaveformInner({
  levels,
  durationMs,
  playbackPositionMs,
  markers = [],
  onSeek,
}: Props) {
  const theme = useTheme();
  const { width: screenWidth } = useWindowDimensions();

  // ✅ largura real: N*(BAR_W+GAP) - GAP (sem gap no final)
  const rawWidth = useMemo(() => {
    if (levels.length <= 0) return 1;
    return levels.length * (BAR_W + GAP) - GAP;
  }, [levels.length]);

  const containerWidth = Math.max(1, screenWidth - H_PADDING * 2);

  const heights = useMemo(() => {
    if (levels.length === 0) return [];
    return levels.map((level) => {
      const db = (level * 160) - 160;
      const minDb = -45;
      let ratio = 0.04;
      if (db > minDb) {
        ratio = (db - minDb) / (-minDb);
      }
      const normalized = Math.max(0.04, Math.min(1, ratio));
      return normalized * MAX_H;
    });
  }, [levels]);

  const animatedTrackStyle = useAnimatedStyle(() => {
    if (levels.length === 0 || durationMs <= 0) {
      return { transform: [{ translateX: containerWidth / 2 }] };
    }

    const progress = clamp01(playbackPositionMs.value / durationMs);
    const pixelPosition = progress * rawWidth;

    // centro do container - posição do áudio
    const translateX = containerWidth / 2 - pixelPosition;

    return { transform: [{ translateX }] };
  }, [containerWidth, rawWidth, durationMs, levels.length]);

  const animatedMarkersStyle = animatedTrackStyle; // mesma transformação

  return (
    <View style={[styles.wrapper, { backgroundColor: theme.input }]}>
      <Playhead />

      <View style={styles.container}>
        {/* BARRAS */}
        <Animated.View style={[styles.track, animatedTrackStyle, { width: rawWidth }]}>
          {heights.map((h, i) => (
            <View
              key={i}
              style={[
                styles.bar,
                {
                  height: h,
                  width: BAR_W,
                  marginRight: i === heights.length - 1 ? 0 : GAP,
                  backgroundColor: theme.primary,
                },
              ]}
            />
          ))}
        </Animated.View>

        {/* MARKERS (camada separada, mas sincronizada) */}
        <Animated.View
          pointerEvents="box-none"
          style={[styles.markersLayer, animatedMarkersStyle, { width: rawWidth }]}
        >
          {markers.map((marker) => {
            const ratio = marker.timestampMs / (durationMs || 1);
            const x = clamp01(ratio) * rawWidth;

            return (
              <Pressable
                key={marker.id}
                hitSlop={{ top: 10, bottom: 10, left: 15, right: 15 }}
                onPress={() => onSeek?.(marker.timestampMs)}
                style={[
                  styles.marker,
                  {
                    left: Math.max(0, x - MARKER_W / 2),
                    width: MARKER_W,
                    backgroundColor: theme.primary,
                  },
                ]}
              />
            );
          })}
        </Animated.View>
      </View>
    </View>
  );
}

export const Waveform = memo(WaveformInner, (prev, next) => {
  return (
    prev.levels === next.levels &&
    prev.durationMs === next.durationMs &&
    prev.markers === next.markers &&
    prev.waveformVersion === next.waveformVersion &&
    prev.playbackPositionMs === next.playbackPositionMs
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
  bar: {
    borderRadius: 2,
  },
  markersLayer: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
  },
  marker: {
    position: "absolute",
    top: 20,
    bottom: 20,
    zIndex: 2,
  },
});