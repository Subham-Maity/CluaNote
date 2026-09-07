import React, { useState, useCallback } from "react";
import { View, Text, TouchableOpacity, useWindowDimensions, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  getPendingTasks,
  getNotDoneTasks,
  getCompletedTasks,
  setTaskStatus,
  toggleComplete,
  deleteTask,
} from "../../lib/tasks";
import { HistoryList } from "../../components/HistoryList";
import type { Task } from "@cluanote/shared";

type TabSegment = "pending" | "not_done" | "completed";

export default function HistoryScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isTablet = width > 768;
  const [segment, setSegment] = useState<TabSegment>("pending");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Counts for each segment
  const [counts, setCounts] = useState({
    pending: 0,
    not_done: 0,
    completed: 0,
  });

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [pendingList, notDoneList, completedList] = await Promise.all([
        getPendingTasks(),
        getNotDoneTasks(),
        getCompletedTasks(),
      ]);

      setCounts({
        pending: pendingList.length,
        not_done: notDoneList.length,
        completed: completedList.length,
      });

      if (segment === "pending") {
        setTasks(pendingList);
      } else if (segment === "not_done") {
        setTasks(notDoneList);
      } else {
        setTasks(completedList);
      }
    } catch (err) {
      console.error("Failed to load history tasks:", err);
    } finally {
      setIsLoading(false);
    }
  }, [segment]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleToggleComplete = async (task: Task) => {
    // Optimistic removal from current list if not in completed segment
    const nextCompleted = task.completed === 1 ? 0 : 1;
    if (segment !== "completed" && nextCompleted === 1) {
      setTasks((prev) => prev.filter((t) => t.id !== task.id));
    }
    try {
      await toggleComplete(task.id, nextCompleted === 1);
      await loadData();
    } catch (err) {
      console.error("Failed to toggle task completion:", err);
      await loadData();
    }
  };

  const handleSetStatus = async (task: Task, status: number) => {
    // Optimistic removal if status doesn't match current segment
    const willStayInSegment =
      (segment === "pending" && status === 0) ||
      (segment === "not_done" && status === 2) ||
      (segment === "completed" && status === 1);

    if (!willStayInSegment) {
      setTasks((prev) => prev.filter((t) => t.id !== task.id));
    }

    try {
      await setTaskStatus(task.id, status);
      await loadData();
    } catch (err) {
      console.error("Failed to set task status:", err);
      await loadData();
    }
  };

  const handleDelete = async (task: Task) => {
    setTasks((prev) => prev.filter((t) => t.id !== task.id));
    try {
      await deleteTask(task.id);
      await loadData();
    } catch (err) {
      console.error("Failed to delete task:", err);
      await loadData();
    }
  };

  const handleJumpToDate = (date: string) => {
    router.navigate({
      pathname: "/",
      params: { date },
    });
  };

  return (
    <LinearGradient
      colors={["#090d16", "#0c1222", "#090d16"]}
      style={{ flex: 1 }}
    >
      <SafeAreaView className="flex-1 px-4 pt-2" edges={["top"]}>
        <View className={isTablet ? "max-w-4xl mx-auto w-full flex-1" : "flex-1"}>
          {/* Header */}
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center space-x-2">
              <View className="w-8 h-8 rounded-xl bg-violet-600/20 border border-violet-500/30 items-center justify-center">
                <Ionicons name="time-outline" size={18} color="#a78bfa" />
              </View>
              <Text className="text-2xl font-black text-white tracking-tight">
                History
              </Text>
            </View>

            <TouchableOpacity
              onPress={loadData}
              accessibilityRole="button"
              accessibilityLabel="Refresh history"
              className="p-2 rounded-xl bg-white/[0.04] border border-white/[0.08]"
            >
              <Ionicons name="reload-outline" size={16} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          {/* 3-Segment selector with count chips */}
          <View className="flex-row p-1 rounded-2xl bg-white/[0.04] border border-white/[0.08] mb-4">
            {(
              [
                { key: "pending", label: "Pending", count: counts.pending },
                { key: "not_done", label: "Not Done", count: counts.not_done },
                { key: "completed", label: "Done", count: counts.completed },
              ] as const
            ).map((s) => {
              const isActive = segment === s.key;
              return (
                <TouchableOpacity
                  key={s.key}
                  onPress={() => {
                    if (Platform.OS !== "web") {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                    }
                    setSegment(s.key);
                  }}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: isActive }}
                  accessibilityLabel={`${s.label} history, ${s.count} tasks`}
                  className={`flex-1 py-2 rounded-xl flex-row items-center justify-center space-x-1.5 ${
                    isActive
                      ? "bg-indigo-600 shadow-md shadow-indigo-600/30"
                      : "active:bg-white/[0.02]"
                  }`}
                >
                  <Text
                    className={`text-xs font-bold ${
                      isActive ? "text-white" : "text-slate-400"
                    }`}
                  >
                    {s.label}
                  </Text>
                  <View
                    className={`px-1.5 py-0.2 rounded-full ${
                      isActive ? "bg-white/25" : "bg-white/10"
                    }`}
                  >
                    <Text
                      className={`text-[10px] font-bold ${
                        isActive ? "text-white" : "text-slate-400"
                      }`}
                    >
                      {s.count}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Task History SectionList */}
          <HistoryList
            tasks={tasks}
            segment={segment}
            isLoading={isLoading}
            onRefresh={loadData}
            onToggleComplete={handleToggleComplete}
            onSetStatus={handleSetStatus}
            onDelete={handleDelete}
            onJumpToDate={handleJumpToDate}
          />
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}
