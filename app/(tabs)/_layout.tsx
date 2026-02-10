import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Tabs } from "expo-router";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: true,
        tabBarActiveTintColor: "#7c3aed",
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Riff Maker",
          tabBarLabel: "Riffs",
          tabBarIcon: ({ color }) => (
            <FontAwesome name="music" size={24} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="create"
        options={{
          title: "Novo Riff",
          tabBarLabel: "Criar",
          tabBarIcon: ({ color }) => (
            <FontAwesome name="plus-circle" size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
