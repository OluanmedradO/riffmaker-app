import type { ReactNode } from "react";
import { View, ViewProps } from "react-native";

interface ScreenProps extends ViewProps {
  children: ReactNode;
  background?: string;
}

export function Screen({
  children,
  background,
  style,
  ...rest
}: ScreenProps) {
  return (
    <View
      style={[{ flex: 1, alignItems: "center", backgroundColor: background }, style]}
      {...rest}
    >
      <View style={{ width: "100%", maxWidth: 420, padding: 20, flex: 1 }}>
        {children}
      </View>
    </View>
  );
}
