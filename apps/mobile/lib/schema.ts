import { sqliteTable, integer, text, index, uniqueIndex } from "drizzle-orm/sqlite-core";

export const tasks = sqliteTable(
  "tasks",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    uuid: text("uuid").notNull().unique(),
    title: text("title").notNull(),
    note: text("note"),
    date: text("date").notNull(),
    time: text("time"),
    priority: text("priority").notNull().default("medium"),
    completed: integer("completed").notNull().default(0),
    created_at: text("created_at").notNull(),
    updated_at: text("updated_at").notNull(),
    is_deleted: integer("is_deleted").notNull().default(0),
    is_future_note: integer("is_future_note").notNull().default(0),
    notification_id: text("notification_id"),
  },
  (table) => [
    index("idx_tasks_date").on(table.date),
    uniqueIndex("idx_tasks_uuid").on(table.uuid),
  ]
);

export type TaskSelect = typeof tasks.$inferSelect;
export type TaskInsert = typeof tasks.$inferInsert;
