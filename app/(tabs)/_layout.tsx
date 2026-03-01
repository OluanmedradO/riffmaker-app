import { CustomTabBar } from "@/components/CustomTabBar";
import { useTheme } from "@/components/ThemeProvider";
import { Tabs } from "expo-router";
import { ArrowsLeftRightIcon, FolderSimpleIcon, GearIcon, WaveformIcon } from "phosphor-react-native";
export default function TabsLayout() {
  const theme = useTheme();
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Idéias",
          tabBarIcon: ({ color }) => (
            <WaveformIcon weight="regular" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="projects"
        options={{
          title: "Projetos",
          tabBarIcon: ({ color }) => (
            <FolderSimpleIcon weight="regular" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="compare"
        options={{
          title: "Comparar",
          tabBarIcon: ({ color }) => (
            <ArrowsLeftRightIcon weight="regular" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Configurações",
          tabBarIcon: ({ color }) => (
            <GearIcon weight="regular" size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
