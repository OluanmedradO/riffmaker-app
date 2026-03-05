import { useTheme } from "@/src/shared/theme/ThemeProvider";
import { useIsFocused } from "@react-navigation/native";
import React, { useEffect } from "react";
import { Text, ViewStyle } from "react-native";
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withTiming,
} from "react-native-reanimated";

type Props = {
  title: string;
  style?: ViewStyle;
  /** extra delay before animating, useful when this tab isn't the first */
  delayMs?: number;
  fontSize?: number;
  fontWeight?: "700" | "800" | "900";
};

export function AnimatedHeaderTitle({
  title,
  style,
  delayMs = 0,
  fontSize = 28,
  fontWeight = "900",
}: Props) {
  const theme = useTheme();
  const isFocused = useIsFocused();

  const y = useSharedValue(12);
  const o = useSharedValue(0);
  const s = useSharedValue(0.97);

  useEffect(() => {
    if (isFocused) {
      // Reset immediately
      y.value = 12;
      o.value = 0;
      s.value = 0.97;

      const cfg = {
        duration: 360,
        easing: Easing.out(Easing.cubic),
      };

      if (delayMs > 0) {
        o.value = withDelay(delayMs, withTiming(1, cfg));
        y.value = withDelay(delayMs, withTiming(0, cfg));
        s.value = withDelay(delayMs, withTiming(1, cfg));
      } else {
        o.value = withTiming(1, cfg);
        y.value = withTiming(0, cfg);
        s.value = withTiming(1, cfg);
      }
    }
  }, [isFocused]);

  const aStyle = useAnimatedStyle(() => ({
    opacity: o.value,
    transform: [{ translateY: y.value }, { scale: s.value }],
  }));

  return (
    <Animated.View style={[aStyle, style]}>
      <Text
        style={{
          color: theme.foreground,
          fontSize,
          fontWeight,
          letterSpacing: 0.1,
        }}
        numberOfLines={1}
      >
        {title}
      </Text>
    </Animated.View>
  );
}

