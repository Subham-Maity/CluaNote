import React, { useState, useEffect } from "react";
import { openUrl } from "@tauri-apps/plugin-opener";
import {
  checkAutostartStatus,
  toggleAutostartPreference,
} from "../lib/autostart";

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  const [isAutostart, setIsAutostart] = useState(false);

  useEffect(() => {
    if (isOpen) {
      checkAutostartStatus().then(setIsAutostart);
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleToggleAutostart = async () => {
    const newState = await toggleAutostartPreference();
    setIsAutostart(newState);
  };

  const handleOpenLink = async (url: string) => {
    try {
      await openUrl(url);
    } catch (err) {
      console.error("Failed to open external link:", err);
      // Fallback for browser testing
      window.open(url, "_blank");
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-[calc(100%-1.5rem)] max-w-sm max-h-[92vh] overflow-y-auto glass-modal p-5 sm:p-6 animate-scale-up text-center relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 w-7 h-7 rounded-lg flex items-center justify-center text-white/50 hover:text-white hover:bg-white/[0.1] transition-colors"
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

        {/* App Logo & Header */}
        <div className="w-12 h-12 mx-auto rounded-2xl bg-gradient-to-tr from-indigo-500 to-violet-400 flex items-center justify-center shadow-lg shadow-indigo-500/30 mb-3">
          <svg
            className="w-6 h-6 text-white"
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

        <h2 className="text-lg font-bold text-white tracking-wide">CluaNote</h2>
        <p className="text-xs text-white/50 mt-0.5">Version 0.2.1</p>

        <p className="text-xs text-white/70 mt-2.5 leading-relaxed">
          A fast, minimalist, dark glassmorphic desktop task planner built for focus and speed.
        </p>

        {/* Preferences / Autostart Section */}
        <div className="mt-4 p-3 rounded-xl bg-white/[0.03] border border-white/[0.07] flex items-center justify-between">
          <div className="text-left">
            <p className="text-xs font-medium text-white/90">Launch on Startup</p>
            <p className="text-[10px] text-white/40">Start CluaNote when your PC boots</p>
          </div>
          <button
            type="button"
            onClick={handleToggleAutostart}
            className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer ${
              isAutostart ? "bg-indigo-600" : "bg-white/20"
            }`}
          >
            <span
              className={`block w-3.5 h-3.5 rounded-full bg-white transition-transform ${
                isAutostart ? "translate-x-4.5" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>

        <div className="my-4 h-px bg-white/[0.08]" />

        {/* Developer Credit */}
        <div className="space-y-1">
          <p className="text-xs text-white/50">Developed by</p>
          <p className="text-sm font-semibold text-indigo-300">Subham Maity</p>
        </div>

        {/* Social Links */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => handleOpenLink("https://github.com/Subham-Maity")}
            className="px-3 py-1.5 rounded-xl glass-button text-xs font-medium text-white/80 hover:text-white flex items-center space-x-1.5"
          >
            <span>GitHub</span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenLink("https://x.com/TheSubhamMaity")}
            className="px-3 py-1.5 rounded-xl glass-button text-xs font-medium text-white/80 hover:text-white flex items-center space-x-1.5"
          >
            <span>Twitter / X</span>
          </button>

          <button
            type="button"
            onClick={() => handleOpenLink("https://www.instagram.com/subham_xam/")}
            className="px-3 py-1.5 rounded-xl glass-button text-xs font-medium text-white/80 hover:text-white flex items-center space-x-1.5"
          >
            <span>Instagram</span>
          </button>
        </div>

        {/* Footer Note */}
        <p className="text-[10px] text-white/30 mt-4">
          Licensed under MIT Open Source
        </p>
      </div>
    </div>
  );
};
