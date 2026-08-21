# CluaNote

> A fast, minimalist, dark glassmorphic task planner that runs natively on **Windows, macOS, and Linux** from one shared codebase.

---

## Overview

**CluaNote** is designed for extreme focus and zero friction. It opens instantly, schedules tasks effortlessly by day and time, and persists everything locally in SQLite with zero cloud dependencies or tracking.

- ⚡ **Instant Startup:** Built with Tauri v2 and OS-native webviews for sub-500ms launches and minimal memory usage.
- 🎨 **Dark Glassmorphic UI:** Tailwind CSS v4 design system with backdrop blur, glowing ambient lighting, and fluid responsiveness.
- 📅 **Day & Time Planning:** 7-day strip navigation, anytime tasks, and a vertical hourly timeline (06:00 to 23:00) with a live time indicator.
- 🔒 **Local-First & Private:** SQLite persistence via `tauri-plugin-sql`. All data stays on your machine.
- 📐 **Fully Responsive:** Fluid layouts designed to work seamlessly from a compact ~360px window to widescreen displays.

---

## Tech Stack

- **App Shell / Runtime:** [Tauri v2](https://v2.tauri.app/) (Rust 1.98+ Stable)
- **Frontend Framework:** React 19 + TypeScript (Vite)
- **Styling:** Tailwind CSS v4 (CSS-First engine)
- **Local Storage:** SQLite (`tauri-plugin-sql`)
- **Package Manager:** npm

---

## Getting Started

### Prerequisites

Make sure you have installed:
- [Rust & Cargo](https://www.rust-lang.org/tools/install) (Stable channel)
- [Node.js](https://nodejs.org/) (v24 LTS recommended)
- OS WebView runtime (WebView2 on Windows, WebKit on macOS, WebKitGTK on Linux)

### Development

Install dependencies and launch the application in development mode with hot-reloading:

```bash
npm install
npm run tauri dev
```

### Production Build

Compile the native desktop installer and standalone binary for your current OS:

```bash
npm run tauri build
```

Generated installer bundles will be available in `src-tauri/target/release/bundle/`.

---

## Author & Credits

Developed by **Subham Maity**:
- **GitHub:** [Subham-Maity](https://github.com/Subham-Maity)
- **Twitter / X:** [@TheSubhamMaity](https://x.com/TheSubhamMaity)
- **Instagram:** [@subham_xam](https://www.instagram.com/subham_xam/)

---

## License

Distributed under the MIT License. See [LICENSE](./LICENSE) for details.
