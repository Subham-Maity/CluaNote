import React from "react";

interface FloatingAddButtonProps {
  onClick: () => void;
}

export const FloatingAddButton: React.FC<FloatingAddButtonProps> = ({
  onClick,
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Add Task"
      title="Add New Task"
      className="fixed bottom-6 right-6 z-40 w-13 h-13 glass-fab flex items-center justify-center group cursor-pointer shadow-2xl shadow-indigo-500/50 hover:scale-105 active:scale-95 transition-all"
    >
      <svg
        className="w-6 h-6 text-white transition-transform duration-200 group-hover:rotate-90"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 4v16m8-8H4"
        />
      </svg>
    </button>
  );
};
