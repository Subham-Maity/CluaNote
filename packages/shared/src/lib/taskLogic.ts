import type { Task } from "../types/task";

/**
 * Filters tasks that do not have a specific time set (anytime tasks).
 */
export function filterAnytimeTasks(tasks: Task[]): Task[] {
  return tasks.filter((t) => !t.time || t.time.trim() === "");
}

/**
 * Filters tasks that have a specific time set (timed tasks).
 */
export function filterTimedTasks(tasks: Task[]): Task[] {
  return tasks.filter((t) => Boolean(t.time && t.time.trim() !== ""));
}

export interface GroupedTasksSection {
  date: string;
  data: Task[];
}

/**
 * Groups tasks by date ('YYYY-MM-DD').
 * Returns an array of sections suitable for React Native SectionList and grouped views.
 */
export function groupTasksByDate(
  tasks: Task[],
  sortOrder: "asc" | "desc" = "desc"
): GroupedTasksSection[] {
  const map: Record<string, Task[]> = {};
  for (const task of tasks) {
    if (!map[task.date]) {
      map[task.date] = [];
    }
    map[task.date].push(task);
  }

  const sortedDates = Object.keys(map).sort((a, b) =>
    sortOrder === "desc" ? b.localeCompare(a) : a.localeCompare(b)
  );

  return sortedDates.map((date) => ({
    date,
    data: map[date],
  }));
}

/**
 * Sorts tasks by time in ascending order, placing tasks with null/empty time first.
 */
export function sortTasksByTime(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    if (!a.time && !b.time) return 0;
    if (!a.time) return -1;
    if (!b.time) return 1;
    return a.time.localeCompare(b.time);
  });
}

/**
 * Parses a semver-like version string into an array of numbers.
 * Strips leading "v" if present (e.g., "v0.3.0" → [0, 3, 0]).
 */
export function parseVersion(v: string): number[] {
  return v
    .replace(/^v/, "")
    .split(".")
    .map((n) => parseInt(n, 10) || 0);
}

/**
 * Returns true if `a` is strictly greater than `b` (semver comparison).
 */
export function isNewerVersion(a: string, b: string): boolean {
  const av = parseVersion(a);
  const bv = parseVersion(b);
  for (let i = 0; i < Math.max(av.length, bv.length); i++) {
    const ai = av[i] ?? 0;
    const bi = bv[i] ?? 0;
    if (ai > bi) return true;
    if (ai < bi) return false;
  }
  return false;
}
