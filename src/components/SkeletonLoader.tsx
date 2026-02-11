import { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { useTheme } from "@/components/ThemeProvider";

interface SkeletonLoaderProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}

export function SkeletonLoader({
  width = "100%",
  height = 20,
  borderRadius = 4,
  style,
}: SkeletonLoaderProps) {
  const theme = useTheme();
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    );
    animation.start();

    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius,
          backgroundColor: theme.muted,
          opacity,
        },
        style,
      ]}
    />
  );
}

export function RiffCardSkeleton() {
  return (
    <View style={styles.card}>
      <SkeletonLoader height={24} width="60%" style={{ marginBottom: 8 }} />
      <SkeletonLoader height={16} width="40%" style={{ marginBottom: 4 }} />
      <SkeletonLoader height={14} width="30%" />
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {},
  card: {
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
  },
});
