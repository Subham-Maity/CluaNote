import { getDb } from "./db";
import type { NewTask, Task, UpdateTaskInput, SyncTask } from "../types/task";

/**
 * Fetches all active tasks for a specific date (YYYY-MM-DD), ordered by time and creation.
 */
export async function getTasks(date: string): Promise<Task[]> {
  const db = await getDb();
  const rows = await db.select<Task[]>(
    `SELECT id, uuid, title, note, date, time, priority, completed, created_at, updated_at, is_deleted 
     FROM tasks 
     WHERE is_deleted = 0 AND date = $1 
     ORDER BY 
       CASE WHEN time IS NULL THEN 0 ELSE 1 END,
       time ASC, 
       id ASC`,
    [date]
  );
  return rows;
}

/**
 * Fetches all active tasks in the database (for alarm checker and backups).
 */
export async function getAllTasks(): Promise<Task[]> {
  const db = await getDb();
  const rows = await db.select<Task[]>(
    `SELECT id, uuid, title, note, date, time, priority, completed, created_at, updated_at, is_deleted 
     FROM tasks 
     WHERE is_deleted = 0
     ORDER BY date ASC, time ASC, id ASC`
  );
  return rows;
}

/**
 * Fetches all tasks (including soft-deleted tombstones) to synchronize with remote Postgres.
 */
export async function getAllTasksForSync(): Promise<SyncTask[]> {
  const db = await getDb();
  const rows = await db.select<SyncTask[]>(
    `SELECT uuid, title, note, date, time, priority, completed, created_at, updated_at, is_deleted 
     FROM tasks 
     ORDER BY updated_at ASC`
  );
  return rows;
}

/**
 * Fetches all incomplete (pending) tasks across all dates.
 * Used by the Pending History modal. Results ordered by date DESC then time ASC.
 */
export async function getPendingTasks(): Promise<Task[]> {
  const db = await getDb();
  const rows = await db.select<Task[]>(
    `SELECT id, uuid, title, note, date, time, priority, completed, created_at, updated_at, is_deleted 
     FROM tasks 
     WHERE is_deleted = 0 AND completed = 0
     ORDER BY date DESC, time ASC, id ASC`
  );
  return rows;
}

/**
 * Fetches all tasks marked as Not Done (completed = 2) across all dates.
 * Used by the Not Done History modal. Results ordered by date DESC then time ASC.
 */
export async function getNotDoneTasks(): Promise<Task[]> {
  const db = await getDb();
  const rows = await db.select<Task[]>(
    `SELECT id, uuid, title, note, date, time, priority, completed, created_at, updated_at, is_deleted 
     FROM tasks 
     WHERE is_deleted = 0 AND completed = 2
     ORDER BY date DESC, time ASC, id ASC`
  );
  return rows;
}

/**
 * Fetches all incomplete tasks from yesterday.
 * Used by the Pending Reminder Banner shown on app open.
 */
export async function getYesterdayPendingTasks(): Promise<Task[]> {
  const db = await getDb();
  const rows = await db.select<Task[]>(
    `SELECT id, uuid, title, note, date, time, priority, completed, created_at, updated_at, is_deleted 
     FROM tasks 
     WHERE is_deleted = 0 
       AND completed = 0
       AND date = date('now', '-1 day')
     ORDER BY time ASC, id ASC`
  );
  return rows;
}

/**
 * Inserts a new task into SQLite with generated UUID and updated_at timestamp.
 */
export async function addTask(task: NewTask): Promise<void> {
  const db = await getDb();
  const title = task.title.trim();
  if (!title) {
    throw new Error("Task title cannot be empty");
  }

  const uuid = task.uuid || crypto.randomUUID();
  const nowIso = new Date().toISOString();

  await db.execute(
    `INSERT INTO tasks (uuid, title, note, date, time, priority, completed, created_at, updated_at, is_deleted) 
     VALUES ($1, $2, $3, $4, $5, $6, 0, $7, $8, 0)`,
    [
      uuid,
      title,
      task.note ? task.note.trim() : null,
      task.date,
      task.time || null,
      task.priority || "medium",
      nowIso,
      nowIso,
    ]
  );
}

/**
 * Updates an existing task with partial changes and updates the updated_at timestamp.
 */
