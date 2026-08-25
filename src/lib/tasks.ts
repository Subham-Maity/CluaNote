import { getDb } from "./db";
import type { NewTask, Task, UpdateTaskInput } from "../types/task";

/**
 * Fetches all tasks for a specific date (YYYY-MM-DD), ordered by time and creation.
 */
export async function getTasks(date: string): Promise<Task[]> {
  const db = await getDb();
  const rows = await db.select<Task[]>(
    `SELECT id, title, note, date, time, priority, completed, created_at 
     FROM tasks 
     WHERE date = $1 
     ORDER BY 
       CASE WHEN time IS NULL THEN 0 ELSE 1 END,
       time ASC, 
       id ASC`,
    [date]
  );
  return rows;
}

/**
 * Fetches all tasks in the database (for alarm checker and backups).
 */
export async function getAllTasks(): Promise<Task[]> {
  const db = await getDb();
  const rows = await db.select<Task[]>(
    `SELECT id, title, note, date, time, priority, completed, created_at 
     FROM tasks 
     ORDER BY date ASC, time ASC, id ASC`
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
    `SELECT id, title, note, date, time, priority, completed, created_at 
     FROM tasks 
     WHERE completed = 0
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
    `SELECT id, title, note, date, time, priority, completed, created_at 
     FROM tasks 
     WHERE completed = 2
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
    `SELECT id, title, note, date, time, priority, completed, created_at 
     FROM tasks 
     WHERE completed = 0
       AND date = date('now', '-1 day')
     ORDER BY time ASC, id ASC`
  );
  return rows;
}

/**
 * Inserts a new task into SQLite.
 */
export async function addTask(task: NewTask): Promise<void> {
  const db = await getDb();
  const title = task.title.trim();
  if (!title) {
    throw new Error("Task title cannot be empty");
  }

  await db.execute(
    `INSERT INTO tasks (title, note, date, time, priority, completed) 
     VALUES ($1, $2, $3, $4, $5, 0)`,
    [
      title,
      task.note ? task.note.trim() : null,
      task.date,
      task.time || null,
      task.priority || "medium",
    ]
  );
}

/**
 * Updates an existing task with partial changes.
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
    values.push(changes.completed ? 1 : 0);
  }

  if (setClauses.length === 0) {
    return;
  }

  values.push(id);
  const sql = `UPDATE tasks SET ${setClauses.join(", ")} WHERE id = $${paramIndex}`;
  await db.execute(sql, values);
}

/**
 * Deletes a task by its ID.
 */
export async function deleteTask(id: number): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM tasks WHERE id = $1", [id]);
}

/**
 * Toggles or sets the completion status of a task.
 * If completed is true, sets to 1 (done). If false, sets to 0 (pending/active).
 */
export async function toggleComplete(
  id: number,
  completed: boolean
): Promise<void> {
  const db = await getDb();
  await db.execute("UPDATE tasks SET completed = $1 WHERE id = $2", [
    completed ? 1 : 0,
    id,
  ]);
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
  await db.execute("UPDATE tasks SET completed = $1 WHERE id = $2", [
    status,
    id,
  ]);
}

/**
 * Exports all tasks as a JSON formatted string for backup.
 */
export async function exportAllTasksJson(): Promise<string> {
  const tasks = await getAllTasks();
  const backup = {
    appName: "CluaNote",
    version: "0.3.2",
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
    await db.execute(
      `INSERT INTO tasks (title, note, date, time, priority, completed) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        t.title.trim(),
        t.note ? t.note.trim() : null,
        t.date,
        t.time || null,
        t.priority || "medium",
        t.completed ? 1 : 0,
      ]
    );
    count++;
  }
  return count;
}
