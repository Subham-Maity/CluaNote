import type { Task } from "../types/task";
import { sendTaskNotification } from "./notifications";
import { format } from "date-fns";

const ALARM_ENABLED_KEY = "cluanote_alarm_enabled";
const CUSTOM_SOUND_KEY = "cluanote_custom_sound";

let alertedTaskSet = new Set<string>();
let activeAudio: HTMLAudioElement | null = null;
let onAlarmCallback: ((taskTitle: string) => void) | null = null;

export function isAlarmEnabled(): boolean {
  const stored = localStorage.getItem(ALARM_ENABLED_KEY);
  return stored === null ? true : stored === "true";
}

export function setAlarmEnabled(enabled: boolean): void {
  localStorage.setItem(ALARM_ENABLED_KEY, String(enabled));
}

export function getCustomSound(): string | null {
  return localStorage.getItem(CUSTOM_SOUND_KEY);
}

export function setCustomSound(dataUrl: string | null): void {
  if (dataUrl) {
    localStorage.setItem(CUSTOM_SOUND_KEY, dataUrl);
  } else {
    localStorage.removeItem(CUSTOM_SOUND_KEY);
  }
}

export function setAlarmTriggerListener(
  callback: (taskTitle: string) => void
): void {
  onAlarmCallback = callback;
}

export function playAlarmSound(): void {
  try {
    if (activeAudio) {
      activeAudio.pause();
      activeAudio.currentTime = 0;
    }
    const soundSrc = getCustomSound() || "/tingting.mp3";
    activeAudio = new Audio(soundSrc);
    activeAudio.volume = 0.9;
    activeAudio.loop = true; // Loop until user stops it
    activeAudio.play().catch((err) => {
      console.warn("Audio play notice:", err);
    });
  } catch (err) {
    console.warn("Failed to play alarm audio:", err);
  }
}

export function stopAlarmSound(): void {
  if (activeAudio) {
    activeAudio.pause();
    activeAudio.currentTime = 0;
  }
}

/**
 * Checks all tasks against the current time.
 * If a task matches the current date & minute, triggers audio alarm and notification.
 */
export function checkTaskAlarms(tasks: Task[]): void {
  if (!isAlarmEnabled()) {
    return;
  }

  const now = new Date();
  const currentDate = format(now, "yyyy-MM-dd");
  const currentHourMinute = format(now, "HH:mm");

  for (const task of tasks) {
    if (task.completed) continue;
    if (!task.time) continue;

    // Standardize time format to HH:mm
    const taskTime = task.time.substring(0, 5);

    if (task.date === currentDate && taskTime === currentHourMinute) {
      const alertKey = `${task.id}-${currentDate}-${currentHourMinute}`;
      if (!alertedTaskSet.has(alertKey)) {
        alertedTaskSet.add(alertKey);

        // Play alarm sound (loops until stopped)
        playAlarmSound();

        if (onAlarmCallback) {
          onAlarmCallback(task.title);
        }

        // Send Windows desktop notification
        sendTaskNotification(
          `⏰ Task Alarm: ${task.title}`,
          task.note ? `${task.note} (${task.time})` : `Scheduled for ${task.time}`
        );
      }
    }
  }

  // Prevent set from growing infinitely
  if (alertedTaskSet.size > 50) {
    alertedTaskSet = new Set(Array.from(alertedTaskSet).slice(-20));
  }
}
