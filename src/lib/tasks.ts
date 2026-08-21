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
