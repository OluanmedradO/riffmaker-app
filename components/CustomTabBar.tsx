import { useHaptic } from "@/src/shared/hooks/useHaptic";
import { useTranslation } from "@/src/i18n";
import { getRiffs } from "@/src/data/storage/riffs";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useFocusEffect, useRouter } from "expo-router";
import { ArrowsLeftRight, FolderSimple, Gear, Waveform } from "phosphor-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  DeviceEventEmitter,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { QuickRecordButton } from "@/src/features/recorder/components/QuickRecordButton";
import { useTheme } from "@/src/shared/theme/ThemeProvider";

const ICONS: Record<string, any> = {
  index: Waveform,
  projects: FolderSimple,
  compare: ArrowsLeftRight,
  settings: Gear,
};

const LABELS: Record<string, string> = {
  index: "Ideias",
  projects: "Projetos",
  compare: "Comparar",
  settings: "Config",
};

export function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { triggerHaptic } = useHaptic();

  const [hasIdeasToday, setHasIdeasToday] = useState(true);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const [isSelectionMode, setSelectionMode] = useState(false);

  const [isRecordingGlobal, setIsRecordingGlobal] = useState(false);
  const redGlowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const showSub = Keyboard.addListener(Platform.OS === 'ios' ? "keyboardWillShow" : "keyboardDidShow", () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener(Platform.OS === 'ios' ? "keyboardWillHide" : "keyboardDidHide", () => setKeyboardVisible(false));
    const selSub = DeviceEventEmitter.addListener("selectionModeChange", (mode) => setSelectionMode(mode));

    const recSub = DeviceEventEmitter.addListener("recording_state_change", (isRec) => {
      setIsRecordingGlobal(isRec);
      Animated.timing(redGlowAnim, {
        toValue: isRec ? 1 : 0,
        duration: 400,
        useNativeDriver: true,
      }).start();
    });

    return () => {
      showSub.remove();
      hideSub.remove();
      selSub.remove();
      recSub.remove();
    };
  }, [redGlowAnim]);

  useFocusEffect(
    useCallback(() => {
      async function checkIdeas() {
        try {
          const riffs = await getRiffs();
          const today = new Date().toDateString();
          const hadIdeaToday = riffs.some(r => new Date(r.createdAt).toDateString() === today);
          setHasIdeasToday(hadIdeaToday);
        } catch {
          setHasIdeasToday(true);
        }
      }
      checkIdeas();
    }, [])
  );

  useEffect(() => {
    if (!hasIdeasToday) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.08, duration: 1500, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
        ])
      ).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
          Animated.timing(glowAnim, { toValue: 0, duration: 1500, useNativeDriver: true }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
      glowAnim.setValue(0); // Optional subtle glow can stay on, but we'll turn it off entirely
    }
  }, [hasIdeasToday, pulseAnim, glowAnim]);

  if (isKeyboardVisible) return null;

  const handleRecordPress = () => {
    triggerHaptic("medium");
    Animated.sequence([
      Animated.timing(pulseAnim, { toValue: 1.2, duration: 100, useNativeDriver: true }),
      Animated.timing(pulseAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start(() => {
      router.push("/create");
    });
  };

  const HIDDEN_TABS = ["settings", "compare"];

  const tabs = state.routes
    .filter((route) => !HIDDEN_TABS.includes(route.name))
    .map((route) => {
      const isFocused = state.routes.indexOf(route) === state.index;
      const Icon = ICONS[route.name] || Waveform;
      const label =
        route.name === "index" ? t("tab.ideas") :
          route.name === "projects" ? t("projects.title") :
            route.name;

      return (
        <Pressable
          key={route.key}
          onPress={() => {
            const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
              triggerHaptic("light");
            }
          }}
          style={styles.tabItem}
        >
          <Animated.View style={{ alignItems: "center", gap: 6, opacity: redGlowAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0.2] }) }}>
            <Icon
              weight={isFocused ? "fill" : "regular"}
              size={24}
              color={isFocused ? theme.foreground : theme.mutedForeground}
            />
            <Text
              style={[
                styles.tabLabel,
                { color: isFocused ? theme.foreground : theme.mutedForeground, fontWeight: isFocused ? "900" : "600", letterSpacing: 0.5 }
              ]}
            >
              {label.toUpperCase()}
            </Text>
          </Animated.View>
        </Pressable>
      );
    });

  // Insert Record Button between the two tabs for a [Ideas] [REC] [Songs] layout
  tabs.splice(1, 0, (
    <View key="record-center" style={styles.centerButtonWrapper}>
      {!isSelectionMode && (
        <>
          <Animated.View style={[
            styles.glowLayer,
            {
              backgroundColor: theme.accent,
              opacity: glowAnim,
              transform: [{ scale: pulseAnim }],
            }
          ]} />
          <QuickRecordButton
            onTap={handleRecordPress}
            onQuickSave={() => {
              // Re-check ideas to stop the glowing if it was their first idea today
              setHasIdeasToday(true);
            }}
            style={{ zIndex: 2 }}
            buttonStyle={[styles.recordButton, { backgroundColor: theme.accent }]}
            iconSize={32}
          />
        </>
      )}
    </View>
  ));

  return (
    <View style={[styles.container, { backgroundColor: theme.background, borderTopColor: theme.border, paddingBottom: insets.bottom || 16, paddingTop: 12 }]}>
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: theme.primary,
            opacity: redGlowAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.05] })
          }
        ]}
        pointerEvents="none"
      />
      {tabs}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  tabLabel: {
    fontSize: 10,
  },
  centerButtonWrapper: {
    flex: 1.2,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -28, // Pop out heavily
    zIndex: 10,
  },
  recordButton: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 10,
    zIndex: 2,
    borderWidth: 4,
    borderColor: "#000000",
  },
  glowLayer: {
    position: "absolute",
    width: 74,
    height: 74,
    borderRadius: 37,
    zIndex: 1,
    shadowColor: "#ef4444",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 16,
  }
});

