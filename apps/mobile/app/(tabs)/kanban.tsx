import React, { useState, useCallback } from "react";
import { View, Text, TouchableOpacity, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  getFutureNotes,
  pushNoteToEvent,
  updateTask,
  deleteTask,
} from "../../lib/tasks";
import {
  KanbanBoard,
  kanbanStatusToCompleted,
} from "../../components/KanbanBoard";
import { KanbanStatus } from "../../components/KanbanCard";
import { FloatingActionButton } from "../../components/FloatingActionButton";
import type { Task } from "@cluanote/shared";

export default function KanbanScreen() {
  const router = useRouter();
  const [notes, setNotes] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadNotes = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getFutureNotes();
      setNotes(data);
    } catch (err) {
      console.error("Failed to load future notes:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadNotes();
    }, [loadNotes])
  );

  const handleCardPress = (task: Task) => {
    router.push({
      pathname: "/modal/note",
      params: {
        taskId: String(task.id),
        title: task.title,
        initialNote: task.note || "",
      },
    });
  };

  const handleMoveStatus = async (task: Task, target: KanbanStatus) => {
    const nextCompleted = kanbanStatusToCompleted(target);
    // Optimistic update
    setNotes((prev) =>
      prev.map((n) => (n.id === task.id ? { ...n, completed: nextCompleted } : n))
    );

    try {
      await updateTask(task.id, { completed: nextCompleted });
      await loadNotes();
    } catch (err) {
      console.error("Failed to move note kanban status:", err);
      await loadNotes();
    }
  };

  const handlePushToEvent = async (task: Task) => {
    // Optimistic removal from future notes
    setNotes((prev) => prev.filter((n) => n.id !== task.id));

    try {
      await pushNoteToEvent(task.id);
      // Navigate to Today tab with this note's target date
      router.navigate({
        pathname: "/",
        params: { date: task.date },
      });
    } catch (err) {
      console.error("Failed to push note to event:", err);
      await loadNotes();
    }
  };

  const handleDelete = (task: Task) => {
    Alert.alert(
      "Delete Future Note",
      `Are you sure you want to delete "${task.title}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setNotes((prev) => prev.filter((n) => n.id !== task.id));
            try {
              await deleteTask(task.id);
              await loadNotes();
            } catch (err) {
              console.error("Failed to delete note:", err);
              await loadNotes();
            }
          },
        },
      ]
    );
  };

  const handleCreateFutureNote = () => {
    router.push({
      pathname: "/modal/add-task",
      params: { is_future_note: "1" },
    });
  };

  return (
    <LinearGradient
      colors={["#090d16", "#0c1222", "#090d16"]}
      style={{ flex: 1 }}
    >
      <SafeAreaView className="flex-1 pt-2" edges={["top"]}>
        {/* Header */}
        <View className="px-4 flex-row items-center justify-between mb-3">
          <View className="flex-row items-center space-x-2">
            <View className="w-8 h-8 rounded-xl bg-amber-600/20 border border-amber-500/30 items-center justify-center">
              <Ionicons name="grid-outline" size={18} color="#fbbf24" />
            </View>
            <View>
              <Text className="text-2xl font-black text-white tracking-tight">
                Kanban
              </Text>
              <Text className="text-[11px] text-slate-400">
                Future planning notes & roadmap
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={handleCreateFutureNote}
            accessibilityRole="button"
            accessibilityLabel="Create future note"
            className="px-3 py-1.5 rounded-xl bg-amber-600 active:bg-amber-700 flex-row items-center space-x-1 shadow-md shadow-amber-600/20"
          >
            <Ionicons name="add" size={16} color="white" />
            <Text className="text-white text-xs font-bold">New Note</Text>
          </TouchableOpacity>
        </View>

        {/* Kanban Board */}
        <KanbanBoard
          tasks={notes}
          isLoading={isLoading}
          onRefresh={loadNotes}
          onCardPress={handleCardPress}
          onPushToEvent={handlePushToEvent}
          onMoveStatus={handleMoveStatus}
          onDelete={handleDelete}
        />

        {/* Floating Action Button */}
        <FloatingActionButton onPress={handleCreateFutureNote} />
      </SafeAreaView>
    </LinearGradient>
  );
}
