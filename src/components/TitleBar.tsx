import { useState, useEffect } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";

interface TitleBarProps {
  onOpenAbout: () => void;
}

export function TitleBar({ onOpenAbout }: TitleBarProps) {
  const appWindow = getCurrentWindow();
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    let unlisten: (() => void) | undefined;

    const setup = async () => {
      try {
        const max = await appWindow.isMaximized();
        setIsMaximized(max);

        unlisten = await appWindow.onResized(async () => {
          const isMax = await appWindow.isMaximized();
          setIsMaximized(isMax);
        });
      } catch (err) {
        console.error("Window listener setup error:", err);
      }
    };

    setup();
    return () => {
      if (unlisten) unlisten();
    };
  }, [appWindow]);

  const handleMinimize = async () => {
    try {
      await appWindow.minimize();
    } catch (err) {
      console.error("Failed to minimize window:", err);
    }
  };

  const handleToggleMaximize = async () => {
    try {
      await appWindow.toggleMaximize();
      const max = await appWindow.isMaximized();
      setIsMaximized(max);
    } catch (err) {
      console.error("Failed to toggle maximize:", err);
    }
  };

  const handleClose = async () => {
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
      {/* Left: Brand — all drag-enabled, no pointer events so buttons work */}
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
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <span data-tauri-drag-region className="text-xs font-semibold tracking-wider text-white/90 uppercase">
          CluaNote
        </span>
      </div>

      {/* Right: Window controls — NOT drag-region so they receive clicks */}
      <div className="flex items-center space-x-1">

        {/* About */}
        <button
          type="button"
          onClick={onOpenAbout}
          title="About CluaNote"
          className="w-8 h-8 rounded-md flex items-center justify-center text-white/60 hover:text-white hover:bg-white/[0.08] transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="9" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
        </button>

        {/* Minimize */}
        <button
          type="button"
          onClick={handleMinimize}
          title="Minimize"
          className="w-8 h-8 rounded-md flex items-center justify-center text-white/60 hover:text-white hover:bg-white/[0.08] transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>

        {/* Maximize / Restore */}
        <button
          type="button"
          onClick={handleToggleMaximize}
          title={isMaximized ? "Restore" : "Maximize"}
          className="w-8 h-8 rounded-md flex items-center justify-center text-white/60 hover:text-white hover:bg-white/[0.08] transition-colors"
        >
          {isMaximized ? (
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <rect x="7" y="7" width="13" height="13" rx="1.5" />
              <polyline points="4 17 4 4 17 4" />
            </svg>
          ) : (
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <rect x="4" y="4" width="16" height="16" rx="2" />
            </svg>
          )}
        </button>

        {/* Close */}
        <button
          type="button"
          onClick={handleClose}
          title="Close"
          className="w-8 h-8 rounded-md flex items-center justify-center text-white/60 hover:text-red-400 hover:bg-red-500/20 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </header>
  );
}

export default TitleBar;
