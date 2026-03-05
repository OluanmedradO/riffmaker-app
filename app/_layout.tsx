import { ToastProvider } from "@/src/shared/ui/AppToast";
import { ThemeProvider, useTheme } from "@/src/shared/theme/ThemeProvider";
import { CustomAlert } from "@/src/shared/ui/CustomAlert";
import { ErrorBoundary } from "@/src/shared/ui/ErrorBoundary";
import { AccessProvider } from "@/src/access/AccessProvider";
import { AlertProvider } from "@/src/contexts/AlertContext";
import { I18nProvider } from "@/src/i18n";
import { migrateLegacyAsyncStorageIfNeeded } from '@/src/data/storage/migrateLegacy';
import { applyMigrations } from '@/src/data/storage/migrations';
import { reconcileStorage } from "@/src/utils/reconciler";
import { fadeScaleTransition, sheetTransition, slideTransition } from "@/src/utils/screenTransitions";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, InteractionManager, StyleSheet, Text, TextInput, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

const FONT_REGULAR = "SpaceGrotesk_400Regular";
const FONT_MEDIUM = "SpaceGrotesk_500Medium";
const FONT_BOLD = "SpaceGrotesk_700Bold";

function resolveFontByWeight(style: unknown): string {
  const flattened = StyleSheet.flatten(style) as { fontFamily?: string; fontWeight?: string | number } | undefined;
  if (flattened?.fontFamily) return flattened.fontFamily;

  const weightRaw = flattened?.fontWeight;
  const weight =
    typeof weightRaw === "number"
      ? weightRaw
      : typeof weightRaw === "string"
        ? parseInt(weightRaw, 10)
        : NaN;

  if (weightRaw === "bold" || (!Number.isNaN(weight) && weight >= 700)) return FONT_BOLD;
  if (!Number.isNaN(weight) && weight >= 500) return FONT_MEDIUM;
  return FONT_REGULAR;
}

function withGlobalFont(style: unknown) {
  return [{ fontFamily: resolveFontByWeight(style) }, style];
}

const ReactPatched = React as typeof React & { __riffTypographyPatched?: boolean };

if (!ReactPatched.__riffTypographyPatched) {
  ReactPatched.__riffTypographyPatched = true;
  const createElementOriginal = React.createElement;

  React.createElement = ((type: any, props: any, ...children: any[]) => {
    if (type === Text || type === TextInput) {
      return createElementOriginal(type, { ...props, style: withGlobalFont(props?.style) }, ...children);
    }
    return createElementOriginal(type, props, ...children);
  }) as typeof React.createElement;
}

export default function RootLayout() {
  const [dbReady, setDbReady] = useState(false);
  const [fontsLoaded] = useFonts({
    [FONT_REGULAR]: require("../assets/fonts/SpaceGrotesk-Regular.ttf"),
    [FONT_MEDIUM]: require("../assets/fonts/SpaceGrotesk-Medium.ttf"),
    [FONT_BOLD]: require("../assets/fonts/SpaceGrotesk-Bold.ttf"),
  });

  useEffect(() => {
    async function initDB() {
      try {
        await applyMigrations();
        await migrateLegacyAsyncStorageIfNeeded();
      } catch (e) {
        console.error("Migration error:", e);
      } finally {
        setDbReady(true);
      }
    }
    initDB();

    const task = InteractionManager.runAfterInteractions(() => {
      reconcileStorage();
    });
    return () => task.cancel();
  }, []);

  if (!dbReady || !fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: "#000", justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#FF3B30" />
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AccessProvider>
          <SafeAreaProvider>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <I18nProvider>
                <AlertProvider>
                  <RootNavigation />
                  <ToastProvider />
                  <CustomAlert />
                </AlertProvider>
              </I18nProvider>
            </GestureHandlerRootView>
          </SafeAreaProvider>
        </AccessProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

function RootNavigation() {
  const theme = useTheme();

  return (
    <Stack screenOptions={{ contentStyle: { backgroundColor: theme.background } }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

      {/* Modal (sheet) */}
      <Stack.Screen
        name="create"
        options={{ ...sheetTransition, title: "Novo riff" }}
      />

      {/* Push (slide) */}
      <Stack.Screen
        name="riff/[id]"
        options={{ ...slideTransition, title: "Editar riff" }}
      />

      {/* Opcional: project/[id] também costuma ser slide */}
      <Stack.Screen
        name="project/[id]"
        options={{ ...slideTransition, title: "Projeto" }}
      />

      {/* Full-screen modals */}
      <Stack.Screen
        name="pro"
        options={{ ...fadeScaleTransition, headerShown: false }}
      />
      <Stack.Screen
        name="dev"
        options={{ ...fadeScaleTransition, headerShown: false }}
      />
    </Stack>
  );
}
