import { Easing } from "react-native-reanimated";

export const ANIMATION_FAST = 180;
export const ANIMATION_NORMAL = 220;
export const EASING_STANDARD = Easing.out(Easing.cubic);

export const lightTheme = {
  background: "#ffffff",
  foreground: "#030213",

  card: "#ffffff",
  cardForeground: "#030213",

  primary: "#E64D4D", // Punk Red
  primaryForeground: "#ffffff",

  secondary: "#ececf0",
  secondaryForeground: "#030213",

  muted: "#ececf0",
  mutedForeground: "#A3A3A3",

  accent: "#C83A3A", // Punk Dark Red
  accentForeground: "#ffffff",
  
  danger: "#ef4444",
  destructive: "#ef4444",
  destructiveForeground: "#ffffff",

  accentBlue: "#3B82F6",
  accentGold: "#EAB308",
  
  surface: "#ffffff",
  surfaceElevated: "#f3f3f5",
  surfaceActive: "#eaeaef",
  borderSubtle: "rgba(0,0,0,0.05)",

  border: "rgba(0,0,0,0.1)",
  input: "#f3f3f5",

  proPurple: "#A855F7",
  proGlow: "rgba(230, 77, 77, 0.15)",
  proSurface: "#f5f3ff",
  isDark: false,
  fonts: {
    heading: "SpaceGrotesk_700Bold",
    body: "SpaceGrotesk_400Regular",
    medium: "SpaceGrotesk_500Medium",
    bold: "SpaceGrotesk_700Bold",
  },
};

export const darkTheme = {
  // Base
  background: "#000000",
  foreground: "#FAFAFA",

  // Surfaces
  card: "#111111",
  cardForeground: "#FAFAFA",
  surface: "#111111",
  surfaceElevated: "#1A1A1A",
  surfaceActive: "#222222", 
  surfaceForeground: "#FAFAFA",

  // Brand / Accents
  primary: "#FF3B3B", // Red Principal
  primaryForeground: "#FFFFFF",
  secondary: "#2A2A2A",
  secondaryForeground: "#FAFAFA",
  accent: "#FF3B3B",
  accentForeground: "#FFFFFF",
  accentBlue: "#3B82F6",
  accentGold: "#EAB308",

  // States
  danger: "#FF3B3B",
  destructive: "#FF3B3B",
  destructiveForeground: "#FFFFFF",
  success: "#4ade80",
  successForeground: "#000000",

  // Muted & Borders
  muted: "#1A1A1A",
  mutedForeground: "#9A9A9A",
  border: "#1F1F1F",
  borderSubtle: "rgba(255,255,255,0.05)",
  input: "#1A1A1A",

  // Pro / Premium
  proPurple: "#FF3B3B",
  proGlow: "rgba(255, 59, 59, 0.15)",
  proSurface: "#1A1A1A",
  isDark: true,
  fonts: {
    heading: "SpaceGrotesk_700Bold",
    body: "SpaceGrotesk_400Regular",
    medium: "SpaceGrotesk_500Medium",
    bold: "SpaceGrotesk_700Bold",
  },
};

export const KEY_COLORS: Record<string, string> = {
  C: "#3b82f6",     // Blue
  "C#": "#06b6d4",  // Cyan
  D: "#10b981",     // Emerald
  "D#": "#84cc16",  // Lime
  E: "#eab308",     // Yellow
  F: "#f59e0b",     // Amber
  "F#": "#f97316",  // Orange
  G: "#ef4444",     // Red
  "G#": "#f43f5e",  // Rose
  A: "#d946ef",     // Fuchsia
  "A#": "#a855f7",  // Purple
  B: "#8b5cf6",     // Violet
  
  // Minors
  Cm: "#1d4ed8",    // Dark Blue
  "C#m": "#0891b2", // Dark Cyan
  Dm: "#047857",    // Dark Emerald
  "D#m": "#4d7c0f", // Dark Lime
  Em: "#a16207",    // Dark Yellow
  Fm: "#b45309",    // Dark Amber
  "F#m": "#c2410c", // Dark Orange
  Gm: "#b91c1c",    // Dark Red
  "G#m": "#be123c", // Dark Rose
  Am: "#a21caf",    // Dark Fuchsia
  "A#m": "#7e22ce", // Dark Purple
  Bm: "#6d28d9"     // Dark Violet
};

