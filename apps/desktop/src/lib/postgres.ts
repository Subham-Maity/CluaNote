import { invoke } from "@tauri-apps/api/core";
import { getAllTasksForSync, batchUpsertFromSync } from "./tasks";
import type {
  PostgresConfigInfo,
  ConnectionTestResult,
  SyncResult,
} from "../types/task";

/**
 * Tests connection to a remote PostgreSQL database and initializes table schema.
 */
export async function testPostgresConnection(
  url: string
): Promise<ConnectionTestResult> {
  return await invoke<ConnectionTestResult>("test_postgres_connection", { url });
}

/**
 * Saves and encrypts PostgreSQL connection URL at rest, testing connectivity first.
 */
export async function savePostgresConfig(
  url: string,
  autoSync = true
): Promise<PostgresConfigInfo> {
  return await invoke<PostgresConfigInfo>("save_postgres_config", {
    url,
    autoSync,
  });
}

/**
 * Retrieves the current PostgreSQL connection info (with redacted credentials).
 */
export async function getPostgresConfig(): Promise<PostgresConfigInfo> {
  return await invoke<PostgresConfigInfo>("get_postgres_config");
}

/**
 * Disconnects the active PostgreSQL database and wipes the encrypted credentials.
 */
export async function disconnectPostgres(): Promise<void> {
  await invoke("disconnect_postgres");
}

/**
 * Performs a complete bi-directional synchronization between local SQLite and remote PostgreSQL.
 * Resolves conflicts by comparing `updated_at` timestamps per record.
 */
export async function runPostgresSync(): Promise<SyncResult> {
  // 1. Gather all local tasks (including tombstones)
  const localTasks = await getAllTasksForSync();

  // 2. Invoke Rust backend sync engine
  const result = await invoke<SyncResult>("sync_postgres", {
    localTasks,
  });

  // 3. If remote tasks were pulled, atomically merge them into SQLite
  if (result.pulled_tasks && result.pulled_tasks.length > 0) {
    await batchUpsertFromSync(result.pulled_tasks);
  }

  return result;
}

// ----------------------------------------------------------------------------
// Background Auto-Sync Scheduler
// ----------------------------------------------------------------------------

const AUTO_SYNC_INTERVAL_MS = 30 * 1000; // 30 seconds
let autoSyncTimer: number | null = null;
let consecutiveFailures = 0;
let isSyncInProgress = false;

/**
 * Checks and triggers sync if PostgreSQL is configured and auto-sync is enabled.
 */
export async function triggerSyncIfConfigured(
  onSyncSuccess?: (result: SyncResult) => void,
  onSyncError?: (error: string) => void
): Promise<void> {
  if (isSyncInProgress) return;
  try {
    isSyncInProgress = true;
    const config = await getPostgresConfig();
    if (config.is_configured && config.auto_sync) {
      const result = await runPostgresSync();
      consecutiveFailures = 0;
      if (onSyncSuccess) onSyncSuccess(result);
    }
  } catch (err) {
    consecutiveFailures = Math.min(consecutiveFailures + 1, 5);
    const errMsg = err instanceof Error ? err.message : String(err);
    console.warn(
      `[CluaNote AutoSync] Attempt failed (retry in ${consecutiveFailures * 10}s):`,
      errMsg
    );
    if (onSyncError) onSyncError(errMsg);
  } finally {
    isSyncInProgress = false;
  }
}

/**
 * Starts periodic background auto-sync if PostgreSQL is configured.
 * Also reacts immediately to window focus and visibility changes.
 */
export function startBackgroundAutoSync(
  onSyncSuccess?: (result: SyncResult) => void,
  onSyncError?: (error: string) => void
): () => void {
  if (autoSyncTimer) {
    window.clearTimeout(autoSyncTimer);
  }

  const scheduleNextRun = (delayMs: number) => {
    autoSyncTimer = window.setTimeout(async () => {
      await triggerSyncIfConfigured(onSyncSuccess, onSyncError);
      // Backoff if failed, otherwise 30 seconds
      const nextDelay =
        consecutiveFailures > 0
          ? Math.min(consecutiveFailures * 10 * 1000, 5 * 60 * 1000)
          : AUTO_SYNC_INTERVAL_MS;
      scheduleNextRun(nextDelay);
    }, delayMs);
  };

  const handleFocus = () => {
    triggerSyncIfConfigured(onSyncSuccess, onSyncError);
  };

  const handleVisibilityChange = () => {
    if (document.visibilityState === "visible") {
      triggerSyncIfConfigured(onSyncSuccess, onSyncError);
    }
  };

  window.addEventListener("focus", handleFocus);
  document.addEventListener("visibilitychange", handleVisibilityChange);

  // Run initial background sync after 2 seconds if configured
  scheduleNextRun(2000);

  return () => {
    if (autoSyncTimer) {
      window.clearTimeout(autoSyncTimer);
      autoSyncTimer = null;
    }
    window.removeEventListener("focus", handleFocus);
    document.removeEventListener("visibilitychange", handleVisibilityChange);
  };
}
