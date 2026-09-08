import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  Platform,
  DeviceEventEmitter,
} from "react-native";
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

interface TaskStore {
  pending: Task[];
  not_done: Task[];
  completed: Task[];
}

export default function HistoryScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isTablet = width > 768;
  const [segment, setSegment] = useState<TabSegment>("pending");
  const [taskStore, setTaskStore] = useState<TaskStore>({
    pending: [],
    not_done: [],
    completed: [],
  });
  const [isLoading, setIsLoading] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [pendingList, notDoneList, completedList] = await Promise.all([
        getPendingTasks(),
        getNotDoneTasks(),
        getCompletedTasks(),
      ]);

      setTaskStore({
        pending: pendingList,
        not_done: notDoneList,
        completed: completedList,
      });
    } catch (err) {
      console.error("Failed to load history tasks:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // Listen for sync completion events to automatically refresh
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(
      "CLUANOTE_SYNC_COMPLETED",
      () => {
        loadData();
      }
    );
    return () => {
      sub.remove();
    };
  }, [loadData]);

  const handleToggleComplete = async (task: Task) => {
    const nextCompleted = task.completed === 1 ? 0 : 1;
    try {
      await toggleComplete(task.id, nextCompleted === 1);
      await loadData();
    } catch (err) {
      console.error("Failed to toggle task completion:", err);
      await loadData();
    }
  };

  const handleSetStatus = async (task: Task, status: number) => {
    try {
      await setTaskStatus(task.id, status);
      await loadData();
    } catch (err) {
      console.error("Failed to set task status:", err);
      await loadData();
    }
  };

  const handleDelete = async (task: Task) => {
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

  const currentTasks = taskStore[segment] || [];
  const counts = {
    pending: taskStore.pending.length,
    not_done: taskStore.not_done.length,
    completed: taskStore.completed.length,
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
            <View className="flex-row items-center gap-2.5">
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
          <View className="flex-row p-1 rounded-2xl bg-white/[0.04] border border-white/[0.08] mb-4 gap-1">
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
                  className={`flex-1 py-2.5 rounded-xl flex-row items-center justify-center gap-2 ${
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
                    className={`px-2 py-0.5 rounded-full ${
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
          <View style={{ flex: 1 }}>
            <HistoryList
              tasks={currentTasks}
              segment={segment}
              isLoading={isLoading}
              onRefresh={loadData}
              onToggleComplete={handleToggleComplete}
              onSetStatus={handleSetStatus}
              onDelete={handleDelete}
              onJumpToDate={handleJumpToDate}
            />
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}
