/**
 * AppToast - Standardized in-app notification system
 *
 * Usage:
 *   import { showToast } from "@/components/AppToast";
 *   showToast({ type: "error", message: "Não foi possível salvar." });
 *   showToast({ type: "success", message: "Ideia salva!" });
 *
 * Mount <ToastProvider /> once at the app root (app/_layout.tsx).
 */

import { CheckCircle, Info, Warning, X, XCircle } from "phosphor-react-native";
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type ToastType = "success" | "error" | "warning" | "info";

interface ToastConfig {
  type: ToastType;
  title?: string;
  message: string;
  duration?: number; // ms, default 3500
}

type ToastEntry = ToastConfig & { id: number };

// ─── Imperative API ─────────────────────────────────────────────────────────

let _showToast: ((config: ToastConfig) => void) | null = null;

export function showToast(config: ToastConfig) {
  if (_showToast) {
    _showToast(config);
  } else {
    // Fallback when provider isn't mounted yet
    console.warn("[Toast]", config.type, config.message);
  }
}

// ─── Single toast item ───────────────────────────────────────────────────────

const COLORS: Record<ToastType, { bg: string; border: string; icon: string }> = {
  success: { bg: "#0f2e1a", border: "#22c55e", icon: "#22c55e" },
  error:   { bg: "#2e0f0f", border: "#ef4444", icon: "#ef4444" },
  warning: { bg: "#2e1f0a", border: "#eab308", icon: "#eab308" },
  info:    { bg: "#0f1e2e", border: "#3b82f6", icon: "#3b82f6" },
};

function ToastIcon({ type, size = 20 }: { type: ToastType; size?: number }) {
  const color = COLORS[type].icon;
  switch (type) {
    case "success": return <CheckCircle size={size} color={color} weight="fill" />;
    case "error":   return <XCircle     size={size} color={color} weight="fill" />;
    case "warning": return <Warning     size={size} color={color} weight="fill" />;
    case "info":    return <Info        size={size} color={color} weight="fill" />;
  }
}

function ToastItem({ item, onDismiss }: { item: ToastEntry; onDismiss: (id: number) => void }) {
  const translateY = useRef(new Animated.Value(80)).current;
  const opacity    = useRef(new Animated.Value(0)).current;
  const colors     = COLORS[item.type];

  useEffect(() => {
    // Enter
    Animated.parallel([
      Animated.timing(translateY, { toValue: 0, duration: 280, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(opacity,    { toValue: 1, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();

    // Auto-dismiss
    const timer = setTimeout(() => dismiss(), item.duration ?? 3500);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function dismiss() {
    Animated.parallel([
      Animated.timing(translateY, { toValue: 80, duration: 220, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
      Animated.timing(opacity,    { toValue: 0,  duration: 180, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
    ]).start(() => onDismiss(item.id));
  }

  return (
    <Animated.View
      style={[
        styles.toast,
        {
          backgroundColor: colors.bg,
          borderColor: colors.border,
          transform: [{ translateY }],
          opacity,
        },
      ]}
    >
      <ToastIcon type={item.type} />
      <View style={styles.textArea}>
        {item.title && <Text style={[styles.title, { color: colors.icon }]}>{item.title}</Text>}
        <Text style={styles.message} numberOfLines={3}>{item.message}</Text>
      </View>
      <Pressable onPress={dismiss} hitSlop={10} style={styles.close}>
        <X size={14} color="#ffffff80" weight="bold" />
      </Pressable>
    </Animated.View>
  );
}

// ─── Provider ────────────────────────────────────────────────────────────────

let _counter = 0;

export function ToastProvider() {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    _showToast = (config) => {
      const id = ++_counter;
      setToasts(prev => [...prev.slice(-2), { ...config, id }]); // max 3 at a time
    };
    return () => { _showToast = null; };
  }, []);

  const dismiss = (id: number) =>
    setToasts(prev => prev.filter(t => t.id !== id));

  if (toasts.length === 0) return null;

  return (
    <View
      style={[styles.container, { bottom: insets.bottom + 72 }]}
      pointerEvents="box-none"
    >
      {toasts.map(item => (
        <ToastItem key={item.id} item={item} onDismiss={dismiss} />
      ))}
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 9999,
    gap: 8,
  },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
    shadowColor: "#000",
    shadowOpacity: 0.4,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  textArea: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  message: {
    fontSize: 13,
    color: "#e5e5e5",
    lineHeight: 18,
  },
  close: {
    padding: 4,
  },
});
