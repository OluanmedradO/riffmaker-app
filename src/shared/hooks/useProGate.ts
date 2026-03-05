import { useAccess } from "@/src/access/AccessProvider";
import type { FeatureKey } from "@/src/domain/types/access";
import { useRouter } from "expo-router";
import { useCallback } from "react";

/**
 * Returns a gate function that redirects to the PRO screen if the user
 * does not have access to a given feature.
 *
 * Usage:
 *   const requirePro = useProGate();
 *   requirePro("loopMode"); // returns true if blocked
 */
export function useProGate() {
  const router = useRouter();
  const { can } = useAccess();

  const requirePro = useCallback(
    (feature?: FeatureKey, message?: string) => {
      // If a specific feature is given, check it
      if (feature && can(feature)) return false;

      // If no feature given, check general PRO status
      if (!feature && can("advancedExport")) return false;

      router.push({
        pathname: "/pro",
        params: message ? { message } : undefined
      });
      return true; // blocked
    },
    [router, can],
  );

  return requirePro;
}

