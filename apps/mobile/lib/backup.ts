import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as DocumentPicker from "expo-document-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { exportAllTasksJson, importTasksFromJson } from "./tasks";

export const LAST_BACKUP_KEY = "cluanote_last_backup_date";

/**
 * Retrieves the timestamp of the last successful backup export/import.
 */
export async function getLastBackupDate(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(LAST_BACKUP_KEY);
  } catch {
    return null;
  }
}

/**
 * Persists the last backup timestamp.
 */
export async function setLastBackupDate(dateIso: string): Promise<void> {
  try {
    await AsyncStorage.setItem(LAST_BACKUP_KEY, dateIso);
  } catch (err) {
    console.warn("Failed to store last backup timestamp:", err);
  }
}

/**
 * Exports all active tasks from local SQLite as a formatted JSON file
 * and opens the native OS share sheet (AirDrop, Google Drive, Email, etc.).
 */
export async function exportBackup(): Promise<string> {
  const json = await exportAllTasksJson();
  const baseDir = FileSystem.cacheDirectory || FileSystem.documentDirectory || "";
  const filename = `cluanote_backup_${Date.now()}.json`;
  const filePath = `${baseDir}${filename}`;

  await FileSystem.writeAsStringAsync(filePath, json);

  const isAvailable = await Sharing.isAvailableAsync();
  if (isAvailable) {
    await Sharing.shareAsync(filePath, {
      mimeType: "application/json",
      dialogTitle: "Export CluaNote Backup",
      UTI: "public.json",
    });
  }

  const nowIso = new Date().toISOString();
  await setLastBackupDate(nowIso);
  return filePath;
}

/**
 * Parses and verifies a backup JSON file string before importing.
 */
export function inspectBackupJson(jsonData: string): {
  count: number;
  appName?: string;
  version?: string;
  exportedAt?: string;
} {
  const parsed = JSON.parse(jsonData);
  const tasks = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed.tasks)
    ? parsed.tasks
    : [];

  return {
    count: tasks.length,
    appName: parsed.appName,
    version: parsed.version,
    exportedAt: parsed.exportedAt,
  };
}

/**
 * Prompts user to pick a JSON file and returns its content.
 * Returns null if the user cancelled the picker.
 */
export async function pickBackupFile(): Promise<{ uri: string; name: string; content: string } | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ["application/json", "text/json", "*/*"],
    copyToCacheDirectory: true,
  });

  if (result.canceled || !result.assets || result.assets.length === 0) {
    return null;
  }

  const asset = result.assets[0];
  const content = await FileSystem.readAsStringAsync(asset.uri);
  return {
    uri: asset.uri,
    name: asset.name,
    content,
  };
}

/**
 * Restores tasks from JSON string with timestamp-based conflict resolution.
 */
export async function restoreTasksFromJson(content: string): Promise<number> {
  const count = await importTasksFromJson(content);
  const nowIso = new Date().toISOString();
  await setLastBackupDate(nowIso);
  return count;
}
