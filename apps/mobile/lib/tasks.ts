import { eq, and, desc, asc, sql } from "drizzle-orm";
import { tasks as tasksTable } from "./schema";
import { getDb } from "./db";
import { scheduleTaskAlarm, cancelTaskAlarm, rescheduleAllAlarms } from "./alarm";
import type { Task, NewTask, UpdateTaskInput, SyncTask } from "@cluanote/shared";

/**
 * Fetches all active tasks for a specific date (YYYY-MM-DD), ordered by time and creation.
 */
export async function getTasks(date: string): Promise<Task[]> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(tasksTable)
    .where(
      and(
        eq(tasksTable.is_deleted, 0),
        eq(tasksTable.date, date),
        eq(tasksTable.is_future_note, 0)
      )
    )
    .orderBy(
      sql`CASE WHEN ${tasksTable.time} IS NULL THEN 0 ELSE 1 END`,
      asc(tasksTable.time),
      asc(tasksTable.id)
    );
  return rows as Task[];
}

/**
 * Fetches all active tasks in the database (for backup and alarms).
 */
export async function getAllTasks(): Promise<Task[]> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(tasksTable)
    .where(eq(tasksTable.is_deleted, 0))
    .orderBy(asc(tasksTable.date), asc(tasksTable.time), asc(tasksTable.id));
  return rows as Task[];
}

/**
 * Fetches all tasks (including soft-deleted tombstones) to synchronize with remote Postgres.
 */
export async function getAllTasksForSync(): Promise<SyncTask[]> {
  const db = await getDb();
  const rows = await db
    .select({
      uuid: tasksTable.uuid,
      title: tasksTable.title,
      note: tasksTable.note,
      date: tasksTable.date,
      time: tasksTable.time,
      priority: tasksTable.priority,
      completed: tasksTable.completed,
      created_at: tasksTable.created_at,
      updated_at: tasksTable.updated_at,
      is_deleted: tasksTable.is_deleted,
      is_future_note: tasksTable.is_future_note,
    })
    .from(tasksTable)
    .orderBy(asc(tasksTable.updated_at));
  return rows as SyncTask[];
}

/**
 * Fetches all incomplete (pending) tasks across all dates.
 */
export async function getPendingTasks(): Promise<Task[]> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(tasksTable)
    .where(
      and(
        eq(tasksTable.is_deleted, 0),
        eq(tasksTable.completed, 0),
        eq(tasksTable.is_future_note, 0)
      )
    )
    .orderBy(desc(tasksTable.date), asc(tasksTable.time), asc(tasksTable.id));
  return rows as Task[];
}

/**
 * Fetches all tasks marked as Not Done (completed = 2) across all dates.
 */
export async function getNotDoneTasks(): Promise<Task[]> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(tasksTable)
    .where(
      and(
        eq(tasksTable.is_deleted, 0),
        eq(tasksTable.completed, 2),
        eq(tasksTable.is_future_note, 0)
      )
    )
    .orderBy(desc(tasksTable.date), asc(tasksTable.time), asc(tasksTable.id));
  return rows as Task[];
}

/**
 * Fetches all incomplete tasks from yesterday.
 */
export async function getYesterdayPendingTasks(): Promise<Task[]> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(tasksTable)
    .where(
      and(
        eq(tasksTable.is_deleted, 0),
        eq(tasksTable.completed, 0),
        eq(tasksTable.is_future_note, 0),
        sql`${tasksTable.date} = date('now', '-1 day')`
      )
    )
    .orderBy(asc(tasksTable.time), asc(tasksTable.id));
  return rows as Task[];
}

/**
 * Fetches all completed tasks (completed = 1) across all dates.
 */
export async function getCompletedTasks(): Promise<Task[]> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(tasksTable)
    .where(
      and(
        eq(tasksTable.is_deleted, 0),
        eq(tasksTable.completed, 1),
        eq(tasksTable.is_future_note, 0)
      )
    )
    .orderBy(desc(tasksTable.date), asc(tasksTable.time), asc(tasksTable.id));
  return rows as Task[];
}

/**
 * Fetches all future planning notes (is_future_note = 1) that are not soft-deleted.
 */
