import { enable, isEnabled, disable } from "@tauri-apps/plugin-autostart";

export async function checkAutostartStatus(): Promise<boolean> {
  try {
    return await isEnabled();
  } catch {
    return false;
  }
}

export async function toggleAutostartPreference(): Promise<boolean> {
  try {
    const currentlyEnabled = await isEnabled();
    if (currentlyEnabled) {
      await disable();
      return false;
    } else {
      await enable();
      return true;
    }
  } catch (err) {
    console.warn("Autostart toggle warning:", err);
    return false;
  }
}
