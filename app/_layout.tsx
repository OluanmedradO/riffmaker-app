import { ToastProvider } from "@/components/AppToast";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AccessProvider } from "@/src/access/AccessProvider";
import { ErrorBoundary } from "@/src/components/ErrorBoundary";
import { reconcileStorage } from "@/src/utils/reconciler";
import { Stack } from "expo-router";
import { useEffect } from "react";
import { InteractionManager } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

export default function RootLayout() {
  useEffect(() => {
    // Run after first frame renders — does not block UI
    const task = InteractionManager.runAfterInteractions(() => {
      reconcileStorage();
    });
    return () => task.cancel();
  }, []);

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AccessProvider>
          <SafeAreaProvider>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <Stack>
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen
                  name="create"
                  options={{ presentation: "modal", title: "Novo riff" }}
                />
                <Stack.Screen
                  name="pro"
                  options={{
                    presentation: "fullScreenModal",
                    headerShown: false,
                    animation: "fade",
                  }}
                />
                <Stack.Screen
                  name="dev"
                  options={{
                    presentation: "fullScreenModal",
                    headerShown: false,
                    animation: "fade",
                  }}
                />
              </Stack>
              <ToastProvider />
            </GestureHandlerRootView>
          </SafeAreaProvider>
        </AccessProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
