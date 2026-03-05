import React, { memo, useMemo } from "react";
import { Dimensions, StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
    runOnJS,
    SharedValue,
    useAnimatedReaction,
    useAnimatedStyle,
    useSharedValue,
} from "react-native-reanimated";
import { G, Rect, Svg } from "react-native-svg";
import { Marker } from '@/src/domain/types/riff';
import { Playhead } from "@/src/features/riff/components/Playhead";
import { useTheme } from '@/src/shared/theme/ThemeProvider';

type Props = {
  levels: number[];
  durationMs: number;
  playbackPositionMs: SharedValue<number>;
  markers?: Marker[];
  onSeek?: (ms: number) => void;
  onScrubStateChange?: (isScrubbing: boolean) => void;
  waveformVersion?: number;
  isLooping?: boolean;
  loopStartMs?: number | null;
  loopEndMs?: number | null;
  onLoopChange?: (start: number | null, end: number | null) => void;
};

const SCREEN_WIDTH = Dimensions.get("window").width;
const BAR_WIDTH_BASE = 3;
const BAR_GAP_BASE = 1;
const WAVEFORM_HEIGHT = 80;
const OVERVIEW_HEIGHT = 20;

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
    barWidth,
    barGap,
    windowStartPx,
    viewportWidth,
  }: {
    levels: number[];
    primaryColor: string;
    width: number;
    height: number;
    barWidth: number;
    barGap: number;
    windowStartPx?: number;
    viewportWidth?: number;
  }) => {
    const normalizedLevels = useMemo(() => normalizeLevels(levels), [levels]);

    const bars = useMemo(() => {
      let startIndex = 0;
      let endIndex = normalizedLevels.length;

      if (windowStartPx !== undefined && viewportWidth !== undefined) {
        const barsPerPx = 1 / (barWidth + barGap);
        // overscan by +40% on both sides
        const overscan = viewportWidth * 0.4;
        const visiblePxStart = Math.max(0, windowStartPx - overscan);
        const visiblePxEnd = windowStartPx + viewportWidth + overscan;

        startIndex = Math.max(0, Math.floor(visiblePxStart * barsPerPx));
        endIndex = Math.min(normalizedLevels.length, Math.ceil(visiblePxEnd * barsPerPx));
      }

      const visibleSlice = normalizedLevels.slice(startIndex, endIndex);

      return visibleSlice.map((lvl, indexOffset) => {
        const visualIndex = startIndex + indexOffset;
        const barH = Math.max(2, lvl * height);
        const x = visualIndex * (barWidth + barGap);
        const y = (height - barH) / 2;
        const opacity = 0.45 + lvl * 0.55;
        return { key: visualIndex, x, y, h: barH, opacity };
      });
    }, [normalizedLevels, height, barWidth, barGap, windowStartPx, viewportWidth]);

    return (
      <Svg width={width} height={height}>
        <G>
          {bars.map((bar) => (
            <Rect
              key={bar.key}
              x={bar.x}
              y={bar.y}
              width={barWidth}
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
    prev.width === next.width &&
    prev.barWidth === next.barWidth &&
    prev.barGap === next.barGap &&
    prev.windowStartPx === next.windowStartPx &&
    prev.viewportWidth === next.viewportWidth
);

// ---------------------------------------------------------------------------
// Marker — own component so useAnimatedStyle is at top level (no hooks in map)
// ---------------------------------------------------------------------------
function MarkerLine({
  marker,
  durationMs,
  rawWidth,
  bgColor,
  textColor,
}: {
  marker: Marker;
  durationMs: number;
  rawWidth: number;
  bgColor: string;
  textColor: string;
}) {
  const ratio = durationMs > 0 ? marker.timestampMs / durationMs : 0;

  const animatedStyle = useAnimatedStyle(() => ({
    left: ratio * rawWidth,
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
  loopStartMs = null,
  loopEndMs = null,
  onLoopChange,
}: Props) {
  const theme = useTheme();

  const barWidth = BAR_WIDTH_BASE;
  const barGap = BAR_GAP_BASE;

  const isScrubbing = useSharedValue(false);
  const [containerWidth, setContainerWidth] = React.useState(Dimensions.get("window").width - 40);

  const rawWidth = Math.max(1, levels.length * (barWidth + barGap) - barGap);

  const lastRenderedPx = useSharedValue(0);
  const [renderPx, setRenderPx] = React.useState(0);

  useAnimatedReaction(
    () => {
      if (durationMs === 0) return 0;
      const progressRatio = Math.max(0, Math.min(playbackPositionMs.value / durationMs, 1));
      return progressRatio * rawWidth;
    },
    (currentPx) => {
      if (Math.abs(currentPx - lastRenderedPx.value) > containerWidth * 0.4) {
        lastRenderedPx.value = currentPx;
        runOnJS(setRenderPx)(currentPx);
      }
    }
  );

  const pan = Gesture.Pan()
    .minDistance(2)
    .onStart(() => {
      isScrubbing.value = true;
      if (onScrubStateChange) runOnJS(onScrubStateChange)(true);
    })
    .onChange((e) => {
      const pixelDelta = -e.changeX;
      const timeDelta = (pixelDelta / rawWidth) * durationMs;
      // When scrubbing, we adjust the actual playback position, not the visual one
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
    
    // e.x is relative to `track` wrapper. The center of the screen/wrapper is `containerWidth / 2`.
    const distanceFromCenter = e.x - (containerWidth / 2);
    
    const currentVal = playbackPositionMs.value; // Read safely inside gesture
    const currentPixelPosition = (currentVal / (durationMs || 1)) * rawWidth;
    
    const newPixelPosition = currentPixelPosition + distanceFromCenter;
    const newRatio = newPixelPosition / rawWidth;
    const newTime = Math.max(0, Math.min(newRatio * durationMs, durationMs));
    runOnJS(onSeek)(newTime);
  });

  // Loop Handle State
  const localLoopStart = useSharedValue(loopStartMs ?? 0);
  const localLoopEnd = useSharedValue(loopEndMs ?? durationMs);
  const isDraggingLoop = useSharedValue(false);
  // Sync props to shared values if not dragging
  React.useEffect(() => {
    if (!isDraggingLoop.value) {
      if (loopStartMs != null) localLoopStart.value = loopStartMs;
      if (loopEndMs != null) localLoopEnd.value = loopEndMs;
    }
  }, [loopStartMs, loopEndMs, isDraggingLoop]);

  const loopStartPan = Gesture.Pan()
    .minDistance(2)
    .onStart(() => {
      isDraggingLoop.value = true;
      if (onScrubStateChange) runOnJS(onScrubStateChange)(true);
    })
    .onChange((e) => {
      const pixelDelta = e.changeX;
      let timeDelta = (pixelDelta / rawWidth) * durationMs;
      // Reverse if scrolling is centered differently, but here changeX positive means moving right.
      // Wait, pan is inside the container, but container moves. The handle is relative to track.
      let newStart = Math.max(0, localLoopStart.value + timeDelta);
      newStart = Math.min(newStart, localLoopEnd.value - 100); // start < end
      localLoopStart.value = newStart;
    })
    .onFinalize(() => {
      isDraggingLoop.value = false;
      if (onScrubStateChange) runOnJS(onScrubStateChange)(false);
      if (onLoopChange) runOnJS(onLoopChange)(localLoopStart.value, localLoopEnd.value);
    });

  const loopEndPan = Gesture.Pan()
    .minDistance(2)
    .onStart(() => {
      isDraggingLoop.value = true;
      if (onScrubStateChange) runOnJS(onScrubStateChange)(true);
    })
    .onChange((e) => {
      const pixelDelta = e.changeX;
      let timeDelta = (pixelDelta / rawWidth) * durationMs;
      let newEnd = Math.min(durationMs, localLoopEnd.value + timeDelta);
      newEnd = Math.max(newEnd, localLoopStart.value + 100); // end > start
      localLoopEnd.value = newEnd;
    })
    .onFinalize(() => {
      isDraggingLoop.value = false;
      if (onScrubStateChange) runOnJS(onScrubStateChange)(false);
      if (onLoopChange) runOnJS(onLoopChange)(localLoopStart.value, localLoopEnd.value);
    });


  const composed = Gesture.Race(pan, tap);

  const animatedTrackStyle = useAnimatedStyle(() => {
    const totalWidth = rawWidth + containerWidth;

    if (levels.length === 0 || durationMs === 0) {
      return { transform: [{ translateX: 0 }], width: totalWidth };
    }
    const visualPositionMs = playbackPositionMs.value;
    const progressRatio = Math.max(
      0,
      Math.min(visualPositionMs / durationMs, 1)
    );
    const pixelPosition = progressRatio * rawWidth;

    return {
      width: totalWidth,
      transform: [{ translateX: -pixelPosition }],
    };
  });

  const loopRegionStyle = useAnimatedStyle(() => {
    if (durationMs === 0) return { width: 0, left: 0, opacity: 0 };
    const startPx = (localLoopStart.value / durationMs) * rawWidth;
    const endPx = (localLoopEnd.value / durationMs) * rawWidth;
    return {
      left: startPx,
      width: endPx - startPx,
      opacity: (loopStartMs != null && loopEndMs != null) ? 1 : 0,
      transform: [{ translateX: containerWidth / 2 }] // offset for the left padding spacer
    };
  });

  const overviewPlayheadStyle = useAnimatedStyle(() => {
    if (durationMs === 0) return { left: 0 };
    const progressRatio = Math.max(0, Math.min(playbackPositionMs.value / durationMs, 1));
    return {
      left: progressRatio * containerWidth,
    };
  });

  const loopHandleStartStyle = useAnimatedStyle(() => {
    if (durationMs === 0) return { transform: [{ translateX: -1000 }] };
    return {
      transform: [{ translateX: (containerWidth / 2) + (localLoopStart.value / durationMs) * rawWidth - 12 }],
      opacity: (loopStartMs != null && loopEndMs != null) ? 1 : 0,
    };
  });

  const loopHandleEndStyle = useAnimatedStyle(() => {
    if (durationMs === 0) return { transform: [{ translateX: -1000 }] };
    return {
      transform: [{ translateX: (containerWidth / 2) + (localLoopEnd.value / durationMs) * rawWidth - 12 }],
      opacity: (loopStartMs != null && loopEndMs != null) ? 1 : 0,
    };
  });

  return (
    <View 
      style={[styles.wrapper, { backgroundColor: theme.input }]}
      onLayout={(e) => setContainerWidth(Math.max(1, e.nativeEvent.layout.width))}
    >
      {isLooping && (
        <View style={[styles.loopBadge, { backgroundColor: theme.primary + "20" }]}>
          <Animated.Text style={[styles.loopText, { color: theme.primary }]}>
            loop
          </Animated.Text>
        </View>
      )}

      {/* Overview Map */}
      <View style={[styles.overviewContainer, { backgroundColor: theme.background }]}>
        <WaveformSvg
          levels={levels}
          primaryColor={theme.mutedForeground}
          width={containerWidth}
          height={OVERVIEW_HEIGHT}
          barWidth={(containerWidth / Math.max(1, levels.length))}
          barGap={0}
        />
        <Animated.View style={[styles.overviewPlayhead, { backgroundColor: theme.primary }, overviewPlayheadStyle]} />
      </View>

      <Playhead />

      <GestureDetector gesture={composed}>
        <View style={styles.container}>
          <Animated.View style={[styles.track, animatedTrackStyle]}>
            <View style={{ width: containerWidth / 2 }} />
            
            <WaveformSvg
              levels={levels}
              primaryColor={theme.primary}
              width={rawWidth}
              height={WAVEFORM_HEIGHT}
              barWidth={barWidth}
              barGap={barGap}
              windowStartPx={renderPx}
              viewportWidth={containerWidth}
            />
            
            {markers.map((marker) => (
              <Animated.View key={marker.id} style={useAnimatedStyle(() => ({
                position: 'absolute',
                top: 0, bottom: 0,
                transform: [{ translateX: containerWidth / 2 }] // visually offset by left spacer
              }))}>
                <MarkerLine
                  marker={marker}
                  durationMs={durationMs}
                  rawWidth={rawWidth}
                  bgColor={theme.secondary ?? "#888"}
                  textColor={theme.secondaryForeground ?? "#fff"}
                />
              </Animated.View>
            ))}

            {/* Loop Region Highlighter */}
            <Animated.View style={[styles.loopRegion, loopRegionStyle, { backgroundColor: theme.primary + "30" }]} pointerEvents="none" />

            {/* Loop Handles */}
            <GestureDetector gesture={loopStartPan}>
              <Animated.View style={[styles.loopHandle, loopHandleStartStyle, { backgroundColor: theme.primary }]} hitSlop={{ top: 20, bottom: 20, left: 15, right: 15 }}>
                <View style={styles.loopHandlePill} />
              </Animated.View>
            </GestureDetector>

            <GestureDetector gesture={loopEndPan}>
              <Animated.View style={[styles.loopHandle, loopHandleEndStyle, { backgroundColor: theme.primary }]} hitSlop={{ top: 20, bottom: 20, left: 15, right: 15 }}>
                <View style={styles.loopHandlePill} />
              </Animated.View>
            </GestureDetector>

            <View style={{ width: containerWidth / 2 }} />
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
    height: 140, // Expanded for overview
    width: "100%",
    overflow: "hidden",
    borderRadius: 8,
    position: "relative",
  },
  overviewContainer: {
    height: OVERVIEW_HEIGHT,
    width: "100%",
    position: "relative",
    opacity: 0.6,
  },
  overviewPlayhead: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 2,
    zIndex: 2,
  },
  zoomIndicator: {
    position: "absolute",
    bottom: 8,
    right: 8,
    zIndex: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
  },
  zoomText: {
    fontSize: 10,
    fontWeight: "bold",
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
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
  loopRegion: {
    position: "absolute",
    top: 0,
    bottom: 0,
    zIndex: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  loopHandle: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 24,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 5,
    opacity: 0.9,
    borderRadius: 12,
  },
  loopHandlePill: {
    width: 4,
    height: 16,
    backgroundColor: "#fff",
    borderRadius: 2,
    opacity: 0.8,
  }
});

