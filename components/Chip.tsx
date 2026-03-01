import React, { useCallback, useRef } from "react";
import { Animated, Pressable, Text, View } from "react-native";
import { useTheme } from "./ThemeProvider";

type ChipVariant = "filled" | "outline" | "ghost" | "subtle";
type ChipSize = "sm" | "md" | "lg";

type ChipProps = {
  label: string;
  icon?: React.ReactNode;
  variant?: ChipVariant;
  size?: ChipSize;
  active?: boolean;
  activeColor?: string; // override color when active
  onPress?: () => void;
  disabled?: boolean;
};

/**
 * Standardized Chip component for RiffMaker.
 * Supports filled, outline, ghost and subtle variants.
 * Has a scale micro-animation on press.
 */
export function Chip({
  label,
  icon,
  variant = "subtle",
  size = "md",
  active = false,
  activeColor,
  onPress,
  disabled = false,
}: ChipProps) {
  const theme = useTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 0.94,
      useNativeDriver: true,
      tension: 200,
      friction: 8,
    }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 200,
      friction: 8,
    }).start();
  }, [scaleAnim]);

  const resolveColor = (): string => {
    if (activeColor && active) return activeColor;
    return active ? theme.primary : theme.mutedForeground;
  };

  const resolveBackground = (): string => {
    const color = activeColor && active ? activeColor : theme.primary;
    switch (variant) {
      case "filled":
        return active ? color : theme.input;
      case "outline":
        return "transparent";
      case "ghost":
        return "transparent";
      case "subtle":
      default:
        return active ? color + "20" : theme.input;
    }
  };

  const resolveBorder = (): string => {
    const color = activeColor && active ? activeColor : theme.primary;
    switch (variant) {
      case "filled":
        return active ? color : theme.border;
      case "outline":
        return active ? color : theme.border;
      case "ghost":
      case "subtle":
      default:
        return active ? color : "transparent";
    }
  };

  const sizes: Record<ChipSize, { px: number; py: number; fontSize: number; borderRadius: number }> = {
    sm: { px: 10, py: 5, fontSize: 11, borderRadius: 99 },
    md: { px: 12, py: 7, fontSize: 13, borderRadius: 99 },
    lg: { px: 16, py: 10, fontSize: 15, borderRadius: 12 },
  };

  const s = sizes[size];
  const color = resolveColor();

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          paddingHorizontal: s.px,
          paddingVertical: s.py,
          borderRadius: s.borderRadius,
          backgroundColor: resolveBackground(),
          borderWidth: 1,
          borderColor: resolveBorder(),
          opacity: disabled ? 0.45 : 1,
        }}
      >
        {icon && <View style={{ opacity: 1 }}>{icon}</View>}
        <Text style={{ fontSize: s.fontSize, fontWeight: active ? "700" : "500", color }}>
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}
