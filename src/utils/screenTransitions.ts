/**
 * screenTransitions.ts
 * 
 * Transition presets para usar no Stack.Screen options do Expo Router.
 * Inspirado no feel de apps to-do premium (Things 3, Todoist).
 * 
 * Usage:
 *   import { sheetTransition, fadeTransition, slideTransition } from "@/src/utils/screenTransitions";
 * 
 *   <Stack.Screen options={{ ...sheetTransition, title: "Nova Ideia" }} />
 */

import { TransitionPresets } from "@react-navigation/stack";

// ---------------------------------------------------------------------------
// Sheet — sobe de baixo como modal sheet (create, edit, pro)
// Igual ao Things 3 / Reminders do iOS
// ---------------------------------------------------------------------------
export const sheetTransition = {
  ...TransitionPresets.ModalPresentationIOS,
  gestureEnabled: true,
  gestureDirection: "vertical" as const,
  cardOverlayEnabled: true,
  presentation: "modal" as const,
};

// ---------------------------------------------------------------------------
// Slide — push clássico com spring (detail views, project)
// Mais rápido e com mais bounce que o padrão do React Navigation
// ---------------------------------------------------------------------------
export const slideTransition = {
  ...TransitionPresets.SlideFromRightIOS,
  gestureEnabled: true,
  gestureDirection: "horizontal" as const,
};

// ---------------------------------------------------------------------------
// Fade scale — entrada suave para modais de conteúdo (pro.tsx, dev.tsx)
// ---------------------------------------------------------------------------
export const fadeScaleTransition = {
  gestureEnabled: true,
  transitionSpec: {
    open: {
      animation: "timing" as const,
      config: { duration: 260 },
    },
    close: {
      animation: "timing" as const,
      config: { duration: 200 },
    },
  },
  cardStyleInterpolator: ({
    current,
  }: {
    current: { progress: { interpolate: Function } };
  }) => {
    const opacity = current.progress.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
    });
    const scale = current.progress.interpolate({
      inputRange: [0, 1],
      outputRange: [0.94, 1],
    });
    return {
      cardStyle: {
        opacity,
        transform: [{ scale }],
      },
    };
  },
};