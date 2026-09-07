import { useState } from "react";
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
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { addTask } from "../../lib/tasks";
import type { TaskPriority } from "@cluanote/shared";

export default function AddTaskModal() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [time, setTime] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [isFutureNote, setIsFutureNote] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!title.trim()) {
      setError("Task title is required");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await addTask({
        title: title.trim(),
        note: note.trim() ? note.trim() : null,
        date,
        time: time.trim() ? time.trim() : null,
        priority,
        is_future_note: isFutureNote ? 1 : 0,
      });
      router.back();
    } catch (err) {
      console.error("Failed to add task:", err);
      setError(err instanceof Error ? err.message : "Failed to save task");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-[#090d16]">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        {/* Modal Top Bar */}
        <View className="px-4 py-3 border-b border-white/[0.08] flex-row items-center justify-between">
          <TouchableOpacity
            onPress={() => router.back()}
            className="p-1 rounded-lg bg-white/[0.05]"
          >
            <Ionicons name="close" size={20} color="#94a3b8" />
          </TouchableOpacity>
          <Text className="text-white font-bold text-base">New Task</Text>
          <TouchableOpacity
            onPress={handleSave}
            disabled={isSubmitting}
            className="px-3 py-1.5 rounded-lg bg-indigo-600 active:bg-indigo-700"
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
              autoFocus
            />
          </View>

          {/* Date and Time Inputs */}
          <View className="flex-row space-x-3 mt-3">
            <View className="flex-1">
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
            <View className="flex-1">
              <Text className="text-slate-400 text-xs font-semibold mb-1.5">
                Time (HH:MM or empty)
              </Text>
              <TextInput
                value={time}
                onChangeText={setTime}
                placeholder="e.g. 14:30"
                placeholderTextColor="#64748b"
                className="p-3 rounded-xl bg-white/[0.05] border border-white/[0.1] text-white text-xs font-mono"
              />
            </View>
          </View>

          {/* Priority Pill Selector */}
          <View className="mt-3">
            <Text className="text-slate-400 text-xs font-semibold mb-1.5">
              Priority
            </Text>
            <View className="flex-row space-x-2">
              {(["low", "medium", "high"] as const).map((p) => (
                <TouchableOpacity
                  key={p}
                  onPress={() => setPriority(p)}
                  className={`flex-1 py-2 rounded-xl border items-center justify-center ${
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
              placeholder="Add details, bullet points, or thoughts..."
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
            className="flex-row items-center justify-between p-3.5 rounded-xl bg-white/[0.04] border border-white/[0.08] mt-2 mb-8"
          >
            <View className="flex-1 pr-2">
              <Text className="text-white text-sm font-semibold">
                Plan as Future Note (Kanban)
              </Text>
              <Text className="text-slate-400 text-xs mt-0.5">
                Keeps in backlog until ready to push to a specific day
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
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
