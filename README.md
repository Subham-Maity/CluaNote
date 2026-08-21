# CluaNote

<img width="708" height="489" alt="ss" src="https://github.com/user-attachments/assets/00795cf1-514f-46af-a459-77c0d93b06cb" />


**A native desktop task planner built on Rust. Fast, private, and free.**

[![Build](https://github.com/Subham-Maity/CluaNote/actions/workflows/build.yml/badge.svg)](https://github.com/Subham-Maity/CluaNote/actions/workflows/build.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey)](https://github.com/Subham-Maity/CluaNote/releases)
[![Release](https://img.shields.io/github/v/release/Subham-Maity/CluaNote)](https://github.com/Subham-Maity/CluaNote/releases/latest)

---

## Why CluaNote

Most productivity apps are Electron wrappers shipping 200MB of Chromium and Node.js just to render a to-do list. They phone home, store your tasks in the cloud, and charge a subscription for the privilege.

CluaNote is different. It is built on [Tauri](https://v2.tauri.app/) — a Rust-powered application framework that uses the OS-native webview instead of bundling a browser. The result is a binary under 12MB that starts in under 500 milliseconds, uses a fraction of the RAM of comparable tools, and keeps every byte of your data in a local SQLite database that you own.

No account. No sync. No telemetry. No cost.

---

## Feature Overview

**Day and Time Planning**
Navigate a 7-day strip by week. Place tasks at any hour on a scrollable 06:00–23:00 timeline, or drop them in the Anytime section when timing does not matter. A real-time indicator marks the current hour.

**Full Task Lifecycle**
Create, edit, complete, and delete tasks. Set priority (low, medium, high). Attach optional notes. All changes are committed immediately to SQLite with optimistic UI updates — there is no loading state between actions.

**Glassmorphic Dark Interface**
The UI is built with Tailwind CSS v4 and a custom dark design system: translucent glass panels, ambient radial lighting, and a 7-layer visual hierarchy. The window is frameless and fully transparent, with a custom title bar that supports drag, minimize, maximize, and close.

**Responsive Layout**
The interface is fluid from a compact 360px sidebar to a full widescreen window. All layouts use flexbox and grid with no fixed pixel widths.

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