export async function getFutureNotes(): Promise<Task[]> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(tasksTable)
    .where(
      and(
        eq(tasksTable.is_future_note, 1),
        eq(tasksTable.is_deleted, 0)
      )
    )
    .orderBy(desc(tasksTable.created_at));
  return rows as Task[];
}

/**
 * Promotes a future planning note to a real event by clearing its is_future_note flag.
 */
export async function pushNoteToEvent(id: number): Promise<void> {
  const db = await getDb();
  const [existing] = await db
    .select()
    .from(tasksTable)
    .where(eq(tasksTable.id, id))
    .limit(1);

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
      completed: 0,
      is_future_note: 0,
      is_deleted: 0,
    });
  }

  const nowIso = new Date().toISOString();
  await db
    .update(tasksTable)
    .set({
      is_future_note: 0,
      completed: 0,
      notification_id: notifId,
      updated_at: nowIso,
    })
    .where(eq(tasksTable.id, id));
}

/**
 * Inserts a new task into SQLite with generated UUID and updated_at timestamp.
 */
export async function addTask(task: NewTask): Promise<void> {
  const title = task.title.trim();
  if (!title) {
    throw new Error("Task title cannot be empty");
  }

  const db = await getDb();
  const uuid =
    task.uuid ||
    (typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `task-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`);
  const nowIso = new Date().toISOString();

  const [inserted] = await db
    .insert(tasksTable)
    .values({
      uuid,
      title,
      note: task.note ? task.note.trim() : null,
      date: task.date,
      time: task.time || null,
      priority: task.priority || "medium",
      completed: 0,
      created_at: nowIso,
      updated_at: nowIso,
      is_deleted: 0,
      is_future_note: task.is_future_note ?? 0,
    })
    .returning({ id: tasksTable.id });

  if (inserted?.id && task.time && (task.is_future_note ?? 0) === 0) {
    const notifId = await scheduleTaskAlarm({
      id: inserted.id,
      uuid,
      title,
      note: task.note ? task.note.trim() : null,
      date: task.date,
      time: task.time || null,
      completed: 0,
      is_future_note: task.is_future_note ?? 0,
      is_deleted: 0,
    });

    if (notifId) {
      await db
        .update(tasksTable)
        .set({ notification_id: notifId })
        .where(eq(tasksTable.id, inserted.id));
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
  const db = await getDb();
  const [existing] = await db
    .select()
    .from(tasksTable)
    .where(eq(tasksTable.id, id))
    .limit(1);

  if (!existing) return;

  const nowIso = new Date().toISOString();
  const updateData: Record<string, unknown> = {
    updated_at: nowIso,
  };

  if (changes.title !== undefined) {
    const title = changes.title.trim();
    if (!title) throw new Error("Task title cannot be empty");
    updateData.title = title;
  }
  if (changes.note !== undefined) {
    updateData.note = changes.note ? changes.note.trim() : null;
  }
  if (changes.date !== undefined) updateData.date = changes.date;
  if (changes.time !== undefined) updateData.time = changes.time || null;
  if (changes.priority !== undefined) updateData.priority = changes.priority;
  if (changes.completed !== undefined) updateData.completed = changes.completed;
  if (changes.is_deleted !== undefined) updateData.is_deleted = changes.is_deleted;
  if (changes.is_future_note !== undefined) updateData.is_future_note = changes.is_future_note;

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
      updateData.notification_id = null;
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
        completed: 0,
        is_future_note: 0,
        is_deleted: 0,
      });
      updateData.notification_id = notifId;
    }
  }

  await db.update(tasksTable).set(updateData).where(eq(tasksTable.id, id));
}

/**
 * Soft deletes a task by its ID (marks is_deleted = 1 and updates timestamp).
 */
export async function deleteTask(id: number): Promise<void> {
  const db = await getDb();
  const [existing] = await db
    .select({ notification_id: tasksTable.notification_id })
    .from(tasksTable)
    .where(eq(tasksTable.id, id))
    .limit(1);

  if (existing?.notification_id) {
    await cancelTaskAlarm(existing.notification_id);
  }

  const nowIso = new Date().toISOString();
  await db
    .update(tasksTable)
    .set({ is_deleted: 1, notification_id: null, updated_at: nowIso })
    .where(eq(tasksTable.id, id));
}

/**
 * Sets the completion status of a task.
 */
