import React, { useState, useEffect, useRef } from "react";
import {
  isAlarmEnabled,
  setAlarmEnabled,
  getCustomSound,
  setCustomSound,
  playAlarmSound,
  stopAlarmSound,
} from "../lib/alarm";

interface AlarmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAlarmToggle?: (enabled: boolean) => void;
}

export const AlarmModal: React.FC<AlarmModalProps> = ({
  isOpen,
  onClose,
  onAlarmToggle,
}) => {
  const [alarmActive, setAlarmActive] = useState(true);
  const [customSoundName, setCustomSoundName] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setAlarmActive(isAlarmEnabled());
      const custom = getCustomSound();
      setCustomSoundName(custom ? "Custom Audio File Loaded" : null);
      setIsPlaying(false);
    } else {
      stopAlarmSound();
      setIsPlaying(false);
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleToggle = () => {
    const nextState = !alarmActive;
    setAlarmActive(nextState);
    setAlarmEnabled(nextState);
    if (onAlarmToggle) {
      onAlarmToggle(nextState);
    }
  };

  const handleTestPlay = () => {
    if (isPlaying) {
      stopAlarmSound();
      setIsPlaying(false);
    } else {
      playAlarmSound();
      setIsPlaying(true);
      setTimeout(() => setIsPlaying(false), 6000);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("audio/")) {
      alert("Please select a valid audio file (e.g. .mp3, .wav, .ogg)");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setCustomSound(result);
        setCustomSoundName(file.name);
        alert(`Custom alarm sound "${file.name}" loaded successfully!`);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleResetSound = () => {
    setCustomSound(null);
    setCustomSoundName(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-[calc(100%-1.5rem)] max-w-sm max-h-[92vh] overflow-y-auto glass-modal p-5 animate-scale-up text-left relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 w-7 h-7 rounded-lg flex items-center justify-center text-white/50 hover:text-white hover:bg-white/[0.1] transition-colors cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Modal Header */}
        <div className="flex items-center space-x-3 pb-3 border-b border-white/[0.08] mb-4">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white/95">Task Alarm & Audio</h2>
            <p className="text-[11px] text-white/50">Sound alerts & desktop reminders</p>
          </div>
        </div>

        {/* Enable / Disable Alarm Toggle */}
        <div className="p-3 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-between mb-3.5">
          <div>
            <p className="text-xs font-semibold text-white/90">Alarm Sound Alerts</p>
            <p className="text-[10px] text-white/50">
              {alarmActive ? "Active with glowing icon" : "Muted (no sound)"}
            </p>
          </div>
          <button
            type="button"
            onClick={handleToggle}
            className={`w-10 h-5.5 rounded-full transition-colors relative cursor-pointer ${
              alarmActive ? "bg-indigo-600 shadow-md shadow-indigo-500/40" : "bg-white/20"
            }`}
          >
            <span
              className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                alarmActive ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>

        {/* Sound Selection */}
        <div className="space-y-2.5">
          <label className="block text-xs font-medium text-white/70">
            Audio Alarm Track
          </label>
          <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.07] space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 overflow-hidden">
                <svg className="w-4 h-4 text-indigo-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
                <span className="text-xs text-white/80 truncate font-mono">
                  {customSoundName || "tingting.mp3 (Default)"}
                </span>
              </div>
              <button
                type="button"
                onClick={handleTestPlay}
                className="px-2.5 py-1 text-[11px] rounded-lg glass-button text-indigo-300 hover:text-white"
              >
                {isPlaying ? "⏹ Stop" : "▶ Test"}
              </button>
            </div>

            <div className="flex items-center space-x-2 pt-1 border-t border-white/[0.06]">
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 py-1.5 text-xs rounded-xl glass-button text-white/80 hover:text-white flex items-center justify-center space-x-1.5"
              >
                <span>Choose Sound from PC</span>
              </button>
              {customSoundName && (
                <button
                  type="button"
                  onClick={handleResetSound}
                  className="px-2.5 py-1.5 text-xs rounded-xl glass-button text-rose-300 hover:text-rose-200"
                  title="Reset to default tingting.mp3"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-4 p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-[11px] text-indigo-200/80 leading-relaxed">
          When the alarm is glowing in the top bar, CluaNote will play this music and pop a Windows notification whenever a scheduled task time arrives.
        </div>
      </div>
    </div>
  );
};
