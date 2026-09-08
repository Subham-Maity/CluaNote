import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Platform, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function TabsLayout() {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isTablet = width > 768;

  // On phones, ensure the tab bar sits safely above Android 3-button navigation or iOS home indicator
  const bottomInset = insets.bottom > 0 ? insets.bottom : (Platform.OS === "ios" ? 28 : 12);
  const mobileTabHeight = 60 + bottomInset;

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
              height: mobileTabHeight,
              paddingBottom: bottomInset,
              paddingTop: 8,
            },
        tabBarItemStyle: {
          paddingVertical: 2,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
          marginTop: 4,
        },
        tabBarIconStyle: {
          marginTop: 2,
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
