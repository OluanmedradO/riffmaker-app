import React, { memo, useMemo } from "react";
import { Dimensions, StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
    runOnJS,
    SharedValue,
    useAnimatedStyle,
    useSharedValue,
} from "react-native-reanimated";
import { G, Rect, Svg } from "react-native-svg";
import { Marker } from "../src/types/riff";
import { Playhead } from "./Playhead";
import { useTheme } from "./ThemeProvider";

type Props = {
  levels: number[];
  durationMs: number;
  playbackPositionMs: SharedValue<number>;
  markers?: Marker[];
  onSeek?: (ms: number) => void;
  onScrubStateChange?: (isScrubbing: boolean) => void;
  waveformVersion?: number;
  isLooping?: boolean;
};

const SCREEN_WIDTH = Dimensions.get("window").width;
const BAR_WIDTH = 3;
const BAR_GAP = 1;
const WAVEFORM_HEIGHT = 80;

// ---------------------------------------------------------------------------
// Normalize levels so the full height range is used and
// quiet/loud differences are visible. Uses sqrt compression
// so quiet parts aren't invisible.
// ---------------------------------------------------------------------------
function normalizeLevels(raw: number[]): number[] {
  if (raw.length === 0) return [];

  return raw.map((level) => {
    const db = (level * 160) - 160;
    const minDb = -45;
    if (db <= minDb) return 0.04;
    const ratio = (db - minDb) / (-minDb);
    return Math.max(0.04, Math.min(1, ratio));
  });
}

// ---------------------------------------------------------------------------
// Static SVG waveform — rendered once, never re-renders during playback
// ---------------------------------------------------------------------------
const WaveformSvg = memo(
  ({
    levels,
    primaryColor,
    width,
    height,
  }: {
    levels: number[];
    primaryColor: string;
    width: number;
    height: number;
  }) => {
    const normalizedLevels = useMemo(() => normalizeLevels(levels), [levels]);

    const bars = useMemo(() => {
      return normalizedLevels.map((lvl, i) => {
        const barH = Math.max(2, lvl * height);
        const x = i * (BAR_WIDTH + BAR_GAP);
        const y = (height - barH) / 2;
        const opacity = 0.45 + lvl * 0.55;
        return { x, y, h: barH, opacity };
      });
    }, [normalizedLevels, height]);

    return (
      <Svg width={width} height={height}>
        <G>
          {bars.map((bar, i) => (
            <Rect
              key={i}
              x={bar.x}
              y={bar.y}
              width={BAR_WIDTH}
              height={bar.h}
              rx={1.5}
              fill={primaryColor}
              opacity={bar.opacity}
            />
          ))}
        </G>
      </Svg>
    );
  },
  (prev, next) =>
    prev.levels === next.levels &&
    prev.primaryColor === next.primaryColor &&
    prev.width === next.width
);

