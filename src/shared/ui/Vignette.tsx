import React, { memo } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";

interface VignetteProps {
  /** Opacity of the vignette darkening at edges. Default: 0.24 */
  opacity?: number;
}

/**
 * Vignette
 * Radial gradient overlay darkening screen edges — cinema-style.
 * r=80% for a longer, softer feather to avoid 'closed-in' feeling.
 * Pointer-events-none.
 */
export const Vignette = memo(function Vignette({
  opacity = 0.24,
}: VignetteProps) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg
        width="100%"
        height="100%"
        style={StyleSheet.absoluteFill}
        preserveAspectRatio="none"
      >
        <Defs>
          <RadialGradient
            id="vignette-gradient"
            cx="50%"
            cy="50%"
            r="80%"
            fx="50%"
            fy="50%"
          >
            <Stop offset="0%" stopColor="black" stopOpacity={0} />
            <Stop offset="100%" stopColor="black" stopOpacity={opacity} />
          </RadialGradient>
        </Defs>
        <Rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="url(#vignette-gradient)"
        />
      </Svg>
    </View>
  );
});
