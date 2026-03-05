import { useCallback, useEffect, useRef, useState } from "react";

/**
 * useTapBPM
 * 
 * A robust tap-tempo hook for React Native.
 * - Allows tapping to determine a stable BPM
 * - Averages the last N taps
 * - Auto-resets after an inactivity timeout
 */
export function useTapBPM(initialBpm: number | null = null, options = { maxTaps: 8, timeoutMs: 2000 }) {
  const [bpm, setBpm] = useState<number | null>(initialBpm);
  const [isTapping, setIsTapping] = useState(false);
  
  const tapTimesRef = useRef<number[]>([]);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const tap = useCallback(() => {
    const now = Date.now();
    const taps = tapTimesRef.current;
    
    // Add new tap
    taps.push(now);
    
    // Keep only the last N taps
    if (taps.length > options.maxTaps) {
      taps.shift();
    }
    
    setIsTapping(true);

    // Calculate BPM if we have at least 2 taps
    if (taps.length >= 2) {
      const intervals = [];
      for (let i = 1; i < taps.length; i++) {
        intervals.push(taps[i] - taps[i - 1]);
      }
      
      // Calculate average interval
      const avgInterval = intervals.reduce((sum, val) => sum + val, 0) / intervals.length;
      
      // Convert to BPM: 60,000 ms per minute
      const calculatedBpm = Math.round(60000 / avgInterval);
      
      // Sanity check, ignore crazy fast or slow taps (>300, <30)
      if (calculatedBpm >= 30 && calculatedBpm <= 300) {
        setBpm(calculatedBpm);
      }
    }

    // Reset inactivity timer
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      // Auto-reset the tap array after timeout (e.g. 2s)
      tapTimesRef.current = [];
      setIsTapping(false);
    }, options.timeoutMs);

  }, [options.maxTaps, options.timeoutMs]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const reset = useCallback(() => {
    tapTimesRef.current = [];
    setBpm(null);
    setIsTapping(false);
  }, []);

  return {
    bpm,
    setBpm,         // Allow manual manual override
    tap,
    reset,
    isTapping,      // Useful for UI feedback
    tapCount: tapTimesRef.current.length
  };
}

