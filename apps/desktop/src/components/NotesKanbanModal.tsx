import React, { useState, useEffect, useCallback, useRef } from "react";
import { format, parseISO } from "date-fns";
import { getFutureNotes, pushNoteToEvent, deleteTask, updateTask } from "../lib/tasks";
import type { Task } from "../types/task";
import clsx from "clsx";

interface NotesKanbanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataChanged: () => void;
  onJumpToDate: (date: string) => void;
}

type KanbanStatus = "todo" | "doing" | "done";

interface KanbanTask extends Task {
  kanbanStatus: KanbanStatus;
}

const PRIORITY_DOT: Record<string, string> = {
  high: "bg-rose-500",
  medium: "bg-amber-400",
  low: "bg-emerald-400",
};

const PRIORITY_COLOR: Record<string, string> = {
  high: "text-rose-400",
  medium: "text-amber-400",
  low: "text-emerald-400",
};

const COLUMN_CONFIG: {
  id: KanbanStatus;
  label: string;
  accent: string;
  border: string;
  bg: string;
  headerBg: string;
}[] = [
  {
    id: "todo",
    label: "📋 To-Do",
    accent: "text-slate-300",
    border: "border-slate-500/25",
    bg: "bg-slate-500/[0.04]",
    headerBg: "bg-slate-500/[0.08] border-slate-500/20",
  },
  {
    id: "doing",
    label: "⚡ In Progress",
    accent: "text-amber-300",
    border: "border-amber-500/25",
    bg: "bg-amber-500/[0.04]",
    headerBg: "bg-amber-500/[0.08] border-amber-500/20",
  },
  {
    id: "done",
    label: "✅ Done",
    accent: "text-emerald-300",
    border: "border-emerald-500/25",
    bg: "bg-emerald-500/[0.04]",
    headerBg: "bg-emerald-500/[0.08] border-emerald-500/20",
  },
];

/**
 * Simple kanban status persistence via task.completed field repurposing:
 *   completed=0  → "todo"
 *   completed=3  → "doing" (new kanban-only status value)
 *   completed=1  → "done" (within future notes only)
 */
function completedToKanban(completed: number): KanbanStatus {
  if (completed === 1) return "done";
  if (completed === 3) return "doing";
  return "todo";
}
function kanbanToCompleted(k: KanbanStatus): number {
  if (k === "done") return 1;
  if (k === "doing") return 3;
  return 0;
}

