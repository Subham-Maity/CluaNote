import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Platform, useWindowDimensions } from "react-native";

export default function TabsLayout() {
  const { width } = useWindowDimensions();
  const isTablet = width > 768;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarPosition: isTablet ? "top" : "bottom",
        tabBarActiveTintColor: "#818cf8", // Indigo-400
        tabBarInactiveTintColor: "#64748b", // Slate-500
        tabBarStyle: isTablet
          ? {
              backgroundColor: "#0d1322",
              borderBottomColor: "rgba(255, 255, 255, 0.08)",
              borderBottomWidth: 1,
              height: 54,
              paddingTop: 4,
              paddingBottom: 4,
            }
          : {
              backgroundColor: "#0d1322",
              borderTopColor: "rgba(255, 255, 255, 0.08)",
              borderTopWidth: 1,
              height: Platform.OS === "ios" ? 84 : 64,
              paddingBottom: Platform.OS === "ios" ? 28 : 10,
              paddingTop: 8,
            },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Today",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: "History",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="time-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="kanban"
        options={{
          title: "Kanban",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="grid-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
