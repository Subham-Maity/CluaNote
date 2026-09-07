import { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { addTask, updateTask, deleteTask, getAllTasks } from "../../lib/tasks";
import type { TaskPriority, Task } from "@cluanote/shared";

export default function AddTaskModal() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    taskId?: string;
    initialDate?: string;
    is_future_note?: string;
  }>();

  const isEditing = Boolean(params.taskId);
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(
    () => params.initialDate || new Date().toISOString().split("T")[0]
  );
  const [isAnytime, setIsAnytime] = useState(true);
  const [time, setTime] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [isFutureNote, setIsFutureNote] = useState(
    () => params.is_future_note === "1" || params.is_future_note === "true"
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If editing, load task details
  useEffect(() => {
    if (params.taskId) {
      const idNum = parseInt(params.taskId, 10);
      getAllTasks().then((all) => {
        const found = all.find((t) => t.id === idNum);
        if (found) {
          setTitle(found.title);
          setNote(found.note || "");
          setDate(found.date);
          if (found.time) {
            setIsAnytime(false);
            setTime(found.time);
          } else {
            setIsAnytime(true);
            setTime("");
          }
          setPriority(found.priority);
          setIsFutureNote(found.is_future_note === 1);
        }
      });
    }
  }, [params.taskId]);

  const handleSave = async () => {
    if (!title.trim()) {
      setError("Task title is required");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const formattedTime = !isAnytime && time.trim() ? time.trim() : null;

      if (isEditing && params.taskId) {
        await updateTask(parseInt(params.taskId, 10), {
          title: title.trim(),
          note: note.trim() ? note.trim() : null,
          date,
          time: formattedTime,
          priority,
          is_future_note: isFutureNote ? 1 : 0,
        });
      } else {
        await addTask({
          title: title.trim(),
          note: note.trim() ? note.trim() : null,
          date,
          time: formattedTime,
          priority,
          is_future_note: isFutureNote ? 1 : 0,
        });
      }
      router.back();
    } catch (err) {
      console.error("Failed to save task:", err);
      setError(err instanceof Error ? err.message : "Failed to save task");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!params.taskId) return;
    try {
      await deleteTask(parseInt(params.taskId, 10));
      router.back();
    } catch (err) {
      console.error("Failed to delete task:", err);
    }
  };

  return (
    <SafeAreaView
      accessible={true}
      accessibilityViewIsModal={true}
      className="flex-1 bg-[#090d16]"
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        {/* Modal Top Bar */}
        <View className="px-4 py-3 border-b border-white/[0.08] flex-row items-center justify-between">
          <TouchableOpacity
            onPress={() => router.back()}
            className="p-1.5 rounded-lg bg-white/[0.05]"
          >
            <Ionicons name="close" size={20} color="#94a3b8" />
          </TouchableOpacity>
          <Text className="text-white font-bold text-base">
            {isEditing ? "Edit Task" : "New Task"}
          </Text>
          <TouchableOpacity
            onPress={handleSave}
            disabled={isSubmitting}
            className="px-3.5 py-1.5 rounded-lg bg-indigo-600 active:bg-indigo-700"
          >
            <Text className="text-white text-xs font-bold">
              {isSubmitting ? "Saving..." : "Save"}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1 px-4 pt-4 space-y-4">
          {error ? (
            <View className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/30">
              <Text className="text-rose-300 text-xs">{error}</Text>
            </View>
          ) : null}

          {/* Title Input */}
          <View>
            <Text className="text-slate-400 text-xs font-semibold mb-1.5">
              Title *
            </Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="What needs to be done?"
              placeholderTextColor="#64748b"
              className="p-3.5 rounded-xl bg-white/[0.05] border border-white/[0.1] text-white text-sm"
              autoFocus={!isEditing}
            />
          </View>

          {/* Date and Time */}
          <View className="mt-3">
            <Text className="text-slate-400 text-xs font-semibold mb-1.5">
              Date (YYYY-MM-DD)
            </Text>
            <TextInput
              value={date}
              onChangeText={setDate}
              placeholder="2026-09-07"
              placeholderTextColor="#64748b"
              className="p-3 rounded-xl bg-white/[0.05] border border-white/[0.1] text-white text-xs font-mono"
            />
          </View>

          {/* Anytime toggle vs Time picker */}
          <View className="mt-3">
            <View className="flex-row items-center justify-between mb-1.5">
              <Text className="text-slate-400 text-xs font-semibold">Time</Text>
              <TouchableOpacity
                onPress={() => setIsAnytime(!isAnytime)}
                className="flex-row items-center space-x-1"
              >
                <Text className="text-xs text-indigo-400 font-semibold">
                  {isAnytime ? "Set Specific Time" : "Set to Anytime"}
                </Text>
              </TouchableOpacity>
            </View>

            {!isAnytime ? (
              <TextInput
                value={time}
                onChangeText={setTime}
                placeholder="14:30 (24-hour format)"
                placeholderTextColor="#64748b"
                className="p-3 rounded-xl bg-white/[0.05] border border-white/[0.1] text-white text-xs font-mono"
              />
            ) : (
              <View className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                <Text className="text-slate-500 text-xs">
                  Anytime today (shown in top Anytime section)
                </Text>
              </View>
            )}
          </View>

          {/* Priority Pills */}
          <View className="mt-3">
            <Text className="text-slate-400 text-xs font-semibold mb-1.5">
              Priority
            </Text>
            <View className="flex-row space-x-2">
              {(["low", "medium", "high"] as const).map((p) => (
                <TouchableOpacity
                  key={p}
                  onPress={() => setPriority(p)}
                  className={`flex-1 py-2.5 rounded-xl border items-center justify-center ${
                    priority === p
                      ? p === "high"
                        ? "bg-rose-500/20 border-rose-500"
                        : p === "medium"
                        ? "bg-amber-500/20 border-amber-500"
                        : "bg-emerald-500/20 border-emerald-500"
                      : "bg-white/[0.04] border-white/[0.08]"
                  }`}
                >
                  <Text
                    className={`text-xs font-bold capitalize ${
                      priority === p
                        ? p === "high"
                          ? "text-rose-400"
                          : p === "medium"
                          ? "text-amber-400"
                          : "text-emerald-400"
                        : "text-slate-400"
                    }`}
                  >
                    {p}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Note Input */}
          <View className="mt-3">
            <Text className="text-slate-400 text-xs font-semibold mb-1.5">
              Notes (Markdown supported)
            </Text>
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder="Add details, checklists, or thoughts..."
              placeholderTextColor="#64748b"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              className="p-3.5 rounded-xl bg-white/[0.05] border border-white/[0.1] text-white text-sm min-h-[100px]"
            />
          </View>

          {/* Future Note Toggle */}
          <TouchableOpacity
            onPress={() => setIsFutureNote(!isFutureNote)}
            className="flex-row items-center justify-between p-3.5 rounded-xl bg-white/[0.04] border border-white/[0.08] mt-2 mb-4"
          >
            <View className="flex-1 pr-2">
              <Text className="text-white text-sm font-semibold">
                Future Planning Note (Kanban)
              </Text>
              <Text className="text-slate-400 text-xs mt-0.5">
                Stays in backlog until ready to schedule into a day
              </Text>
            </View>
            <View
              className={`w-5 h-5 rounded-md border items-center justify-center ${
                isFutureNote
                  ? "bg-indigo-600 border-indigo-500"
                  : "border-slate-500"
              }`}
            >
              {isFutureNote && (
                <Ionicons name="checkmark" size={14} color="white" />
              )}
            </View>
          </TouchableOpacity>

          {/* Delete Button (when editing) */}
          {isEditing && (
            <TouchableOpacity
              onPress={handleDelete}
              className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 flex-row items-center justify-center space-x-2 mb-10"
            >
              <Ionicons name="trash-outline" size={16} color="#f43f5e" />
              <Text className="text-rose-400 font-bold text-xs">
                Delete Task
              </Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