export const NotesKanbanModal: React.FC<NotesKanbanModalProps> = ({
  isOpen,
  onClose,
  onDataChanged,
  onJumpToDate,
}) => {
  const [notes, setNotes] = useState<KanbanTask[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [dragOverCol, setDragOverCol] = useState<KanbanStatus | null>(null);
  const dragTask = useRef<KanbanTask | null>(null);

  const loadNotes = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await getFutureNotes();
      setNotes(
        data.map((t) => ({ ...t, kanbanStatus: completedToKanban(t.completed) }))
      );
    } catch (err) {
      console.error("Failed to load future notes:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) loadNotes();
  }, [isOpen, loadNotes]);

  if (!isOpen) return null;

  const columns: Record<KanbanStatus, KanbanTask[]> = {
    todo: [],
    doing: [],
    done: [],
  };
  notes.forEach((n) => columns[n.kanbanStatus].push(n));

  // ───── Drag & Drop ─────
  const handleDragStart = (task: KanbanTask, e: React.DragEvent) => {
    dragTask.current = task;
    setDraggingId(task.id);
    e.dataTransfer.setData("text/plain", String(task.id));
    e.dataTransfer.effectAllowed = "move";
  };
  const handleDragEnd = () => {
    setDraggingId(null);
    setDragOverCol(null);
    dragTask.current = null;
  };
  const handleDrop = async (targetCol: KanbanStatus, e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const rawId = e.dataTransfer.getData("text/plain");
    const taskId = rawId ? Number(rawId) : dragTask.current?.id;
    const task = notes.find((n) => n.id === taskId) || dragTask.current;

    setDragOverCol(null);
    setDraggingId(null);
    dragTask.current = null;

    if (!task || task.kanbanStatus === targetCol) {
      return;
    }

    // Optimistic update
    setNotes((prev) =>
      prev.map((n) =>
        n.id === task.id ? { ...n, kanbanStatus: targetCol } : n
      )
    );

    try {
      await updateTask(task.id, { completed: kanbanToCompleted(targetCol) });
      onDataChanged();
    } catch (err) {
      console.error("Failed to update kanban status:", err);
      // Revert
      setNotes((prev) =>
        prev.map((n) =>
          n.id === task.id ? { ...n, kanbanStatus: task.kanbanStatus } : n
        )
      );
    }
  };

  // ───── Status Change (Dropdown) ─────
  const handleStatusChange = async (task: KanbanTask, newStatus: KanbanStatus) => {
    if (task.kanbanStatus === newStatus) return;
    const oldStatus = task.kanbanStatus;

    // Optimistic update: card moves to the target column immediately
    setNotes((prev) =>
      prev.map((n) =>
        n.id === task.id ? { ...n, kanbanStatus: newStatus } : n
      )
    );

    try {
      await updateTask(task.id, { completed: kanbanToCompleted(newStatus) });
      onDataChanged();
    } catch (err) {
      console.error("Failed to update kanban status via dropdown:", err);
      // Revert
      setNotes((prev) =>
        prev.map((n) =>
          n.id === task.id ? { ...n, kanbanStatus: oldStatus } : n
        )
      );
    }
  };

  // ───── Actions ─────
  const handlePushToEvent = async (task: KanbanTask) => {
    setNotes((p) => p.filter((n) => n.id !== task.id));
    try {
      await pushNoteToEvent(task.id);
      onDataChanged();
      onJumpToDate(task.date);
      onClose();
    } catch {
      setNotes((p) => [...p, task]);
    }
  };

  const handleDelete = async (task: KanbanTask) => {
    setNotes((p) => p.filter((n) => n.id !== task.id));
    try {
      await deleteTask(task.id);
    } catch {
      setNotes((p) => [...p, task]);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/75 backdrop-blur-md animate-fade-in"
      style={{ fontFamily: "inherit" }}
    >
      {/* Kanban Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.08] flex-shrink-0"
           style={{ background: "rgba(15,10,30,0.85)" }}>
        <div className="flex items-center space-x-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, rgba(139,92,246,0.9) 0%, rgba(59,130,246,0.9) 100%)",
              boxShadow: "0 4px 16px rgba(139,92,246,0.4)",
            }}
          >
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
            </svg>
          </div>
          <div>
            <h2 className="text-sm font-bold text-white/95">Future Notes</h2>
            <p className="text-[10px] text-violet-300/60">Drag cards between columns · Push to Event to add to timeline</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <span className="text-[10px] text-white/30">
            {notes.length} note{notes.length !== 1 ? "s" : ""}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-white/50 hover:text-white hover:bg-white/[0.1] transition-colors cursor-pointer"
          >
            <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-hidden p-5">
        {isLoading && (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center space-y-3">
              <div className="w-8 h-8 rounded-full border-2 border-violet-400 border-t-transparent animate-spin" />
              <p className="text-sm text-white/40">Loading notes…</p>
            </div>
          </div>
        )}

        {!isLoading && notes.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-3">
              <div
                className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center"
                style={{ background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.25)" }}
              >
                <svg className="w-8 h-8 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-white/60">No future notes yet</p>
              <p className="text-xs text-white/30">Use the CREATE button to plan ahead</p>
            </div>
          </div>
        )}

        {!isLoading && notes.length > 0 && (
          <div className="h-full grid grid-cols-3 gap-4">
            {COLUMN_CONFIG.map((col) => {
              const colTasks = columns[col.id];
              const isDragTarget = dragOverCol === col.id;

              return (
                <div
                  key={col.id}
                  className={clsx(
                    "flex flex-col rounded-2xl border transition-all duration-200",
                    col.bg,
                    isDragTarget
                      ? "border-violet-500/50 ring-1 ring-violet-500/30"
                      : col.border
                  )}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                    if (dragOverCol !== col.id) setDragOverCol(col.id);
                  }}
                  onDrop={(e) => handleDrop(col.id, e)}
                >
                  {/* Column Header */}
                  <div className={clsx("flex items-center justify-between px-4 py-3 rounded-t-2xl border-b", col.headerBg)}>
                    <span className={clsx("text-xs font-bold", col.accent)}>{col.label}</span>
                    <span className="text-[10px] text-white/30 font-medium">{colTasks.length}</span>
                  </div>

                  {/* Cards */}
                  <div
                    className="flex-1 overflow-y-auto p-3 space-y-2.5"
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "move";
                      if (dragOverCol !== col.id) setDragOverCol(col.id);
                    }}
                    onDrop={(e) => handleDrop(col.id, e)}
                  >
                    {colTasks.length === 0 && (
                      <div className={clsx(
                        "flex items-center justify-center h-16 rounded-xl border border-dashed text-[10px] transition-all",
                        isDragTarget
                          ? "border-violet-500/40 text-violet-400/60"
                          : "border-white/[0.07] text-white/20"
                      )}>
                        {isDragTarget ? "Drop here" : "Empty"}
                      </div>
                    )}
                    {colTasks.map((task) => {
                      const isExpanded = expandedId === task.id;
                      const isDragging = draggingId === task.id;

                      return (
                        <div
                          key={task.id}
                          draggable
                          onDragStart={(e) => handleDragStart(task, e)}
                          onDragEnd={handleDragEnd}
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.dataTransfer.dropEffect = "move";
                            if (dragOverCol !== col.id) setDragOverCol(col.id);
                          }}
                          onDrop={(e) => handleDrop(col.id, e)}
                          className={clsx(
                            "rounded-xl border transition-all cursor-grab active:cursor-grabbing select-none",
                            "bg-white/[0.03] border-white/[0.09] hover:border-white/[0.16] hover:bg-white/[0.05]",
                            isDragging && "opacity-40 scale-95"
                          )}
                        >
                          {/* Card top – click to expand */}
                          <div
                            className="px-3 py-2.5 space-y-2 cursor-pointer"
                            onClick={() => setExpandedId(isExpanded ? null : task.id)}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-xs font-semibold text-white/88 leading-tight line-clamp-2 flex-1">
                                {task.title}
                              </p>
                              <div className="flex items-center space-x-1.5 shrink-0 mt-0.5">
                                <span className={clsx("text-[9px] font-semibold", PRIORITY_COLOR[task.priority])}>
                                  {task.priority}
                                </span>
                                <span
                                  className={clsx(
                                    "w-2 h-2 rounded-full",
                                    PRIORITY_DOT[task.priority] ?? "bg-white/20"
                                  )}
                                />
                              </div>
                            </div>

                            {task.note && (
                              <p className="text-[10px] text-white/40 leading-relaxed line-clamp-2 note-preview-body">
                                {task.note}
                              </p>
                            )}

                            <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-white/[0.05]">
                              {/* Status Dropdown */}
                              <div
                                className="flex items-center space-x-1"
                                onClick={(e) => e.stopPropagation()}
                                onMouseDown={(e) => e.stopPropagation()}
                                onDragStart={(e) => { e.preventDefault(); e.stopPropagation(); }}
                              >
                                <select
                                  value={task.kanbanStatus}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    handleStatusChange(task, e.target.value as KanbanStatus);
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  onMouseDown={(e) => e.stopPropagation()}
                                  className={clsx(
                                    "text-[10px] font-semibold rounded-md px-2 py-0.5 border cursor-pointer transition-all outline-none",
                                    task.kanbanStatus === "todo" && "bg-slate-500/15 text-slate-300 border-slate-500/30 hover:bg-slate-500/25",
                                    task.kanbanStatus === "doing" && "bg-amber-500/15 text-amber-300 border-amber-500/35 hover:bg-amber-500/25",
                                    task.kanbanStatus === "done" && "bg-emerald-500/15 text-emerald-300 border-emerald-500/35 hover:bg-emerald-500/25"
                                  )}
                                  title="Change status to move between columns"
                                >
                                  <option value="todo" className="bg-[#181920] text-slate-300">📋 To-Do</option>
                                  <option value="doing" className="bg-[#181920] text-amber-300">⚡ In Progress</option>
                                  <option value="done" className="bg-[#181920] text-emerald-300">✅ Done</option>
                                </select>
                              </div>

                              <span className="text-[9px] text-white/30 font-medium">
                                {format(parseISO(task.date), "MMM d, yyyy")}
                              </span>
                            </div>
                          </div>

                          {/* Expand panel */}
                          {isExpanded && (
                            <div className="px-3 pb-3 border-t border-white/[0.05] animate-fade-in">
                              <div className="mt-2 space-y-2">
                                {task.note && (
                                  <p className="text-[10px] text-white/55 leading-relaxed note-preview-body">
                                    {task.note}
                                  </p>
                                )}
                                <div className="flex flex-wrap gap-1.5 pt-1">
                                  {/* Push to Event */}
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); handlePushToEvent(task); }}
                                    title="Push to timeline event on target date"
                                    className="flex items-center space-x-1 px-2 py-1 rounded-lg text-[9px] font-semibold transition-colors cursor-pointer"
                                    style={{
                                      background: "rgba(139,92,246,0.15)",
                                      border: "1px solid rgba(139,92,246,0.35)",
                                      color: "rgb(196,181,253)",
                                    }}
                                  >
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                    </svg>
                                    <span>Push to Event</span>
                                  </button>
                                  {/* Delete */}
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); handleDelete(task); }}
                                    title="Delete note"
                                    className="w-6 h-6 rounded-lg flex items-center justify-center text-white/25 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                                  >
                                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                </div>
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
  );
};

export default NotesKanbanModal;
