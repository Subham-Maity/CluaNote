import React, { useState, useEffect, useCallback } from "react";
import { format, isToday, parseISO, isYesterday } from "date-fns";
import { getCompletedTasks, setTaskStatus, deleteTask } from "../lib/tasks";
import type { Task } from "../types/task";
import clsx from "clsx";

interface CompletedHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTasksChanged: () => void;
  onJumpToDate: (date: string) => void;
}

type SortOrder = "desc" | "asc";

const PRIORITY_LABEL: Record<string, string> = {
  high: "High",
  medium: "Medium",
  low: "Low",
};

export const CompletedHistoryModal: React.FC<CompletedHistoryModalProps> = ({
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
      const data = await getCompletedTasks();
      setTasks(data);
    } catch (err) {
      console.error("Failed to load completed tasks:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) loadTasks();
  }, [isOpen, loadTasks]);

  if (!isOpen) return null;

  const grouped = tasks.reduce<Record<string, Task[]>>((acc, t) => {
    if (!acc[t.date]) acc[t.date] = [];
    acc[t.date].push(t);
    return acc;
  }, {});

  const sortedDates = Object.keys(grouped).sort((a, b) =>
    sortOrder === "desc" ? b.localeCompare(a) : a.localeCompare(b)
  );

  /** Optimistic removal helper shared by all action buttons */
  const removeAndUpdate = async (task: Task, fn: () => Promise<void>) => {
    setProcessingIds((p) => new Set(p).add(task.id));
    setTasks((p) => p.filter((t) => t.id !== task.id));
    try {
      await fn();
      onTasksChanged();
    } catch {
      // Revert on failure
      setTasks((p) => [...p, task].sort((a, b) => b.date.localeCompare(a.date)));
    } finally {
      setProcessingIds((p) => {
        const s = new Set(p);
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
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-md shadow-emerald-500/30">
              <svg
                className="w-4 h-4 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-bold text-white/95 flex items-center space-x-2">
                <span>Completed Tasks</span>
                {totalCount > 0 && (
                  <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-emerald-500/80 text-white text-[10px] font-bold">
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
            <button
              type="button"
              onClick={() => setSortOrder((s) => (s === "desc" ? "asc" : "desc"))}
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
            <button
              type="button"
              onClick={onClose}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white/50 hover:text-white hover:bg-white/[0.1] transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
              <div className="w-6 h-6 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin" />
              <p className="text-xs text-white/40">Loading completed tasks…</p>
            </div>
          )}

          {!isLoading && totalCount === 0 && (
            <div className="flex flex-col items-center justify-center h-40 text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-white/30"
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
              <p className="text-sm font-semibold text-white/50">No completed tasks yet</p>
              <p className="text-xs text-white/30">Mark tasks as done to see them here</p>
            </div>
          )}

          {!isLoading && sortedDates.length > 0 && (
            <div className="space-y-4">
              {sortedDates.map((dateStr) => {
                const dateTasks = grouped[dateStr];
                return (
                  <div key={dateStr}>
                    {/* Date group header */}
                    <div className="flex items-center justify-between px-3 py-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/[0.06] text-emerald-400 mb-2">
                      <span className="text-xs font-bold">{formatDateHeader(dateStr)}</span>
                      <span className="text-[10px] font-bold opacity-70">
                        {dateTasks.length} task{dateTasks.length !== 1 ? "s" : ""}
                      </span>
                    </div>

                    {/* Task rows */}
                    <div className="space-y-1.5 pl-1">
                      {dateTasks.map((task) => {
                        const isProcessing = processingIds.has(task.id);
                        const isExpanded = expandedId === task.id;

                        return (
                          <div
                            key={task.id}
                            className={clsx(
                              "rounded-xl border bg-emerald-500/[0.03] border-emerald-500/20 hover:border-emerald-500/35 transition-all",
                              isProcessing && "opacity-50"
                            )}
                          >
                            {/* Main row – click to expand */}
                            <div
                              className="flex items-center justify-between px-3 py-2.5 cursor-pointer group"
                              onClick={() => setExpandedId(isExpanded ? null : task.id)}
                            >
                              <div className="flex items-center space-x-2.5 min-w-0">
                                {/* Green check icon */}
                                <div className="w-4 h-4 rounded-md bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center flex-shrink-0">
                                  <svg
                                    className="w-2.5 h-2.5 text-emerald-400"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth={3}
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      d="M5 13l4 4L19 7"
                                    />
                                  </svg>
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-medium text-emerald-200/85 line-through truncate">
                                    {task.title}
                                  </p>
                                  {task.time && (
                                    <p className="text-[10px] text-white/35 mt-0.5">{task.time}</p>
                                  )}
                                </div>
                              </div>

                              {/* Actions */}
                              <div className="flex items-center space-x-1 flex-shrink-0 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                {/* Jump */}
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
                                {/* Revert to Pending */}
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); removeAndUpdate(task, () => setTaskStatus(task.id, 0)); }}
                                  disabled={isProcessing}
                                  title="Move back to Pending"
                                  className="flex items-center space-x-1 px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 hover:bg-amber-500/20 text-[10px] font-medium transition-colors cursor-pointer disabled:opacity-50"
                                >
                                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                  </svg>
                                  <span>Pending</span>
                                </button>
                                {/* Not Done */}
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); removeAndUpdate(task, () => setTaskStatus(task.id, 2)); }}
                                  disabled={isProcessing}
                                  title="Mark as Not Done"
                                  className="flex items-center space-x-1 px-2 py-1 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 hover:bg-rose-500/20 text-[10px] font-medium transition-colors cursor-pointer disabled:opacity-50"
                                >
                                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                  <span>Not Done</span>
                                </button>
                                {/* Delete */}
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); removeAndUpdate(task, () => deleteTask(task.id)); }}
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
                              <div className="px-3 pb-3 border-t border-emerald-500/[0.1] animate-fade-in">
                                <div className="mt-2 space-y-1.5">
                                  <div className="flex items-center space-x-2 text-[10px]">
                                    <span className="text-white/30 w-14 flex-shrink-0">Date</span>
                                    <span className="text-white/70 font-medium">
                                      {format(parseISO(task.date), "EEEE, MMMM d, yyyy")}
                                    </span>
                                  </div>
                                  {task.time && (
                                    <div className="flex items-center space-x-2 text-[10px]">
                                      <span className="text-white/30 w-14 flex-shrink-0">Time</span>
                                      <span className="text-white/70 font-medium">{task.time}</span>
                                    </div>
                                  )}
                                  <div className="flex items-center space-x-2 text-[10px]">
                                    <span className="text-white/30 w-14 flex-shrink-0">Priority</span>
                                    <span
                                      className={clsx(
                                        "font-semibold",
                                        task.priority === "high"
                                          ? "text-rose-400"
                                          : task.priority === "medium"
                                          ? "text-amber-400"
                                          : "text-emerald-400"
                                      )}
                                    >
                                      {PRIORITY_LABEL[task.priority] ?? task.priority}
                                    </span>
                                  </div>
                                  {task.note && (
                                    <div className="flex items-start space-x-2 text-[10px]">
                                      <span className="text-white/30 w-14 flex-shrink-0 mt-0.5">Note</span>
                                      <span className="text-white/60 leading-relaxed line-clamp-4 note-preview-body">
                                        {task.note}
                                      </span>
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

export default CompletedHistoryModal;
