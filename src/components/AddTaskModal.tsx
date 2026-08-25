import React, { useState, useEffect, useRef } from "react";
import type { NewTask, Task, TaskPriority } from "../types/task";
import clsx from "clsx";
import { MarkdownNoteEditor } from "./MarkdownNoteEditor";

interface AddTaskModalProps {
  isOpen: boolean;
  selectedDate: string; // 'YYYY-MM-DD'
  editingTask: Task | null;
  onClose: () => void;
  onSave: (taskData: NewTask, editId?: number) => Promise<void>;
}

const DRAFT_STORAGE_KEY = "cluanote_task_draft";

export const AddTaskModal: React.FC<AddTaskModalProps> = ({
  isOpen,
  selectedDate,
  editingTask,
  onClose,
  onSave,
}) => {
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(selectedDate);
  const [time, setTime] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasRestoredDraft, setHasRestoredDraft] = useState(false);

  const titleInputRef = useRef<HTMLInputElement>(null);

  // Load editing task or restore auto-saved draft on open
  useEffect(() => {
    if (isOpen) {
      if (editingTask) {
        setTitle(editingTask.title);
        setNote(editingTask.note || "");
        setDate(editingTask.date);
        setTime(editingTask.time || "");
        setPriority(editingTask.priority || "medium");
        setHasRestoredDraft(false);
      } else {
        // Check for auto-saved draft
        const savedDraft = localStorage.getItem(DRAFT_STORAGE_KEY);
        if (savedDraft) {
          try {
            const parsed = JSON.parse(savedDraft);
            if (parsed.title || parsed.note) {
              setTitle(parsed.title || "");
              setNote(parsed.note || "");
              setDate(parsed.date || selectedDate);
              setTime(parsed.time || "");
              setPriority(parsed.priority || "medium");
              setHasRestoredDraft(true);
            } else {
              resetToDefault();
            }
          } catch {
            resetToDefault();
          }
        } else {
          resetToDefault();
        }
      }
      setError(null);
      setTimeout(() => titleInputRef.current?.focus(), 50);
    }
  }, [isOpen, editingTask, selectedDate]);

  const resetToDefault = () => {
    setTitle("");
    setNote("");
    setDate(selectedDate);
    setTime("");
    setPriority("medium");
    setHasRestoredDraft(false);
  };

  // Auto-save draft as user writes (only for new tasks)
  useEffect(() => {
    if (isOpen && !editingTask) {
      if (title.trim() || note.trim()) {
        const draft = { title, note, date, time, priority };
        localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
      } else {
        localStorage.removeItem(DRAFT_STORAGE_KEY);
      }
    }
  }, [isOpen, editingTask, title, note, date, time, priority]);

  const handleDiscardDraft = () => {
    localStorage.removeItem(DRAFT_STORAGE_KEY);
    resetToDefault();
  };

  if (!isOpen) {
    return null;
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!title.trim()) {
      setError("Please enter a task title");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      await onSave(
        {
          title: title.trim(),
          note: note.trim() ? note.trim() : null,
          date,
          time: time.trim() ? time.trim() : null,
          priority,
        },
        editingTask?.id
      );

      // Clear draft on successful save
      localStorage.removeItem(DRAFT_STORAGE_KEY);
      onClose();
    } catch (err) {
      console.error("Failed to save task:", err);
      setError(err instanceof Error ? err.message : "Failed to save task");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
      onKeyDown={handleKeyDown}
    >
      <div
        className="w-[calc(100%-1.5rem)] max-w-md max-h-[92vh] overflow-y-auto glass-modal p-4 sm:p-5 animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08] mb-4">
          <h2 className="text-base font-semibold text-white/95">
            {editingTask ? "Edit Task" : "Add New Task"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white/60 hover:text-white hover:bg-white/[0.1] transition-colors"
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

        {/* Draft auto-restored indicator */}
        {hasRestoredDraft && !editingTask && (
          <div className="mb-3.5 px-3 py-1.5 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-between animate-fade-in">
            <span className="text-[11px] text-indigo-300 font-medium flex items-center space-x-1.5">
              <span>📝</span>
              <span>Draft auto-restored</span>
            </span>
            <button
              type="button"
              onClick={handleDiscardDraft}
              className="text-[10px] text-white/50 hover:text-rose-300 underline cursor-pointer transition-colors"
            >
              Discard draft
            </button>
          </div>
        )}

        {error && (
          <div className="mb-3 px-3 py-2 rounded-lg bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs">
            {error}
          </div>
        )}

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Title input */}
          <div>
            <label className="block text-xs font-medium text-white/70 mb-1">
              Title <span className="text-indigo-400">*</span>
            </label>
            <input
              ref={titleInputRef}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What needs to be scheduled?"
              className="w-full px-3 py-2 text-sm glass-input"
            />
          </div>

          {/* Date and Time row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-white/70 mb-1">
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 text-xs glass-input"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-white/70 mb-1">
                Time (optional)
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-3 py-2 text-xs glass-input"
              />
            </div>
          </div>

          {/* Priority selector */}
          <div>
            <label className="block text-xs font-medium text-white/70 mb-1.5">
              Priority
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(["low", "medium", "high"] as TaskPriority[]).map((p) => {
                const isSelected = priority === p;
                const dotColor = {
                  low: "bg-emerald-400",
                  medium: "bg-amber-400",
                  high: "bg-rose-500",
                }[p];

                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={clsx(
                      "py-1.5 px-2 rounded-xl text-xs capitalize flex items-center justify-center space-x-1.5 transition-all border",
                      isSelected
                        ? "bg-white/[0.12] text-white border-indigo-400/50 shadow-sm"
                        : "bg-white/[0.03] text-white/60 border-white/[0.08] hover:bg-white/[0.07]"
                    )}
                  >
                    <span className={clsx("w-2 h-2 rounded-full", dotColor)} />
                    <span>{p}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Note input — Markdown editor with Write/Preview */}
          <div>
            <label className="block text-xs font-medium text-white/70 mb-1">
              Note{" "}
              <span className="text-white/30 font-normal">(optional · supports markdown)</span>
            </label>
            <MarkdownNoteEditor
              value={note}
              onChange={setNote}
              placeholder="Add notes, links, or **markdown** content..."
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end space-x-2 pt-2 border-t border-white/[0.08]">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs rounded-xl glass-button text-white/70"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-1.5 text-xs rounded-xl glass-button-primary disabled:opacity-50"
            >
              {isSubmitting
                ? "Saving..."
                : editingTask
                ? "Update Task"
                : "Add Task"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
