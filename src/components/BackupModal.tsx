import React, { useState, useRef } from "react";
import { format } from "date-fns";
import { invoke } from "@tauri-apps/api/core";
import { exportAllTasksJson, importTasksFromJson } from "../lib/tasks";

interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataRestored: () => void;
}

export const BackupModal: React.FC<BackupModalProps> = ({
  isOpen,
  onClose,
  onDataRestored,
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) {
    return null;
  }

  const handleExport = async () => {
    try {
      setIsExporting(true);
      setStatusMessage(null);
      const jsonContent = await exportAllTasksJson();
      const defaultFilename = `cluanote-backup-${format(
        new Date(),
        "yyyy-MM-dd_HH-mm"
      )}.json`;

      try {
        // Native Windows Save As dialog
        const savedPath = await invoke<string>("export_backup_file", {
          content: jsonContent,
          defaultFilename,
        });

        setStatusMessage({
          type: "success",
          text: `Backup successfully saved to:\n${savedPath}`,
        });
      } catch (nativeErr) {
        if (String(nativeErr).toLowerCase().includes("cancelled")) {
          return;
        }

        // Web browser download fallback
        const blob = new Blob([jsonContent], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = defaultFilename;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        URL.revokeObjectURL(url);

        setStatusMessage({
          type: "success",
          text: `Backup exported as "${defaultFilename}"!`,
        });
      }
    } catch (err) {
      console.error("Backup export failed:", err);
      setStatusMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to export backup",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async () => {
    try {
      setIsImporting(true);
      setStatusMessage(null);

      try {
        // Native Windows Open File dialog
        const jsonContent = await invoke<string>("import_backup_file");
        const count = await importTasksFromJson(jsonContent);

        setStatusMessage({
          type: "success",
          text: `Successfully restored ${count} task(s) from backup!`,
        });

        onDataRestored();
      } catch (nativeErr) {
        if (String(nativeErr).toLowerCase().includes("cancelled")) {
          return;
        }
        // Fallback to web file picker
        fileInputRef.current?.click();
      }
    } catch (err) {
      console.error("Backup import failed:", err);
      setStatusMessage({
        type: "error",
        text:
          err instanceof Error
            ? err.message
            : "Failed to parse or import backup file",
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleWebFileSelected = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsImporting(true);
      setStatusMessage(null);

      const text = await file.text();
      const count = await importTasksFromJson(text);

      setStatusMessage({
        type: "success",
        text: `Successfully restored ${count} task(s) from backup!`,
      });

      onDataRestored();
    } catch (err) {
      console.error("Backup import failed:", err);
      setStatusMessage({
        type: "error",
        text:
          err instanceof Error
            ? err.message
            : "Failed to parse or import backup file",
      });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-[calc(100%-1.5rem)] max-w-md max-h-[92vh] overflow-y-auto glass-modal p-5 animate-scale-up text-left relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 w-7 h-7 rounded-lg flex items-center justify-center text-white/50 hover:text-white hover:bg-white/[0.1] transition-colors cursor-pointer"
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

        {/* Modal Header */}
        <div className="flex items-center space-x-3 pb-3 border-b border-white/[0.08] mb-4">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
            <svg
              className="w-5 h-5"
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
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white/95">
              Data Backup & Restore
            </h2>
            <p className="text-[11px] text-white/50">
              Export and import local SQLite tasks
            </p>
          </div>
        </div>

        {/* Status Notification */}
        {statusMessage && (
          <div
            className={`mb-3.5 px-3 py-2 rounded-xl text-xs flex items-start space-x-2 ${
              statusMessage.type === "success"
                ? "bg-emerald-500/20 border border-emerald-500/30 text-emerald-300"
                : "bg-rose-500/20 border border-rose-500/30 text-rose-300"
            }`}
          >
            <span className="shrink-0 mt-0.5">
              {statusMessage.type === "success" ? "✓" : "⚠"}
            </span>
            <span className="break-all whitespace-pre-line">
              {statusMessage.text}
            </span>
          </div>
        )}

        {/* Critical Update / Reinstall Warning Note */}
        <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-200/90 text-xs space-y-1">
          <p className="font-semibold flex items-center space-x-1.5 text-amber-300">
            <span>⚠</span>
            <span>Important Data Protection Notice:</span>
          </p>
          <p className="text-[11px] text-amber-200/80 leading-relaxed">
            If you are updating, reinstalling, or deleting software on your PC, please
            export a backup first! All tasks are stored securely on your local machine,
            so exporting ensures your data can be restored anytime with one click.
          </p>
        </div>

        {/* Actions Grid */}
        <div className="grid grid-cols-2 gap-3 mb-2">
          {/* Export Action */}
          <div className="p-3.5 rounded-xl bg-white/[0.04] border border-white/[0.08] flex flex-col justify-between space-y-3">
            <div>
              <p className="text-xs font-semibold text-white/90">Export Backup</p>
              <p className="text-[10px] text-white/50 mt-0.5">
                Opens native Save dialog to choose folder and filename.
              </p>
            </div>
            <button
              type="button"
              onClick={handleExport}
              disabled={isExporting}
              className="w-full py-1.5 text-xs rounded-xl glass-button-primary cursor-pointer disabled:opacity-50"
            >
              {isExporting ? "Exporting..." : "Save Backup (.json)"}
            </button>
          </div>

          {/* Import Action */}
          <div className="p-3.5 rounded-xl bg-white/[0.04] border border-white/[0.08] flex flex-col justify-between space-y-3">
            <div>
              <p className="text-xs font-semibold text-white/90">Import Backup</p>
              <p className="text-[10px] text-white/50 mt-0.5">
                Opens File Explorer to select and restore a .json file.
              </p>
            </div>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleWebFileSelected}
                className="hidden"
              />
              <button
                type="button"
                onClick={handleImport}
                disabled={isImporting}
                className="w-full py-1.5 text-xs rounded-xl glass-button cursor-pointer disabled:opacity-50 text-white/90 hover:text-white"
              >
                {isImporting ? "Importing..." : "Choose File (.json)"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
