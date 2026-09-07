import * as Application from "expo-application";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  checkForUpdate,
  fetchAllReleases,
  registerVersionGetter,
  CURRENT_VERSION,
  type UpdateCheckResult,
  type GitHubRelease,
} from "@cluanote/shared";

// Register platform version getter for Expo
registerVersionGetter(() => {
  return Application.nativeApplicationVersion || CURRENT_VERSION;
});

const MOBILE_UPDATE_CACHE_KEY = "cluanote_mobile_update_check";
const MOBILE_RELEASES_CACHE_KEY = "cluanote_mobile_all_releases";
const MOBILE_DISMISSED_VERSION_KEY = "cluanote_mobile_dismissed_update";

/**
 * Checks for updates using GitHub Releases API, caching in AsyncStorage.
 */
export async function checkMobileUpdate(force = false): Promise<UpdateCheckResult> {
  const currentVer = Application.nativeApplicationVersion || CURRENT_VERSION;

  try {
    if (!force) {
      const cached = await AsyncStorage.getItem(MOBILE_UPDATE_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached) as UpdateCheckResult;
        if (parsed.currentVersion === currentVer) {
          return parsed;
        }
      }
    }

    const result = await checkForUpdate(true);

    await AsyncStorage.setItem(MOBILE_UPDATE_CACHE_KEY, JSON.stringify(result));
    return result;
  } catch (err) {
    console.warn("Mobile update check failed:", err);
    return {
      hasUpdate: false,
      latestVersion: currentVer,
      currentVersion: currentVer,
      releaseName: `v${currentVer}`,
      releaseUrl: "https://github.com/Subham-Maity/CluaNote/releases",
      releaseBody: "",
      publishedAt: "",
      assets: [],
    };
  }
}

/**
 * Fetches all GitHub releases, caching in AsyncStorage.
 */
export async function fetchMobileReleases(force = false): Promise<GitHubRelease[]> {
  try {
    if (!force) {
      const cached = await AsyncStorage.getItem(MOBILE_RELEASES_CACHE_KEY);
      if (cached) {
        return JSON.parse(cached) as GitHubRelease[];
      }
    }

    const releases = await fetchAllReleases();
    if (releases && releases.length > 0) {
      await AsyncStorage.setItem(MOBILE_RELEASES_CACHE_KEY, JSON.stringify(releases));
    }
    return releases;
  } catch (err) {
    console.warn("Failed to fetch mobile releases:", err);
    return [];
  }
}

/**
 * Marks an update version as dismissed so it doesn't nag the user continuously.
 */
export async function dismissMobileUpdate(version: string): Promise<void> {
  try {
    await AsyncStorage.setItem(MOBILE_DISMISSED_VERSION_KEY, version);
  } catch (err) {
    console.warn("Failed to save dismissed update version:", err);
  }
}

/**
 * Checks if a specific update version was previously dismissed.
 */
export async function isUpdateDismissed(version: string): Promise<boolean> {
  try {
    const dismissed = await AsyncStorage.getItem(MOBILE_DISMISSED_VERSION_KEY);
    return dismissed === version;
  } catch {
    return false;
  }
}
