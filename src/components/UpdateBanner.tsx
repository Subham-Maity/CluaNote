import React, { useState } from "react";
import { openUrl } from "@tauri-apps/plugin-opener";

interface UpdateBannerProps {
  latestVersion: string;
  releaseUrl: string;
  releaseBody: string;
  publishedAt: string;
  onDismiss: () => void;
}

export const UpdateBanner: React.FC<UpdateBannerProps> = ({
  latestVersion,
  releaseUrl,
  onDismiss,
}) => {
  const [isOpening, setIsOpening] = useState(false);

  const handleOpenRelease = async () => {
    setIsOpening(true);
    try {
      await openUrl(releaseUrl);
    } catch {
      window.open(releaseUrl, "_blank");
    } finally {
      setIsOpening(false);
    }
  };

  return (
    <div className="relative z-20 mx-3 mt-2 mb-0 rounded-2xl overflow-hidden animate-slide-down">
      {/* Gradient shimmer border */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-amber-500/30 via-orange-400/20 to-amber-500/30 p-px">
        <div className="w-full h-full rounded-2xl bg-gradient-to-r from-amber-950/80 to-orange-950/80 backdrop-blur-xl" />
      </div>

      <div className="relative flex items-center justify-between px-4 py-2.5 gap-3">
        {/* Icon + Text */}
        <div className="flex items-center space-x-3 min-w-0">
          <div className="flex-shrink-0 w-7 h-7 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-400 flex items-center justify-center shadow-md shadow-amber-500/30">
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
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4-4m0 0l-4 4m4-4v12"
              />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-[10px] text-amber-300/80 uppercase font-semibold tracking-wider leading-none">
              Update Available
            </p>
            <p className="text-xs font-bold text-white mt-0.5 truncate">
              CluaNote {latestVersion} is ready
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-2 flex-shrink-0">
          <button
            type="button"
            onClick={handleOpenRelease}
            disabled={isOpening}
            className="px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 shadow-md shadow-amber-500/25 transition-all active:scale-95 disabled:opacity-60 cursor-pointer"
          >
            {isOpening ? "Opening..." : "Download ↗"}
          </button>
          <button
            type="button"
            onClick={onDismiss}
            title="Dismiss update notification"
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white/50 hover:text-white hover:bg-white/[0.1] transition-colors cursor-pointer"
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default UpdateBanner;
