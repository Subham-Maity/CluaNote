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
          title TEXT NOT NULL,
          note TEXT,
          date TEXT NOT NULL,
          time TEXT,
          priority TEXT NOT NULL DEFAULT 'medium',
          completed INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
      `);

      await db.execute(`
        CREATE INDEX IF NOT EXISTS idx_tasks_date ON tasks(date);
      `);

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
