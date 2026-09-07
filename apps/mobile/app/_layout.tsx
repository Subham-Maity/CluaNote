import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SQLiteProvider } from "expo-sqlite";
import { initDb, DB_NAME } from "../lib/db";
import "../global.css";

export default function RootLayout() {
  useEffect(() => {
    initDb().catch((err) => {
      console.error("Failed to initialize database in RootLayout:", err);
    });
  }, []);

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
      </SQLiteProvider>
    </GestureHandlerRootView>
  );
}
