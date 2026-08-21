import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { TitleBar } from "./components/TitleBar";
import { DateStrip } from "./components/DateStrip";
import { AnytimeSection } from "./components/AnytimeSection";
import { Timeline } from "./components/Timeline";
import { FloatingAddButton } from "./components/FloatingAddButton";
import { AddTaskModal } from "./components/AddTaskModal";
import { AboutModal } from "./components/AboutModal";
import { AlarmModal } from "./components/AlarmModal";
import { BackupModal } from "./components/BackupModal";
import {
  getTasks,
  getAllTasks,
  addTask,
  updateTask,
  deleteTask,
  toggleComplete,
} from "./lib/tasks";
import { isAlarmEnabled, checkTaskAlarms } from "./lib/alarm";
import { sendTaskNotification } from "./lib/notifications";
import type { Task, NewTask } from "./types/task";

export function App() {
  const [selectedDate, setSelectedDate] = useState<string>(() =>
    format(new Date(), "yyyy-MM-dd")
  );
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [isAlarmOpen, setIsAlarmOpen] = useState(false);
  const [isBackupOpen, setIsBackupOpen] = useState(false);
  const [isAlarmActive, setIsAlarmActive] = useState(() => isAlarmEnabled());
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Zoom via Tauri native webview API (Ctrl+/- handled by zoomHotkeysEnabled in tauri.conf.json)
  useEffect(() => {
    let zoomLevel = 1;

    const handleKeyDown = async (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === "=" || e.key === "+") {
          e.preventDefault();
          zoomLevel = Math.min(Number((zoomLevel + 0.1).toFixed(1)), 2.0);
          try {
            const { getCurrentWebview } = await import("@tauri-apps/api/webview");
            await getCurrentWebview().setZoom(zoomLevel);
          } catch {
            // fallback: not in Tauri context
          }
        } else if (e.key === "-") {
          e.preventDefault();
          zoomLevel = Math.max(Number((zoomLevel - 0.1).toFixed(1)), 0.5);
          try {
            const { getCurrentWebview } = await import("@tauri-apps/api/webview");
            await getCurrentWebview().setZoom(zoomLevel);
          } catch {
            // fallback
          }
        } else if (e.key === "0") {
          e.preventDefault();
          zoomLevel = 1;
          try {
            const { getCurrentWebview } = await import("@tauri-apps/api/webview");
            await getCurrentWebview().setZoom(1);
          } catch {
            // fallback
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Fetch tasks whenever selectedDate changes
  const fetchTasks = useCallback(async (date: string) => {
    try {
      setIsLoading(true);
      const data = await getTasks(date);
      setTasks(data);
    } catch (err) {
      console.error("Failed to load tasks for date:", date, err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks(selectedDate);
  }, [selectedDate, fetchTasks]);

  // Background Alarm Checker: runs every 10 seconds across all database tasks
  useEffect(() => {
    const alarmInterval = setInterval(async () => {
      try {
        if (isAlarmEnabled()) {
          const allTasks = await getAllTasks();
          checkTaskAlarms(allTasks);
        }
      } catch (err) {
        console.warn("Alarm check ticker notice:", err);
      }
    }, 10000);

    return () => clearInterval(alarmInterval);
  }, []);

  // Optimistic toggle completion
  const handleToggleComplete = async (id: number, completed: boolean) => {
    const previousTasks = [...tasks];
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: completed ? 1 : 0 } : t))
    );

    try {
      await toggleComplete(id, completed);
    } catch (err) {
      console.error("Failed to toggle task completion:", err);
      // Revert optimistic update on failure
      setTasks(previousTasks);
    }
  };

  // Optimistic delete
  const handleDeleteTask = async (id: number) => {
    const previousTasks = [...tasks];
    setTasks((prev) => prev.filter((t) => t.id !== id));

    try {
      await deleteTask(id);
    } catch (err) {
      console.error("Failed to delete task:", err);
      // Revert on failure
      setTasks(previousTasks);
    }
  };

  // Save (Create or Update)
  const handleSaveTask = async (taskData: NewTask, editId?: number) => {
    if (editId) {
      await updateTask(editId, taskData);
    } else {
      await addTask(taskData);
      // Send desktop notification for new task
      sendTaskNotification(
        taskData.title,
        taskData.time ? `Scheduled for ${taskData.time}` : "Added to Anytime tasks"
      );
    }

    // Refresh if task date matches or switch to task date
    if (taskData.date === selectedDate) {
      await fetchTasks(selectedDate);
    } else {
      setSelectedDate(taskData.date);
    }
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setIsAddTaskOpen(true);
  };

  const handleOpenAddModal = () => {
    setEditingTask(null);
    setIsAddTaskOpen(true);
  };

  // Filter tasks into anytime vs timed
  const anytimeTasks = tasks.filter((t) => !t.time || t.time.trim() === "");
  const timedTasks = tasks.filter((t) => t.time && t.time.trim() !== "");

  return (
    <div className="relative w-full h-full flex flex-col overflow-hidden text-white select-none">
      {/* Dynamic ambient background with lighting */}
      <div className="app-background" />

      {/* Custom Titlebar with native drag, alarm glow, and window controls */}
      <TitleBar
        onOpenAbout={() => setIsAboutOpen(true)}
        onOpenAlarm={() => setIsAlarmOpen(true)}
        onOpenBackup={() => setIsBackupOpen(true)}
        isAlarmActive={isAlarmActive}
      />

      {/* 7-day horizontal glass date strip */}
      <DateStrip selectedDate={selectedDate} onSelectDate={setSelectedDate} />

      {/* Main schedule view */}
      <main className="relative z-10 flex-1 flex flex-col overflow-y-auto min-h-0">
        {/* Anytime Tasks Section */}
        <AnytimeSection
          tasks={anytimeTasks}
          onToggleComplete={handleToggleComplete}
          onEdit={handleEditTask}
          onDelete={handleDeleteTask}
        />

        {/* Empty state hint when no tasks exist on this date */}
        {!isLoading && tasks.length === 0 && (
          <div className="px-4 py-8 flex flex-col items-center justify-center text-center">
            <div className="w-10 h-10 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-indigo-400 mb-2.5">
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.8}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
            </div>
            <p className="text-xs font-medium text-white/60">No tasks planned for this day</p>
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="mt-2 text-xs text-indigo-400 hover:text-indigo-300 font-medium cursor-pointer"
            >
              + Add a task
            </button>
          </div>
        )}

        {/* Hourly Timeline */}
        <Timeline
          selectedDate={selectedDate}
          tasks={timedTasks}
          onToggleComplete={handleToggleComplete}
          onEdit={handleEditTask}
          onDelete={handleDeleteTask}
        />
      </main>

      {/* Floating Add Task Action Button */}
      <FloatingAddButton onClick={handleOpenAddModal} />

      {/* Add / Edit Task Glass Modal */}
      <AddTaskModal
        isOpen={isAddTaskOpen}
        selectedDate={selectedDate}
        editingTask={editingTask}
        onClose={() => {
          setIsAddTaskOpen(false);
          setEditingTask(null);
        }}
        onSave={handleSaveTask}
      />

      {/* Task Alarm & Audio Settings Modal */}
      <AlarmModal
        isOpen={isAlarmOpen}
        onClose={() => setIsAlarmOpen(false)}
        onAlarmToggle={(enabled) => setIsAlarmActive(enabled)}
      />

      {/* Backup & Restore Modal */}
      <BackupModal
        isOpen={isBackupOpen}
        onClose={() => setIsBackupOpen(false)}
        onDataRestored={() => fetchTasks(selectedDate)}
      />

      {/* About Developer Modal */}
      <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
    </div>
  );
}

export default App;
