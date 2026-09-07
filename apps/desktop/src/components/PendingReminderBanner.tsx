import React, { useState } from "react";
import { format, parseISO } from "date-fns";
import type { Task } from "../types/task";
import clsx from "clsx";

interface PendingReminderBannerProps {
  tasks: Task[];
  onDismissTask: (taskId: number) => void;
  onDismissAll: () => void;
  onMarkDone: (task: Task) => void;
  onMarkNotDone: (task: Task) => void;
}

/** Returns color scheme based on pending task count. */
function getColorScheme(count: number) {
  if (count >= 5) {
    return {
      bg: "from-rose-950/85 to-red-950/85",
      border: "border-rose-500/40",
      badge: "bg-rose-500",
      badgeShadow: "shadow-rose-500/30",
      iconGrad: "from-rose-500 to-red-500",
      label: "text-rose-300",
      dot: "bg-rose-400",
      dotRing: "bg-rose-500",
      alert: "🔴 High Priority",
      text: "text-rose-100",
    };
  }
  if (count >= 3) {
    return {
      bg: "from-amber-950/85 to-orange-950/85",
      border: "border-amber-500/40",
      badge: "bg-amber-500",
      badgeShadow: "shadow-amber-500/30",
      iconGrad: "from-amber-500 to-orange-500",
      label: "text-amber-300",
      dot: "bg-amber-400",
      dotRing: "bg-amber-500",
      alert: "🟠 Overdue Tasks",
      text: "text-amber-100",
    };
  }
  return {
    bg: "from-emerald-950/85 to-teal-950/85",
    border: "border-emerald-500/40",
    badge: "bg-emerald-500",
    badgeShadow: "shadow-emerald-500/30",
    iconGrad: "from-emerald-500 to-teal-500",
    label: "text-emerald-300",
    dot: "bg-emerald-400",
    dotRing: "bg-emerald-500",
    alert: "🟢 From Yesterday",
    text: "text-emerald-100",
  };
}

const PRIORITY_DOT: Record<string, string> = {
  high: "bg-rose-500",
  medium: "bg-amber-400",
  low: "bg-emerald-400",
};

export const PendingReminderBanner: React.FC<PendingReminderBannerProps> = ({
  tasks,
  onDismissTask,
  onDismissAll,
  onMarkDone,
  onMarkNotDone,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (tasks.length === 0) return null;

  const colors = getColorScheme(tasks.length);
  const currentTask = tasks[currentIndex] ?? tasks[0];
  const isMultiple = tasks.length > 1;

  const handlePrev = () =>
    setCurrentIndex((i) => (i > 0 ? i - 1 : tasks.length - 1));
  const handleNext = () =>
    setCurrentIndex((i) => (i < tasks.length - 1 ? i + 1 : 0));

  // When a task is dismissed, move index safely
  const handleDismissTask = () => {
    if (currentIndex >= tasks.length - 1) {
      setCurrentIndex(Math.max(0, tasks.length - 2));
    }
    onDismissTask(currentTask.id);
  };

  const handleMarkDone = () => {
    if (currentIndex >= tasks.length - 1) {
      setCurrentIndex(Math.max(0, tasks.length - 2));
    }
    onMarkDone(currentTask);
  };

  const handleMarkNotDone = () => {
    if (currentIndex >= tasks.length - 1) {
      setCurrentIndex(Math.max(0, tasks.length - 2));
    }
    onMarkNotDone(currentTask);
  };

  const formatTaskDate = (d: string) => {
    try {
      return format(parseISO(d), "MMM d");
    } catch {
      return d;
    }
  };

  return (
    <div
      className={clsx(
        "relative z-20 mx-3 mt-2 rounded-2xl overflow-hidden border animate-slide-down",
        colors.border
      )}
    >
      {/* Background gradient */}
      <div
        className={clsx(
          "absolute inset-0 bg-gradient-to-r backdrop-blur-xl",
          colors.bg
        )}
      />

      <div className="relative p-3">
        {/* Top row: alert label + task count + dismiss all */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            {/* Pulsing dot */}
            <span className="relative flex h-2.5 w-2.5">
              <span
                className={clsx(
                  "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                  colors.dotRing
                )}
              />
              <span
                className={clsx(
                  "relative inline-flex rounded-full h-2.5 w-2.5",
                  colors.dot
                )}
              />
            </span>
            <span
              className={clsx("text-[10px] font-bold uppercase tracking-wider", colors.label)}
            >
              {colors.alert}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            {/* Count badge */}
            <span
              className={clsx(
                "inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[10px] font-bold text-white shadow-sm",
                colors.badge,
                colors.badgeShadow
              )}
            >
              {tasks.length} pending
            </span>
            {/* Dismiss all */}
            <button
              type="button"
              onClick={onDismissAll}
              className="text-[10px] text-white/40 hover:text-white/70 transition-colors cursor-pointer underline"
            >
              Dismiss all
            </button>
            <button
              type="button"
              onClick={onDismissAll}
              className="w-6 h-6 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/[0.1] transition-colors cursor-pointer"
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Task card row */}
        <div className="flex items-center space-x-2">
          {/* Prev arrow */}
          {isMultiple && (
            <button
              type="button"
              onClick={handlePrev}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/[0.1] transition-colors flex-shrink-0 cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}

          {/* Task content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 min-w-0">
              <span
                className={clsx(
                  "w-1.5 h-1.5 rounded-full flex-shrink-0",
                  PRIORITY_DOT[currentTask.priority] ?? "bg-white/30"
                )}
              />
              <p className={clsx("text-sm font-semibold truncate", colors.text)}>
                {currentTask.title}
              </p>
              <span className="text-[10px] text-white/35 flex-shrink-0">
                {formatTaskDate(currentTask.date)}
                {currentTask.time ? ` · ${currentTask.time}` : ""}
              </span>
            </div>
            {currentTask.note && (
              <p className="text-[10px] text-white/40 mt-0.5 truncate pl-3.5">
                {currentTask.note}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-1.5 flex-shrink-0">
            <button
              type="button"
              onClick={handleMarkDone}
              className="flex items-center space-x-1 px-2 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-[10px] font-bold transition-colors cursor-pointer border border-emerald-500/30"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span>Done</span>
            </button>
            <button
              type="button"
              onClick={handleMarkNotDone}
              title="Mark as Not Done"
              className="flex items-center space-x-1 px-2 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-[10px] font-bold transition-colors cursor-pointer border border-rose-500/30"
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span>Not Done</span>
            </button>
            <button
              type="button"
              onClick={handleDismissTask}
              title="Don't show this task again"
              className="text-[10px] text-white/35 hover:text-white/60 transition-colors cursor-pointer whitespace-nowrap pl-1"
            >
              Hide
            </button>
          </div>

          {/* Next arrow */}
          {isMultiple && (
            <button
              type="button"
              onClick={handleNext}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/[0.1] transition-colors flex-shrink-0 cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
        </div>

        {/* Carousel dot indicators */}
        {isMultiple && (
          <div className="flex justify-center space-x-1 mt-2.5">
            {tasks.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setCurrentIndex(i)}
                className={clsx(
                  "rounded-full transition-all cursor-pointer",
                  i === currentIndex
                    ? clsx("w-4 h-1.5", colors.dot)
                    : "w-1.5 h-1.5 bg-white/20 hover:bg-white/40"
                )}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PendingReminderBanner;
