import React, { useEffect, useRef } from "react";
import { Animated as RNAnimated, StyleSheet, View } from "react-native";

export function CountdownOverlay({ value }: { value: number }) {
  const scale = useRef(new RNAnimated.Value(0.4)).current;
  const opacity = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    scale.setValue(0.4);
    opacity.setValue(0);
    RNAnimated.parallel([
      RNAnimated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        damping: 10,
        stiffness: 180,
      }),
      RNAnimated.timing(opacity, {
        toValue: 1,
        duration: 120,
        useNativeDriver: true,
      }),
    ]).start();
  }, [value]);

  return (
    <View style={styles.countdownOverlay}>
      <RNAnimated.Text style={[styles.countdownText, { transform: [{ scale }], opacity }]}>
        {value}
      </RNAnimated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  countdownOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.75)",
    zIndex: 50,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
  },
  countdownText: {
    fontSize: 80,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: -2,
  },
});
