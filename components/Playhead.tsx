import React from "react";
import { StyleSheet, View } from "react-native";
import { useTheme } from "./ThemeProvider";

export function Playhead() {
  const theme = useTheme();

  return (
    <View style={styles.container} pointerEvents="none">
      <View style={[styles.line, { backgroundColor: theme.accentForeground }]} />
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
    width: 2,
    height: "100%",
    borderRadius: 1,
  },
});
