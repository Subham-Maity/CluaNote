import Database from "@tauri-apps/plugin-sql";

let dbInstance: Database | null = null;
let dbInitPromise: Promise<Database> | null = null;

export const DB_NAME = "sqlite:cluanote.db";

/**
 * Initializes SQLite database connection and runs schema migrations.
 * Can be called non-blocking at startup.
 */
export async function initDb(): Promise<Database> {
  if (dbInstance) {
    return dbInstance;
  }

  if (dbInitPromise) {
    return dbInitPromise;
  }

  dbInitPromise = (async () => {
    try {
      const db = await Database.load(DB_NAME);

      await db.execute(`
        CREATE TABLE IF NOT EXISTS tasks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          uuid TEXT UNIQUE,
          title TEXT NOT NULL,
          note TEXT,
          date TEXT NOT NULL,
          time TEXT,
          priority TEXT NOT NULL DEFAULT 'medium',
          completed INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL DEFAULT (datetime('now')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now')),
          is_deleted INTEGER NOT NULL DEFAULT 0
        );
      `);

      // Run non-destructive column migrations for existing databases
      try {
        await db.execute(`ALTER TABLE tasks ADD COLUMN uuid TEXT;`);
      } catch {
        // column already exists
      }

      try {
        await db.execute(`ALTER TABLE tasks ADD COLUMN updated_at TEXT;`);
      } catch {
        // column already exists
      }

      try {
        await db.execute(
          `ALTER TABLE tasks ADD COLUMN is_deleted INTEGER DEFAULT 0;`
        );
      } catch {
        // column already exists
      }

      try {
        await db.execute(
          `ALTER TABLE tasks ADD COLUMN is_future_note INTEGER NOT NULL DEFAULT 0;`
        );
      } catch {
        // column already exists
      }

      // Auto-backfill UUIDs for any existing tasks created before sync was added
      try {
        const unassigned = await db.select<{ id: number }[]>(
          `SELECT id FROM tasks WHERE uuid IS NULL OR uuid = ''`
        );
        for (const row of unassigned) {
          const newUuid = crypto.randomUUID();
          await db.execute(`UPDATE tasks SET uuid = $1 WHERE id = $2`, [
            newUuid,
            row.id,
          ]);
        }
      } catch (err) {
        console.warn("UUID backfill notice:", err);
      }

      // Backfill updated_at and is_deleted
      try {
        await db.execute(
          `UPDATE tasks SET updated_at = datetime('now') WHERE updated_at IS NULL OR updated_at = ''`
        );
      } catch (err) {
        console.warn("updated_at backfill notice:", err);
      }

      try {
        await db.execute(
          `UPDATE tasks SET is_deleted = 0 WHERE is_deleted IS NULL`
        );
      } catch (err) {
        console.warn("is_deleted backfill notice:", err);
      }

      try {
        await db.execute(
          `UPDATE tasks SET is_future_note = 0 WHERE is_future_note IS NULL`
        );
      } catch (err) {
        console.warn("is_future_note backfill notice:", err);
      }

      try {
        await db.execute(`
          CREATE INDEX IF NOT EXISTS idx_tasks_date ON tasks(date);
        `);
      } catch {
        // index already exists
      }

      try {
        await db.execute(`
          CREATE UNIQUE INDEX IF NOT EXISTS idx_tasks_uuid ON tasks(uuid);
        `);
      } catch {
        // index already exists
      }

      dbInstance = db;
      return db;
    } catch (err) {
      dbInitPromise = null;
      console.error("Failed to initialize SQLite database:", err);
      throw err;
    }
  })();

  return dbInitPromise;
}

/**
 * Returns the active SQLite database instance, initializing if not already loaded.
 */
export async function getDb(): Promise<Database> {
  if (dbInstance) {
    return dbInstance;
  }
  return initDb();
}
