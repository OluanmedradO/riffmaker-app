import React, { memo } from "react";
import { Dimensions, StyleSheet, Text, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, { runOnJS, SharedValue, useAnimatedStyle, useSharedValue } from "react-native-reanimated";
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
  isLooping?: boolean;
};

const SCREEN_WIDTH = Dimensions.get("window").width;
const BASE_BAR_SPACE = 4;

function InteractiveWaveformInner({
  levels,
  durationMs,
  playbackPositionMs,
  markers = [],
  onSeek,
  isLooping = false,
}: Props) {
  const theme = useTheme();

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);

  const rawWidth = Math.max(1, levels.length * BASE_BAR_SPACE);

  const pinch = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = Math.max(0.5, Math.min(savedScale.value * e.scale, 4.0));
    })
    .onEnd(() => {
      savedScale.value = scale.value;
    });

  const pan = Gesture.Pan()
    .onChange((e) => {
      if (!onSeek) return;
      const pixelDelta = -e.changeX;
      // Because we scaled the width natively using width: rawWidth * scale.value and children as flex: 1, 
      // the total width is indeed scaled correctly.
      const timeDelta = (pixelDelta / (rawWidth * scale.value)) * durationMs;
      const newTime = Math.max(0, Math.min(playbackPositionMs.value + timeDelta, durationMs));
      runOnJS(onSeek)(newTime);
    });

  const tap = Gesture.Tap()
    .onEnd((e) => {
      if (!onSeek) return;
      // E.x is relative to the GestureDetector's container bounds.
      const center = (SCREEN_WIDTH - 32) / 2;
      const distanceFromCenter = e.x - center;
      const currentPixelPosition = (playbackPositionMs.value / durationMs) * rawWidth * scale.value;
      const newPixelPosition = currentPixelPosition + distanceFromCenter;
      
      const newRatio = newPixelPosition / (rawWidth * scale.value);
      const newTime = Math.max(0, Math.min(newRatio * durationMs, durationMs));
      runOnJS(onSeek)(newTime);
    });

  const composed = Gesture.Simultaneous(pinch, Gesture.Race(pan, tap));

  const animatedStyle = useAnimatedStyle(() => {
    if (levels.length === 0 || durationMs === 0) {
      return { transform: [{ translateX: SCREEN_WIDTH / 2 }] };
    }

    const progressRatio = playbackPositionMs.value / durationMs;
    const clampedProgress = Math.max(0, Math.min(progressRatio, 1));
    const currentScaledWidth = rawWidth * scale.value;
    const pixelPosition = clampedProgress * currentScaledWidth;

    const containerWidth = SCREEN_WIDTH - 32;
    const translateX = containerWidth / 2 - pixelPosition;

    return {
      width: currentScaledWidth,
      transform: [{ translateX }],
    };
  });

  const averageEnergy = levels.length > 0 ? levels.reduce((sum, level) => {
      const normalized = Math.max(0, level < 0 ? (level + 160) / 160 : level);
      return sum + normalized;
    }, 0) / levels.length : 0;
  
  let dynamicText = "";
  if (averageEnergy > 0.6) dynamicText = "Alta Energia";
  else if (averageEnergy > 0.3) dynamicText = "Dinâmica Média";
  else dynamicText = "Suave";

  return (
    <View style={[styles.wrapper, { backgroundColor: theme.input }]}>
      <View style={{ position: "absolute", top: 8, left: 12, zIndex: 10, flexDirection: "row", alignItems: "center", gap: 8 }}>
         <Text style={{ color: theme.mutedForeground, fontSize: 10, fontWeight: "800", textTransform: "uppercase" }}>{dynamicText}</Text>
         {isLooping && <Text style={{ color: theme.accent, fontSize: 10, fontWeight: "800", textTransform: "uppercase" }}>Em Loop</Text>}
      </View>
      <Playhead />
      <GestureDetector gesture={composed}>
        <View style={styles.container}>
          <Animated.View style={[animatedStyle, styles.track]}>
            {levels.map((level, i) => {
              const normalized = Math.max(0.02, level < 0 ? (level + 160) / 160 : level);
              return (
                <View
                  key={i}
                  style={{
                    flex: 1,
                    marginRight: 1,
                    height: normalized * 60,
                    backgroundColor: theme.primary,
                    borderRadius: 2,
                  }}
                />
              );
            })}

            {/* RENDER MARKERS */}
            {markers.map((marker) => {
              const ratio = marker.timestampMs / (durationMs || 1);
              
              const markerStyle = useAnimatedStyle(() => {
                 return { left: ratio * rawWidth * scale.value };
              });

              return (
                <Animated.View
                  key={marker.id}
                  style={[
                    markerStyle, 
                    {
                      position: "absolute",
                      top: 10,
                      bottom: 10,
                      width: 2,
                      backgroundColor: theme.secondary,
                      alignItems: "center",
                      justifyContent: "center",
                      zIndex: 2,
                    }
                  ]}
                >
                  <View style={{ position: "absolute", top: -14, backgroundColor: theme.secondary, paddingHorizontal: 4, paddingVertical: 2, borderRadius: 4 }}>
                     <Text style={{ fontSize: 8, color: theme.secondaryForeground, fontWeight: "bold" }}>{marker.label}</Text>
                  </View>
                </Animated.View>
              );
            })}
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
