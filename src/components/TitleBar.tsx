import React from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";

interface TitleBarProps {
  onOpenAbout: () => void;
}

export const TitleBar: React.FC<TitleBarProps> = ({ onOpenAbout }) => {
  const appWindow = getCurrentWindow();

  const handleMinimize = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await appWindow.minimize();
    } catch (err) {
      console.error("Failed to minimize window:", err);
    }
  };

  const handleClose = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await appWindow.close();
    } catch (err) {
      console.error("Failed to close window:", err);
    }
  };

  return (
    <header
      data-tauri-drag-region
      className="relative z-30 flex items-center justify-between h-11 px-3.5 select-none border-b border-white/[0.07] bg-white/[0.02] backdrop-blur-md"
    >
      {/* Left side: Brand Icon & Title */}
      <div data-tauri-drag-region className="flex items-center space-x-2.5">
        <div
          data-tauri-drag-region
          className="w-5 h-5 rounded-lg bg-gradient-to-tr from-indigo-500 to-violet-400 flex items-center justify-center shadow-sm shadow-indigo-500/30"
        >
          <svg
            className="w-3.5 h-3.5 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <span
          data-tauri-drag-region
          className="text-xs font-semibold tracking-wider text-white/90 uppercase"
        >
          CluaNote
        </span>
      </div>

      {/* Right side: Action & Window controls */}
      <div className="flex items-center space-x-1.5 no-drag">
        <button
          onClick={onOpenAbout}
          title="About CluaNote"
          className="w-7 h-7 rounded-md flex items-center justify-center text-white/60 hover:text-white hover:bg-white/[0.08] transition-colors"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <circle cx="12" cy="12" r="9" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
        </button>

        <button
          onClick={handleMinimize}
          title="Minimize"
          className="w-7 h-7 rounded-md flex items-center justify-center text-white/60 hover:text-white hover:bg-white/[0.08] transition-colors"
        >
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>

        <button
          onClick={handleClose}
          title="Close"
          className="w-7 h-7 rounded-md flex items-center justify-center text-white/60 hover:text-red-400 hover:bg-red-500/20 transition-colors"
        >
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </header>
  );
};
