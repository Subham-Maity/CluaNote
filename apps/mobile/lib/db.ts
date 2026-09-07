import * as SQLite from "expo-sqlite";
import { drizzle, ExpoSQLiteDatabase } from "drizzle-orm/expo-sqlite";
import * as schema from "./schema";

export const DB_NAME = "cluanote.db";

let expoDb: SQLite.SQLiteDatabase | null = null;
let dbInstance: ExpoSQLiteDatabase<typeof schema> | null = null;
let initPromise: Promise<ExpoSQLiteDatabase<typeof schema>> | null = null;

/**
 * Initializes SQLite database connection and runs schema migrations.
 */
export async function initDb(): Promise<ExpoSQLiteDatabase<typeof schema>> {
  if (dbInstance) {
    return dbInstance;
  }

  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    try {
      expoDb = await SQLite.openDatabaseAsync(DB_NAME);

      // Execute base table creation
      await expoDb.execAsync(`
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
          is_deleted INTEGER NOT NULL DEFAULT 0,
          is_future_note INTEGER NOT NULL DEFAULT 0,
          notification_id TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_tasks_date ON tasks(date);
        CREATE UNIQUE INDEX IF NOT EXISTS idx_tasks_uuid ON tasks(uuid);
      `);

      // Column migrations for existing databases
      const migrationQueries = [
        "ALTER TABLE tasks ADD COLUMN uuid TEXT;",
        "ALTER TABLE tasks ADD COLUMN updated_at TEXT;",
        "ALTER TABLE tasks ADD COLUMN is_deleted INTEGER DEFAULT 0;",
        "ALTER TABLE tasks ADD COLUMN is_future_note INTEGER NOT NULL DEFAULT 0;",
        "ALTER TABLE tasks ADD COLUMN notification_id TEXT;",
      ];

      for (const query of migrationQueries) {
        try {
          await expoDb.execAsync(query);
        } catch {
          // Column already exists
        }
      }

      dbInstance = drizzle(expoDb, { schema });
      return dbInstance;
    } catch (err) {
      console.error("Failed to initialize mobile SQLite database:", err);
      initPromise = null;
      throw err;
    }
  })();

  return initPromise;
}

/**
 * Returns the singleton Drizzle database instance.
 * Automatically initializes if not already opened.
 */
export async function getDb(): Promise<ExpoSQLiteDatabase<typeof schema>> {
  if (dbInstance) {
    return dbInstance;
  }
  return initDb();
}
