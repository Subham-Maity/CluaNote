/**
 * updater.ts
 * Checks GitHub Releases API for new versions and fetches release history.
 * Works across desktop and mobile.
 */

import { GITHUB_REPO, CURRENT_VERSION } from "../constants";
import { parseVersion, isNewerVersion } from "./taskLogic";

export { parseVersion, isNewerVersion };

export type VersionGetter = () => Promise<string> | string;

let customVersionGetter: VersionGetter | null = null;

/** Register a platform-specific version getter (e.g. for Tauri or Expo Application) */
export function registerVersionGetter(getter: VersionGetter): void {
  customVersionGetter = getter;
}

/** Reads the real app version from registered getter or Tauri at runtime — falls back to CURRENT_VERSION */
export async function getCurrentVersion(): Promise<string> {
  if (customVersionGetter) {
    try {
      const v = await customVersionGetter();
      if (v) return v;
    } catch {
      // fallback
    }
  }

  try {
    // @ts-ignore
    const { getVersion } = await import("@tauri-apps/api/app");
    const v = await getVersion();
    return v || CURRENT_VERSION;
  } catch {
    // Fallback for browser/dev/RN context outside Tauri
    return CURRENT_VERSION;
  }
}

export interface GitHubRelease {
  id: number;
  tag_name: string;
  name: string;
  body: string;
  published_at: string;
  html_url: string;
  assets: {
    name: string;
    browser_download_url: string;
    size: number;
  }[];
  prerelease: boolean;
  draft: boolean;
}

export interface ReleaseAsset {
  name: string;
  browser_download_url: string;
  size: number;
}

export interface UpdateCheckResult {
  hasUpdate: boolean;
  latestVersion: string;
  currentVersion: string;
  releaseName: string;
  releaseUrl: string;
  releaseBody: string;
  publishedAt: string;
  assets: ReleaseAsset[];
  directDownloadUrl?: string;
  directDownloadName?: string;
}

const SESSION_CACHE_KEY = "cluanote_update_check";
const RELEASES_CACHE_KEY = "cluanote_all_releases";

function getStorage(): Storage | null {
  if (typeof window !== "undefined" && window.sessionStorage) {
    return window.sessionStorage;
  }
  return null;
}

/**
 * Checks for a newer release on GitHub.
 * @param force If true, bypasses sessionStorage cache and queries GitHub API fresh.
 */
export async function checkForUpdate(force = false): Promise<UpdateCheckResult> {
  const runtimeVersion = await getCurrentVersion();
  const currentVer = runtimeVersion && runtimeVersion !== "0.0.0" ? runtimeVersion : CURRENT_VERSION;
  const storage = getStorage();

  try {
    if (!force && storage) {
      const cached = storage.getItem(SESSION_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached) as UpdateCheckResult;
        if (parsed.currentVersion === currentVer) {
          return parsed;
        }
      }
    }

    const response = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`,
      {
        headers: { Accept: "application/vnd.github+json" },
        signal: AbortSignal.timeout(8000),
      }
    );

    if (!response.ok) {
      throw new Error(`GitHub API responded with ${response.status}`);
    }

    const release: GitHubRelease = await response.json();
    const latestVersion = release.tag_name;
    const hasUpdate = isNewerVersion(latestVersion, currentVer);

    const assets: ReleaseAsset[] = (release.assets || []).map((a) => ({
      name: a.name,
      browser_download_url: a.browser_download_url,
      size: a.size,
    }));

    const directAsset =
      assets.find((a) => a.name.endsWith(".exe") || a.name.endsWith("-setup.exe")) ||
      assets.find((a) => a.name.endsWith(".msi")) ||
      assets.find((a) => a.name.endsWith(".dmg")) ||
      assets.find((a) => a.name.endsWith(".AppImage") || a.name.endsWith(".deb")) ||
      assets.find((a) => a.name.endsWith(".apk")) ||
      assets[0];

    const result: UpdateCheckResult = {
      hasUpdate,
      latestVersion,
      currentVersion: currentVer,
      releaseName: release.name || release.tag_name,
      releaseUrl: release.html_url,
      releaseBody: release.body || "",
      publishedAt: release.published_at,
      assets,
      directDownloadUrl: directAsset?.browser_download_url,
      directDownloadName: directAsset?.name,
    };

    if (storage) {
      storage.setItem(SESSION_CACHE_KEY, JSON.stringify(result));
    }
    return result;
  } catch (err) {
    console.warn("Update check failed (offline or rate-limited?):", err);
    return {
      hasUpdate: false,
      latestVersion: currentVer,
      currentVersion: currentVer,
      releaseName: `v${currentVer}`,
      releaseUrl: `https://github.com/${GITHUB_REPO}/releases`,
      releaseBody: "",
      publishedAt: "",
      assets: [],
    };
  }
}

/**
 * Fetches all releases from the GitHub API for the changelog/release-notes modal.
 * Caches result in sessionStorage if available.
 */
export async function fetchAllReleases(): Promise<GitHubRelease[]> {
  const storage = getStorage();
  try {
    if (storage) {
      const cached = storage.getItem(RELEASES_CACHE_KEY);
      if (cached) {
        return JSON.parse(cached) as GitHubRelease[];
      }
    }

    const response = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/releases?per_page=30`,
      {
        headers: { Accept: "application/vnd.github+json" },
        signal: AbortSignal.timeout(10000),
      }
    );

    if (!response.ok) {
      throw new Error(`GitHub API responded with ${response.status}`);
    }

    const releases: GitHubRelease[] = await response.json();
    const published = releases.filter((r) => !r.draft);
    if (storage) {
      storage.setItem(RELEASES_CACHE_KEY, JSON.stringify(published));
    }
    return published;
  } catch (err) {
    console.warn("Failed to fetch releases:", err);
    return [];
  }
}
