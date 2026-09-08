import { getExpoDb } from "./db";
import { scheduleTaskAlarm, cancelTaskAlarm, rescheduleAllAlarms } from "./alarm";
import { type Task, type NewTask, type UpdateTaskInput, type SyncTask, CURRENT_VERSION } from "@cluanote/shared";

/**
 * Fetches all active tasks for a specific date (YYYY-MM-DD), ordered by time and creation.
 */
export async function getTasks(date: string): Promise<Task[]> {
  const expoDb = await getExpoDb();
  return await expoDb.getAllAsync<Task>(
    `SELECT * FROM tasks
     WHERE is_deleted = 0 AND date = ? AND is_future_note = 0
     ORDER BY CASE WHEN time IS NULL THEN 0 ELSE 1 END, time ASC, id ASC;`,
    [date]
  );
}

/**
 * Fetches all active tasks in the database (for backup and alarms).
 */
export async function getAllTasks(): Promise<Task[]> {
  const expoDb = await getExpoDb();
  return await expoDb.getAllAsync<Task>(
    `SELECT * FROM tasks
     WHERE is_deleted = 0
     ORDER BY date ASC, time ASC, id ASC;`
  );
}

/**
 * Fetches all tasks (including soft-deleted tombstones) to synchronize with remote Postgres.
 */
export async function getAllTasksForSync(): Promise<SyncTask[]> {
  const expoDb = await getExpoDb();
  return await expoDb.getAllAsync<SyncTask>(
    `SELECT uuid, title, note, date, time, priority, completed, created_at, updated_at, is_deleted, is_future_note
     FROM tasks
     ORDER BY updated_at ASC;`
  );
}

/**
 * Fetches all incomplete (pending) tasks across all dates.
 */
export async function getPendingTasks(): Promise<Task[]> {
  const expoDb = await getExpoDb();
  return await expoDb.getAllAsync<Task>(
    `SELECT * FROM tasks
     WHERE is_deleted = 0 AND completed = 0 AND is_future_note = 0
     ORDER BY date DESC, time ASC, id ASC;`
  );
}

/**
 * Fetches all tasks marked as Not Done (completed = 2) across all dates.
 */
export async function getNotDoneTasks(): Promise<Task[]> {
  const expoDb = await getExpoDb();
  return await expoDb.getAllAsync<Task>(
    `SELECT * FROM tasks
     WHERE is_deleted = 0 AND completed = 2 AND is_future_note = 0
     ORDER BY date DESC, time ASC, id ASC;`
  );
}

/**
 * Fetches all incomplete tasks from yesterday.
 */
export async function getYesterdayPendingTasks(): Promise<Task[]> {
  const expoDb = await getExpoDb();
  return await expoDb.getAllAsync<Task>(
    `SELECT * FROM tasks
     WHERE is_deleted = 0 AND completed = 0 AND is_future_note = 0 AND date = date('now', '-1 day')
     ORDER BY date DESC, time ASC, id ASC;`
  );
}

/**
 * Fetches all completed tasks across all dates.
 */
export async function getCompletedTasks(): Promise<Task[]> {
  const expoDb = await getExpoDb();
  return await expoDb.getAllAsync<Task>(
    `SELECT * FROM tasks
     WHERE is_deleted = 0 AND completed = 1 AND is_future_note = 0
     ORDER BY date DESC, time ASC, id ASC;`
  );
}

/**
 * Fetches all future planning notes (is_future_note = 1) that are not soft-deleted.
 */
export async function getFutureNotes(): Promise<Task[]> {
  const expoDb = await getExpoDb();
  return await expoDb.getAllAsync<Task>(
    `SELECT * FROM tasks
     WHERE is_future_note = 1 AND is_deleted = 0
     ORDER BY created_at DESC;`
  );
}

/**
 * Promotes a future planning note to a real event by clearing its is_future_note flag.
 */
