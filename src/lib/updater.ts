/**
 * updater.ts
 * Checks GitHub Releases API for new versions and fetches release history.
 * Uses session-level caching to avoid redundant network calls.
 */

const GITHUB_REPO = "Subham-Maity/CluaNote";
const CURRENT_VERSION = "0.3.2"; // Keep in sync with tauri.conf.json / package.json

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

/**
 * Parses a semver-like version string into an array of numbers.
 * Strips leading "v" if present (e.g., "v0.3.0" → [0, 3, 0]).
 */
function parseVersion(v: string): number[] {
  return v
    .replace(/^v/, "")
    .split(".")
    .map((n) => parseInt(n, 10) || 0);
}

/**
 * Returns true if `a` is strictly greater than `b` (semver comparison).
 */
function isNewerVersion(a: string, b: string): boolean {
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

const SESSION_CACHE_KEY = "cluanote_update_check";
const RELEASES_CACHE_KEY = "cluanote_all_releases";

/**
 * Checks for a newer release on GitHub.
 * @param force If true, bypasses sessionStorage cache and queries GitHub API fresh.
 */
export async function checkForUpdate(force = false): Promise<UpdateCheckResult> {
  try {
    if (!force) {
      const cached = sessionStorage.getItem(SESSION_CACHE_KEY);
      if (cached) {
        return JSON.parse(cached) as UpdateCheckResult;
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
    const hasUpdate = isNewerVersion(latestVersion, CURRENT_VERSION);

    // Try to find a direct installer asset (e.g. .exe / .msi for Windows, .dmg for macOS, .AppImage for Linux)
    const assets: ReleaseAsset[] = (release.assets || []).map((a) => ({
      name: a.name,
      browser_download_url: a.browser_download_url,
      size: a.size,
    }));

    // Detect best match: Windows .exe installer first, then .msi, etc.
    const directAsset =
      assets.find((a) => a.name.endsWith(".exe") || a.name.endsWith("-setup.exe")) ||
      assets.find((a) => a.name.endsWith(".msi")) ||
      assets.find((a) => a.name.endsWith(".dmg")) ||
      assets.find((a) => a.name.endsWith(".AppImage") || a.name.endsWith(".deb")) ||
      assets[0];

    const result: UpdateCheckResult = {
      hasUpdate,
      latestVersion,
      currentVersion: CURRENT_VERSION,
      releaseName: release.name || release.tag_name,
      releaseUrl: release.html_url,
      releaseBody: release.body || "",
      publishedAt: release.published_at,
      assets,
      directDownloadUrl: directAsset?.browser_download_url,
      directDownloadName: directAsset?.name,
    };

    sessionStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(result));
    return result;
  } catch (err) {
    console.warn("Update check failed (offline or rate-limited?):", err);
    return {
      hasUpdate: false,
      latestVersion: CURRENT_VERSION,
      currentVersion: CURRENT_VERSION,
      releaseName: `v${CURRENT_VERSION}`,
      releaseUrl: `https://github.com/${GITHUB_REPO}/releases`,
      releaseBody: "",
      publishedAt: "",
      assets: [],
    };
  }
}

/**
 * Fetches all releases from the GitHub API for the changelog/release-notes modal.
 * Caches result in sessionStorage.
 */
export async function fetchAllReleases(): Promise<GitHubRelease[]> {
  try {
    const cached = sessionStorage.getItem(RELEASES_CACHE_KEY);
    if (cached) {
      return JSON.parse(cached) as GitHubRelease[];
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
    // Filter out drafts
    const published = releases.filter((r) => !r.draft);
    sessionStorage.setItem(RELEASES_CACHE_KEY, JSON.stringify(published));
    return published;
  } catch (err) {
    console.warn("Failed to fetch releases:", err);
    return [];
  }
}

export { CURRENT_VERSION };
