import { AnimatedHeaderTitle } from "@/src/shared/ui/AnimatedHeaderTitle";
import { useTheme } from "@/src/shared/theme/ThemeProvider";
import { CaretLeft } from "phosphor-react-native";
import React from "react";
import { Pressable, Text, View, ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = {
  title: string;
  subtitle?: string | React.ReactNode;
  rightSlot?: React.ReactNode;
  belowSlot?: React.ReactNode;
  delayMs?: number;
  style?: ViewStyle;
  withSafeArea?: boolean;
  onBack?: () => void;
};

export function ScreenHeader({
  title,
  subtitle,
  rightSlot,
  belowSlot,
  delayMs = 0,
  style,
  withSafeArea = true,
  onBack,
}: Props) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();

  return (
    <View style={[{ paddingTop: withSafeArea ? insets.top + yOffset : yOffset, paddingHorizontal: 20, paddingBottom: 16 }, style]}>
      {onBack && (
        <Pressable 
          onPress={onBack} 
          style={{ marginBottom: 12, marginLeft: -4 }}
          hitSlop={15}
        >
          <CaretLeft size={24} color={theme.foreground} weight="bold" />
        </Pressable>
      )}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginBottom: belowSlot ? 16 : 0 }}>
        <View style={{ flex: 1 }}>
          <AnimatedHeaderTitle title={title} delayMs={delayMs} />
          {subtitle && (
            <View style={{ marginTop: 4 }}>
              {typeof subtitle === "string" ? (
                <Text style={{ fontSize: 13, color: theme.mutedForeground }}>{subtitle}</Text>
              ) : (
                subtitle
              )}
            </View>
          )}
        </View>
        {rightSlot && <View style={{ marginLeft: 16 }}>{rightSlot}</View>}
      </View>
      {belowSlot}
    </View>
  );
}

const yOffset = 16;

