import React from "react";
import type { Task } from "../types/task";
import { TaskCard } from "./TaskCard";

interface AnytimeSectionProps {
  tasks: Task[];
  onToggleComplete: (id: number, completed: boolean) => void;
  onEdit: (task: Task) => void;
  onDelete: (id: number) => void;
}

export const AnytimeSection: React.FC<AnytimeSectionProps> = ({
  tasks,
  onToggleComplete,
  onEdit,
  onDelete,
}) => {
  if (tasks.length === 0) {
    return null;
  }

  return (
    <div className="px-3 sm:px-4 pt-3 pb-2">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <svg
            className="w-3.5 h-3.5 text-indigo-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 14 14" />
          </svg>
          <span className="text-xs font-semibold uppercase tracking-wider text-white/70">
            Anytime Today
          </span>
          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/[0.08] text-white/60 font-mono">
            {tasks.length}
          </span>
        </div>
      </div>

      <div className="space-y-2">
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onToggleComplete={onToggleComplete}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  );
};
