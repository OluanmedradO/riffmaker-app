import { Easing } from "react-native-reanimated";

export const ANIMATION_FAST = 180;
export const ANIMATION_NORMAL = 220;
export const EASING_STANDARD = Easing.out(Easing.cubic);

export const lightTheme = {
  background: "#ffffff",
  foreground: "#030213",

  card: "#ffffff",
  cardForeground: "#030213",

  primary: "#030213",
  primaryForeground: "#ffffff",

  secondary: "#ececf0",
  secondaryForeground: "#030213",

  muted: "#ececf0",
  mutedForeground: "#717182",

  accent: "#b5334c", // Premium Deep Red (Less saturated)
  accentForeground: "#ffffff",
  
  danger: "#ef4444", // Destructive Red
  destructive: "#ef4444", // kept for compatibility

  accentBlue: "#3b82f6",
  accentGold: "#eab308",
  
  surface: "#f9fafb",
  surface2: "#f3f4f6",
  borderSubtle: "rgba(0,0,0,0.05)",

  border: "rgba(0,0,0,0.1)",
  input: "#f3f3f5",

  proPurple: "#6D28D9",
  proGlow: "rgba(109, 40, 217, 0.15)",
  proSurface: "#f5f3ff",
};

export const darkTheme = {
  background: "#0E0E0F",
  foreground: "#fafafa",

  card: "#151515",
  cardForeground: "#fafafa",

  primary: "#d45050", // Less saturated red
  primaryForeground: "#ffffff",

  secondary: "#1f1f1f",
  secondaryForeground: "#fafafa",

  muted: "#1f1f1f",
  mutedForeground: "#a3a3a3",

  accent: "#b74242", // Premium Dark Red (Less saturated)
  accentForeground: "#ffffff",

  danger: "#ef4444",
  destructive: "#ef4444",

  accentBlue: "#3b82f6",
  accentGold: "#eab308",

  surface: "#121212",
  surface2: "#1a1a1a",
  borderSubtle: "rgba(255,255,255,0.05)",

  border: "#262626",
  input: "#1f1f1f",

  proPurple: "#7C3AED",
  proGlow: "rgba(183, 66, 66, 0.15)", // updated proGlow to reflect new accent
  proSurface: "#141414",
};
