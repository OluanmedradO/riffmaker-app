import { CustomTabBar } from "@/components/CustomTabBar";
import { useTheme } from "@/components/ThemeProvider";
import { Tabs } from "expo-router";
import { ArrowsLeftRight, FolderSimple, Gear, Waveform } from "phosphor-react-native";

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
          title: "Ideias",
          tabBarIcon: ({ color }) => (
            <Waveform weight="regular" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="projects"
        options={{
          title: "Projetos",
          tabBarIcon: ({ color }) => (
            <FolderSimple weight="regular" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="compare"
        options={{
          title: "Comparar",
          tabBarIcon: ({ color }) => (
            <ArrowsLeftRight weight="regular" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Configurações",
          tabBarIcon: ({ color }) => (
            <Gear weight="regular" size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
