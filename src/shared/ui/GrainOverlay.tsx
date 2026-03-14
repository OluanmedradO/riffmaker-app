import React, { memo } from "react";
import { Image, StyleSheet, View } from "react-native";

interface GrainOverlayProps {
  /** Overall opacity of the grain layer. Default: 0.05 (5%) */
  opacity?: number;
}

/**
 * GrainOverlay
 * Uses a pre-generated tileable noise PNG (assets/images/grain.png) as a
 * low-opacity image covering the screen. Works on both Android and iOS native.
 *
 * The PNG was generated with fractalNoise characteristics (XorShift RNG,
 * per-pixel gray + alpha variation) for an analogue film-grain look.
 *
 * Place ONCE at the root, pointer-events-none.
 */
export const GrainOverlay = memo(function GrainOverlay({
  opacity = 0.05,
}: GrainOverlayProps) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Image
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        source={require("../../../assets/images/grain.png")}
        style={[StyleSheet.absoluteFill, { opacity }]}
        resizeMode="stretch"
      />
    </View>
  );
});
