import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/components/ThemeProvider";

interface LoadingSpinnerProps {
  message?: string;
  size?: "small" | "large";
}

export function LoadingSpinner({
  message = "Carregando...",
  size = "large",
}: LoadingSpinnerProps) {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <ActivityIndicator size={size} color={theme.primary} />
      {message && (
        <Text style={[styles.message, { color: theme.mutedForeground }]}>
          {message}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  message: {
    marginTop: 12,
    fontSize: 14,
  },
});
