import React from "react";

interface FloatingAddButtonProps {
  onClick: () => void;
  onCreateNote: () => void;
}

export const FloatingAddButton: React.FC<FloatingAddButtonProps> = ({
  onClick,
  onCreateNote,
}) => {
  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-center gap-3">
      {/* CREATE — Future Planning Note */}
      <div className="flex flex-col items-center gap-1">
        <button
          type="button"
          onClick={onCreateNote}
          aria-label="Create Future Note"
          title="Create Future Planning Note"
          className="w-12 h-12 rounded-full flex items-center justify-center group cursor-pointer transition-all duration-200 hover:scale-105 active:scale-95"
          style={{
            background: "linear-gradient(135deg, rgba(139,92,246,0.95) 0%, rgba(109,40,217,0.95) 100%)",
            border: "1px solid rgba(255,255,255,0.3)",
            boxShadow: "0 8px 28px rgba(139,92,246,0.45), 0 2px 10px rgba(0,0,0,0.3)",
          }}
        >
          <svg
            className="w-5 h-5 text-white"
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
        </button>
        <span className="text-[9px] font-bold text-violet-300/80 tracking-widest uppercase">
          CREATE
        </span>
      </div>

      {/* ADD TASK — main + FAB */}
      <button
        type="button"
        onClick={onClick}
        aria-label="Add Task"
        title="Add New Task"
        className="w-13 h-13 glass-fab flex items-center justify-center group cursor-pointer shadow-2xl shadow-indigo-500/50 hover:scale-105 active:scale-95 transition-all"
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
    </div>
  );
};
