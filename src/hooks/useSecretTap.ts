import { useRef } from "react";

export function useSecretTap(
  onTrigger: () => void,
  taps = 5,
  windowMs = 1200,
) {
  const countRef = useRef(0);
  const lastRef = useRef(0);

  return () => {
    const now = Date.now();
    if (now - lastRef.current > windowMs) countRef.current = 0;
    lastRef.current = now;

    countRef.current += 1;
    if (countRef.current >= taps) {
      countRef.current = 0;
      onTrigger();
    }
  };
}
