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
import { UpdateBanner } from "./components/UpdateBanner";
import { UpdateModal } from "./components/UpdateModal";
import { ReleaseNotesModal } from "./components/ReleaseNotesModal";
import { PendingHistoryModal } from "./components/PendingHistoryModal";
import { NotDoneHistoryModal } from "./components/NotDoneHistoryModal";
import { CompletedHistoryModal } from "./components/CompletedHistoryModal";
import { CreateFutureNoteModal } from "./components/CreateFutureNoteModal";
import { NotesKanbanModal } from "./components/NotesKanbanModal";
import { PendingReminderBanner } from "./components/PendingReminderBanner";
import {
  getTasks,
  getAllTasks,
  addTask,
  updateTask,
  deleteTask,
  toggleComplete,
  setTaskStatus,
  getPendingTasks,
  getNotDoneTasks,
  getCompletedTasks,
  getYesterdayPendingTasks,
} from "./lib/tasks";
import {
  isAlarmEnabled,
  checkTaskAlarms,
  stopAlarmSound,
  setAlarmTriggerListener,
} from "./lib/alarm";
import { sendTaskNotification } from "./lib/notifications";
import { startBackgroundAutoSync } from "./lib/postgres";
import {
  checkForUpdate,
  filterAnytimeTasks,
  filterTimedTasks,
  type Task,
  type NewTask,
  type UpdateCheckResult,
} from "@cluanote/shared";

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
  const [activeAlarmTitle, setActiveAlarmTitle] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  // Feature 1: Update checker
  const [updateInfo, setUpdateInfo] = useState<UpdateCheckResult | null>(null);
  const [showUpdateBanner, setShowUpdateBanner] = useState(false);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [isReleaseNotesOpen, setIsReleaseNotesOpen] = useState(false);

  // Feature 2: Pending & Not-Done & Completed task history
  const [isPendingHistoryOpen, setIsPendingHistoryOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [isNotDoneHistoryOpen, setIsNotDoneHistoryOpen] = useState(false);
  const [notDoneCount, setNotDoneCount] = useState(0);
  const [isCompletedHistoryOpen, setIsCompletedHistoryOpen] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);

  // Feature 4: Create Future Note & Notes Kanban
  const [isCreateFutureNoteOpen, setIsCreateFutureNoteOpen] = useState(false);
  const [isNotesKanbanOpen, setIsNotesKanbanOpen] = useState(false);

  // Feature 3: Yesterday reminder banner
  const [reminderTasks, setReminderTasks] = useState<Task[]>([]);
  const [showReminderBanner, setShowReminderBanner] = useState(false);

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

  // Feature 1: Check for updates on app mount (non-blocking)
  useEffect(() => {
    checkForUpdate().then((result) => {
      setUpdateInfo(result);
      if (result.hasUpdate) {
        setShowUpdateBanner(true);
      }
    });
  }, []);

  // Feature 2 + 3: Load pending task counts, not-done counts, completed counts, and yesterday reminders
  const refreshPendingState = useCallback(async () => {
    try {
      const all = await getPendingTasks();
      setPendingCount(all.length);

      const notDone = await getNotDoneTasks();
      setNotDoneCount(notDone.length);

      const completed = await getCompletedTasks();
      setCompletedCount(completed.length);

      const yesterday = await getYesterdayPendingTasks();
      // Filter out tasks the user dismissed (stored per-task in localStorage)
      const dismissed = new Set<number>(
        JSON.parse(localStorage.getItem("dismissed_reminder_tasks") || "[]")
      );
      const visible = yesterday.filter((t) => !dismissed.has(t.id));
      setReminderTasks(visible);
      if (visible.length > 0) {
        setShowReminderBanner(true);
      }
    } catch (err) {
      console.warn("Could not load pending/not-done task state:", err);
    }
  }, []);

  useEffect(() => {
    refreshPendingState();
  }, [refreshPendingState]);

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

  // Background PostgreSQL Auto-Sync Worker
  useEffect(() => {
    const stopAutoSync = startBackgroundAutoSync(
      (res) => {
        if (res.pulled_count > 0) {
          fetchTasks(selectedDate);
          refreshPendingState();
        }
      },
      (err) => {
        console.warn("Background auto-sync note:", err);
      }
    );

    return () => {
      stopAutoSync();
    };
  }, [selectedDate, fetchTasks, refreshPendingState]);

  // Background Alarm Checker: runs every 10 seconds across all database tasks
  useEffect(() => {
    setAlarmTriggerListener((title) => {
      setActiveAlarmTitle(title);
    });

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
      refreshPendingState();
    } catch (err) {
      console.error("Failed to toggle task completion:", err);
      // Revert optimistic update on failure
      setTasks(previousTasks);
    }
  };

  // Explicit set task status (0 = active, 1 = completed, 2 = not done)
  const handleSetStatus = async (id: number, status: number) => {
    const previousTasks = [...tasks];
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, completed: status } : t))
    );

    try {
      await setTaskStatus(id, status);
      refreshPendingState();
    } catch (err) {
      console.error("Failed to set task status:", err);
      setTasks(previousTasks);
    }
  };

  // Optimistic delete
  const handleDeleteTask = async (id: number) => {
    const previousTasks = [...tasks];
    setTasks((prev) => prev.filter((t) => t.id !== id));

    try {
      await deleteTask(id);
      refreshPendingState();
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
    // Refresh pending state after any save
    refreshPendingState();
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setIsAddTaskOpen(true);
  };

  const handleOpenAddModal = () => {
    setEditingTask(null);
    setIsAddTaskOpen(true);
  };

  /** Jump to a specific date (used by history modals' Jump button) */
  const handleJumpToDate = (date: string) => {
    setSelectedDate(date);
  };

  // Feature 3: Reminder banner handlers
  const handleDismissReminderTask = (taskId: number) => {
    // Persist dismissal to localStorage so it survives page refreshes
    const dismissed: number[] = JSON.parse(
      localStorage.getItem("dismissed_reminder_tasks") || "[]"
    );
    if (!dismissed.includes(taskId)) {
      dismissed.push(taskId);
      localStorage.setItem("dismissed_reminder_tasks", JSON.stringify(dismissed));
    }
    setReminderTasks((prev) => prev.filter((t) => t.id !== taskId));
    setShowReminderBanner((prev) => prev && reminderTasks.length > 1);
  };

  const handleDismissAllReminders = () => {
    setShowReminderBanner(false);
  };

  const handleReminderMarkDone = async (task: Task) => {
    // Remove from reminder list immediately
    setReminderTasks((prev) => prev.filter((t) => t.id !== task.id));
    if (reminderTasks.length <= 1) setShowReminderBanner(false);
    try {
      await toggleComplete(task.id, true);
      refreshPendingState();
      // Also update the main task list if it's the same date
      if (task.date === selectedDate) {
        await fetchTasks(selectedDate);
      }
    } catch (err) {
      console.error("Failed to mark reminder task done:", err);
    }
  };

  const handleReminderMarkNotDone = async (task: Task) => {
    setReminderTasks((prev) => prev.filter((t) => t.id !== task.id));
    if (reminderTasks.length <= 1) setShowReminderBanner(false);
    try {
      await setTaskStatus(task.id, 2); // 2 = not done
      refreshPendingState();
      if (task.date === selectedDate) {
        await fetchTasks(selectedDate);
      }
    } catch (err) {
      console.error("Failed to mark reminder task as not done:", err);
    }
  };

  // Filter tasks into anytime vs timed
  const anytimeTasks = filterAnytimeTasks(tasks);
  const timedTasks = filterTimedTasks(tasks);

  return (
    <div className="relative w-full h-full flex flex-col overflow-hidden text-white select-none">
      {/* Dynamic ambient background with lighting */}
      <div className="app-background" />

      {/* Custom Titlebar with native drag, alarm glow, and window controls */}
      <TitleBar
        onOpenAbout={() => setIsAboutOpen(true)}
        onOpenAlarm={() => setIsAlarmOpen(true)}
        onOpenBackup={() => setIsBackupOpen(true)}
        onOpenReleaseNotes={() => setIsReleaseNotesOpen(true)}
        onOpenPendingHistory={() => setIsPendingHistoryOpen(true)}
        onOpenNotDoneHistory={() => setIsNotDoneHistoryOpen(true)}
        onOpenCompletedHistory={() => setIsCompletedHistoryOpen(true)}
        onOpenNotesKanban={() => setIsNotesKanbanOpen(true)}
        isAlarmActive={isAlarmActive}
        pendingCount={pendingCount}
        notDoneCount={notDoneCount}
        completedCount={completedCount}
        updateAvailable={updateInfo?.hasUpdate ?? false}
        onCheckUpdate={() => setIsUpdateModalOpen(true)}
      />

      {/* Floating Active Alarm Notification Banner */}
      {activeAlarmTitle && (
        <div className="fixed top-13 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl bg-indigo-950/90 border border-indigo-500/60 shadow-2xl shadow-indigo-500/50 backdrop-blur-xl flex items-center space-x-3.5 animate-scale-up">
          <div className="flex items-center space-x-2">
            <span className="text-base animate-bounce">🔔</span>
            <div className="text-left">
              <p className="text-[10px] text-indigo-300 uppercase font-semibold tracking-wider">
                Alarm Ringing
              </p>
              <p className="text-xs font-bold text-white max-w-[200px] truncate">
                {activeAlarmTitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              stopAlarmSound();
              setActiveAlarmTitle(null);
            }}
            className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white text-xs font-bold shadow-md cursor-pointer transition-transform active:scale-95"
          >
            ⏹ Stop Alarm
          </button>
        </div>
      )}

      {/* Update Available Banner */}
      {showUpdateBanner && updateInfo?.hasUpdate && (
        <UpdateBanner
          latestVersion={updateInfo.latestVersion}
          releaseUrl={updateInfo.releaseUrl}
          releaseBody={updateInfo.releaseBody}
          publishedAt={updateInfo.publishedAt}
          onDismiss={() => setShowUpdateBanner(false)}
        />
      )}

      {/* Yesterday Pending Task Reminder Banner */}
      {showReminderBanner && reminderTasks.length > 0 && (
        <PendingReminderBanner
          tasks={reminderTasks}
          onDismissTask={handleDismissReminderTask}
          onDismissAll={handleDismissAllReminders}
          onMarkDone={handleReminderMarkDone}
          onMarkNotDone={handleReminderMarkNotDone}
        />
      )}

      {/* 7-day horizontal glass date strip */}
      <DateStrip selectedDate={selectedDate} onSelectDate={setSelectedDate} />

      {/* Main schedule view */}
      <main className="relative z-10 flex-1 flex flex-col overflow-y-auto min-h-0">
        {/* Anytime Tasks Section */}
        <AnytimeSection
          tasks={anytimeTasks}
          onToggleComplete={handleToggleComplete}
          onSetStatus={handleSetStatus}
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
          onSetStatus={handleSetStatus}
          onEdit={handleEditTask}
          onDelete={handleDeleteTask}
        />
      </main>

      {/* Floating Add Task + CREATE Note Action Buttons */}
      <FloatingAddButton
        onClick={handleOpenAddModal}
        onCreateNote={() => setIsCreateFutureNoteOpen(true)}
      />

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

      {/* Software Update Modal */}
      <UpdateModal
        isOpen={isUpdateModalOpen}
        onClose={() => setIsUpdateModalOpen(false)}
        onOpenReleaseNotes={() => {
          setIsUpdateModalOpen(false);
          setIsReleaseNotesOpen(true);
        }}
      />

      {/* Release Notes / Changelog Modal */}
      <ReleaseNotesModal
        isOpen={isReleaseNotesOpen}
        onClose={() => setIsReleaseNotesOpen(false)}
      />

      {/* Pending Task History Log Modal */}
      <PendingHistoryModal
        isOpen={isPendingHistoryOpen}
        onClose={() => setIsPendingHistoryOpen(false)}
        onTasksChanged={refreshPendingState}
        onJumpToDate={handleJumpToDate}
      />

      {/* Not Done Task History Log Modal */}
      <NotDoneHistoryModal
        isOpen={isNotDoneHistoryOpen}
        onClose={() => setIsNotDoneHistoryOpen(false)}
        onTasksChanged={refreshPendingState}
        onJumpToDate={handleJumpToDate}
      />

      {/* Completed Task History Modal */}
      <CompletedHistoryModal
        isOpen={isCompletedHistoryOpen}
        onClose={() => setIsCompletedHistoryOpen(false)}
        onTasksChanged={refreshPendingState}
        onJumpToDate={handleJumpToDate}
      />

      {/* Create Future Planning Note Modal */}
      <CreateFutureNoteModal
        isOpen={isCreateFutureNoteOpen}
        onClose={() => setIsCreateFutureNoteOpen(false)}
        onCreated={refreshPendingState}
      />

      {/* Notes Kanban Board — full-screen overlay */}
      <NotesKanbanModal
        isOpen={isNotesKanbanOpen}
        onClose={() => setIsNotesKanbanOpen(false)}
        onDataChanged={refreshPendingState}
        onJumpToDate={(date) => {
          setIsNotesKanbanOpen(false);
          handleJumpToDate(date);
        }}
      />
    </div>
  );
}

export default App;
