import type { ReactNode } from "react";
import { createContext, useContext } from "react";
import { useColorScheme } from "react-native";
import { darkTheme, lightTheme } from "./Theme";

const ThemeContext = createContext(lightTheme);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const scheme = useColorScheme();
  const theme = scheme === "dark" ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