export async function updateTask(
  id: number,
  changes: UpdateTaskInput
): Promise<void> {
  const db = await getDb();

  const setClauses: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (changes.title !== undefined) {
    const title = changes.title.trim();
    if (!title) {
      throw new Error("Task title cannot be empty");
    }
    setClauses.push(`title = $${paramIndex++}`);
    values.push(title);
  }

  if (changes.note !== undefined) {
    setClauses.push(`note = $${paramIndex++}`);
    values.push(changes.note ? changes.note.trim() : null);
  }

  if (changes.date !== undefined) {
    setClauses.push(`date = $${paramIndex++}`);
    values.push(changes.date);
  }

  if (changes.time !== undefined) {
    setClauses.push(`time = $${paramIndex++}`);
    values.push(changes.time || null);
  }

  if (changes.priority !== undefined) {
    setClauses.push(`priority = $${paramIndex++}`);
    values.push(changes.priority);
  }

  if (changes.completed !== undefined) {
    setClauses.push(`completed = $${paramIndex++}`);
    values.push(changes.completed);
  }

  // Always update updated_at timestamp
  const nowIso = new Date().toISOString();
  setClauses.push(`updated_at = $${paramIndex++}`);
  values.push(nowIso);

  values.push(id);
  const sql = `UPDATE tasks SET ${setClauses.join(", ")} WHERE id = $${paramIndex}`;
  await db.execute(sql, values);
}

/**
 * Soft deletes a task by its ID (marks is_deleted = 1 and updates timestamp).
 */
export async function deleteTask(id: number): Promise<void> {
  const db = await getDb();
  const nowIso = new Date().toISOString();
  await db.execute(
    "UPDATE tasks SET is_deleted = 1, updated_at = $1 WHERE id = $2",
    [nowIso, id]
  );
}

/**
 * Sets the completion status of a task.
 */
export async function toggleComplete(
  id: number,
  completed: boolean
): Promise<void> {
  const db = await getDb();
  const nowIso = new Date().toISOString();
  await db.execute(
    "UPDATE tasks SET completed = $1, updated_at = $2 WHERE id = $3",
    [completed ? 1 : 0, nowIso, id]
  );
}

/**
 * Sets the explicit status of a task:
 * 0 = active/pending
 * 1 = completed/done
 * 2 = not done / missed
 */
export async function setTaskStatus(
  id: number,
  status: number
): Promise<void> {
  const db = await getDb();
  const nowIso = new Date().toISOString();
  await db.execute(
    "UPDATE tasks SET completed = $1, updated_at = $2 WHERE id = $3",
    [status, nowIso, id]
  );
}

/**
 * Merges pulled remote tasks from Postgres into local SQLite.
 * Uses atomic SQLite transactions to prevent partial writes.
 */
export async function batchUpsertFromSync(pulledTasks: SyncTask[]): Promise<number> {
  if (pulledTasks.length === 0) return 0;
  const db = await getDb();

  let mergedCount = 0;
  for (const t of pulledTasks) {
    await db.execute(
      `INSERT INTO tasks (uuid, title, note, date, time, priority, completed, created_at, updated_at, is_deleted)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT (uuid) DO UPDATE SET
         title = excluded.title,
         note = excluded.note,
         date = excluded.date,
         time = excluded.time,
         priority = excluded.priority,
         completed = excluded.completed,
         created_at = excluded.created_at,
         updated_at = excluded.updated_at,
         is_deleted = excluded.is_deleted
       WHERE excluded.updated_at >= tasks.updated_at;`,
      [
        t.uuid,
        t.title,
        t.note || null,
        t.date,
        t.time || null,
        t.priority || "medium",
        t.completed,
        t.created_at,
        t.updated_at,
        t.is_deleted,
      ]
    );
    mergedCount++;
  }

  return mergedCount;
}

/**
 * Exports all active tasks as a JSON formatted string for backup.
 */
export async function exportAllTasksJson(): Promise<string> {
  const tasks = await getAllTasks();
  const backup = {
    appName: "CluaNote",
    version: "0.3.3",
    exportedAt: new Date().toISOString(),
    totalTasks: tasks.length,
    tasks,
  };
  return JSON.stringify(backup, null, 2);
}

/**
 * Imports tasks from JSON backup data into SQLite.
 */
export async function importTasksFromJson(jsonData: string): Promise<number> {
  const parsed = JSON.parse(jsonData);
  const taskList: Task[] = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed.tasks)
    ? parsed.tasks
    : [];

  if (taskList.length === 0) {
    throw new Error("No tasks found in the uploaded backup file");
  }

  const db = await getDb();
  let count = 0;
  for (const t of taskList) {
    if (!t.title || !t.date) continue;
    const uuid = t.uuid || crypto.randomUUID();
    const nowIso = new Date().toISOString();
    await db.execute(
      `INSERT INTO tasks (uuid, title, note, date, time, priority, completed, created_at, updated_at, is_deleted) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 0)`,
      [
        uuid,
        t.title.trim(),
        t.note ? t.note.trim() : null,
        t.date,
        t.time || null,
        t.priority || "medium",
        t.completed || 0,
        t.created_at || nowIso,
        t.updated_at || nowIso,
      ]
    );
    count++;
  }
  return count;
}

