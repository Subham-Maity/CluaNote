import React, { useEffect, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { DateStrip } from "../../components/DateStrip";
import { AnytimeSection } from "../../components/AnytimeSection";
import { Timeline } from "../../components/Timeline";
import { ReminderBanner } from "../../components/ReminderBanner";
import { FloatingActionButton } from "../../components/FloatingActionButton";
import { useTasks } from "../../hooks/useTasks";
import { usePendingState } from "../../hooks/usePendingState";
import { filterAnytimeTasks, filterTimedTasks, type Task } from "@cluanote/shared";

export default function TodayScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ date?: string }>();

  const {
    tasks,
    isLoading,
    selectedDate,
    setSelectedDate,
    fetchTasks,
    handleToggleComplete,
    handleSetStatus,
    handleDeleteTask,
  } = useTasks();

  const {
    reminderTasks,
    showReminderBanner,
    refreshPendingState,
    handleDismissReminderTask,
    handleDismissAllReminders,
    handleReminderMarkDone,
    handleReminderMarkNotDone,
  } = usePendingState();

  // Handle jump-to-date parameters from other screens (History / Kanban)
  useEffect(() => {
    if (params.date && params.date !== selectedDate) {
      setSelectedDate(params.date);
    }
  }, [params.date, selectedDate, setSelectedDate]);

  // Refresh tasks and pending counters when screen regains focus
  useFocusEffect(
    useCallback(() => {
      fetchTasks(selectedDate);
      refreshPendingState();
    }, [selectedDate, fetchTasks, refreshPendingState])
  );

  const anytimeTasks = filterAnytimeTasks(tasks);
  const timedTasks = filterTimedTasks(tasks);

  const handleEdit = (task: Task) => {
    router.push({
      pathname: "/modal/add-task",
      params: { taskId: String(task.id), initialDate: task.date },
    });
  };

  const handleOpenNote = (task: Task) => {
    router.push({
      pathname: "/modal/note",
      params: { title: task.title, initialNote: task.note || "" },
    });
  };

  const onRefresh = async () => {
    await Promise.all([fetchTasks(selectedDate), refreshPendingState()]);
  };

  return (
    <SafeAreaView className="flex-1 bg-[#090d16]" edges={["top"]}>
      {/* App Header */}
      <View className="px-4 py-2 flex-row items-center justify-between">
        <View className="flex-row items-center space-x-2">
          <View className="w-8 h-8 rounded-xl bg-indigo-600/30 border border-indigo-500/40 items-center justify-center">
            <Ionicons name="flash-outline" size={18} color="#818cf8" />
          </View>
          <Text className="text-xl font-black text-white tracking-tight">
            Clua<Text className="text-indigo-400">Note</Text>
          </Text>
        </View>

        <TouchableOpacity
          onPress={() =>
            router.push({
              pathname: "/modal/add-task",
              params: { initialDate: selectedDate },
            })
          }
          className="px-3 py-1.5 rounded-xl bg-indigo-600 active:bg-indigo-700 flex-row items-center space-x-1 shadow-md shadow-indigo-500/20"
        >
          <Ionicons name="add" size={16} color="white" />
          <Text className="text-white text-xs font-bold">New Task</Text>
        </TouchableOpacity>
      </View>

      {/* Date Strip Navigation */}
      <DateStrip
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
      />

      {/* Yesterday Reminder Banner */}
      {showReminderBanner && reminderTasks.length > 0 && (
        <ReminderBanner
          tasks={reminderTasks}
          onDismissTask={handleDismissReminderTask}
          onDismissAll={handleDismissAllReminders}
          onMarkDone={async (task) => {
            await handleReminderMarkDone(task);
            if (task.date === selectedDate) {
              await fetchTasks(selectedDate);
            }
          }}
          onMarkNotDone={async (task) => {
            await handleReminderMarkNotDone(task);
            if (task.date === selectedDate) {
              await fetchTasks(selectedDate);
            }
          }}
          onJumpToDate={(date) => setSelectedDate(date)}
        />
      )}

      {/* Main Task List & Timeline Scroll */}
      <ScrollView
        className="flex-1 px-4 pt-3"
        contentContainerStyle={{ paddingBottom: 90 }}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={onRefresh}
            tintColor="#818cf8"
          />
        }
      >
        {/* Anytime Tasks */}
        <AnytimeSection
          tasks={anytimeTasks}
          onToggleComplete={handleToggleComplete}
          onSetStatus={handleSetStatus}
          onEdit={handleEdit}
          onDelete={handleDeleteTask}
          onOpenNote={handleOpenNote}
        />

        {/* Empty State when no tasks exist on this date */}
        {!isLoading && tasks.length === 0 && (
          <View className="items-center justify-center py-16 px-4">
            <View className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/[0.08] items-center justify-center mb-3">
              <Ionicons name="calendar-clear-outline" size={26} color="#818cf8" />
            </View>
            <Text className="text-white font-bold text-sm mb-1">
              No tasks scheduled
            </Text>
            <Text className="text-slate-400 text-xs text-center mb-4">
              Plan ahead or tap the button below to add your first item for this day.
            </Text>
            <TouchableOpacity
              onPress={() =>
                router.push({
                  pathname: "/modal/add-task",
                  params: { initialDate: selectedDate },
                })
              }
              className="px-4 py-2 rounded-xl bg-white/[0.06] border border-white/[0.1] flex-row items-center space-x-1.5"
            >
              <Ionicons name="add-circle-outline" size={16} color="#818cf8" />
              <Text className="text-indigo-300 text-xs font-semibold">
                Add Task for {selectedDate}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Hourly Timeline */}
        {timedTasks.length > 0 || tasks.length > 0 ? (
          <Timeline
            selectedDate={selectedDate}
            tasks={timedTasks}
            onToggleComplete={handleToggleComplete}
            onSetStatus={handleSetStatus}
            onEdit={handleEdit}
            onDelete={handleDeleteTask}
            onOpenNote={handleOpenNote}
          />
        ) : null}
      </ScrollView>

      {/* Floating Action Button */}
      <FloatingActionButton
        onPress={() =>
          router.push({
            pathname: "/modal/add-task",
            params: { initialDate: selectedDate },
          })
        }
      />
    </SafeAreaView>
  );
}
