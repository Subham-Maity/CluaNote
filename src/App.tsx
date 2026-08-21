import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { TitleBar } from "./components/TitleBar";
import { DateStrip } from "./components/DateStrip";
import { AnytimeSection } from "./components/AnytimeSection";
import { Timeline } from "./components/Timeline";
import { FloatingAddButton } from "./components/FloatingAddButton";
import { AddTaskModal } from "./components/AddTaskModal";
import { AboutModal } from "./components/AboutModal";
import { getTasks, addTask, updateTask, deleteTask, toggleComplete } from "./lib/tasks";
import type { Task, NewTask } from "./types/task";

export function App() {
  const [selectedDate, setSelectedDate] = useState<string>(() =>
    format(new Date(), "yyyy-MM-dd")
  );
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddTaskOpen, setIsAddTaskOpen] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  // Zoom in / Zoom out with Ctrl + / Ctrl - / Ctrl 0 or Ctrl + Wheel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === "=" || e.key === "+") {
          e.preventDefault();
          setZoomLevel((prev) => Math.min(Number((prev + 0.1).toFixed(1)), 1.5));
        } else if (e.key === "-") {
          e.preventDefault();
          setZoomLevel((prev) => Math.max(Number((prev - 0.1).toFixed(1)), 0.75));
        } else if (e.key === "0") {
          e.preventDefault();
          setZoomLevel(1);
        }
      }
    };

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        if (e.deltaY < 0) {
          setZoomLevel((prev) => Math.min(Number((prev + 0.05).toFixed(2)), 1.5));
        } else {
          setZoomLevel((prev) => Math.max(Number((prev - 0.05).toFixed(2)), 0.75));
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("wheel", handleWheel);
    };
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
    <div
      style={{ zoom: zoomLevel }}
      className="relative w-full h-full flex flex-col overflow-hidden text-white select-none"
    >
      {/* Dynamic ambient background with lighting */}
      <div className="app-background" />

      {/* Custom Titlebar with native drag and window controls */}
      <TitleBar onOpenAbout={() => setIsAboutOpen(true)} />

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

      {/* About Developer Modal */}
      <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
    </div>
  );
}

export default App;
