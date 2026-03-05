import type { AccessState, FeatureKey } from "@/src/domain/types/access";
import { PRO_FEATURES } from "@/src/access/features";

export function effectivePlan(access: AccessState) {
  if (access.role === "admin") return access.simulatePlan ?? "pro";
  return access.plan;
}

export function hasAccess(feature: FeatureKey, access: AccessState): boolean {
  // Admin always passes unless simulating
  if (access.role === "admin" && access.simulatePlan === undefined) return true;

  if (PRO_FEATURES.has(feature)) {
    return effectivePlan(access) === "pro";
  }

  return true;
}

