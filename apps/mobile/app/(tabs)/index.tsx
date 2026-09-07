import { useState, useEffect, useCallback } from "react";
import { View, Text, TouchableOpacity, FlatList, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { getTasks, toggleComplete } from "../../lib/tasks";
import { CURRENT_VERSION, type Task } from "@cluanote/shared";

export default function TodayScreen() {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const todayStr = new Date().toISOString().split("T")[0];

  const loadTasks = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getTasks(todayStr);
      setTasks(data);
    } catch (err) {
      console.error("Failed to load today's tasks:", err);
    } finally {
      setIsLoading(false);
    }
  }, [todayStr]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const handleToggle = async (task: Task) => {
    try {
      await toggleComplete(task.id, task.completed !== 1);
      await loadTasks();
    } catch (err) {
      console.error("Failed to toggle task:", err);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#090d16] px-4 pt-2">
      {/* Header */}
      <View className="flex-row items-center justify-between pb-4 border-b border-white/[0.08]">
        <View>
          <Text className="text-2xl font-bold text-white tracking-tight">
            Clua<Text className="text-indigo-400">Note</Text>
          </Text>
          <Text className="text-xs text-slate-400 mt-0.5">
            Today • {new Date().toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => router.push("/modal/add-task")}
          className="bg-indigo-600 active:bg-indigo-700 px-3.5 py-2 rounded-xl flex-row items-center space-x-1.5 shadow-lg shadow-indigo-500/25"
        >
          <Ionicons name="add" size={18} color="white" />
          <Text className="text-white text-xs font-semibold">New Task</Text>
        </TouchableOpacity>
      </View>

      {/* Task List */}
      <FlatList
        data={tasks}
        keyExtractor={(item) => item.uuid || String(item.id)}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={loadTasks}
            tintColor="#818cf8"
          />
        }
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 80 }}
        ListEmptyComponent={
          <View className="items-center justify-center py-20 px-6">
            <View className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.08] items-center justify-center mb-4">
              <Ionicons name="checkmark-done" size={28} color="#818cf8" />
            </View>
            <Text className="text-white font-semibold text-base mb-1">
              All clear for today!
            </Text>
            <Text className="text-slate-400 text-xs text-center">
              Tap the "+ New Task" button above to schedule your day.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View className="mb-2.5 p-3.5 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex-row items-center justify-between">
            <TouchableOpacity
              onPress={() => handleToggle(item)}
              className="flex-row items-center flex-1 pr-3"
            >
              <View
                className={`w-5 h-5 rounded-lg border items-center justify-center mr-3 ${
                  item.completed === 1
                    ? "bg-emerald-500/20 border-emerald-500"
                    : "border-slate-500 bg-transparent"
                }`}
              >
                {item.completed === 1 && (
                  <Ionicons name="checkmark" size={14} color="#10b981" />
                )}
              </View>

              <View className="flex-1">
                <Text
                  className={`text-sm font-medium ${
                    item.completed === 1
                      ? "text-slate-500 line-through"
                      : "text-white"
                  }`}
                >
                  {item.title}
                </Text>
                {item.note ? (
                  <Text className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                    {item.note}
                  </Text>
                ) : null}
              </View>
            </TouchableOpacity>

            {item.time ? (
              <View className="px-2 py-1 rounded-md bg-white/[0.06] border border-white/[0.05]">
                <Text className="text-[11px] font-mono text-indigo-300">
                  {item.time}
                </Text>
              </View>
            ) : null}
          </View>
        )}
      />
    </SafeAreaView>
  );
}
