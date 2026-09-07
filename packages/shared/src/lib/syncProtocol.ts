import type { SyncTask } from "../types/task";

/**
 * Resolves conflict between a local and remote task using last-write-wins (updated_at timestamp comparison).
 */
export function resolveConflict(local: SyncTask, remote: SyncTask): SyncTask {
  return remote.updated_at >= local.updated_at ? remote : local;
}

/**
 * Builds the list of remote tasks that need to be pulled into the local database.
 */
export function buildPullList(
  localMap: Map<string, SyncTask>,
  remoteTasks: SyncTask[]
): SyncTask[] {
  return remoteTasks.filter((r) => {
    const local = localMap.get(r.uuid);
    return !local || r.updated_at > local.updated_at;
  });
}

/**
 * Builds the list of local tasks that need to be pushed to the remote database.
 */
export function buildPushList(
  localTasks: SyncTask[],
  remoteMap: Map<string, SyncTask>
): SyncTask[] {
  return localTasks.filter((l) => {
    const remote = remoteMap.get(l.uuid);
    return !remote || l.updated_at > remote.updated_at;
  });
}
