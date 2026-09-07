import React, { useEffect, useState, useRef } from "react";
import { View, Text, TouchableOpacity, Animated, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as Notifications from "expo-notifications";
import { playAlarmSound, stopAlarmSound } from "../lib/alarm";

export interface ActiveAlarmInfo {
  taskId?: number | string;
  taskUuid?: string;
  title: string;
  time?: string;
  date?: string;
}

export const AlarmBanner: React.FC = () => {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [activeAlarm, setActiveAlarm] = useState<ActiveAlarmInfo | null>(null);
  const slideAnim = useRef(new Animated.Value(-200)).current;

  useEffect(() => {
    // Listen for incoming notifications while app is foregrounded
    const subscription = Notifications.addNotificationReceivedListener((notification) => {
      const { content } = notification.request;
      const data = (content.data || {}) as Record<string, unknown>;

      const title =
        (data.title as string) ||
        content.title?.replace(/^⏰ Task Alarm:\s*/, "") ||
        "Scheduled Task";
      const time = (data.time as string) || "";
      const date = (data.date as string) || "";
      const taskId = (data.taskId as number | string) || undefined;
      const taskUuid = (data.taskUuid as string) || undefined;

      setActiveAlarm({
        title,
        time,
        date,
        taskId,
        taskUuid,
      });

      // Play audio alarm (custom sound if available)
      playAlarmSound();

      // Animate banner slide down
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        damping: 15,
        stiffness: 120,
      }).start();
    });

    return () => {
      subscription.remove();
      stopAlarmSound();
    };
  }, [slideAnim]);

  const handleDismiss = async () => {
    // Slide up banner
    Animated.timing(slideAnim, {
      toValue: -200,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setActiveAlarm(null);
    });

    await stopAlarmSound();
  };

  const handleViewTask = async () => {
    const targetDate = activeAlarm?.date;
    await handleDismiss();

    if (targetDate) {
      router.push({
        pathname: "/(tabs)",
        params: { date: targetDate },
      });
    }
  };

  if (!activeAlarm) return null;

  const topPadding = Math.max(insets.top, Platform.OS === "android" ? 24 : 16);

  return (
    <Animated.View
      style={{
        transform: [{ translateY: slideAnim }],
        top: 0,
        left: 0,
        right: 0,
        position: "absolute",
        zIndex: 9999,
        paddingTop: topPadding + 8,
        paddingHorizontal: 16,
      }}
      pointerEvents="box-none"
    >
      <View className="bg-[#121829] border border-amber-500/50 rounded-2xl p-4 shadow-2xl shadow-black/80">
        <View className="flex-row items-center justify-between mb-2">
          <View className="flex-row items-center space-x-2">
            <View className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/40 items-center justify-center">
              <Ionicons name="alarm" size={16} color="#fbbf24" />
            </View>
            <Text className="text-amber-400 font-bold text-xs uppercase tracking-wider">
              Task Alarm
            </Text>
            {activeAlarm.time ? (
              <View className="bg-white/10 px-2 py-0.5 rounded-md">
                <Text className="text-slate-300 text-[11px] font-mono font-medium">
                  {activeAlarm.time}
                </Text>
              </View>
            ) : null}
          </View>

          <TouchableOpacity
            onPress={handleDismiss}
            activeOpacity={0.7}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            className="w-6 h-6 rounded-full bg-white/10 items-center justify-center"
          >
            <Ionicons name="close" size={14} color="#94a3b8" />
          </TouchableOpacity>
        </View>

        <Text
          numberOfLines={2}
          className="text-white font-semibold text-base leading-snug mb-3"
        >
          {activeAlarm.title}
        </Text>

        <View className="flex-row items-center justify-end space-x-2">
          {activeAlarm.date ? (
            <TouchableOpacity
              onPress={handleViewTask}
              activeOpacity={0.8}
              className="px-3.5 py-1.5 rounded-xl bg-white/10 border border-white/10 flex-row items-center space-x-1.5"
            >
              <Ionicons name="calendar-outline" size={14} color="#e2e8f0" />
              <Text className="text-slate-200 text-xs font-semibold">View</Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            onPress={handleDismiss}
            activeOpacity={0.8}
            className="px-4 py-1.5 rounded-xl bg-amber-500 flex-row items-center space-x-1.5"
          >
            <Ionicons name="stop" size={14} color="#0f172a" />
            <Text className="text-slate-950 font-bold text-xs">Stop</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
};