export async function pushNoteToEvent(id: number): Promise<void> {
  const expoDb = await getExpoDb();
  const existing = await expoDb.getFirstAsync<Task>(
    `SELECT * FROM tasks WHERE id = ? LIMIT 1;`,
    [id]
  );

  if (!existing) return;

  let notifId: string | null = null;
  if (existing.time) {
    notifId = await scheduleTaskAlarm({
      id: existing.id,
      uuid: existing.uuid,
      title: existing.title,
      note: existing.note,
      date: existing.date,
      time: existing.time,
      priority: existing.priority,
      completed: 0,
      is_future_note: 0,
      is_deleted: 0,
      created_at: existing.created_at,
      updated_at: existing.updated_at,
    });
  }

  const nowIso = new Date().toISOString();
  await expoDb.runAsync(
    `UPDATE tasks SET is_future_note = 0, completed = 0, notification_id = ?, updated_at = ? WHERE id = ?;`,
    [notifId, nowIso, id]
  );
}

/**
 * Inserts a new task into SQLite with generated UUID and updated_at timestamp.
 */
export async function addTask(task: NewTask): Promise<void> {
  const title = task.title.trim();
  if (!title) {
    throw new Error("Task title cannot be empty");
  }

  const expoDb = await getExpoDb();
  const uuid =
    task.uuid ||
    (typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `task-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`);
  const nowIso = new Date().toISOString();

  const res = await expoDb.runAsync(
    `INSERT INTO tasks (
      uuid, title, note, date, time, priority, completed, created_at, updated_at, is_deleted, is_future_note
    ) VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, 0, ?);`,
    [
      uuid,
      title,
      task.note ? task.note.trim() : null,
      task.date,
      task.time || null,
      task.priority || "medium",
      nowIso,
      nowIso,
      task.is_future_note ?? 0,
    ]
  );

  const insertedId = res.lastInsertRowId;
  if (insertedId && task.time && (task.is_future_note ?? 0) === 0) {
    const notifId = await scheduleTaskAlarm({
      id: insertedId,
      uuid,
      title,
      note: task.note ? task.note.trim() : null,
      date: task.date,
      time: task.time || null,
      priority: task.priority || "medium",
      completed: 0,
      created_at: nowIso,
      updated_at: nowIso,
      is_future_note: task.is_future_note ?? 0,
      is_deleted: 0,
    });

    if (notifId) {
      await expoDb.runAsync(
        `UPDATE tasks SET notification_id = ? WHERE id = ?;`,
        [notifId, insertedId]
      );
    }
  }
}

/**
 * Updates an existing task with partial changes and updates the updated_at timestamp.
 */
export async function updateTask(
  id: number,
  changes: UpdateTaskInput
): Promise<void> {
  const expoDb = await getExpoDb();
  const existing = await expoDb.getFirstAsync<Task & { notification_id?: string | null }>(
    `SELECT * FROM tasks WHERE id = ? LIMIT 1;`,
    [id]
  );

  if (!existing) return;

  const nowIso = new Date().toISOString();
  const sets: string[] = ["updated_at = ?"];
  const values: (string | number | null)[] = [nowIso];

  if (changes.title !== undefined) {
    const title = changes.title.trim();
    if (!title) throw new Error("Task title cannot be empty");
    sets.push("title = ?");
    values.push(title);
  }
  if (changes.note !== undefined) {
    sets.push("note = ?");
    values.push(changes.note ? changes.note.trim() : null);
  }
  if (changes.date !== undefined) {
    sets.push("date = ?");
    values.push(changes.date);
  }
  if (changes.time !== undefined) {
    sets.push("time = ?");
    values.push(changes.time || null);
  }
  if (changes.priority !== undefined) {
    sets.push("priority = ?");
    values.push(changes.priority);
  }
  if (changes.completed !== undefined) {
    sets.push("completed = ?");
    values.push(changes.completed);
  }
  if (changes.is_deleted !== undefined) {
    sets.push("is_deleted = ?");
    values.push(changes.is_deleted);
  }
  if (changes.is_future_note !== undefined) {
    sets.push("is_future_note = ?");
    values.push(changes.is_future_note);
  }

  // Handle alarm rescheduling if time/date/status changed
  const effectiveDate = changes.date !== undefined ? changes.date : existing.date;
  const effectiveTime = changes.time !== undefined ? changes.time || null : existing.time;
  const effectiveCompleted = changes.completed !== undefined ? changes.completed : existing.completed;
  const effectiveFuture = changes.is_future_note !== undefined ? changes.is_future_note : existing.is_future_note;
  const effectiveDeleted = changes.is_deleted !== undefined ? changes.is_deleted : existing.is_deleted;

  const timeOrDateChanged =
    changes.time !== undefined || changes.date !== undefined;
  const statusChanged =
    changes.completed !== undefined ||
    changes.is_deleted !== undefined ||
    changes.is_future_note !== undefined;

  if (timeOrDateChanged || statusChanged) {
    if (existing.notification_id) {
      await cancelTaskAlarm(existing.notification_id);
      sets.push("notification_id = ?");
      values.push(null);
    }

    if (
      effectiveCompleted === 0 &&
      effectiveFuture === 0 &&
      effectiveDeleted === 0 &&
      effectiveTime
    ) {
      const notifId = await scheduleTaskAlarm({
        id: existing.id,
        uuid: existing.uuid,
        title: changes.title !== undefined ? changes.title.trim() : existing.title,
        note:
          changes.note !== undefined
            ? changes.note
              ? changes.note.trim()
              : null
            : existing.note,
        date: effectiveDate,
        time: effectiveTime,
        priority: changes.priority || existing.priority,
        completed: 0,
        created_at: existing.created_at,
        updated_at: nowIso,
        is_future_note: 0,
        is_deleted: 0,
      });
      sets.push("notification_id = ?");
      values.push(notifId);
    }
  }

  values.push(id);
  await expoDb.runAsync(
    `UPDATE tasks SET ${sets.join(", ")} WHERE id = ?;`,
    values
  );
}

