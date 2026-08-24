import { useState, useEffect } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";

interface TitleBarProps {
  onOpenAbout: () => void;
  onOpenAlarm: () => void;
  onOpenBackup: () => void;
  onOpenReleaseNotes: () => void;
  onOpenPendingHistory: () => void;
  isAlarmActive: boolean;
  pendingCount: number;
  updateAvailable: boolean;
  onCheckUpdate: () => void;
}

export function TitleBar({
  onOpenAbout,
  onOpenAlarm,
  onOpenBackup,
  onOpenReleaseNotes,
  onOpenPendingHistory,
  isAlarmActive,
  pendingCount,
  updateAvailable,
  onCheckUpdate,
}: TitleBarProps) {
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
      // Hide window to system tray background
      await appWindow.hide();
    } catch (err) {
      console.error("Failed to hide window:", err);
      // Fallback
      await appWindow.close();
    }
  };

  return (
    <header
      data-tauri-drag-region
      className="relative z-30 flex items-center justify-between h-11 px-3.5 select-none border-b border-white/[0.07] bg-white/[0.02] backdrop-blur-md"
    >
      {/* Left: Brand */}
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

      {/* Right: Window & Feature controls */}
      <div className="flex items-center space-x-1">
        {/* Update Available indicator button */}
        <button
          type="button"
          onClick={onCheckUpdate}
          title={updateAvailable ? "Update Available — click to view" : "CluaNote is up to date"}
          className="relative w-8 h-8 rounded-md flex items-center justify-center text-white/70 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4-4m0 0l-4 4m4-4v12"
            />
          </svg>
          {updateAvailable && (
            <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500 shadow-sm shadow-amber-400" />
            </span>
          )}
        </button>

        {/* Pending Task History Button */}
        <button
          type="button"
          onClick={onOpenPendingHistory}
          title={`Pending Tasks Log (${pendingCount} pending)`}
          className="relative w-8 h-8 rounded-md flex items-center justify-center text-white/70 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7H9m0 0H9m3 0h3M9 12h.01M12 12h.01M15 12h.01"
            />
          </svg>
          {pendingCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-3.5 px-0.5 rounded-full bg-rose-500 text-white text-[8px] font-bold flex items-center justify-center shadow-sm">
              {pendingCount > 99 ? "99+" : pendingCount}
            </span>
          )}
        </button>

        {/* Release Notes / Changelog Button */}
        <button
          type="button"
          onClick={onOpenReleaseNotes}
          title="Release Notes &amp; Changelog"
          className="w-8 h-8 rounded-md flex items-center justify-center text-white/60 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </button>

        {/* Task Alarm & Audio Button with Glowing indicator */}
        <button
          type="button"
          onClick={onOpenAlarm}
          title={
            isAlarmActive
              ? "Task Alarm is ON (Click to configure)"
              : "Task Alarm is MUTED (Click to configure)"
          }
          className="relative w-8 h-8 rounded-md flex items-center justify-center text-white/70 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
          {isAlarmActive && (
            <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500 shadow-sm shadow-indigo-400"></span>
            </span>
          )}
        </button>

        {/* Data Backup & Restore Button */}
        <button
          type="button"
          onClick={onOpenBackup}
          title="Backup & Restore Data (.json)"
          className="w-8 h-8 rounded-md flex items-center justify-center text-white/60 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
            />
          </svg>
        </button>

        {/* About Button */}
        <button
          type="button"
          onClick={onOpenAbout}
          title="About CluaNote & Developer"
          className="w-8 h-8 rounded-md flex items-center justify-center text-white/60 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
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

        <div className="w-px h-4 bg-white/[0.1] mx-0.5" />

        {/* Minimize */}
        <button
          type="button"
          onClick={handleMinimize}
          title="Minimize"
          className="w-8 h-8 rounded-md flex items-center justify-center text-white/60 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
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

        {/* Maximize / Restore */}
        <button
          type="button"
          onClick={handleToggleMaximize}
          title={isMaximized ? "Restore" : "Maximize"}
          className="w-8 h-8 rounded-md flex items-center justify-center text-white/60 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
        >
          {isMaximized ? (
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <rect x="7" y="7" width="13" height="13" rx="1.5" />
              <polyline points="4 17 4 4 17 4" />
            </svg>
          ) : (
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <rect x="4" y="4" width="16" height="16" rx="2" />
            </svg>
          )}
        </button>

        {/* Close (Hides to Background System Tray) */}
        <button
          type="button"
          onClick={handleClose}
          title="Close to Tray"
          className="w-8 h-8 rounded-md flex items-center justify-center text-white/60 hover:text-red-400 hover:bg-red-500/20 transition-colors cursor-pointer"
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
}

export default TitleBar;
