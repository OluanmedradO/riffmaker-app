import React from "react";
import { StyleSheet, View } from "react-native";
import { useTheme } from '@/src/shared/theme/ThemeProvider';

export function Playhead() {
  const theme = useTheme();

  return (
    <View style={styles.container} pointerEvents="none">
      <View style={[styles.glow, { backgroundColor: theme.primary }]} />
      <View style={[styles.triangleDown, { borderTopColor: theme.primary }]} />
      <View style={[styles.line, { backgroundColor: theme.primary }]} />
      <View style={[styles.triangleUp, { borderBottomColor: theme.primary }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  line: {
    width: 2.5,
    height: "100%",
    borderRadius: 1.5,
    zIndex: 2,
  },
  glow: {
    ...StyleSheet.absoluteFillObject,
    width: 6,
    height: "100%",
    opacity: 0.35,
    shadowColor: "#FF3B3B",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 6,
  },
  triangleDown: {
    width: 0,
    height: 0,
    backgroundColor: "transparent",
    borderStyle: "solid",
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderBottomWidth: 0,
    borderTopWidth: 8,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    marginBottom: -1,
    zIndex: 3,
  },
  triangleUp: {
    width: 0,
    height: 0,
    backgroundColor: "transparent",
    borderStyle: "solid",
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 0,
    borderBottomWidth: 8,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    marginTop: -1,
    zIndex: 3,
  },
});