/**
 * Soft deletes a task by its ID (marks is_deleted = 1 and updates timestamp).
 */
export async function deleteTask(id: number): Promise<void> {
  const expoDb = await getExpoDb();
  const existing = await expoDb.getFirstAsync<{ notification_id: string | null }>(
    `SELECT notification_id FROM tasks WHERE id = ? LIMIT 1;`,
    [id]
  );

  if (existing?.notification_id) {
    await cancelTaskAlarm(existing.notification_id);
  }

  const nowIso = new Date().toISOString();
  await expoDb.runAsync(
    `UPDATE tasks SET is_deleted = 1, notification_id = null, updated_at = ? WHERE id = ?;`,
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
  const expoDb = await getExpoDb();
  const existing = await expoDb.getFirstAsync<Task & { notification_id?: string | null }>(
    `SELECT * FROM tasks WHERE id = ? LIMIT 1;`,
    [id]
  );

  if (!existing) return;

  const nowIso = new Date().toISOString();
  if (completed) {
    if (existing.notification_id) {
      await cancelTaskAlarm(existing.notification_id);
    }
    await expoDb.runAsync(
      `UPDATE tasks SET completed = 1, notification_id = null, updated_at = ? WHERE id = ?;`,
      [nowIso, id]
    );
  } else {
    let notifId: string | null = null;
    if (existing.time && existing.is_future_note === 0 && existing.is_deleted === 0) {
      notifId = await scheduleTaskAlarm({
        id: existing.id,
        uuid: existing.uuid,
        title: existing.title,
        note: existing.note,
        date: existing.date,
        time: existing.time,
        priority: existing.priority,
        completed: 0,
        created_at: existing.created_at,
        updated_at: nowIso,
        is_future_note: 0,
        is_deleted: 0,
      });
    }
    await expoDb.runAsync(
      `UPDATE tasks SET completed = 0, notification_id = ?, updated_at = ? WHERE id = ?;`,
      [notifId, nowIso, id]
    );
  }
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
  const expoDb = await getExpoDb();
  const existing = await expoDb.getFirstAsync<Task & { notification_id?: string | null }>(
    `SELECT * FROM tasks WHERE id = ? LIMIT 1;`,
    [id]
  );

  if (!existing) return;

  const nowIso = new Date().toISOString();
  if (status !== 0) {
    if (existing.notification_id) {
      await cancelTaskAlarm(existing.notification_id);
    }
    await expoDb.runAsync(
      `UPDATE tasks SET completed = ?, notification_id = null, updated_at = ? WHERE id = ?;`,
      [status, nowIso, id]
    );
  } else {
    let notifId: string | null = null;
    if (existing.time && existing.is_future_note === 0 && existing.is_deleted === 0) {
      notifId = await scheduleTaskAlarm({
        id: existing.id,
        uuid: existing.uuid,
        title: existing.title,
        note: existing.note,
        date: existing.date,
        time: existing.time,
        priority: existing.priority,
        completed: 0,
        created_at: existing.created_at,
        updated_at: nowIso,
        is_future_note: 0,
        is_deleted: 0,
      });
    }
    await expoDb.runAsync(
      `UPDATE tasks SET completed = 0, notification_id = ?, updated_at = ? WHERE id = ?;`,
      [notifId, nowIso, id]
    );
  }
}

/**
 * Merges pulled remote tasks from Postgres into local SQLite.
 * Uses native expo-sqlite transaction to prevent crashes in native statement preparation.
 */
export async function batchUpsertFromSync(pulledTasks: SyncTask[]): Promise<number> {
  if (pulledTasks.length === 0) return 0;
  const expoDb = await getExpoDb();

  let mergedCount = 0;
  await expoDb.withExclusiveTransactionAsync(async (txn) => {
    for (const t of pulledTasks) {
      const existing = await txn.getFirstAsync<{ id: number; updated_at: string }>(
        "SELECT id, updated_at FROM tasks WHERE uuid = ? LIMIT 1;",
        [t.uuid]
      );

      if (!existing) {
        await txn.runAsync(
          `INSERT INTO tasks (
            uuid, title, note, date, time, priority, completed, created_at, updated_at, is_deleted, is_future_note
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
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
            t.is_future_note ?? 0,
          ]
        );
        mergedCount++;
      } else {
        const remoteTime = new Date(t.updated_at).getTime();
        const localTime = new Date(existing.updated_at).getTime();
        if (remoteTime >= localTime) {
          await txn.runAsync(
            `UPDATE tasks SET
              title = ?,
              note = ?,
              date = ?,
              time = ?,
              priority = ?,
              completed = ?,
              created_at = ?,
              updated_at = ?,
              is_deleted = ?,
              is_future_note = ?
            WHERE uuid = ?;`,
            [
              t.title,
              t.note || null,
              t.date,
              t.time || null,
              t.priority || "medium",
              t.completed,
              t.created_at,
              t.updated_at,
              t.is_deleted,
              t.is_future_note ?? 0,
              t.uuid,
            ]
          );
          mergedCount++;
        }
      }
    }
  });

  return mergedCount;
}

/**
 * Exports all active tasks as a JSON formatted string for backup.
 */
export async function exportAllTasksJson(): Promise<string> {
  const tasks = await getAllTasks();
  const backup = {
    appName: "CluaNote",
    version: CURRENT_VERSION,
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

  const expoDb = await getExpoDb();
  let count = 0;
  await expoDb.withExclusiveTransactionAsync(async (txn) => {
    for (const t of taskList) {
      if (!t.title || !t.date) continue;
      const uuid =
        t.uuid ||
        (typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `task-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`);
      const nowIso = new Date().toISOString();

      await txn.runAsync(
        `INSERT INTO tasks (
          uuid, title, note, date, time, priority, completed, created_at, updated_at, is_deleted, is_future_note
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT (uuid) DO UPDATE SET
          title = excluded.title,
          note = excluded.note,
          date = excluded.date,
          time = excluded.time,
          priority = excluded.priority,
          completed = excluded.completed,
          created_at = excluded.created_at,
          updated_at = excluded.updated_at,
          is_deleted = excluded.is_deleted,
          is_future_note = excluded.is_future_note
        WHERE excluded.updated_at >= tasks.updated_at;`,
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
          0,
          (t as Task & { is_future_note?: number }).is_future_note ?? 0,
        ]
      );
      count++;
    }
  });

  try {
    const all = await getAllTasks();
    await rescheduleAllAlarms(all);
  } catch (err) {
    console.warn("Failed to reschedule alarms after backup import:", err);
  }

  return count;
}
