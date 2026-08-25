import React, { useState, useEffect, useRef } from "react";
import { format, parseISO } from "date-fns";
import { invoke } from "@tauri-apps/api/core";
import { exportAllTasksJson, importTasksFromJson } from "../lib/tasks";
import {
  getPostgresConfig,
  savePostgresConfig,
  testPostgresConnection,
  runPostgresSync,
  disconnectPostgres,
} from "../lib/postgres";
import type { PostgresConfigInfo } from "../types/task";
import clsx from "clsx";

interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataRestored: () => void;
}

type TabType = "cloud" | "local";

export const BackupModal: React.FC<BackupModalProps> = ({
  isOpen,
  onClose,
  onDataRestored,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>("cloud");

  // Local file backup state
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // Cloud Postgres sync state
  const [pgConfig, setPgConfig] = useState<PostgresConfigInfo | null>(null);
  const [dbUrlInput, setDbUrlInput] = useState("");
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const [statusMessage, setStatusMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load existing Postgres config on modal open
  useEffect(() => {
    if (isOpen) {
      loadPgConfig();
      setStatusMessage(null);
    }
  }, [isOpen]);

  const loadPgConfig = async () => {
    try {
      const config = await getPostgresConfig();
      setPgConfig(config);
      if (config.is_configured) {
        setAutoSyncEnabled(config.auto_sync);
      }
    } catch (err) {
      console.warn("Failed to load PostgreSQL sync configuration:", err);
    }
  };

  if (!isOpen) {
    return null;
  }

  // --------------------------------------------------------------------------
  // PostgreSQL Cloud Sync Handlers
  // --------------------------------------------------------------------------

  const handleTestConnection = async () => {
    if (!dbUrlInput.trim()) {
      setStatusMessage({
        type: "error",
        text: "Please enter a valid PostgreSQL connection URL first.",
      });
      return;
    }

    try {
      setIsTesting(true);
      setStatusMessage(null);
      const res = await testPostgresConnection(dbUrlInput.trim());
      setStatusMessage({
        type: "success",
        text: `Connection verified! ${res.message}${
          res.server_version ? `\nServer: ${res.server_version.split(",")[0]}` : ""
        }`,
      });
    } catch (err) {
      setStatusMessage({
        type: "error",
        text: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSaveAndSync = async () => {
    if (!dbUrlInput.trim()) {
      setStatusMessage({
        type: "error",
        text: "Please enter your PostgreSQL connection URL.",
      });
      return;
    }

    try {
      setIsSaving(true);
      setStatusMessage(null);

      // 1. Save and encrypt credentials
      await savePostgresConfig(dbUrlInput.trim(), autoSyncEnabled);

      // 2. Run initial full bi-directional sync
      const syncResult = await runPostgresSync();
      await loadPgConfig();
      setDbUrlInput("");

      setStatusMessage({
        type: "success",
        text: `Connected & Synced successfully!\n${syncResult.message}`,
      });

      onDataRestored();
    } catch (err) {
      setStatusMessage({
        type: "error",
        text: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSyncNow = async () => {
    try {
      setIsSyncing(true);
      setStatusMessage(null);
      const res = await runPostgresSync();
      await loadPgConfig();
      setStatusMessage({
        type: "success",
        text: res.message,
      });
      onDataRestored();
    } catch (err) {
      setStatusMessage({
        type: "error",
        text: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      setIsDisconnecting(true);
      await disconnectPostgres();
      await loadPgConfig();
      setStatusMessage({
        type: "info",
        text: "PostgreSQL database disconnected. Local data remains intact.",
      });
    } catch (err) {
      setStatusMessage({
        type: "error",
        text: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setIsDisconnecting(false);
    }
  };

  // --------------------------------------------------------------------------
  // Local JSON Backup Handlers
  // --------------------------------------------------------------------------

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

  const formatLastSync = (isoStr?: string | null) => {
    if (!isoStr) return "Never synced";
    try {
      return format(parseISO(isoStr), "MMM d, yyyy 'at' hh:mm a");
    } catch {
      return isoStr;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-[calc(100%-1.5rem)] max-w-lg max-h-[92vh] flex flex-col glass-modal p-5 animate-scale-up text-left relative overflow-hidden"
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
        <div className="flex items-center space-x-3 pb-3 border-b border-white/[0.08] mb-3.5 flex-shrink-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-400 flex items-center justify-center text-white shadow-md shadow-indigo-500/30">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
          </div>
          <div>
            <h2 className="text-sm font-bold text-white/95">Backup & Database Sync</h2>
            <p className="text-[11px] text-white/50">Cloud PostgreSQL sync & local JSON backups</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center space-x-1 p-1 rounded-xl bg-white/[0.04] border border-white/[0.08] mb-3.5 flex-shrink-0">
          <button
            type="button"
            onClick={() => {
              setActiveTab("cloud");
              setStatusMessage(null);
            }}
            className={clsx(
              "flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center space-x-2",
              activeTab === "cloud"
                ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/40"
                : "text-white/60 hover:text-white hover:bg-white/[0.04]"
            )}
          >
            <span>☁️ Cloud Database Sync</span>
            {pgConfig?.is_configured && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400" />
            )}
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab("local");
              setStatusMessage(null);
            }}
            className={clsx(
              "flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center justify-center space-x-2",
              activeTab === "local"
                ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/40"
                : "text-white/60 hover:text-white hover:bg-white/[0.04]"
            )}
          >
            <span>📁 Local JSON Backup</span>
          </button>
        </div>

        {/* Status Notification Banner */}
        {statusMessage && (
          <div
            className={clsx(
              "mb-3.5 px-3 py-2 rounded-xl text-xs flex items-start space-x-2 animate-fade-in flex-shrink-0",
              statusMessage.type === "success" && "bg-emerald-500/20 border border-emerald-500/30 text-emerald-300",
              statusMessage.type === "error" && "bg-rose-500/20 border border-rose-500/30 text-rose-300",
              statusMessage.type === "info" && "bg-indigo-500/20 border border-indigo-500/30 text-indigo-300"
            )}
          >
            <span className="shrink-0 mt-0.5">
              {statusMessage.type === "success" ? "✓" : statusMessage.type === "error" ? "⚠" : "ℹ"}
            </span>
            <span className="break-words whitespace-pre-line text-[11px] leading-relaxed">
              {statusMessage.text}
            </span>
          </div>
        )}

        {/* Tab 1: Cloud Database Sync */}
        {activeTab === "cloud" && (
          <div className="flex-1 overflow-y-auto space-y-3.5 pr-1">
            {/* If Postgres is Configured */}
            {pgConfig?.is_configured ? (
              <div className="space-y-3.5">
                {/* Active Connection Card */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-950/40 to-violet-950/30 border border-indigo-500/30 space-y-3 shadow-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                      </span>
                      <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider">
                        PostgreSQL Active & Synced
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleDisconnect}
                      disabled={isDisconnecting || isSyncing}
                      className="text-[10px] text-rose-300/80 hover:text-rose-200 underline cursor-pointer disabled:opacity-50"
                    >
                      {isDisconnecting ? "Disconnecting..." : "Disconnect Database"}
                    </button>
                  </div>

                  {/* Redacted URL Display */}
                  <div className="px-3 py-2 rounded-xl bg-black/40 border border-white/[0.08] font-mono text-[11px] text-white/80 break-all select-all">
                    {pgConfig.redacted_url || "postgresql://••••••••@configured"}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-white/60">
                    <span>Last Synced:</span>
                    <span className="text-white/90 font-medium">
                      {formatLastSync(pgConfig.last_synced_at)}
                    </span>
                  </div>
                </div>

                {/* Sync Action Buttons */}
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={handleSyncNow}
                    disabled={isSyncing}
                    className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-lg shadow-indigo-500/25 transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center space-x-2 disabled:opacity-50"
                  >
                    <svg
                      className={clsx("w-4 h-4", isSyncing && "animate-spin")}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2.2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                    <span>{isSyncing ? "Synchronizing with PostgreSQL…" : "Sync Now (Bi-Directional)"}</span>
                  </button>

                  <p className="text-[10px] text-white/40 text-center leading-relaxed">
                    Auto-sync runs in the background every 2 hours. Conflicts are resolved automatically using UTC timestamps (newer edit wins).
                  </p>
                </div>
              </div>
            ) : (
              /* If Postgres is NOT Configured */
              <div className="space-y-3.5">
                {/* Intro guide */}
                <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.08] text-xs text-white/70 space-y-1.5 leading-relaxed">
                  <p className="font-semibold text-white/90 flex items-center space-x-1.5">
                    <span>⚡</span>
                    <span>Cross-Device Remote Sync:</span>
                  </p>
                  <p className="text-[11px] text-white/60">
                    Connect your free PostgreSQL database (e.g. <strong>Neon.tech</strong>, <strong>Supabase</strong>, <strong>AWS RDS</strong>, or <strong>Railway</strong>). 
                    Your tasks will sync automatically across all your devices without needing manual JSON file exports.
                  </p>
                </div>

                {/* Connection String Form */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-white/80">
                    PostgreSQL Connection URL <span className="text-indigo-400">*</span>
                  </label>
                  <input
                    type="password"
                    value={dbUrlInput}
                    onChange={(e) => setDbUrlInput(e.target.value)}
                    placeholder="postgresql://user:password@ep-xxx.neon.tech/neondb?sslmode=require"
                    className="w-full px-3 py-2 text-xs font-mono glass-input select-all"
                  />
                  <div className="flex items-center space-x-1 text-[10px] text-white/40">
                    <span>🔒 Credentials are encrypted with AES-256-GCM at rest. SSL required.</span>
                  </div>
                </div>

                {/* Provider Chips */}
                <div>
                  <p className="text-[10px] font-semibold text-white/50 uppercase tracking-wider mb-1.5">
                    Supported Cloud Providers:
                  </p>
                  <div className="grid grid-cols-4 gap-1.5 text-center">
                    <span className="px-2 py-1 rounded-lg bg-white/[0.04] border border-white/[0.08] text-[10px] font-medium text-emerald-300">
                      Neon.tech
                    </span>
                    <span className="px-2 py-1 rounded-lg bg-white/[0.04] border border-white/[0.08] text-[10px] font-medium text-emerald-300">
                      Supabase
                    </span>
                    <span className="px-2 py-1 rounded-lg bg-white/[0.04] border border-white/[0.08] text-[10px] font-medium text-indigo-300">
                      AWS RDS
                    </span>
                    <span className="px-2 py-1 rounded-lg bg-white/[0.04] border border-white/[0.08] text-[10px] font-medium text-violet-300">
                      Railway / Pg
                    </span>
                  </div>
                </div>

                {/* Auto Sync Checkbox */}
                <label className="flex items-center space-x-2 text-xs text-white/80 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={autoSyncEnabled}
                    onChange={(e) => setAutoSyncEnabled(e.target.checked)}
                    className="rounded border-white/30 text-indigo-500 focus:ring-indigo-400"
                  />
                  <span>Enable automatic background sync every 2 hours</span>
                </label>

                {/* Action Buttons */}
                <div className="flex items-center space-x-2 pt-1">
                  <button
                    type="button"
                    onClick={handleTestConnection}
                    disabled={isTesting || isSaving}
                    className="flex-1 py-2 px-3 rounded-xl glass-button text-xs font-semibold text-white/80 hover:text-white cursor-pointer disabled:opacity-50"
                  >
                    {isTesting ? "Testing…" : "Test Connection"}
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveAndSync}
                    disabled={isTesting || isSaving}
                    className="flex-1 py-2 px-3 rounded-xl glass-button-primary text-xs font-bold text-white shadow-md shadow-indigo-600/30 cursor-pointer disabled:opacity-50"
                  >
                    {isSaving ? "Connecting & Syncing…" : "Save & Sync Now"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Local JSON Backup */}
        {activeTab === "local" && (
          <div className="flex-1 overflow-y-auto space-y-3.5 pr-1">
            {/* Warning / Protection Notice */}
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-200/90 text-xs space-y-1">
              <p className="font-semibold flex items-center space-x-1.5 text-amber-300">
                <span>⚠</span>
                <span>Local Offline Protection:</span>
              </p>
              <p className="text-[11px] text-amber-200/80 leading-relaxed">
                You can always export a standalone <code>.json</code> file to store on a USB drive or local disk. All tasks, priorities, and notes are preserved.
              </p>
            </div>

            {/* Actions Grid */}
            <div className="grid grid-cols-2 gap-3">
              {/* Export Action */}
              <div className="p-3.5 rounded-xl bg-white/[0.04] border border-white/[0.08] flex flex-col justify-between space-y-3">
                <div>
                  <p className="text-xs font-semibold text-white/90">Export Backup</p>
                  <p className="text-[10px] text-white/50 mt-0.5">
                    Save all tasks to a local .json file on your machine.
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
                    Select a previously exported .json file to restore data.
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
        )}
      </div>
    </div>
  );
};

export default BackupModal;
