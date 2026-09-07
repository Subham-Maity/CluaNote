import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";

export async function sendTaskNotification(title: string, body?: string) {
  try {
    let permissionGranted = await isPermissionGranted();
    if (!permissionGranted) {
      const permission = await requestPermission();
      permissionGranted = permission === "granted";
    }

    if (permissionGranted) {
      sendNotification({
        title,
        body: body || "Task created in CluaNote",
      });
    }
  } catch (err) {
    console.warn("Notification notice:", err);
  }
}
