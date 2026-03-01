import { ToastProvider } from "@/components/AppToast";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AccessProvider } from "@/src/access/AccessProvider";
import { ErrorBoundary } from "@/src/components/ErrorBoundary";
import { I18nProvider } from "@/src/i18n";
import { reconcileStorage } from "@/src/utils/reconciler";
import { fadeScaleTransition, sheetTransition, slideTransition } from "@/src/utils/screenTransitions";
import { Stack } from "expo-router";
import { useEffect } from "react";
import { InteractionManager } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

export default function RootLayout() {
  useEffect(() => {
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
              <I18nProvider>
                <Stack>
                  <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

                  {/* ✅ MODAL (sheet) */}
                  <Stack.Screen
                    name="create"
                    options={{ ...sheetTransition, title: "Novo riff" }}
                  />

                  {/* ✅ PUSH (slide) */}
                  <Stack.Screen
                    name="riff/[id]"
                    options={{ ...slideTransition, title: "Editar riff" }}
                  />

                  {/* opcional: project/[id] também costuma ser slide */}
                  <Stack.Screen
                    name="project/[id]"
                    options={{ ...slideTransition, title: "Projeto" }}
                  />

                  {/* ✅ full screen modals */}
                  <Stack.Screen
                    name="pro"
                    options={{ ...fadeScaleTransition, headerShown: false }}
                  />
                  <Stack.Screen
                    name="dev"
                    options={{ ...fadeScaleTransition, headerShown: false }}
                  />
                </Stack>

                <ToastProvider />
              </I18nProvider>
            </GestureHandlerRootView>
          </SafeAreaProvider>
        </AccessProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}