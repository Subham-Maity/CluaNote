export type TaskPriority = "low" | "medium" | "high";
export type TaskStatus = 0 | 1 | 2; // 0 = active/pending, 1 = completed, 2 = not done

export interface Task {
  id: number;
  uuid: string; // Unique stable ID for cross-device sync
  title: string;
  note: string | null;
  date: string; // 'YYYY-MM-DD'
  time: string | null; // 'HH:MM' (24-hour format) or null for anytime tasks
  priority: TaskPriority;
  completed: number; // 0 = active/pending, 1 = completed, 2 = not done
  created_at: string;
  updated_at: string; // ISO UTC timestamp for conflict resolution
  is_deleted: number; // 0 = active, 1 = deleted (tombstone)
  is_future_note: number; // 0 = regular task/event, 1 = future planning note (Kanban only)
}

export interface NewTask {
  title: string;
  note?: string | null;
  date: string; // 'YYYY-MM-DD'
  time?: string | null; // 'HH:MM'
  priority?: TaskPriority;
  uuid?: string;
  is_future_note?: number; // 0 = regular task, 1 = future planning note
}

export type UpdateTaskInput = Partial<Omit<Task, "id" | "created_at">>;

export interface SyncTask {
  uuid: string;
  title: string;
  note: string | null;
  date: string;
  time: string | null;
  priority: string;
  completed: number;
  created_at: string;
  updated_at: string;
  is_deleted: number;
  is_future_note: number; // 0 = regular task, 1 = future planning note
}

export interface PostgresConfigInfo {
  is_configured: boolean;
  redacted_url: string | null;
  auto_sync: boolean;
  last_synced_at: string | null;
  last_error: string | null;
}

export interface ConnectionTestResult {
  success: boolean;
  message: string;
  server_version?: string;
}

export interface SyncResult {
  success: boolean;
  pushed_count: number;
  pulled_count: number;
  pulled_tasks: SyncTask[];
  synced_at: string;
  message: string;
}
