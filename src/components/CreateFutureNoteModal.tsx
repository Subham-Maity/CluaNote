import React, { useState } from "react";
import { addTask } from "../lib/tasks";
import type { TaskPriority } from "../types/task";

interface CreateFutureNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

const PRIORITIES: { value: TaskPriority; label: string; color: string }[] = [
  { value: "high", label: "High", color: "text-rose-400 border-rose-500/40 bg-rose-500/10" },
  { value: "medium", label: "Medium", color: "text-amber-400 border-amber-500/40 bg-amber-500/10" },
  { value: "low", label: "Low", color: "text-emerald-400 border-emerald-500/40 bg-emerald-500/10" },
];

export const CreateFutureNoteModal: React.FC<CreateFutureNoteModalProps> = ({
  isOpen,
  onClose,
  onCreated,
}) => {
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [date, setDate] = useState(() => {
    // Default to 7 days from now as a suggested future date
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 10);
  });
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError("Title is required.");
      return;
    }
    setError(null);
    setIsSaving(true);
    try {
      await addTask({
        title: trimmedTitle,
        note: note.trim() || null,
        date,
        priority,
        is_future_note: 1, // Mark as future planning note
      });
      onCreated();
      onClose();
      // Reset form
      setTitle("");
      setNote("");
      setDate(() => {
        const d = new Date();
        d.setDate(d.getDate() + 7);
        return d.toISOString().slice(0, 10);
      });
      setPriority("medium");
    } catch (err) {
      console.error("Failed to create future note:", err);
      setError("Failed to save. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md glass-modal overflow-hidden animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 pb-4 border-b border-white/[0.08]">
          <div className="flex items-center space-x-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shadow-lg"
              style={{
                background:
                  "linear-gradient(135deg, rgba(139,92,246,0.95) 0%, rgba(109,40,217,0.95) 100%)",
                boxShadow: "0 4px 16px rgba(139,92,246,0.4)",
              }}
            >
              <svg
                className="w-4.5 h-4.5 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-bold text-white/95">Create Future Note</h2>
              <p className="text-[10px] text-violet-300/60">Plan ahead · stays in your Kanban board</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white/50 hover:text-white hover:bg-white/[0.1] transition-colors cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Info banner */}
        <div className="mx-5 mt-4 flex items-start space-x-2.5 px-3 py-2.5 rounded-xl border border-violet-500/25 bg-violet-500/[0.08]">
          <svg
            className="w-4 h-4 text-violet-400 flex-shrink-0 mt-0.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="text-[10px] text-violet-300/80 leading-relaxed">
            Future notes live in the <span className="font-semibold text-violet-300">Notes Kanban board</span> (accessible from the navbar) and won't appear in your daily timeline until you push them to an event. Use this to jot down things you're planning for later.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Title */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-white/50 uppercase tracking-wider">
              Title <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What are you planning?"
              autoFocus
              className="w-full px-3 py-2.5 rounded-xl border border-white/[0.1] bg-white/[0.04] text-sm text-white/90 placeholder:text-white/25 focus:outline-none focus:border-violet-500/60 focus:bg-violet-500/[0.05] transition-all"
            />
          </div>

          {/* Note */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-white/50 uppercase tracking-wider">
              Note
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Any details, links, or context…"
              rows={3}
              className="w-full px-3 py-2.5 rounded-xl border border-white/[0.1] bg-white/[0.04] text-sm text-white/90 placeholder:text-white/25 focus:outline-none focus:border-violet-500/60 focus:bg-violet-500/[0.05] transition-all resize-none"
            />
          </div>

          {/* Target date + Priority row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-white/50 uppercase tracking-wider">
                Target Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-white/[0.1] bg-white/[0.04] text-sm text-white/80 focus:outline-none focus:border-violet-500/60 transition-all"
                style={{ colorScheme: "dark" }}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-white/50 uppercase tracking-wider">
                Priority
              </label>
              <div className="flex gap-1.5">
                {PRIORITIES.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setPriority(p.value)}
                    className={`flex-1 py-2 rounded-lg border text-[10px] font-semibold transition-all cursor-pointer ${
                      priority === p.value
                        ? p.color + " opacity-100"
                        : "text-white/30 border-white/[0.08] bg-transparent opacity-60 hover:opacity-80"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <p className="text-[11px] text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-white/[0.1] text-sm text-white/50 hover:text-white hover:border-white/20 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || !title.trim()}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background:
                  "linear-gradient(135deg, rgba(139,92,246,0.9) 0%, rgba(109,40,217,0.9) 100%)",
                boxShadow: "0 4px 14px rgba(139,92,246,0.35)",
              }}
            >
              {isSaving ? "Saving…" : "Create Note"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateFutureNoteModal;
