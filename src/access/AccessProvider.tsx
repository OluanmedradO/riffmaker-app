import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";
import type { AccessState, FeatureKey } from "@/src/domain/types/access";
import { effectivePlan, hasAccess } from "@/src/access/hasAccess";
import { loadAccess, saveAccess } from "@/src/access/storage";

type AccessContextValue = {
  access: AccessState;
  setAccess: (next: AccessState) => void;
  can: (feature: FeatureKey) => boolean;
  planEffective: "free" | "pro";
};

const AccessContext = createContext<AccessContextValue | null>(null);

export function AccessProvider({ children }: { children: React.ReactNode }) {
  const [access, setAccessState] = useState<AccessState>({
    role: "user",
    plan: "free",
  });
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    loadAccess().then((loaded) => {
      setAccessState(loaded);
      setHydrated(true);
    });
  }, []);

  const setAccess = useCallback((next: AccessState) => {
    setAccessState(next);
    void saveAccess(next);
  }, []);

  const value = useMemo<AccessContextValue>(
    () => ({
      access,
      setAccess,
      can: (feature: FeatureKey) => hasAccess(feature, access),
      planEffective: effectivePlan(access),
    }),
    [access, setAccess],
  );

  if (!hydrated) return null;

  return (
    <AccessContext.Provider value={value}>{children}</AccessContext.Provider>
  );
}

export function useAccess() {
  const ctx = useContext(AccessContext);
  if (!ctx) throw new Error("useAccess must be used within AccessProvider");
  return ctx;
}

