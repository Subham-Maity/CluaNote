import { useState, useEffect, useCallback } from "react";
import {
  getPendingTasks,
  getNotDoneTasks,
  getCompletedTasks,
  getYesterdayPendingTasks,
} from "../lib/tasks";
import type { Task } from "@cluanote/shared";

export function usePendingState() {
  const [pendingCount, setPendingCount] = useState(0);
  const [notDoneCount, setNotDoneCount] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [reminderTasks, setReminderTasks] = useState<Task[]>([]);
  const [showReminderBanner, setShowReminderBanner] = useState(false);

  const refreshPendingState = useCallback(async () => {
    try {
      const [pending, notDone, completed, yesterday] = await Promise.all([
        getPendingTasks(),
        getNotDoneTasks(),
        getCompletedTasks(),
        getYesterdayPendingTasks(),
      ]);
      setPendingCount(pending.length);
      setNotDoneCount(notDone.length);
      setCompletedCount(completed.length);
      setReminderTasks(yesterday);
      if (yesterday.length > 0) {
        setShowReminderBanner(true);
      }
    } catch (err) {
      console.error("Failed to refresh pending counts:", err);
    }
  }, []);

  useEffect(() => {
    refreshPendingState();
  }, [refreshPendingState]);

  const handleDismissReminderTask = (id: number) => {
    setReminderTasks((prev) => {
      const remaining = prev.filter((t) => t.id !== id);
      if (remaining.length === 0) setShowReminderBanner(false);
      return remaining;
    });
  };

  const handleDismissAllReminders = () => {
    setShowReminderBanner(false);
    setReminderTasks([]);
  };

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
  };
}
