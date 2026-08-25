import React from "react";
import ReactMarkdown from "react-markdown";
import type { Task } from "../types/task";
import clsx from "clsx";

interface TaskCardProps {
  task: Task;
  onToggleComplete: (id: number, completed: boolean) => void;
  onSetStatus?: (id: number, status: number) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: number) => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({
  task,
  onToggleComplete,
  onSetStatus,
  onEdit,
  onDelete,
}) => {
  const isCompleted = task.completed === 1;
  const isNotDone = task.completed === 2;

  const priorityColor = {
    low: "bg-emerald-400 shadow-emerald-500/50",
    medium: "bg-amber-400 shadow-amber-500/50",
    high: "bg-rose-500 shadow-rose-500/50",
  }[task.priority || "medium"];

  const handleCheckboxClick = () => {
    if (onSetStatus) {
      if (task.completed === 0) {
        onSetStatus(task.id, 1); // Mark as done
      } else {
        onSetStatus(task.id, 0); // Reset to active/pending
      }
    } else {
      onToggleComplete(task.id, !isCompleted);
    }
  };

  return (
    <div
      className={clsx(
        "group relative glass-card p-3 rounded-2xl transition-all duration-200 flex items-start space-x-3",
        isCompleted && "opacity-45 bg-white/[0.02] border-white/[0.05]",
        isNotDone && "bg-rose-950/[0.12] border-rose-500/30 shadow-sm shadow-rose-950/40"
      )}
    >
      {/* Checkbox / Status Button */}
      <button
        type="button"
        onClick={handleCheckboxClick}
        title={
          isCompleted
            ? "Completed (Click to uncheck)"
            : isNotDone
            ? "Marked as Not Done (Click to reset)"
            : "Click to mark as done"
        }
        className={clsx(
          "w-5 h-5 mt-0.5 rounded-lg flex items-center justify-center transition-all duration-200 flex-shrink-0 cursor-pointer",
          isCompleted && "bg-indigo-600 border border-indigo-400 text-white",
          isNotDone && "bg-rose-500/20 border border-rose-500 text-rose-400 hover:bg-rose-500/30",
          !isCompleted && !isNotDone && "border border-white/30 hover:border-indigo-400 bg-white/[0.04]"
        )}
      >
        {isCompleted && (
          <svg
            className="w-3.5 h-3.5"
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
        )}
        {isNotDone && (
          <svg
            className="w-3 h-3 text-rose-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={3}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        )}
      </button>

      {/* Content Area */}
      <div className="flex-1 min-w-0 pr-2">
        <div className="flex items-center space-x-2">
          {/* Priority Dot */}
          <span
            className={clsx(
              "w-2 h-2 rounded-full flex-shrink-0 shadow-sm",
              priorityColor
            )}
            title={`Priority: ${task.priority}`}
          />

          <h3
            className={clsx(
              "text-sm font-medium text-white/90 truncate transition-all",
              isCompleted && "line-through text-white/50",
              isNotDone && "line-through text-rose-300/70"
            )}
          >
            {task.title}
          </h3>

          {isNotDone && (
            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30 flex-shrink-0">
              Not Done
            </span>
          )}

          {task.time && (
            <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-white/[0.06] text-white/70 border border-white/[0.08] flex-shrink-0">
              {task.time}
            </span>
          )}
        </div>

        {task.note && (
          <div
            className={clsx(
              "task-card-note text-xs text-white/60 mt-1 leading-relaxed break-words",
              isCompleted && "text-white/40",
              isNotDone && "text-rose-200/50"
            )}
          >
            <ReactMarkdown
              allowedElements={[
                "p", "strong", "em", "del", "code",
                "ul", "ol", "li", "a",
              ]}
              components={{
                p: ({ children }) => (
                  <p className="line-clamp-2 mb-0">{children}</p>
                ),
                strong: ({ children }) => (
                  <strong className="font-semibold text-white/80">{children}</strong>
                ),
                em: ({ children }) => (
                  <em className="italic text-white/65">{children}</em>
                ),
                del: ({ children }) => (
                  <del className="line-through text-white/35">{children}</del>
                ),
                code: ({ children }) => (
                  <code className="px-1 py-0.5 rounded bg-indigo-500/15 text-indigo-300 font-mono text-[10px]">
                    {children}
                  </code>
                ),
                ul: ({ children }) => (
                  <ul className="list-disc list-inside">{children}</ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal list-inside">{children}</ol>
                ),
                li: ({ children }) => (
                  <li className="text-[11px]">{children}</li>
                ),
                a: ({ children }) => (
                  <span className="text-indigo-400 underline">{children}</span>
                ),
              }}
            >
              {task.note}
            </ReactMarkdown>
          </div>
        )}
      </div>

      {/* Action Buttons (Done / Not Done / Edit / Delete) */}
      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1 flex-shrink-0">
        {/* Quick Not Done Button (if active or completed) */}
        {onSetStatus && !isNotDone && (
          <button
            type="button"
            onClick={() => onSetStatus(task.id, 2)}
            title="Mark as Not Done"
            className="w-6 h-6 rounded-md flex items-center justify-center text-white/50 hover:text-rose-300 hover:bg-rose-500/20 transition-colors cursor-pointer"
          >
            <svg className="w-3.5 h-3.5 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}

        {/* Quick Done Button (if not done) */}
        {onSetStatus && isNotDone && (
          <button
            type="button"
            onClick={() => onSetStatus(task.id, 1)}
            title="Mark as Done"
            className="w-6 h-6 rounded-md flex items-center justify-center text-white/50 hover:text-emerald-300 hover:bg-emerald-500/20 transition-colors cursor-pointer"
          >
            <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </button>
        )}

        {/* Edit Button */}
        <button
          type="button"
          onClick={() => onEdit(task)}
          title="Edit Task"
          className="w-6 h-6 rounded-md flex items-center justify-center text-white/60 hover:text-white hover:bg-white/[0.1] transition-colors cursor-pointer"
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
              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
            />
          </svg>
        </button>

        {/* Delete Button */}
        <button
          type="button"
          onClick={() => onDelete(task.id)}
          title="Delete Task"
          className="w-6 h-6 rounded-md flex items-center justify-center text-white/60 hover:text-rose-400 hover:bg-rose-500/20 transition-colors cursor-pointer"
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
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </button>
      </div>
    </div>
  );
};
