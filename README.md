# CluaNote

<img width="708" height="489" alt="CluaNote Desktop" src="https://github.com/user-attachments/assets/00795cf1-514f-46af-a459-77c0d93b06cb" />

> **A cross-platform task planner — desktop, Android & iOS — built on Rust + Expo. Fast, private, offline-first, and free.**

[![Desktop Build](https://github.com/Subham-Maity/CluaNote/actions/workflows/build.yml/badge.svg)](https://github.com/Subham-Maity/CluaNote/actions/workflows/build.yml)
[![Android Build](https://github.com/Subham-Maity/CluaNote/actions/workflows/mobile-android.yml/badge.svg)](https://github.com/Subham-Maity/CluaNote/actions/workflows/mobile-android.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux%20%7C%20Android%20%7C%20iOS-lightgrey)](https://github.com/Subham-Maity/CluaNote/releases)
[![Release](https://img.shields.io/github/v/release/Subham-Maity/CluaNote)](https://github.com/Subham-Maity/CluaNote/releases/latest)

---

## What Problem Does CluaNote Solve

Most task management apps force you to choose between convenience and privacy. Cloud-first apps (Todoist, TickTick, Notion, Any.do) store your tasks on their servers, require subscriptions for cross-device sync, and your data disappears if they shut down. Local-only apps lose data when you switch devices.

CluaNote answers a different question: **what if you owned your data AND synced across all your devices for free?**

```
Your tasks → Your SQLite database → Your PostgreSQL → All your devices
                                    (Neon, Supabase,
                                     any provider)
```

No monthly fee. No vendor lock-in. No account required. Sync is optional and points at a database you control.

---

## Platform Coverage

| Platform | Status | Download |
|---|---|---|
| Windows (x64) | ◎ Stable | [Latest Release](https://github.com/Subham-Maity/CluaNote/releases/latest) |
| macOS (Apple Silicon) | ◎ Stable | [Latest Release](https://github.com/Subham-Maity/CluaNote/releases/latest) |
| macOS (Intel) | ◎ Stable | [Latest Release](https://github.com/Subham-Maity/CluaNote/releases/latest) |
| Linux (AppImage / .deb) | ◎ Stable | [Latest Release](https://github.com/Subham-Maity/CluaNote/releases/latest) |
| Android (.apk) | ◎ Stable | [Latest Release](https://github.com/Subham-Maity/CluaNote/releases/latest) |
| iOS | ◎ Stable | Build from source |

---

## Why CluaNote Beats Every Market Alternative

### ⇨ Performance That Apps Like Notion & Todoist Cannot Match

| Metric | CluaNote (Desktop) | Electron Apps | Notion / Web Apps |
|---|---|---|---|
| Binary size | ~12 MB | 150–250 MB | N/A (browser) |
| RAM at idle | ~4–7 MB | 200–400 MB | 300–800 MB |
| Cold start | < 500ms | 2–5 seconds | 3–8 seconds |
| Runtime bundled | OS-native WebView | Full Chromium | Browser engine |
| Works offline | → Fully | → Limited | × Requires internet |
| Data ownership | → 100% local | × Cloud default | × Their servers |

### ⇨ Sync Architecture No Other Free App Offers

Most free apps give you: one device. Pay for sync.

CluaNote gives you bidirectional sync across every device you own by connecting to any PostgreSQL-compatible database — free tiers from Neon or Supabase cover hundreds of tasks with zero cost.

```
Desktop (Windows/macOS/Linux)
         ↓ ↑ bidirectional, conflict-resolved
PostgreSQL (Neon / Supabase / self-hosted)
         ↓ ↑ bidirectional, conflict-resolved
Mobile (Android / iOS)
```

→ Conflict resolution uses `updated_at` timestamps — the newest write always wins  
→ Sync runs in the background automatically; manual sync available on demand  
→ App works fully offline if no database is configured  
→ Zero data passes through any CluaNote server — the connection is direct device ↔ your database  

---

## Feature Reference

### ◎ Task Planning & Calendar

- » 7-day week strip with swipe navigation — tap any day to jump to it
- » Scrollable 06:00–23:00 hourly timeline with live current-hour indicator
- » Anytime section for tasks without a specific time
- » Yesterday reminder banner — resolve missed tasks without navigating away
- » Priority levels: Low, Medium, High — color-coded throughout the UI

### ◎ Task Lifecycle

- » Create, edit, complete, delete with optimistic UI — zero loading spinners
- » Three completion states: Pending → Done / Not Done (explicitly marked as missed)
- » Attach rich-text notes to any task
- » Alarm system with floating in-app banner and stop control
- » Alarm continues firing even when the window is hidden (desktop tray mode)

### ◎ History & Analytics View

- » Pending tab — all unresolved tasks grouped by date descending
- » Not Done tab — tasks you marked as explicitly missed
- » Done tab — full completed history
- » Expand any history row → see full details, change status, delete, or jump to that date
- » Pull-to-refresh on mobile; reload button on desktop

### ◎ Kanban Board (Future Notes)

- » Separate idea-capture layer that doesn't pollute the daily timeline
- » Three columns: To-Do ¦ In Progress ¦ Done
- » Drag cards between columns on desktop; tap-to-move on mobile
- » Push to Event converts a Kanban note into a scheduled task and jumps the calendar to it

### ◎ Cross-Device Sync — Self-Hosted PostgreSQL

- » Point app at any PostgreSQL-compatible connection string (Neon, Supabase, Railway, self-hosted)
- » Bidirectional merge: new tasks pull in, local-only tasks push out
- » Background auto-sync every 30 seconds in foreground; fires on app-active event
- » Conflict resolution: `updated_at` wins — no manual merge required
- » Soft-delete tombstones propagate deletes across all devices
- » Instant screen refresh on all tabs (Today, History, Kanban) on sync completion
- » No CluaNote server involved — direct connection to your database

### ◎ Alarms & Notifications (Mobile)

- » Native Android & iOS notification permissions
- » Exact-time alarms with floating in-app banner override
- » Custom alarm sound — pick any audio file from device storage
- » Default chime included; alarm toggle in settings
- » Reschedule All button re-syncs all upcoming task alarms in one tap
- » Alarms auto-reschedule after every sync cycle

### ◎ Backup & Restore

- » Export all tasks to a portable JSON file at any time
- » Import restores without overwriting newer local data
- » Backup file is human-readable and portable to any future tool

### ◎ Desktop Extras

- » System tray: close-to-tray keeps alarms running
- » Auto-start: registers as login item (Windows, macOS, Linux)
- » Frameless window with custom drag, minimize, maximize, and tray controls
- » Glassmorphic dark UI — translucent panels, radial ambient lighting

### ◎ Privacy & Updates

- » Zero telemetry, zero analytics, zero crash reporting
- » Startup update checker: plain GET to public GitHub API — no payload sent
- » Changelog modal in-app for every release
- » MIT licensed — read, modify, self-host

---

## How Sync Works — Technical Detail

```
1. Device reads all local tasks (uuid, updated_at, is_deleted)
2. Device fetches all remote tasks from PostgreSQL
3. Reconcile:
   → remote has uuid local doesn't → pull
   → remote updated_at > local updated_at → pull (overwrite)
   → local updated_at > remote updated_at → push (upsert)
4. Soft-deletes (is_deleted = 1) propagate across all devices
5. DeviceEventEmitter fires → Today, History, Kanban screens reload instantly
```

No server-side logic required. The conflict resolution runs entirely on-device in pure TypeScript against the PostgreSQL HTTP API (Neon serverless driver). Works through firewalls and NAT without port forwarding.

---

## CluaNote vs Competitors at a Glance

| Feature | CluaNote | Todoist | TickTick | Notion | Any.do |
|---|---|---|---|---|---|
| Free cross-device sync | → Yes | × Paid | × Paid | × Limited | × Paid |
| Data stored locally | → Yes | × Cloud | × Cloud | × Cloud | × Cloud |
| Open source | → MIT | × Closed | × Closed | × Closed | × Closed |
| Works fully offline | → Yes | → Partial | → Partial | × No | × No |
| Self-hosted sync | → Yes | × No | × No | × No | × No |
| No account required | → Yes | × Required | × Required | × Required | × Required |
| Subscription cost | → Free | $5–$8/mo | $3–$8/mo | $8–$16/mo | $3–$5/mo |
| Desktop + mobile | → Yes | → Yes | → Yes | → Yes | → Yes |
| Kanban board | → Yes | → Yes | → Yes | → Yes | × No |
| Task alarms (exact time) | → Yes | → Limited | → Yes | × No | → Yes |
| Native performance | → Rust/Native | × Electron | × Flutter/Web | × Electron | × Web |

---

## Tech Stack

### Desktop (Windows · macOS · Linux)

| Layer | Technology |
|---|---|
| Application shell | Tauri v2 (Rust) |
| Backend | Rust 1.98+ Stable |
| Frontend | React 19 + TypeScript |
| Build tool | Vite 7 |
| Styling | Tailwind CSS v4 |
| Local database | SQLite via `tauri-plugin-sql` |
| Date library | `date-fns` |

### Mobile (Android · iOS)

| Layer | Technology |
|---|---|
| Framework | Expo SDK 57 (React Native 0.86) |
| Router | Expo Router v4 |
| Styling | NativeWind v4 (Tailwind for RN) |
| Local database | Expo SQLite (native async driver) |
| Notifications | Expo Notifications (exact alarms) |
| Background sync | Expo Background Task + App State |
| Fonts | Google Fonts Inter via Expo |

### Shared

| Layer | Technology |
|---|---|
| Monorepo tooling | pnpm workspaces + Turborepo |
| Shared types | `@cluanote/shared` TypeScript package |
| Sync transport | PostgreSQL HTTP (Neon serverless driver) |
| Conflict resolution | `updated_at` timestamp — device-side merge |

---

## Installation

### Desktop

Download the latest release from [GitHub Releases](https://github.com/Subham-Maity/CluaNote/releases/latest):

| Platform | File |
|---|---|
| Windows | `cluanote_*_x64-setup.exe` or `cluanote_*_x64_en-US.msi` |
| macOS (Apple Silicon) | `cluanote_*_aarch64.dmg` |
| macOS (Intel) | `cluanote_*_x64.dmg` |
| Linux | `cluanote_*_amd64.AppImage` or `cluanote_*_amd64.deb` |

» Windows: WebView2 Runtime is required — pre-installed on Windows 10 21H2+ and Windows 11  
» Linux: Transparency requires a compositor (picom, KWin, Mutter, etc.)

### Android

Download `cluanote-mobile.apk` from [GitHub Releases](https://github.com/Subham-Maity/CluaNote/releases/latest).  
Enable "Install from unknown sources" in Android settings, then install the APK directly.

### iOS

Build from source using Expo CLI:

```bash
git clone https://github.com/Subham-Maity/CluaNote.git
cd CluaNote
npm install
cd apps/mobile
npx expo run:ios
```

---

## Building From Source

### Desktop

Prerequisites: [Rust](https://www.rust-lang.org/tools/install) stable · Node.js v20+ · OS WebView runtime

**Linux system dependencies (Ubuntu/Debian)**

```bash
sudo apt-get install -y \
  libwebkit2gtk-4.1-dev libxdo-dev libssl-dev \
  libayatana-appindicator3-dev librsvg2-dev
```

```bash
npm install
npm run tauri dev       # development
npm run tauri build     # production — bundles to src-tauri/target/release/bundle/
```

### Mobile

Prerequisites: Node.js v20+ · Android Studio (for Android) · Xcode (for iOS)

```bash
npm install
cd apps/mobile
npx expo run:android    # Android
npx expo run:ios        # iOS
```

---

## Configuring Sync

1. Create a free PostgreSQL database on [Neon](https://neon.tech) or [Supabase](https://supabase.com)
2. Copy the connection string (format: `postgresql://user:pass@host/db?sslmode=require`)
3. Open CluaNote → Settings → Sync → paste the connection string → Save & Sync
4. Install CluaNote on your other devices and paste the same connection string
5. Tasks sync bidirectionally, automatically, in the background

The app creates the `cluanote_tasks` table on first sync. No manual schema setup required.

---

## Data & Privacy

CluaNote stores all task data locally in a single SQLite file:

| Platform | Default database path |
|---|---|
| Windows | `%APPDATA%\com.subhammaity.cluanote\cluanote.db` |
| macOS | `~/Library/Application Support/com.subhammaity.cluanote/cluanote.db` |
| Linux | `~/.local/share/com.subhammaity.cluanote/cluanote.db` |
| Android | App-private SQLite (Expo SQLite) |
| iOS | App-private SQLite (Expo SQLite) |

→ Zero data transmitted to any CluaNote server  
→ No analytics, no crash reporters  
→ Sync traffic goes directly from your device to your own database  
→ Update check = one plain GET request to the public GitHub API  

---

## License

MIT — see [LICENSE](./LICENSE) for the full text.

---

## Author

Built by [Subham Maity](https://github.com/Subham-Maity)

» GitHub → [github.com/Subham-Maity](https://github.com/Subham-Maity)  
» Twitter / X → [x.com/TheSubhamMaity](https://x.com/TheSubhamMaity)  
» Instagram → [instagram.com/subham_xam](https://www.instagram.com/subham_xam/)
