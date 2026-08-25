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

const AUTO_SYNC_INTERVAL_MS = 2 * 60 * 60 * 1000; // 2 hours
let autoSyncTimer: number | null = null;
let consecutiveFailures = 0;

/**
 * Starts periodic background auto-sync if PostgreSQL is configured.
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
      try {
        const config = await getPostgresConfig();
        if (config.is_configured && config.auto_sync) {
          const result = await runPostgresSync();
          consecutiveFailures = 0;
          if (onSyncSuccess) onSyncSuccess(result);
        }
        scheduleNextRun(AUTO_SYNC_INTERVAL_MS);
      } catch (err) {
        consecutiveFailures = Math.min(consecutiveFailures + 1, 5);
        const errMsg = err instanceof Error ? err.message : String(err);
        console.warn(`[CluaNote AutoSync] Attempt failed (retry in ${consecutiveFailures * 5}m):`, errMsg);
        if (onSyncError) onSyncError(errMsg);
        // Exponential backoff up to 30 mins
        const backoffMs = Math.min(consecutiveFailures * 5 * 60 * 1000, 30 * 60 * 1000);
        scheduleNextRun(backoffMs);
      }
    }, delayMs);
  };

  // Run initial background sync after 15 seconds if configured
  scheduleNextRun(15000);

  return () => {
    if (autoSyncTimer) {
      window.clearTimeout(autoSyncTimer);
      autoSyncTimer = null;
    }
  };
}
