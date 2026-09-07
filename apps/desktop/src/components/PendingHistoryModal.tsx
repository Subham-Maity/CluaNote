import React, { useState, useEffect, useCallback } from "react";
import { format, isToday, isPast, parseISO, isYesterday } from "date-fns";
import { getPendingTasks, toggleComplete, setTaskStatus, deleteTask } from "../lib/tasks";
import type { Task } from "../types/task";
import clsx from "clsx";

interface PendingHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTasksChanged: () => void;
  onJumpToDate: (date: string) => void;
}

type SortOrder = "desc" | "asc";

/** Returns a Tailwind color class set based on how overdue the date is. */
function getDateStatus(dateStr: string): "overdue" | "yesterday" | "today" | "future" {
  try {
    const d = parseISO(dateStr);
    if (isToday(d)) return "today";
    if (isYesterday(d)) return "yesterday";
    if (isPast(d)) return "overdue";
    return "future";
  } catch {
    return "overdue";
  }
}

const PRIORITY_DOT: Record<string, string> = {
  high: "bg-rose-500",
  medium: "bg-amber-400",
  low: "bg-emerald-400",
};

export const PendingHistoryModal: React.FC<PendingHistoryModalProps> = ({
  isOpen,
  onClose,
  onTasksChanged,
  onJumpToDate,
}) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [processingIds, setProcessingIds] = useState<Set<number>>(new Set());
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const loadTasks = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getPendingTasks();
      setTasks(data);
    } catch (err) {
      console.error("Failed to load pending tasks:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) loadTasks();
  }, [isOpen, loadTasks]);

  if (!isOpen) return null;

  // Group tasks by date
  const grouped = tasks.reduce<Record<string, Task[]>>((acc, t) => {
    if (!acc[t.date]) acc[t.date] = [];
    acc[t.date].push(t);
    return acc;
  }, {});

  const sortedDates = Object.keys(grouped).sort((a, b) =>
    sortOrder === "desc" ? b.localeCompare(a) : a.localeCompare(b)
  );

  const handleMarkDone = async (task: Task) => {
    setProcessingIds((prev) => new Set(prev).add(task.id));
    // Optimistic removal
    setTasks((prev) => prev.filter((t) => t.id !== task.id));
    try {
      await toggleComplete(task.id, true);
      onTasksChanged();
    } catch (err) {
      console.error("Failed to mark task done:", err);
      // Revert on failure
      setTasks((prev) => [...prev, task].sort((a, b) => b.date.localeCompare(a.date)));
    } finally {
      setProcessingIds((prev) => {
        const s = new Set(prev);
        s.delete(task.id);
        return s;
      });
    }
  };

  const handleMarkNotDone = async (task: Task) => {
    setProcessingIds((prev) => new Set(prev).add(task.id));
    setTasks((prev) => prev.filter((t) => t.id !== task.id));
    try {
      await setTaskStatus(task.id, 2); // 2 = not done
      onTasksChanged();
    } catch (err) {
      console.error("Failed to mark task as not done:", err);
      setTasks((prev) => [...prev, task].sort((a, b) => b.date.localeCompare(a.date)));
    } finally {
      setProcessingIds((prev) => {
        const s = new Set(prev);
        s.delete(task.id);
        return s;
      });
    }
  };

  const handleDelete = async (task: Task) => {
    setProcessingIds((prev) => new Set(prev).add(task.id));
    setTasks((prev) => prev.filter((t) => t.id !== task.id));
    try {
      await deleteTask(task.id);
      onTasksChanged();
    } catch (err) {
      console.error("Failed to delete task:", err);
      setTasks((prev) => [...prev, task].sort((a, b) => b.date.localeCompare(a.date)));
    } finally {
      setProcessingIds((prev) => {
        const s = new Set(prev);
        s.delete(task.id);
        return s;
      });
    }
  };

  const handleJump = (task: Task) => {
    onJumpToDate(task.date);
    onClose();
  };

  const formatDateHeader = (dateStr: string) => {
    try {
      const d = parseISO(dateStr);
      if (isToday(d)) return "Today";
      if (isYesterday(d)) return "Yesterday";
      return format(d, "EEE, MMM d, yyyy");
    } catch {
      return dateStr;
    }
  };

  const totalCount = tasks.length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-[calc(100%-1.5rem)] max-w-lg h-[88vh] flex flex-col glass-modal overflow-hidden animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 pb-3 border-b border-white/[0.08] flex-shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-rose-500 to-orange-400 flex items-center justify-center shadow-md shadow-rose-500/30">
              <svg
                className="w-4 h-4 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-bold text-white/95 flex items-center space-x-2">
                <span>Pending Tasks</span>
                {totalCount > 0 && (
                  <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-rose-500/80 text-white text-[10px] font-bold">
                    {totalCount}
                  </span>
                )}
              </h2>
              <p className="text-[10px] text-white/40">
                Click a task for details · Jump to navigate
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {/* Sort Toggle */}
            <button
              type="button"
              onClick={() => setSortOrder((s) => (s === "desc" ? "asc" : "desc"))}
              title={sortOrder === "desc" ? "Showing newest first — click for oldest first" : "Showing oldest first — click for newest first"}
              className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg glass-button text-[10px] font-medium text-white/60 hover:text-white cursor-pointer"
            >
              <svg
                className={clsx(
                  "w-3 h-3 transition-transform",
                  sortOrder === "asc" ? "rotate-180" : ""
                )}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 4h13M3 8h9M3 12h5m8 0l4-4m0 0l-4-4m4 4H11"
                />
              </svg>
              <span>{sortOrder === "desc" ? "Newest" : "Oldest"}</span>
            </button>
            {/* Close */}
            <button
              type="button"
              onClick={onClose}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white/50 hover:text-white hover:bg-white/[0.1] transition-colors cursor-pointer"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading && (
            <div className="flex flex-col items-center justify-center h-32 space-y-3">
              <div className="w-6 h-6 rounded-full border-2 border-rose-400 border-t-transparent animate-spin" />
              <p className="text-xs text-white/40">Loading pending tasks…</p>
            </div>
          )}

          {!isLoading && totalCount === 0 && (
            <div className="flex flex-col items-center justify-center h-40 text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-emerald-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <p className="text-sm font-semibold text-emerald-400">All caught up!</p>
              <p className="text-xs text-white/30">No pending tasks anywhere 🎉</p>
            </div>
          )}

          {!isLoading && sortedDates.length > 0 && (
            <div className="space-y-4">
              {sortedDates.map((dateStr) => {
                const status = getDateStatus(dateStr);
                const dateTasks = grouped[dateStr];

                const headerClass = {
                  overdue: "text-rose-400 border-rose-500/30 bg-rose-500/[0.06]",
                  yesterday: "text-orange-400 border-orange-500/30 bg-orange-500/[0.06]",
                  today: "text-indigo-400 border-indigo-500/30 bg-indigo-500/[0.06]",
                  future: "text-white/60 border-white/[0.08] bg-white/[0.02]",
                }[status];

                const statusLabel = {
                  overdue: "● Overdue",
                  yesterday: "● Yesterday",
                  today: "★ Today",
                  future: "↑ Upcoming",
                }[status];

                return (
                  <div key={dateStr}>
                    {/* Date group header */}
                    <div
                      className={clsx(
                        "flex items-center justify-between px-3 py-1.5 rounded-xl border mb-2",
                        headerClass
                      )}
                    >
                      <span className="text-xs font-bold">
                        {formatDateHeader(dateStr)}
                      </span>
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] font-medium opacity-70">
                          {statusLabel}
                        </span>
                        <span className="text-[10px] font-bold opacity-60">
                          {dateTasks.length} task{dateTasks.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>

                    {/* Task rows */}
                    <div className="space-y-1.5 pl-1">
                      {dateTasks.map((task) => {
                        const isProcessing = processingIds.has(task.id);
                        const isOverdueTask = status === "overdue" || status === "yesterday";
                        const isExpanded = expandedId === task.id;

                        return (
                          <div
                            key={task.id}
                            className={clsx(
                              "rounded-xl border transition-all",
                              isOverdueTask
                                ? "bg-rose-500/[0.04] border-rose-500/20 hover:border-rose-500/35"
                                : "bg-white/[0.02] border-white/[0.07] hover:border-white/[0.14]",
                              isProcessing && "opacity-50"
                            )}
                          >
                            {/* Main row — click to expand */}
                            <div
                              className="flex items-center justify-between px-3 py-2.5 cursor-pointer group"
                              onClick={() => setExpandedId(isExpanded ? null : task.id)}
                            >
                              <div className="flex items-center space-x-2.5 min-w-0">
                                {/* Priority dot */}
                                <span
                                  className={clsx(
                                    "w-2 h-2 rounded-full flex-shrink-0",
                                    PRIORITY_DOT[task.priority] ?? "bg-white/30"
                                  )}
                                />
                                <div className="min-w-0">
                                  <p className="text-xs font-medium text-white/85 truncate">
                                    {task.title}
                                  </p>
                                  {task.time && (
                                    <p className="text-[10px] text-white/35 mt-0.5">
                                      {task.time}
                                    </p>
                                  )}
                                </div>
                              </div>

                              {/* Actions */}
                              <div className="flex items-center space-x-1 flex-shrink-0 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); handleJump(task); }}
                                  disabled={isProcessing}
                                  title="Jump to this date"
                                  className="flex items-center space-x-1 px-2 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 hover:bg-indigo-500/20 text-[10px] font-medium transition-colors cursor-pointer disabled:opacity-50"
                                >
                                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                  </svg>
                                  <span>Jump</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); handleMarkDone(task); }}
                                  disabled={isProcessing}
                                  title="Mark as done"
                                  className="flex items-center space-x-1 px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 text-[10px] font-medium transition-colors cursor-pointer disabled:opacity-50"
                                >
                                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                  </svg>
                                  <span>Done</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); handleMarkNotDone(task); }}
                                  disabled={isProcessing}
                                  title="Mark as Not Done"
                                  className="flex items-center space-x-1 px-2 py-1 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 hover:bg-rose-500/20 text-[10px] font-medium transition-colors cursor-pointer disabled:opacity-50"
                                >
                                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                  <span>Not Done</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); handleDelete(task); }}
                                  disabled={isProcessing}
                                  title="Delete task"
                                  className="w-6 h-6 rounded-lg flex items-center justify-center text-white/30 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer disabled:opacity-50"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            </div>

                            {/* Expandable detail panel */}
                            {isExpanded && (
                              <div className="px-3 pb-3 border-t border-white/[0.05] animate-fade-in">
                                <div className="mt-2 space-y-1.5">
                                  <div className="flex items-center space-x-2 text-[10px]">
                                    <span className="text-white/30 w-14 flex-shrink-0">Date</span>
                                    <span className="text-white/70 font-medium">{format(parseISO(task.date), "EEEE, MMMM d, yyyy")}</span>
                                  </div>
                                  {task.time && (
                                    <div className="flex items-center space-x-2 text-[10px]">
                                      <span className="text-white/30 w-14 flex-shrink-0">Time</span>
                                      <span className="text-white/70 font-medium">{task.time}</span>
                                    </div>
                                  )}
                                  <div className="flex items-center space-x-2 text-[10px]">
                                    <span className="text-white/30 w-14 flex-shrink-0">Priority</span>
                                    <span className={clsx("font-semibold",
                                      task.priority === "high" ? "text-rose-400" :
                                      task.priority === "medium" ? "text-amber-400" : "text-emerald-400"
                                    )}>
                                      {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                                    </span>
                                  </div>
                                  {task.note && (
                                    <div className="flex items-start space-x-2 text-[10px]">
                                      <span className="text-white/30 w-14 flex-shrink-0 mt-0.5">Note</span>
                                      <span className="text-white/60 leading-relaxed line-clamp-4 note-preview-body">{task.note}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PendingHistoryModal;
