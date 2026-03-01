import { useTheme } from "@/components/ThemeProvider";
import { Check, CircleNotch, WarningCircle } from "phosphor-react-native";
import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";

export type SaveState = "idle" | "saving" | "saved" | "error";

interface SaveStatusIndicatorProps {
  status: SaveState;
}

export function SaveStatusIndicator({ status }: SaveStatusIndicatorProps) {
  const theme = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (status !== "idle") {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }

    if (status === "saving") {
      rotateAnim.setValue(0);
      Animated.loop(
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        })
      ).start();
    } else {
      rotateAnim.stopAnimation();
    }
  }, [status, fadeAnim, rotateAnim]);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const getStatusContent = () => {
    switch (status) {
      case "saving":
        return (
          <View style={[styles.container, { backgroundColor: theme.accentGold + "20" }]}>
            <Animated.View style={{ transform: [{ rotate: spin }] }}>
              <CircleNotch size={14} color={theme.accentGold} weight="bold" />
            </Animated.View>
            <Text style={[styles.text, { color: theme.accentGold }]}>Salvando...</Text>
          </View>
        );
      case "saved":
        return (
          <View style={[styles.container, { backgroundColor: "#10b98120" }]}>
            <Check size={14} color="#10b981" weight="bold" />
            <Text style={[styles.text, { color: "#10b981" }]}>Salvo</Text>
          </View>
        );
      case "error":
        return (
          <View style={[styles.container, { backgroundColor: theme.danger + "20" }]}>
            <WarningCircle size={14} color={theme.danger} weight="bold" />
            <Text style={[styles.text, { color: theme.danger }]}>Erro ao salvar</Text>
          </View>
        );
      default:
        return null;
    }
  };

  if (status === "idle") return null;

  return (
    <Animated.View style={{ opacity: fadeAnim, marginHorizontal: 8 }}>
      {getStatusContent()}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  text: {
    fontSize: 12,
    fontWeight: "600",
  },
});
