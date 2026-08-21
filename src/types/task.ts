export type TaskPriority = "low" | "medium" | "high";

export interface Task {
  id: number;
  title: string;
  note: string | null;
  date: string; // 'YYYY-MM-DD'
  time: string | null; // 'HH:MM' (24-hour format) or null for anytime tasks
  priority: TaskPriority;
  completed: number; // 0 = active, 1 = completed
  created_at: string;
}

export interface NewTask {
  title: string;
  note?: string | null;
  date: string; // 'YYYY-MM-DD'
  time?: string | null; // 'HH:MM'
  priority?: TaskPriority;
}

export type UpdateTaskInput = Partial<Omit<Task, "id" | "created_at">>;
