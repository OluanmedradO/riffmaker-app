import { CustomTabBar } from "@/components/CustomTabBar";
import { useTheme } from "@/src/shared/theme/ThemeProvider";
import { Tabs } from "expo-router";
import { FolderSimpleIcon, WaveformIcon } from "phosphor-react-native";

export default function TabsLayout() {
  const theme = useTheme();
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: theme.background },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Ideias",
          tabBarIcon: ({ color }) => (
            <WaveformIcon weight="regular" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="projects"
        options={{
          title: "Músicas",
          tabBarIcon: ({ color }) => (
            <FolderSimpleIcon weight="regular" size={24} color={color} />
          ),
        }}
      />
      {/* Settings hidden from tab bar — accessible via top-right header icon */}
      <Tabs.Screen
        name="settings"
        options={{
          href: null, // Hide from tab bar
        }}
      />
    </Tabs>
  );
}


