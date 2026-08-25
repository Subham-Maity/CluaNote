export type TaskPriority = "low" | "medium" | "high";
export type TaskStatus = 0 | 1 | 2; // 0 = active/pending, 1 = completed, 2 = not done

export interface Task {
  id: number;
  title: string;
  note: string | null;
  date: string; // 'YYYY-MM-DD'
  time: string | null; // 'HH:MM' (24-hour format) or null for anytime tasks
  priority: TaskPriority;
  completed: number; // 0 = active/pending, 1 = completed, 2 = not done
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
