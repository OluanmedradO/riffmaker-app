import type { ReactNode } from "react";
import { View } from "react-native";

export function Screen({
  children,
  background,
}: {
  children: ReactNode;
  background?: string;
}) {
  return (
    <View
      style={{ flex: 1, alignItems: "center", backgroundColor: background }}
    >
      <View style={{ width: "100%", maxWidth: 420, padding: 20, flex: 1 }}>
        {children}
      </View>
    </View>
  );
}
