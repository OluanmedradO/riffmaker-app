import { ThemeProvider } from "@/components/ThemeProvider";
import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";

export default function RootLayout() {
  return (
    <ThemeProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="create"
            options={{ presentation: "modal", title: "Novo riff" }}
          />
        </Stack>
      </GestureHandlerRootView>
    </ThemeProvider>
  );
}
