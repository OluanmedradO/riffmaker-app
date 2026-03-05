import React, { useEffect, useState } from "react";
import { AppState, AppStateStatus } from "react-native";

export function ActiveGate({
  children,
  fallback = null,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const [active, setActive] = useState(AppState.currentState === "active");

  useEffect(() => {
    const sub = AppState.addEventListener("change", (s: AppStateStatus) => {
      setActive(s === "active");
    });
    return () => sub.remove();
  }, []);

  if (!active) return <>{fallback}</>;
  return <>{children}</>;
}
