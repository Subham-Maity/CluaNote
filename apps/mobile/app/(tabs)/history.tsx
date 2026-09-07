import { useState, useEffect, useCallback } from "react";
import { View, Text, TouchableOpacity, FlatList, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { getPendingTasks, getNotDoneTasks, getCompletedTasks } from "../../lib/tasks";
import type { Task } from "@cluanote/shared";

type TabSegment = "pending" | "not_done" | "completed";

export default function HistoryScreen() {
  const [segment, setSegment] = useState<TabSegment>("pending");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      let data: Task[] = [];
      if (segment === "pending") {
        data = await getPendingTasks();
      } else if (segment === "not_done") {
        data = await getNotDoneTasks();
      } else {
        data = await getCompletedTasks();
      }
      setTasks(data);
    } catch (err) {
      console.error("Failed to load history tasks:", err);
    } finally {
      setIsLoading(false);
    }
  }, [segment]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <SafeAreaView className="flex-1 bg-[#090d16] px-4 pt-2">
      <Text className="text-2xl font-bold text-white tracking-tight mb-3">
        History
      </Text>

      {/* 3-Segment selector */}
      <View className="flex-row p-1 rounded-xl bg-white/[0.04] border border-white/[0.08] mb-4">
        {(["pending", "not_done", "completed"] as const).map((s) => (
          <TouchableOpacity
            key={s}
            onPress={() => setSegment(s)}
            className={`flex-1 py-1.5 rounded-lg items-center justify-center ${
              segment === s ? "bg-indigo-600 shadow-md" : ""
            }`}
          >
            <Text
              className={`text-xs font-semibold capitalize ${
                segment === s ? "text-white" : "text-slate-400"
              }`}
            >
              {s.replace("_", " ")}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Task List */}
      <FlatList
        data={tasks}
        keyExtractor={(item) => item.uuid || String(item.id)}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={loadData}
            tintColor="#818cf8"
          />
        }
        contentContainerStyle={{ paddingBottom: 80 }}
        ListEmptyComponent={
          <View className="items-center justify-center py-20">
            <Ionicons name="folder-open-outline" size={32} color="#64748b" />
            <Text className="text-slate-400 text-xs mt-2">
              No tasks found in {segment.replace("_", " ")}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View className="mb-2 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] flex-row items-center justify-between">
            <View className="flex-1 pr-2">
              <Text className="text-white text-sm font-medium">{item.title}</Text>
              <Text className="text-slate-500 text-[11px] mt-0.5">
                {item.date} {item.time ? `• ${item.time}` : ""}
              </Text>
            </View>
            <View
              className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                item.priority === "high"
                  ? "bg-rose-500/20 text-rose-300"
                  : item.priority === "medium"
                  ? "bg-amber-500/20 text-amber-300"
                  : "bg-emerald-500/20 text-emerald-300"
              }`}
            >
              <Text
                className={`text-[10px] uppercase font-bold ${
                  item.priority === "high"
                    ? "text-rose-400"
                    : item.priority === "medium"
                    ? "text-amber-400"
                    : "text-emerald-400"
                }`}
              >
                {item.priority}
              </Text>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}