export async function toggleComplete(
  id: number,
  completed: boolean
): Promise<void> {
  const db = await getDb();
  const [existing] = await db
    .select()
    .from(tasksTable)
    .where(eq(tasksTable.id, id))
    .limit(1);

  if (!existing) return;

  const nowIso = new Date().toISOString();
  if (completed) {
    if (existing.notification_id) {
      await cancelTaskAlarm(existing.notification_id);
    }
    await db
      .update(tasksTable)
      .set({ completed: 1, notification_id: null, updated_at: nowIso })
      .where(eq(tasksTable.id, id));
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
        completed: 0,
        is_future_note: 0,
        is_deleted: 0,
      });
    }
    await db
      .update(tasksTable)
      .set({ completed: 0, notification_id: notifId, updated_at: nowIso })
      .where(eq(tasksTable.id, id));
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
  const db = await getDb();
  const [existing] = await db
    .select()
    .from(tasksTable)
    .where(eq(tasksTable.id, id))
    .limit(1);

  if (!existing) return;

  const nowIso = new Date().toISOString();
  if (status !== 0) {
    if (existing.notification_id) {
      await cancelTaskAlarm(existing.notification_id);
    }
    await db
      .update(tasksTable)
      .set({ completed: status, notification_id: null, updated_at: nowIso })
      .where(eq(tasksTable.id, id));
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
        completed: 0,
        is_future_note: 0,
        is_deleted: 0,
      });
    }
    await db
      .update(tasksTable)
      .set({ completed: 0, notification_id: notifId, updated_at: nowIso })
      .where(eq(tasksTable.id, id));
  }
}

/**
 * Merges pulled remote tasks from Postgres into local SQLite.
 */
export async function batchUpsertFromSync(pulledTasks: SyncTask[]): Promise<number> {
  if (pulledTasks.length === 0) return 0;
  const db = await getDb();

  let mergedCount = 0;
  for (const t of pulledTasks) {
    await db
      .insert(tasksTable)
      .values({
        uuid: t.uuid,
        title: t.title,
        note: t.note || null,
        date: t.date,
        time: t.time || null,
        priority: t.priority || "medium",
        completed: t.completed,
        created_at: t.created_at,
        updated_at: t.updated_at,
        is_deleted: t.is_deleted,
        is_future_note: t.is_future_note ?? 0,
      })
      .onConflictDoUpdate({
        target: tasksTable.uuid,
        set: {
          title: sql`excluded.title`,
          note: sql`excluded.note`,
          date: sql`excluded.date`,
          time: sql`excluded.time`,
          priority: sql`excluded.priority`,
          completed: sql`excluded.completed`,
          created_at: sql`excluded.created_at`,
          updated_at: sql`excluded.updated_at`,
          is_deleted: sql`excluded.is_deleted`,
          is_future_note: sql`excluded.is_future_note`,
        },
        where: sql`excluded.updated_at >= ${tasksTable.updated_at}`,
      });
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
    version: "0.4.2",
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
    const uuid =
      t.uuid ||
      (typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `task-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`);
    const nowIso = new Date().toISOString();

    await db
      .insert(tasksTable)
      .values({
        uuid,
        title: t.title.trim(),
        note: t.note ? t.note.trim() : null,
        date: t.date,
        time: t.time || null,
        priority: t.priority || "medium",
        completed: t.completed || 0,
        created_at: t.created_at || nowIso,
        updated_at: t.updated_at || nowIso,
        is_deleted: 0,
        is_future_note: (t as Task & { is_future_note?: number }).is_future_note ?? 0,
      })
      .onConflictDoUpdate({
        target: tasksTable.uuid,
        set: {
          title: sql`excluded.title`,
          note: sql`excluded.note`,
          date: sql`excluded.date`,
          time: sql`excluded.time`,
          priority: sql`excluded.priority`,
          completed: sql`excluded.completed`,
          created_at: sql`excluded.created_at`,
          updated_at: sql`excluded.updated_at`,
          is_deleted: sql`excluded.is_deleted`,
          is_future_note: sql`excluded.is_future_note`,
        },
        where: sql`excluded.updated_at >= ${tasksTable.updated_at}`,
      });
    count++;
  }

  try {
    const all = await getAllTasks();
    await rescheduleAllAlarms(all);
  } catch (err) {
    console.warn("Failed to reschedule alarms after backup import:", err);
  }

  return count;
}
