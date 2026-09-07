import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  getPendingTasks,
  getNotDoneTasks,
  getCompletedTasks,
  getYesterdayPendingTasks,
  toggleComplete,
  setTaskStatus,
} from "../lib/tasks";
import type { Task } from "@cluanote/shared";

const DISMISSED_STORAGE_KEY = "dismissed_reminder_tasks";

export function usePendingState() {
  const [pendingCount, setPendingCount] = useState(0);
  const [notDoneCount, setNotDoneCount] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [reminderTasks, setReminderTasks] = useState<Task[]>([]);
  const [showReminderBanner, setShowReminderBanner] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const refreshPendingState = useCallback(async () => {
    setIsLoading(true);
    try {
      const [pending, notDone, completed, yesterday, dismissedRaw] =
        await Promise.all([
          getPendingTasks(),
          getNotDoneTasks(),
          getCompletedTasks(),
          getYesterdayPendingTasks(),
          AsyncStorage.getItem(DISMISSED_STORAGE_KEY),
        ]);

      setPendingCount(pending.length);
      setNotDoneCount(notDone.length);
      setCompletedCount(completed.length);

      const dismissedIds: number[] = dismissedRaw ? JSON.parse(dismissedRaw) : [];
      const dismissedSet = new Set<number>(dismissedIds);

      const visible = yesterday.filter((t) => !dismissedSet.has(t.id));
      setReminderTasks(visible);
      setShowReminderBanner(visible.length > 0);
    } catch (err) {
      console.warn("Failed to refresh pending counts & yesterday tasks:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshPendingState();
  }, [refreshPendingState]);

  const handleDismissReminderTask = useCallback(
    async (taskId: number) => {
      try {
        const raw = await AsyncStorage.getItem(DISMISSED_STORAGE_KEY);
        const dismissed: number[] = raw ? JSON.parse(raw) : [];
        if (!dismissed.includes(taskId)) {
          dismissed.push(taskId);
          await AsyncStorage.setItem(
            DISMISSED_STORAGE_KEY,
            JSON.stringify(dismissed)
          );
        }
      } catch (err) {
        console.warn("Failed to persist dismissed reminder task:", err);
      }

      setReminderTasks((prev) => {
        const remaining = prev.filter((t) => t.id !== taskId);
        if (remaining.length === 0) {
          setShowReminderBanner(false);
        }
        return remaining;
      });
    },
    []
  );

  const handleDismissAllReminders = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(DISMISSED_STORAGE_KEY);
      const dismissed: number[] = raw ? JSON.parse(raw) : [];
      const newDismissed = Array.from(
        new Set([...dismissed, ...reminderTasks.map((t) => t.id)])
      );
      await AsyncStorage.setItem(
        DISMISSED_STORAGE_KEY,
        JSON.stringify(newDismissed)
      );
    } catch (err) {
      console.warn("Failed to persist dismiss all reminders:", err);
    }

    setReminderTasks([]);
    setShowReminderBanner(false);
  }, [reminderTasks]);

  const handleReminderMarkDone = useCallback(
    async (task: Task) => {
      // Optimistic removal
      setReminderTasks((prev) => {
        const remaining = prev.filter((t) => t.id !== task.id);
        if (remaining.length === 0) setShowReminderBanner(false);
        return remaining;
      });

      try {
        await toggleComplete(task.id, true);
        await refreshPendingState();
      } catch (err) {
        console.error("Failed to mark reminder task done:", err);
        // Re-sync state
        await refreshPendingState();
      }
    },
    [refreshPendingState]
  );

  const handleReminderMarkNotDone = useCallback(
    async (task: Task) => {
      // Optimistic removal
      setReminderTasks((prev) => {
        const remaining = prev.filter((t) => t.id !== task.id);
        if (remaining.length === 0) setShowReminderBanner(false);
        return remaining;
      });

      try {
        await setTaskStatus(task.id, 2);
        await refreshPendingState();
      } catch (err) {
        console.error("Failed to mark reminder task not done:", err);
        await refreshPendingState();
      }
    },
    [refreshPendingState]
  );

  return {
    pendingCount,
    notDoneCount,
    completedCount,
    reminderTasks,
    showReminderBanner,
    setShowReminderBanner,
    refreshPendingState,
    handleDismissReminderTask,
    handleDismissAllReminders,
    handleReminderMarkDone,
    handleReminderMarkNotDone,
    isLoading,
  };
}