// ---------------------------------------------------------------------------
// Marker — own component so useAnimatedStyle is at top level (no hooks in map)
// ---------------------------------------------------------------------------
function MarkerLine({
  marker,
  durationMs,
  rawWidth,
  scale,
  bgColor,
  textColor,
}: {
  marker: Marker;
  durationMs: number;
  rawWidth: number;
  scale: SharedValue<number>;
  bgColor: string;
  textColor: string;
}) {
  const ratio = durationMs > 0 ? marker.timestampMs / durationMs : 0;

  const animatedStyle = useAnimatedStyle(() => ({
    left: ratio * rawWidth * scale.value,
  }));

  return (
    <Animated.View
      style={[
        styles.markerLine,
        { backgroundColor: bgColor },
        animatedStyle,
      ]}
    >
      <View style={[styles.markerLabel, { backgroundColor: bgColor }]}>
        <Animated.Text style={[styles.markerText, { color: textColor }]}>
          {marker.label}
        </Animated.Text>
      </View>
    </Animated.View>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
function InteractiveWaveformInner({
  levels,
  durationMs,
  playbackPositionMs,
  markers = [],
  onSeek,
  onScrubStateChange,
  isLooping = false,
}: Props) {
  const theme = useTheme();

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const isScrubbing = useSharedValue(false);

  const rawWidth = Math.max(1, levels.length * (BAR_WIDTH + BAR_GAP));

  const pinch = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = Math.max(0.5, Math.min(savedScale.value * e.scale, 4.0));
    })
    .onEnd(() => {
      savedScale.value = scale.value;
    });

  const pan = Gesture.Pan()
    .minDistance(2)
    .onStart(() => {
      isScrubbing.value = true;
      if (onScrubStateChange) runOnJS(onScrubStateChange)(true);
    })
    .onChange((e) => {
      const pixelDelta = -e.changeX;
      const timeDelta = (pixelDelta / (rawWidth * scale.value)) * durationMs;
      playbackPositionMs.value = Math.max(
        0,
        Math.min(playbackPositionMs.value + timeDelta, durationMs)
      );
    })
    .onFinalize(() => {
      isScrubbing.value = false;
      if (onScrubStateChange) runOnJS(onScrubStateChange)(false);
      if (onSeek) runOnJS(onSeek)(playbackPositionMs.value);
    });

  const tap = Gesture.Tap().onEnd((e) => {
    if (!onSeek) return;
    const containerWidth = SCREEN_WIDTH - 32;
    const center = containerWidth / 2;
    const distanceFromCenter = e.x - center;
    const currentPixelPosition =
      (playbackPositionMs.value / durationMs) * rawWidth * scale.value;
    const newPixelPosition = currentPixelPosition + distanceFromCenter;
    const newRatio = newPixelPosition / (rawWidth * scale.value);
    const newTime = Math.max(0, Math.min(newRatio * durationMs, durationMs));
    runOnJS(onSeek)(newTime);
  });

  const composed = Gesture.Simultaneous(pinch, Gesture.Race(pan, tap));

  const animatedTrackStyle = useAnimatedStyle(() => {
    if (levels.length === 0 || durationMs === 0) {
      return { transform: [{ translateX: 0 }], width: rawWidth };
    }
    const progressRatio = Math.max(
      0,
      Math.min(playbackPositionMs.value / durationMs, 1)
    );
    const currentScaledWidth = rawWidth * scale.value;
    const pixelPosition = progressRatio * currentScaledWidth;
    const containerWidth = SCREEN_WIDTH - 32;
    const translateX = containerWidth / 2 - pixelPosition;

    return {
      width: currentScaledWidth,
      transform: [{ translateX }],
    };
  });

  return (
    <View style={[styles.wrapper, { backgroundColor: theme.input }]}>
      {isLooping && (
        <View style={[styles.loopBadge, { backgroundColor: theme.primary + "20" }]}>
          <Animated.Text style={[styles.loopText, { color: theme.primary }]}>
            loop
          </Animated.Text>
        </View>
      )}

      <Playhead />

      <GestureDetector gesture={composed}>
        <View style={styles.container}>
          <Animated.View style={[styles.track, animatedTrackStyle]}>
            <WaveformSvg
              levels={levels}
              primaryColor={theme.primary}
              width={rawWidth}
              height={WAVEFORM_HEIGHT}
            />
            {markers.map((marker) => (
              <MarkerLine
                key={marker.id}
                marker={marker}
                durationMs={durationMs}
                rawWidth={rawWidth}
                scale={scale}
                bgColor={theme.secondary ?? "#888"}
                textColor={theme.secondaryForeground ?? "#fff"}
              />
            ))}
          </Animated.View>
        </View>
      </GestureDetector>
    </View>
  );
}

export const InteractiveWaveform = memo(InteractiveWaveformInner, (prev, next) => {
  return (
    prev.levels === next.levels &&
    prev.durationMs === next.durationMs &&
    prev.markers === next.markers &&
    prev.waveformVersion === next.waveformVersion &&
    prev.isLooping === next.isLooping
  );
});

const styles = StyleSheet.create({
  wrapper: {
    height: 100,
    width: "100%",
    overflow: "hidden",
    borderRadius: 8,
    position: "relative",
  },
  loopBadge: {
    position: "absolute",
    top: 6,
    right: 8,
    zIndex: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  loopText: {
    fontSize: 9,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  container: {
    flex: 1,
    justifyContent: "center",
  },
  track: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  markerLine: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 2,
    alignItems: "center",
    zIndex: 2,
  },
  markerLabel: {
    position: "absolute",
    top: 4,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  markerText: {
    fontSize: 8,
    fontWeight: "bold",
  },
});