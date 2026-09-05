# CluaNote

<img width="708" height="489" alt="ss" src="https://github.com/user-attachments/assets/00795cf1-514f-46af-a459-77c0d93b06cb" />



**A native desktop task planner built on Rust. Fast, private, and free.**

[![Build](https://github.com/Subham-Maity/CluaNote/actions/workflows/build.yml/badge.svg)](https://github.com/Subham-Maity/CluaNote/actions/workflows/build.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey)](https://github.com/Subham-Maity/CluaNote/releases)
[![Release](https://img.shields.io/github/v/release/Subham-Maity/CluaNote)](https://github.com/Subham-Maity/CluaNote/releases/latest)

---

## Features

**Day and time planning**
Navigate by week on a 7-day strip. Place tasks on a scrollable 06:00–23:00 hourly timeline or drop them in the Anytime section when the exact time doesn't matter. A live indicator marks the current hour.

**Task management**
Create, edit, complete, and delete tasks. Set priority (low, medium, high) and attach optional notes. All changes hit SQLite immediately with optimistic UI updates — no loading spinners between actions.

**Task alarms**
Attach an alarm time to any task. The app checks every 10 seconds and fires a floating notification banner with a Stop button when a task is due. A glowing indicator on the bell icon shows when alarms are enabled. The alarm checker keeps running in the background even when the window is hidden.

**Pending, Not Done, and Completed history**
Three navbar icons give you a full view of your task history. Pending shows overdue and incomplete tasks grouped by date. Not Done lists tasks you explicitly marked as missed. Completed shows everything you finished. Click any task row to expand its full details — date, time, priority, and note. Hover to reveal action buttons: Jump navigates the calendar to that date, and you can change status or delete without opening the task.

**Future notes and Kanban board**
A CREATE button (stacked above the main + button) opens a note form for things you want to plan but haven't scheduled yet. Future notes don't appear in the daily timeline — they live in a separate full-screen Kanban board accessible from the navbar. Drag cards between To-Do, In Progress, and Done columns. When a note is ready to become a real event, Push to Event converts it and jumps the calendar to its target date.

**Yesterday reminder**
If you have unresolved tasks from yesterday, a dismissible banner appears at the top of the app when you open it. You can mark each one done or not done directly from the banner without navigating away.

**Cross-device sync**
Sync is optional and self-hosted. Point the app at your own PostgreSQL instance and it will bidirectionally sync tasks in the background. The sync payload is AES-256 encrypted before it leaves the device. Conflict resolution uses the `updated_at` timestamp. The app works fully offline if no database URL is configured.

**Backup and restore**
Export all tasks to a JSON file at any time. Import from a backup to restore — existing data is preserved.

**System tray**
Closing the window hides the app rather than quitting it. A tray icon lets you bring the window back or quit from the context menu. Alarms continue firing while the app is in the tray.

**Auto-start**
An option in settings registers the app as a login item so it starts with the system.

**Update checker**
On startup the app silently checks GitHub Releases for a newer version. If one is found, a banner appears with the version number and a link to the release page. No data is sent — it's a plain HTTP GET to the public API.

**Release notes**
A changelog modal in the navbar shows the release history for the current version.

**Glassmorphic dark UI**
Translucent glass panels, ambient radial lighting, and a custom frameless title bar with drag, minimize, maximize, and close-to-tray controls. Built with Tailwind CSS v4 and a hand-written dark design system.

---

## Why CluaNote

Most productivity apps are Electron wrappers shipping 200MB of Chromium and Node.js just to render a to-do list. They phone home, store your tasks in the cloud, and charge a subscription for the privilege.

CluaNote is different. It is built on [Tauri](https://v2.tauri.app/) — a Rust-powered application framework that uses the OS-native webview instead of bundling a browser. The result is a binary under 12MB that starts in under 500 milliseconds, uses a fraction of the RAM of comparable tools, and keeps every byte of your data in a local SQLite database that you own.

No account. No telemetry. No cost. Sync is **optional** and self-hosted.

---


## Why Rust / Tauri Over Electron

| | CluaNote (Tauri + Rust) | Typical Electron App |
|---|---|---|
| **Binary size** | ~12 MB | 150–250 MB |
| **Memory at idle** | ~4–7 MB RAM | 200–400 MB RAM |
| **Cold start** | < 500ms | 2–5 seconds |
| **Bundled runtime** | OS-native WebView | Full Chromium |
| **Data storage** | Local SQLite, on-device | Cloud or opaque local |
| **Backend language** | Rust (memory-safe, no GC) | Node.js (garbage collected) |
| **Supply chain** | Minimal Cargo crates | Thousands of npm packages |

Rust's ownership model eliminates entire classes of bugs — use-after-free, data races, null pointer dereferences — at compile time. There is no garbage collector pausing the UI thread. The Tauri security model gates every frontend-to-backend call through an explicit capability manifest, so the web layer cannot call arbitrary system APIs.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Application shell | [Tauri v2](https://v2.tauri.app/) |
| Backend language | Rust 1.98+ (Stable) |
| Frontend framework | React 19 + TypeScript |
| Build tool | Vite 7 |
| Styling | Tailwind CSS v4 (CSS-first, no config file) |
| Local database | SQLite via `tauri-plugin-sql` |
| Date utilities | `date-fns` |

---

## Installation

Download the latest release for your platform from the [Releases page](https://github.com/Subham-Maity/CluaNote/releases/latest).

| Platform | File |
|---|---|
| Windows | `cluanote_*_x64-setup.exe` (NSIS) or `cluanote_*_x64_en-US.msi` |
| macOS (Apple Silicon) | `cluanote_*_aarch64.dmg` |
| macOS (Intel) | `cluanote_*_x64.dmg` |
| Linux | `cluanote_*_amd64.AppImage` or `cluanote_*_amd64.deb` |

**Windows note:** WebView2 Runtime is required. It ships pre-installed on Windows 10 (21H2+) and Windows 11.

**Linux note:** Transparency requires a compositor (picom, KWin, Mutter, etc.). Without one, the background renders as an opaque solid color.

---

## Building From Source

**Prerequisites**

- [Rust](https://www.rust-lang.org/tools/install) (stable channel)
- [Node.js](https://nodejs.org/) v20 or later
- OS WebView runtime (WebView2 on Windows, WebKit on macOS, WebKitGTK 4.1 on Linux)

**Linux system dependencies (Ubuntu/Debian)**

```bash
sudo apt-get install -y \
  libwebkit2gtk-4.1-dev libxdo-dev libssl-dev \
  libayatana-appindicator3-dev librsvg2-dev
```

**Development server**

```bash
npm install
npm run tauri dev
```

**Production build**

```bash
npm run tauri build
```

Installer bundles are written to `src-tauri/target/release/bundle/`.

---

## Data and Privacy

CluaNote stores all task data in a single SQLite file on your local machine. The default location follows the OS convention for application data:

- **Windows:** `%APPDATA%\com.subhammaity.cluanote\cluanote.db`
- **macOS:** `~/Library/Application Support/com.subhammaity.cluanote/cluanote.db`
- **Linux:** `~/.local/share/com.subhammaity.cluanote/cluanote.db`

No data is ever transmitted to any server. There are no analytics, crash reporters, or update checkers.

---

## License

MIT — see [LICENSE](./LICENSE) for the full text.

---

## Author

Built by [Subham Maity](https://github.com/Subham-Maity).

- GitHub: [github.com/Subham-Maity](https://github.com/Subham-Maity)
- Twitter / X: [x.com/TheSubhamMaity](https://x.com/TheSubhamMaity)
- Instagram: [instagram.com/subham_xam](https://www.instagram.com/subham_xam/)
