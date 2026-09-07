import React, { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { openUrl } from "@tauri-apps/plugin-opener";
import { checkForUpdate, CURRENT_VERSION } from "../lib/updater";
import type { UpdateCheckResult } from "../lib/updater";
import { format } from "date-fns";

interface UpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenReleaseNotes: () => void;
}

export const UpdateModal: React.FC<UpdateModalProps> = ({
  isOpen,
  onClose,
  onOpenReleaseNotes,
}) => {
  const [updateInfo, setUpdateInfo] = useState<UpdateCheckResult | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [lastCheckedTime, setLastCheckedTime] = useState<string>("");

  const runCheck = async (force = false) => {
    setIsChecking(true);
    try {
      const res = await checkForUpdate(force);
      setUpdateInfo(res);
      setLastCheckedTime(format(new Date(), "hh:mm a"));
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      runCheck(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleOpenLink = async (url: string) => {
    try {
      await openUrl(url);
    } catch {
      window.open(url, "_blank");
    }
  };

  const handleDirectDownload = async () => {
    if (!updateInfo) return;
    setIsDownloading(true);
    const targetUrl = updateInfo.directDownloadUrl || updateInfo.releaseUrl;
    try {
      await handleOpenLink(targetUrl);
    } finally {
      setIsDownloading(false);
    }
  };

  const hasUpdate = updateInfo?.hasUpdate ?? false;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-[calc(100%-1.5rem)] max-w-md max-h-[90vh] flex flex-col glass-modal overflow-hidden animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 pb-3 border-b border-white/[0.08] flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-lg ${
                hasUpdate
                  ? "bg-gradient-to-tr from-amber-500 to-orange-400 shadow-amber-500/30"
                  : "bg-gradient-to-tr from-indigo-500 to-violet-400 shadow-indigo-500/30"
              }`}
            >
              <svg
                className="w-5 h-5 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-bold text-white/95">App Update</h2>
              <p className="text-[10px] text-white/40">Check & Download Releases</p>
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

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Loading State */}
          {isChecking && (
            <div className="flex flex-col items-center justify-center py-8 space-y-3">
              <div className="w-8 h-8 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
              <p className="text-xs text-white/70 font-medium">Checking GitHub for latest release…</p>
            </div>
          )}

          {/* Update Available State */}
          {!isChecking && hasUpdate && updateInfo && (
            <div className="space-y-4">
              {/* Alert Banner */}
              <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/70 via-orange-950/60 to-amber-950/70 border border-amber-500/40 shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500" />
                    </span>
                    <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider">
                      New Version Available
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-[10px] font-mono font-bold border border-amber-500/30">
                    {updateInfo.latestVersion}
                  </span>
                </div>

                <div className="mt-2.5 flex items-baseline space-x-2 text-xs">
                  <span className="text-white/50">Current:</span>
                  <span className="font-mono text-white/80">v{CURRENT_VERSION}</span>
                  <span className="text-white/30">→</span>
                  <span className="text-white/50">Latest:</span>
                  <span className="font-mono font-bold text-amber-300">{updateInfo.latestVersion}</span>
                </div>
              </div>

              {/* Direct Download & Update CTA Buttons */}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleDirectDownload}
                  disabled={isDownloading}
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-400 shadow-lg shadow-amber-500/25 transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  <span>
                    {isDownloading
                      ? "Opening Download..."
                      : updateInfo.directDownloadName
                      ? `Direct Download (${updateInfo.directDownloadName})`
                      : `Download ${updateInfo.latestVersion} Installer`}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenLink(updateInfo.releaseUrl)}
                  className="w-full py-2 px-3 rounded-xl glass-button text-xs font-medium text-white/80 hover:text-white flex items-center justify-center space-x-1.5 cursor-pointer"
                >
                  <span>View Release Page on GitHub</span>
                  <svg className="w-3.5 h-3.5 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </button>
              </div>

              {/* Release Highlights / Markdown Preview */}
              {updateInfo.releaseBody && (
                <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.08] max-h-48 overflow-y-auto">
                  <p className="text-[11px] font-semibold text-white/80 mb-2">What&apos;s New in {updateInfo.latestVersion}:</p>
                  <div className="text-[11px] text-white/65 leading-relaxed">
                    <ReactMarkdown
                      components={{
                        p: ({ children }) => <p className="mb-1.5 text-white/65">{children}</p>,
                        ul: ({ children }) => <ul className="mb-1.5 pl-3 list-disc space-y-0.5">{children}</ul>,
                        li: ({ children }) => <li className="text-[11px] text-white/60">{children}</li>,
                        strong: ({ children }) => <strong className="text-white/90 font-semibold">{children}</strong>,
                        code: ({ children }) => (
                          <code className="px-1 py-0.5 rounded bg-white/[0.08] text-amber-300 font-mono text-[10px]">
                            {children}
                          </code>
                        ),
                      }}
                    >
                      {updateInfo.releaseBody}
                    </ReactMarkdown>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Up to Date State */}
          {!isChecking && !hasUpdate && (
            <div className="flex flex-col items-center justify-center py-4 text-center space-y-3.5">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center shadow-lg shadow-emerald-500/10">
                <svg className="w-7 h-7 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>

              <div>
                <h3 className="text-sm font-bold text-white/95">CluaNote is up to date!</h3>
                <p className="text-xs text-white/50 mt-1">
                  You are running version <span className="font-mono text-emerald-300 font-semibold">v{CURRENT_VERSION}</span>, which is the latest release.
                </p>
                {lastCheckedTime && (
                  <p className="text-[10px] text-white/30 mt-1">
                    Last checked: today at {lastCheckedTime}
                  </p>
                )}
              </div>

              <div className="w-full flex items-center space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => runCheck(true)}
                  disabled={isChecking}
                  className="flex-1 py-2 px-3 rounded-xl glass-button text-xs font-medium text-white/80 hover:text-white flex items-center justify-center space-x-1.5 cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Check Again</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenReleaseNotes();
                  }}
                  className="flex-1 py-2 px-3 rounded-xl glass-button text-xs font-medium text-indigo-300 hover:text-indigo-200 border-indigo-500/20 hover:border-indigo-500/40 flex items-center justify-center space-x-1.5 cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Release History</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-white/[0.02] border-t border-white/[0.06] flex items-center justify-between text-[10px] text-white/40">
          <span>CluaNote Desktop · GitHub Releases</span>
          <button
            type="button"
            onClick={() => handleOpenLink("https://github.com/Subham-Maity/CluaNote/releases")}
            className="text-indigo-400 hover:text-indigo-300 underline cursor-pointer"
          >
            All Releases on GitHub ↗
          </button>
        </div>
      </div>
    </div>
  );
};

export default UpdateModal;
