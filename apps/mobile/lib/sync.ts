import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState, type AppStateStatus } from "react-native";
import { getAllTasksForSync, batchUpsertFromSync, getAllTasks } from "./tasks";
import { rescheduleAllAlarms } from "./alarm";
import type { SyncTask } from "@cluanote/shared";

export const SYNC_URL_STORE_KEY = "cluanote_sync_url";
export const AUTO_SYNC_ENABLED_KEY = "cluanote_auto_sync_enabled";
export const LAST_SYNCED_AT_KEY = "cluanote_last_synced_at";

export interface SyncConfig {
  isConfigured: boolean;
  url: string | null;
  autoSync: boolean;
  lastSyncedAt: string | null;
}

export interface SyncResult {
  success: boolean;
  pushedCount: number;
  pulledCount: number;
  pulledTasks?: SyncTask[];
  syncedAt: string;
  message: string;
}

/**
 * Retrieves the stored synchronization configuration.
 */
export async function getSyncConfig(): Promise<SyncConfig> {
  try {
    let url: string | null = null;
    try {
      url = await SecureStore.getItemAsync(SYNC_URL_STORE_KEY);
    } catch {
      url = await AsyncStorage.getItem(SYNC_URL_STORE_KEY);
    }

    const autoSyncRaw = await AsyncStorage.getItem(AUTO_SYNC_ENABLED_KEY);
    const lastSyncedAt = await AsyncStorage.getItem(LAST_SYNCED_AT_KEY);
    const autoSync = autoSyncRaw === null ? true : autoSyncRaw === "true";

    return {
      isConfigured: Boolean(url && url.trim().length > 0),
      url,
      autoSync,
      lastSyncedAt,
    };
  } catch (err) {
    console.warn("Failed to read sync config:", err);
    return {
      isConfigured: false,
      url: null,
      autoSync: false,
      lastSyncedAt: null,
    };
  }
}

/**
 * Saves and securely persists the synchronization URL and auto-sync preference.
 */
export async function saveSyncConfig(
  url: string,
  autoSync = true
): Promise<void> {
  const trimmed = url.trim();
  try {
    await SecureStore.setItemAsync(SYNC_URL_STORE_KEY, trimmed);
  } catch {
    await AsyncStorage.setItem(SYNC_URL_STORE_KEY, trimmed);
  }
  await AsyncStorage.setItem(AUTO_SYNC_ENABLED_KEY, String(autoSync));
}

/**
 * Removes the sync URL and turns off sync.
 */
export async function disconnectSync(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(SYNC_URL_STORE_KEY);
  } catch {
    // Ignore
  }
  await AsyncStorage.removeItem(SYNC_URL_STORE_KEY);
  await AsyncStorage.setItem(AUTO_SYNC_ENABLED_KEY, "false");
}

/**
 * Helper to determine if a URL is a Neon PostgreSQL connection string.
 */
function isNeonConnectionString(raw: string): boolean {
  return (
    (raw.startsWith("postgres://") || raw.startsWith("postgresql://")) &&
    raw.includes("neon.tech")
  );
}

/**
 * Executes a SQL query against Neon PostgreSQL over secure HTTPS.
 */
async function executeNeonSql(
  pgUrl: string,
  query: string,
  params: unknown[] = []
): Promise<Record<string, unknown>[]> {
  const urlObj = new URL(pgUrl);
  const host = urlObj.hostname;
  const password = decodeURIComponent(urlObj.password);

  const endpoint = `https://${host}/sql`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${password}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query,
      params,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Neon SQL error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  return (data.rows || []) as Record<string, unknown>[];
}

/**
 * Tests connection to the remote PostgreSQL / Neon database or sync server.
 */
