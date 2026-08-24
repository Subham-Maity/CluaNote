import React, { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { openUrl } from "@tauri-apps/plugin-opener";
import { fetchAllReleases, CURRENT_VERSION } from "../lib/updater";
import type { GitHubRelease } from "../lib/updater";
import { format } from "date-fns";

interface ReleaseNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ReleaseNotesModal: React.FC<ReleaseNotesModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [releases, setReleases] = useState<GitHubRelease[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setIsLoading(true);
    setError(null);
    fetchAllReleases()
      .then((data) => {
        setReleases(data);
        // Auto-expand latest release
        if (data.length > 0) setExpandedId(data[0].id);
      })
      .catch(() => setError("Failed to load release history. Check your internet connection."))
      .finally(() => setIsLoading(false));
  }, [isOpen]);

  if (!isOpen) return null;

  const handleOpenLink = async (url: string) => {
    try {
      await openUrl(url);
    } catch {
      window.open(url, "_blank");
    }
  };

  const formatDate = (iso: string) => {
    try {
      return format(new Date(iso), "MMM d, yyyy");
    } catch {
      return iso.slice(0, 10);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-[calc(100%-1.5rem)] max-w-lg h-[85vh] flex flex-col glass-modal overflow-hidden animate-scale-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 pb-3 border-b border-white/[0.08] flex-shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-violet-500 to-indigo-400 flex items-center justify-center shadow-md shadow-violet-500/30">
              <svg
                className="w-4 h-4 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-bold text-white/95">Release Notes</h2>
              <p className="text-[10px] text-white/40">CluaNote Changelog</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white/50 hover:text-white hover:bg-white/[0.1] transition-colors cursor-pointer"
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

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {isLoading && (
            <div className="flex flex-col items-center justify-center h-32 space-y-3">
              <div className="w-6 h-6 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
              <p className="text-xs text-white/40">Fetching releases…</p>
            </div>
          )}

          {error && !isLoading && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs text-center">
              {error}
            </div>
          )}

          {!isLoading && !error && releases.length === 0 && (
            <div className="flex flex-col items-center justify-center h-32 text-white/40 text-xs">
              No releases found.
            </div>
          )}

          {!isLoading &&
            releases.map((release) => {
              const isCurrent =
                release.tag_name.replace(/^v/, "") === CURRENT_VERSION ||
                release.tag_name === `v${CURRENT_VERSION}`;
              const isExpanded = expandedId === release.id;

              return (
                <div
                  key={release.id}
                  className={`rounded-xl border transition-all overflow-hidden ${
                    isCurrent
                      ? "border-indigo-500/40 bg-indigo-500/[0.06]"
                      : "border-white/[0.08] bg-white/[0.02]"
                  }`}
                >
                  {/* Release header row */}
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedId(isExpanded ? null : release.id)
                    }
                    className="w-full flex items-center justify-between px-4 py-3 text-left cursor-pointer hover:bg-white/[0.03] transition-colors"
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold font-mono tracking-wide flex-shrink-0 ${
                          isCurrent
                            ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                            : release.prerelease
                            ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                            : "bg-white/[0.06] text-white/60 border border-white/[0.1]"
                        }`}
                      >
                        {release.tag_name}
                        {isCurrent && (
                          <span className="ml-1 text-indigo-400">★ current</span>
                        )}
                      </span>
                      <span className="text-xs text-white/70 font-medium truncate">
                        {release.name || release.tag_name}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 flex-shrink-0 ml-2">
                      <span className="text-[10px] text-white/30">
                        {formatDate(release.published_at)}
                      </span>
                      <svg
                        className={`w-3.5 h-3.5 text-white/40 transition-transform ${
                          isExpanded ? "rotate-180" : ""
                        }`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </div>
                  </button>

                  {/* Expanded release body */}
                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-white/[0.06]">
                      {release.body ? (
                        <div className="release-notes-body mt-3 text-xs text-white/70 leading-relaxed">
                          <ReactMarkdown
                            components={{
                              h1: ({ children }) => (
                                <h1 className="text-sm font-bold text-white/90 mt-3 mb-1">{children}</h1>
                              ),
                              h2: ({ children }) => (
                                <h2 className="text-xs font-bold text-white/80 mt-3 mb-1">{children}</h2>
                              ),
                              h3: ({ children }) => (
                                <h3 className="text-xs font-semibold text-white/70 mt-2 mb-1">{children}</h3>
                              ),
                              p: ({ children }) => (
                                <p className="mb-2 text-white/65 leading-relaxed">{children}</p>
                              ),
                              ul: ({ children }) => (
                                <ul className="mb-2 pl-3 space-y-0.5 list-disc list-inside">{children}</ul>
                              ),
                              ol: ({ children }) => (
                                <ol className="mb-2 pl-3 space-y-0.5 list-decimal list-inside">{children}</ol>
                              ),
                              li: ({ children }) => (
                                <li className="text-white/60 text-[11px]">{children}</li>
                              ),
                              code: ({ children }) => (
                                <code className="px-1.5 py-0.5 rounded bg-white/[0.08] text-indigo-300 font-mono text-[10px]">{children}</code>
                              ),
                              strong: ({ children }) => (
                                <strong className="font-semibold text-white/85">{children}</strong>
                              ),
                              a: ({ href, children }) => (
                                <button
                                  type="button"
                                  onClick={() => href && handleOpenLink(href)}
                                  className="text-indigo-400 hover:text-indigo-300 underline cursor-pointer"
                                >
                                  {children}
                                </button>
                              ),
                            }}
                          >
                            {release.body}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        <p className="mt-3 text-xs text-white/30 italic">
                          No release notes provided.
                        </p>
                      )}

                      <button
                        type="button"
                        onClick={() => handleOpenLink(release.html_url)}
                        className="mt-3 inline-flex items-center space-x-1.5 text-[11px] font-medium text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
                      >
                        <span>View on GitHub</span>
                        <svg
                          className="w-3 h-3"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                          />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
};

export default ReleaseNotesModal;
