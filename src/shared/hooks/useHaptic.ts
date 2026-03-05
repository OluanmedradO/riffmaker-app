import * as Haptics from "expo-haptics";
import { useCallback } from "react";

export type HapticFeedbackType =
  | "light"
  | "medium"
  | "heavy"
  | "success"
  | "warning"
  | "error";

export function useHaptic() {
  const triggerHaptic = useCallback((type: HapticFeedbackType = "light") => {
    try {
      switch (type) {
        case "light":
        case "medium":
        case "heavy":
          // Haptics removed to reduce excessive vibration based on user feedback.
          // Only essential warnings and errors will vibrate.
          break;
        case "success":
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          break;
        case "warning":
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          break;
        case "error":
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          break;
      }
    } catch (error) {
      // Haptic feedback not supported on this device
      console.debug("Haptic feedback not available:", error);
    }
  }, []);

  return { triggerHaptic };
}