export async function testSyncConnection(url: string): Promise<{ success: boolean; message: string }> {
  const trimmed = url.trim();
  if (!trimmed) {
    throw new Error("Connection URL cannot be empty");
  }

  if (isNeonConnectionString(trimmed)) {
    // Direct Neon HTTPS test
    try {
      const rows = await executeNeonSql(trimmed, "SELECT 1 as connected, NOW() as server_time;");
      if (rows && rows.length > 0) {
        return {
          success: true,
          message: `Connected to Neon PostgreSQL successfully! Server time: ${rows[0].server_time || "OK"}`,
        };
      }
      return { success: true, message: "Connected successfully." };
    } catch (err) {
      throw new Error(`Connection failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // Generic Sync Server HTTP test
  try {
    const cleanUrl = trimmed.replace(/\/+$/, "");
    const testUrl = cleanUrl.endsWith("/api/test") ? cleanUrl : `${cleanUrl}/api/test`;
    const response = await fetch(testUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: trimmed }),
    });

    if (!response.ok) {
      const txt = await response.text();
      throw new Error(`Server returned HTTP ${response.status}: ${txt}`);
    }

    const json = await response.json();
    return {
      success: true,
      message: json.message || "Connected to sync server successfully!",
    };
  } catch (err) {
    throw new Error(`Failed to reach sync server: ${err instanceof Error ? err.message : String(err)}`);
  }
}

/**
 * Runs a complete bi-directional sync:
 * 1. Fetches latest remote tasks FIRST.
 * 2. Merges any newly added or updated remote tasks into local SQLite.
 * 3. Selectively pushes only newer local tasks to remote.
 * 4. Reschedules upcoming active alarms.
 */
export async function runPostgresSync(): Promise<SyncResult> {
  const config = await getSyncConfig();
  if (!config.url) {
    throw new Error("No synchronization URL configured. Please configure your database in Settings.");
  }

  const url = config.url.trim();
  const localTasks = await getAllTasksForSync();
  const localMap = new Map<string, SyncTask>(localTasks.map((t) => [t.uuid, t]));

  let remoteTasks: SyncTask[] = [];

  if (isNeonConnectionString(url)) {
    // 1. Ensure table schema exists on Neon PostgreSQL
    await executeNeonSql(
      url,
      `
      CREATE TABLE IF NOT EXISTS cluanote_tasks (
          uuid VARCHAR(64) PRIMARY KEY,
          title TEXT NOT NULL,
          note TEXT,
          date VARCHAR(10) NOT NULL,
          time VARCHAR(10),
          priority VARCHAR(10) NOT NULL DEFAULT 'medium',
          completed INTEGER NOT NULL DEFAULT 0,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
          is_future_note INTEGER NOT NULL DEFAULT 0
      );
      CREATE INDEX IF NOT EXISTS idx_cluanote_tasks_date ON cluanote_tasks(date);
      CREATE INDEX IF NOT EXISTS idx_cluanote_tasks_updated ON cluanote_tasks(updated_at);
      ALTER TABLE cluanote_tasks ADD COLUMN IF NOT EXISTS is_future_note INTEGER NOT NULL DEFAULT 0;
      `
    );

    // 2. Fetch all remote tasks FIRST
    const rows = await executeNeonSql(
      url,
      `
      SELECT 
          uuid, 
          title, 
          note, 
          date, 
          time, 
          priority, 
          completed, 
          to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') as created_at_str,
          to_char(updated_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') as updated_at_str,
          is_deleted,
          is_future_note
      FROM cluanote_tasks;
      `
    );

    remoteTasks = rows.map((r) => ({
      uuid: String(r.uuid),
      title: String(r.title),
      note: r.note ? String(r.note) : null,
      date: String(r.date),
      time: r.time ? String(r.time) : null,
      priority: String(r.priority || "medium"),
      completed: Number(r.completed || 0),
      created_at: String(r.created_at_str || new Date().toISOString()),
      updated_at: String(r.updated_at_str || new Date().toISOString()),
      is_deleted: r.is_deleted ? 1 : 0,
      is_future_note: Number(r.is_future_note || 0),
    }));
  } else {
    // Generic sync server
    const cleanUrl = url.replace(/\/+$/, "");
    const syncEndpoint = cleanUrl.endsWith("/api/sync") ? cleanUrl : `${cleanUrl}/api/sync`;
    const response = await fetch(syncEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ local_tasks: localTasks }),
    });

    if (!response.ok) {
      const txt = await response.text();
      throw new Error(`Sync server error (${response.status}): ${txt}`);
    }

    const data = await response.json();
    if (data.pulled_tasks && Array.isArray(data.pulled_tasks)) {
      await batchUpsertFromSync(data.pulled_tasks);
      const all = await getAllTasks();
      await rescheduleAllAlarms(all);
    }

    const nowIso = new Date().toISOString();
    await AsyncStorage.setItem(LAST_SYNCED_AT_KEY, nowIso);
    return {
      success: true,
      pushedCount: data.pushed_count || 0,
      pulledCount: data.pulled_count || (data.pulled_tasks ? data.pulled_tasks.length : 0),
      pulledTasks: data.pulled_tasks,
      syncedAt: nowIso,
      message: data.message || "Synced successfully with server.",
    };
  }

  // 3. Reconcile differences: PULL newer/new remote records FIRST
  const remoteMap = new Map<string, SyncTask>(remoteTasks.map((t) => [t.uuid, t]));
  const pulledTasks: SyncTask[] = [];
  const toPush: SyncTask[] = [];

  for (const remote of remoteTasks) {
    const local = localMap.get(remote.uuid);
    if (!local) {
      // Newly created on desktop / other device -> pull!
      pulledTasks.push(remote);
    } else {
      const remoteTime = new Date(remote.updated_at).getTime();
      const localTime = new Date(local.updated_at).getTime();
      if (remoteTime > localTime) {
        pulledTasks.push(remote);
      }
    }
  }

  for (const local of localTasks) {
    const remote = remoteMap.get(local.uuid);
    if (!remote) {
      // Newly created on this device -> push!
      toPush.push(local);
    } else {
      const localTime = new Date(local.updated_at).getTime();
      const remoteTime = new Date(remote.updated_at).getTime();
      if (localTime > remoteTime) {
        toPush.push(local);
      }
    }
  }

  // 4. Merge pulled tasks into local SQLite FIRST
  if (pulledTasks.length > 0) {
    await batchUpsertFromSync(pulledTasks);
  }

  // 5. Selectively push genuinely newer local tasks to PostgreSQL
  let pushedCount = 0;
  for (const task of toPush) {
    await executeNeonSql(
      url,
      `
      INSERT INTO cluanote_tasks (
          uuid, title, note, date, time, priority, completed, created_at, updated_at, is_deleted, is_future_note
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8::timestamptz, $9::timestamptz, $10, $11)
      ON CONFLICT (uuid) DO UPDATE SET
          title = EXCLUDED.title,
          note = EXCLUDED.note,
          date = EXCLUDED.date,
          time = EXCLUDED.time,
          priority = EXCLUDED.priority,
          completed = EXCLUDED.completed,
          updated_at = EXCLUDED.updated_at,
          is_deleted = EXCLUDED.is_deleted,
          is_future_note = EXCLUDED.is_future_note
      WHERE EXCLUDED.updated_at >= cluanote_tasks.updated_at;
      `,
      [
        task.uuid,
        task.title,
        task.note || null,
        task.date,
        task.time || null,
        task.priority || "medium",
        task.completed,
        task.created_at,
        task.updated_at,
        task.is_deleted === 1,
        task.is_future_note ?? 0,
      ]
    );
    pushedCount++;
  }

  // Reschedule alarms if tasks changed
  if (pulledTasks.length > 0 || pushedCount > 0) {
    try {
      const all = await getAllTasks();
      await rescheduleAllAlarms(all);
    } catch (err) {
      console.warn("Failed to reschedule alarms after sync:", err);
    }
  }

  const nowIso = new Date().toISOString();
  await AsyncStorage.setItem(LAST_SYNCED_AT_KEY, nowIso);

  return {
    success: true,
    pushedCount,
    pulledCount: pulledTasks.length,
    pulledTasks,
    syncedAt: nowIso,
    message: `Sync successful. Pushed ${pushedCount} task(s), pulled ${pulledTasks.length} task(s).`,
  };
}

// ----------------------------------------------------------------------------
// Mobile Background & Foreground Auto-Sync Scheduler
// ----------------------------------------------------------------------------

let autoSyncTimer: ReturnType<typeof setTimeout> | null = null;
let isSyncInProgress = false;
let failureCount = 0;

/**
 * Triggers sync if configured and auto-sync is enabled.
 */
export async function triggerMobileSyncIfConfigured(
  onSuccess?: (result: SyncResult) => void,
  onError?: (error: string) => void
): Promise<void> {
  if (isSyncInProgress) return;
  try {
    isSyncInProgress = true;
    const config = await getSyncConfig();
    if (config.isConfigured && config.autoSync) {
      const result = await runPostgresSync();
      failureCount = 0;
      if (onSuccess) onSuccess(result);
    }
  } catch (err) {
    failureCount = Math.min(failureCount + 1, 5);
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[CluaNote Mobile AutoSync] Sync attempt failed:`, msg);
    if (onError) onError(msg);
  } finally {
    isSyncInProgress = false;
  }
}

/**
 * Starts periodic sync and listens for app state changes (foreground resume).
 */
export function startMobileAutoSync(
  onSuccess?: (result: SyncResult) => void,
  onError?: (error: string) => void
): () => void {
  if (autoSyncTimer) {
    clearTimeout(autoSyncTimer);
  }

  const scheduleNext = (delayMs: number) => {
    autoSyncTimer = setTimeout(async () => {
      await triggerMobileSyncIfConfigured(onSuccess, onError);
      const nextDelay =
        failureCount > 0 ? Math.min(failureCount * 10 * 1000, 2 * 60 * 1000) : 30 * 1000;
      scheduleNext(nextDelay);
    }, delayMs);
  };

  // Immediate sync when app becomes active
  const subscription = AppState.addEventListener("change", (nextState: AppStateStatus) => {
    if (nextState === "active") {
      triggerMobileSyncIfConfigured(onSuccess, onError);
    }
  });

  // Initial sync attempt after 2 seconds
  scheduleNext(2000);

  return () => {
    if (autoSyncTimer) {
      clearTimeout(autoSyncTimer);
      autoSyncTimer = null;
    }
    subscription.remove();
  };
}
