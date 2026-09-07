import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createAudioPlayer, type AudioPlayer } from "expo-audio";
import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { tasks as tasksTable } from "./schema";
import type { Task } from "@cluanote/shared";

export const ALARM_ENABLED_KEY = "cluanote_alarm_enabled";
export const CUSTOM_SOUND_KEY = "cluanote_custom_sound_uri";
export const NOTIFICATION_CHANNEL_ID = "cluanote-alarms";

let alarmPlayer: AudioPlayer | null = null;

/**
 * Requests system notification permissions and configures the Android notification channel.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  try {
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNEL_ID, {
        name: "Task Alarms",
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#4f46e5",
        sound: "default",
        enableLights: true,
        enableVibrate: true,
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    return finalStatus === "granted";
  } catch (err) {
    console.warn("Failed to request notification permissions:", err);
    return false;
  }
}

/**
 * Checks if alarms are enabled in user settings.
 */
export async function isAlarmEnabled(): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem(ALARM_ENABLED_KEY);
    return val === null ? true : val === "true";
  } catch {
    return true;
  }
}

/**
 * Enables or disables task alarms.
 */
export async function setAlarmEnabled(enabled: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(ALARM_ENABLED_KEY, String(enabled));
  } catch (err) {
    console.warn("Failed to persist alarm enabled setting:", err);
  }
}

/**
 * Gets the custom sound file URI stored in user settings.
 */
export async function getCustomSoundUri(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(CUSTOM_SOUND_KEY);
  } catch {
    return null;
  }
}

/**
 * Sets or clears the custom sound file URI.
 */
export async function setCustomSoundUri(uri: string | null): Promise<void> {
  try {
    if (uri) {
      await AsyncStorage.setItem(CUSTOM_SOUND_KEY, uri);
    } else {
      await AsyncStorage.removeItem(CUSTOM_SOUND_KEY);
    }
  } catch (err) {
    console.warn("Failed to persist custom sound URI:", err);
  }
}

/**
 * Plays an alarm audio in loop (either custom audio or default).
 */
export async function playAlarmSound(): Promise<void> {
  try {
    await stopAlarmSound();
    const customUri = await getCustomSoundUri();
    if (customUri) {
      alarmPlayer = createAudioPlayer({ uri: customUri });
      alarmPlayer.loop = true;
      alarmPlayer.volume = 1.0;
      alarmPlayer.play();
    }
  } catch (err) {
    console.warn("Failed to play alarm sound:", err);
  }
}

/**
 * Stops any actively playing alarm audio.
 */
export async function stopAlarmSound(): Promise<void> {
  try {
    if (alarmPlayer) {
      alarmPlayer.pause();
      alarmPlayer.release();
      alarmPlayer = null;
    }
  } catch (err) {
    console.warn("Failed to stop alarm sound:", err);
  }
}

/**
 * Schedules a local notification alarm for a specific task.
 * Returns notification ID if scheduled, or null if skipped.
 */
export async function scheduleTaskAlarm(
  task: Pick<Task, "id" | "uuid" | "title" | "note" | "date" | "time" | "completed"> & {
    is_future_note?: number;
    is_deleted?: number;
  }
): Promise<string | null> {
  try {
    if (!task.time || !task.date) return null;
    if (task.completed !== 0 || task.is_future_note || task.is_deleted) return null;

    const enabled = await isAlarmEnabled();
    if (!enabled) return null;

    const [yearStr, monthStr, dayStr] = task.date.split("-");
    const [hourStr, minuteStr] = task.time.split(":");
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    const day = parseInt(dayStr, 10);
    const hour = parseInt(hourStr, 10);
    const minute = parseInt(minuteStr, 10);

    if (isNaN(year) || isNaN(month) || isNaN(day) || isNaN(hour) || isNaN(minute)) {
      return null;
    }

    const triggerDate = new Date(year, month - 1, day, hour, minute, 0, 0);
    if (triggerDate.getTime() <= Date.now()) {
      return null;
    }

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: `⏰ Task Alarm: ${task.title}`,
        body: task.note ? `${task.note} (${task.time})` : `Scheduled for ${task.time}`,
        data: {
          taskId: task.id,
          taskUuid: task.uuid,
          date: task.date,
          time: task.time,
          title: task.title,
        },
        sound: "default",
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
        channelId: NOTIFICATION_CHANNEL_ID,
      },
    });

    return notificationId;
  } catch (err) {
    console.warn("Failed to schedule task alarm:", err);
    return null;
  }
}

/**
 * Cancels a scheduled task notification by its notification identifier.
 */
export async function cancelTaskAlarm(
  notificationId: string | null | undefined
): Promise<void> {
  if (!notificationId) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
  } catch (err) {
    console.warn(`Failed to cancel notification ${notificationId}:`, err);
  }
}

/**
 * Cancels all scheduled task alarms.
 */
export async function cancelAllTaskAlarms(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (err) {
    console.warn("Failed to cancel all notifications:", err);
  }
}

/**
 * Cancels all current alarms and reschedules active tasks that have upcoming times.
 */
export async function rescheduleAllAlarms(tasks: Task[]): Promise<void> {
  try {
    await cancelAllTaskAlarms();
    const enabled = await isAlarmEnabled();
    if (!enabled) return;

    const db = await getDb();
    const nowIso = new Date().toISOString();

    for (const task of tasks) {
      if (
        task.completed === 0 &&
        !task.is_future_note &&
        !task.is_deleted &&
        task.time
      ) {
        const notifId = await scheduleTaskAlarm(task);
        if (notifId && task.id) {
          await db
            .update(tasksTable)
            .set({ notification_id: notifId, updated_at: nowIso })
            .where(eq(tasksTable.id, task.id));
        }
      }
    }
  } catch (err) {
    console.warn("Failed to reschedule all alarms:", err);
  }
}
