import { useEffect } from "react";
import { Alert, Platform } from "react-native";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SQLiteProvider } from "expo-sqlite";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import { initDb, DB_NAME } from "../lib/db";
import { requestNotificationPermission } from "../lib/alarm";
import { startMobileAutoSync } from "../lib/sync";
import { AlarmBanner } from "../components/AlarmBanner";
import "../global.css";

// Configure foreground notification presentation behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: false,
    shouldShowBanner: false,
    shouldShowList: false,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const PERMISSION_ALERT_KEY = "cluanote_notif_permission_alerted";

export default function RootLayout() {
  const router = useRouter();

  useEffect(() => {
    // 1. Initialize SQLite Database
    initDb().catch((err) => {
      console.error("Failed to initialize database in RootLayout:", err);
    });

    // 2. Request notification permissions on mount
    (async () => {
      const granted = await requestNotificationPermission();
      if (!granted) {
        try {
          const alreadyAlerted = await AsyncStorage.getItem(PERMISSION_ALERT_KEY);
          if (!alreadyAlerted) {
            await AsyncStorage.setItem(PERMISSION_ALERT_KEY, "true");
            Alert.alert(
              "Enable Notifications",
              "CluaNote uses notifications and exact alarms to alert you when your scheduled tasks are due. You can enable them anytime in system settings.",
              [{ text: "OK" }]
            );
          }
        } catch {
          // Ignore AsyncStorage errors
        }
      }
    })();

    // 3. Listen for notification interactions (user tapped system tray notification)
    const responseSub = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        try {
          const data = response.notification.request.content.data as
            | Record<string, unknown>
            | undefined;
          const targetDate = data?.date as string | undefined;

          if (targetDate) {
            router.push({
              pathname: "/(tabs)",
              params: { date: targetDate },
            });
          }
        } catch (err) {
          console.warn("Failed to handle notification response:", err);
        }
      }
    );

    // 4. Start background / foreground auto-sync worker
    const stopAutoSync = startMobileAutoSync();

    return () => {
      responseSub.remove();
      stopAutoSync();
    };
  }, [router]);

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: "#090d16" }}>
      <SQLiteProvider
        databaseName={DB_NAME}
        onInit={async () => {
          await initDb();
        }}
      >
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: "#090d16" },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="modal/add-task"
            options={{
              presentation: "modal",
              animation: "slide_from_bottom",
            }}
          />
          <Stack.Screen
            name="modal/note"
            options={{
              presentation: "modal",
              animation: "slide_from_bottom",
            }}
          />
        </Stack>
        {/* Global floating in-app alarm banner */}
        <AlarmBanner />
      </SQLiteProvider>
    </GestureHandlerRootView>
  );
}
