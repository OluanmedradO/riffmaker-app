import { AccessProvider } from "@/src/access/AccessProvider";
import { AlertProvider } from "@/src/contexts/AlertContext";
import { migrateLegacyAsyncStorageIfNeeded } from "@/src/data/storage/migrateLegacy";
import { applyMigrations } from "@/src/data/storage/migrations";
import { I18nProvider } from "@/src/i18n";
import { preloadLatestUpdateAsync } from "@/src/lib/appUpdates";
import {
  initializeObservability,
  ObservabilityNavigationTracker,
  reportError,
} from "@/src/lib/observability";
import { ThemeProvider, useTheme } from "@/src/shared/theme/ThemeProvider";
import { ToastProvider } from "@/src/shared/ui/AppToast";
import { BackgroundAtmosphere } from "@/src/shared/ui/BackgroundAtmosphere";
import { CustomAlert } from "@/src/shared/ui/CustomAlert";
import { ErrorBoundary } from "@/src/shared/ui/ErrorBoundary";
import { GrainOverlay } from "@/src/shared/ui/GrainOverlay";
import { Vignette } from "@/src/shared/ui/Vignette";
import { reconcileStorage } from "@/src/utils/reconciler";
import {
  fadeScaleTransition,
  sheetTransition,
  slideTransition,
} from "@/src/utils/screenTransitions";
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_700Bold,
} from "@expo-google-fonts/dm-sans";
import {
  SpaceMono_400Regular,
  SpaceMono_700Bold,
} from "@expo-google-fonts/space-mono";
import {
  Syne_400Regular,
  Syne_600SemiBold,
  Syne_700Bold,
  Syne_800ExtraBold,
} from "@expo-google-fonts/syne";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, InteractionManager, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

const FONT_REGULAR = "DMSans_400Regular";
const FONT_MEDIUM = "DMSans_500Medium";
const FONT_BOLD = "DMSans_700Bold";


export default function RootLayout() {
  const [dbReady, setDbReady] = useState(false);
  const [fontsLoaded] = useFonts({
    [FONT_REGULAR]: DMSans_400Regular,
    [FONT_MEDIUM]: DMSans_500Medium,
    [FONT_BOLD]: DMSans_700Bold,
    "Space Mono": SpaceMono_400Regular,
    "Space Mono Bold": SpaceMono_700Bold,
    Syne: Syne_400Regular,
    "Syne SemiBold": Syne_600SemiBold,
    "Syne Bold": Syne_700Bold,
    "Syne ExtraBold": Syne_800ExtraBold,
  });

  useEffect(() => {
    initializeObservability();
  }, []);

  useEffect(() => {
    async function initDB() {
      try {
        await applyMigrations();
        await migrateLegacyAsyncStorageIfNeeded();
      } catch (e) {
        console.error("Migration error:", e);
        reportError(e, { scope: "db-migrations" });
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

  useEffect(() => {
    if (!dbReady || !fontsLoaded) {
      return;
    }

    void preloadLatestUpdateAsync();
  }, [dbReady, fontsLoaded]);

  if (!dbReady || !fontsLoaded) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#000",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ActivityIndicator size="large" color="#FF3B30" />
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AccessProvider>
          <SafeAreaProvider>
            <GestureHandlerRootView
              style={{ flex: 1, backgroundColor: "#0a0a0b" }}
            >
              <I18nProvider>
                <AlertProvider>
                  <RootNavigation />
                  <ObservabilityNavigationTracker />
                  <ToastProvider />
                  <CustomAlert />
                </AlertProvider>
              </I18nProvider>
              {/* Atmospheric layers rendered ABOVE screen content: pointer-events-none */}
              <BackgroundAtmosphere />
              <GrainOverlay opacity={0.15} />
              <Vignette opacity={0.24} />
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
    <Stack
      screenOptions={{ contentStyle: { backgroundColor: theme.background } }}
    >
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

      {/* Opcional: project/[id] tambÃ©m costuma ser slide */}
      <Stack.Screen
        name="project/[id]"
        options={{ ...slideTransition, title: "Projeto" }}
      />

      {/* Full-screen modals */}
      <Stack.Screen
        name="pro"
        options={{ ...fadeScaleTransition, headerShown: false }}
      />
      {__DEV__ && (
        <Stack.Screen
          name="dev"
          options={{ ...fadeScaleTransition, headerShown: false }}
        />
      )}
    </Stack>
  );
}

