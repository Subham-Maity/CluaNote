import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import {
  getTasks,
  addTask,
  updateTask,
  deleteTask,
  toggleComplete,
  setTaskStatus,
} from "../lib/tasks";
import type { Task, NewTask, UpdateTaskInput } from "@cluanote/shared";

export function useTasks(initialDate?: string) {
  const [selectedDate, setSelectedDate] = useState<string>(
    () => initialDate || format(new Date(), "yyyy-MM-dd")
  );
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTasks = useCallback(
    async (dateToFetch?: string) => {
      const targetDate = dateToFetch || selectedDate;
      setIsLoading(true);
      try {
        const data = await getTasks(targetDate);
        setTasks(data);
      } catch (err) {
        console.error("Failed to fetch tasks for date:", targetDate, err);
      } finally {
        setIsLoading(false);
      }
    },
    [selectedDate]
  );

  useEffect(() => {
    fetchTasks(selectedDate);
  }, [selectedDate, fetchTasks]);

  const handleAddTask = async (newTask: NewTask) => {
    try {
      await addTask(newTask);
      await fetchTasks(selectedDate);
    } catch (err) {
      console.error("Failed to add task:", err);
      throw err;
    }
  };

  const handleUpdateTask = async (id: number, changes: UpdateTaskInput) => {
    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? ({ ...t, ...changes } as Task) : t))
    );
    try {
      await updateTask(id, changes);
      await fetchTasks(selectedDate);
    } catch (err) {
      console.error("Failed to update task:", err);
      await fetchTasks(selectedDate); // Revert on failure
      throw err;
    }
  };

  const handleDeleteTask = async (id: number) => {
    // Optimistic delete
    setTasks((prev) => prev.filter((t) => t.id !== id));
    try {
      await deleteTask(id);
    } catch (err) {
      console.error("Failed to delete task:", err);
      await fetchTasks(selectedDate); // Revert
      throw err;
    }
  };

  const handleToggleComplete = async (id: number, completed: boolean) => {
    // Optimistic toggle
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, completed: completed ? 1 : 0 } : t
      )
    );
    try {
      await toggleComplete(id, completed);
    } catch (err) {
      console.error("Failed to toggle task:", err);
      await fetchTasks(selectedDate);
      throw err;
    }
  };

  const handleSetStatus = async (id: number, status: number) => {
    // Optimistic status update
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: status } : t))
    );
    try {
      await setTaskStatus(id, status);
    } catch (err) {
      console.error("Failed to set task status:", err);
      await fetchTasks(selectedDate);
      throw err;
    }
  };

  return {
    tasks,
    isLoading,
    selectedDate,
    setSelectedDate,
    fetchTasks,
    handleAddTask,
    handleUpdateTask,
    handleDeleteTask,
    handleToggleComplete,
    handleSetStatus,
  };
}
