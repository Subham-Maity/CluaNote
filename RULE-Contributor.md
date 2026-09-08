# Contributor Guide

## >> Local Dev Setup

**Prerequisites**

| Tool | Version | Purpose |
|---|---|---|
| Node.js | v20+ | JS runtime |
| pnpm | v9+ | Package manager |
| Rust | stable | Tauri backend |
| Android Studio | latest | Android builds |
| Xcode | latest | iOS builds (macOS only) |

**Clone & install**

```bash
git clone https://github.com/Subham-Maity/CluaNote.git
cd CluaNote
pnpm install
```

**Run desktop (Tauri)**

```bash
cd apps/desktop
pnpm tauri dev
```

**Run mobile (Expo)**

```bash
cd apps/mobile
npx expo start            # Expo Go / dev client
npx expo run:android      # physical or emulator
npx expo run:ios          # macOS + Xcode required
```

**Run sync server (Rust)**

```bash
cd packages/rust-sync-server
cargo run
# or for release binary:
cargo build --release
./target/release/cluanote-sync-server
```

> Set `DATABASE_URL` env var to your PostgreSQL connection string before starting the sync server.

---

## >> Version Bumping

Every release bumps **one version number** in **six places**. No scripts — edit manually.

| File | Field |
|---|---|
| `packages/shared/src/constants.ts` | `CURRENT_VERSION` string |
| `packages/shared/package.json` | `"version"` |
| `apps/desktop/package.json` | `"version"` |
| `apps/desktop/src-tauri/tauri.conf.json` | `"version"` |
| `apps/mobile/package.json` | `"version"` |
| `apps/mobile/app.json` | `version` + `android.versionCode` (increment by 1) |

**Version format:** `MAJOR.MINOR.PATCH`

| Change | When to use |
|---|---|
| PATCH `0.4.x` | Bug fixes, small improvements |
| MINOR `0.x.0` | New features added |
| MAJOR `x.0.0` | Breaking changes or complete rewrites |

---

## >> Writing Patch Notes

Every PR description and every release must have a patch note section. Keep it short — bullet points only.

**Format:**

```
## What Changed

- feat: added X feature
- fix: resolved Y crash on Android
- chore: bumped expo-sqlite to 57.0.3
```

**Prefixes to use:**

| Prefix | Meaning |
|---|---|
| `feat` | New feature |
| `fix` | Bug fix |
| `chore` | Dependency update, build change |
| `docs` | Documentation only |
| `refactor` | Code restructure, no behavior change |
| `perf` | Performance improvement |

---

## >> Writing Release Notes (in build.yml)

Release notes appear automatically on the GitHub Releases page. They are defined in `.github/workflows/build.yml` under `releaseBody`.

**Every release note MUST include:**

1. `## What is New in vX.Y.Z` section with bullet list of changes
2. `## Asset Reference` table (see below)
3. `## Requirements` section
4. Version-specific notes for breaking changes

**Asset Reference table format to always use:**

```markdown
| File | Platform | Arch | Notes |
|---|---|---|---|
| cluanote_*_x64-setup.exe | Windows | x64 | NSIS installer (recommended) |
| cluanote_*_x64_en-US.msi | Windows | x64 | Windows Installer (MSI) |
| cluanote_*_aarch64.dmg | macOS | ARM64 | M1/M2/M3/M4 |
| cluanote_*_x64.dmg | macOS | x64 | Intel Macs |
| cluanote_*_amd64.AppImage | Linux | x64 | Any distro with FUSE support |
| cluanote_*_amd64.deb | Linux | x64 | Debian, Ubuntu, Mint, Pop!_OS |
| cluanote_*_x86_64.rpm | Linux | x64 | Fedora, RHEL, CentOS, openSUSE |
| cluanote-mobile.apk | Android | arm64 | Android 8.0+ (API 26+) |
| cluanote-sync-server-linux | Linux | x64 | Self-hosted sync daemon |
| cluanote-sync-server-macos | macOS | x64+ARM | Self-hosted sync daemon |
| cluanote-sync-server-windows.exe | Windows | x64 | Self-hosted sync daemon |
```

**Linux distro compatibility to always note:**

| Package | Compatible Distros |
|---|---|
| .AppImage | Ubuntu 20.04+, Fedora 36+, Arch, Manjaro, openSUSE (needs FUSE / libfuse2) |
| .deb | Ubuntu 20.04+, Debian 11+, Linux Mint 20+, Pop!_OS 20.04+ |
| .rpm | Fedora 36+, RHEL 9+, CentOS Stream 9+, openSUSE Leap 15.4+ |

> Transparency/glassmorphic background needs a compositor on Linux (picom, KWin, Mutter, Hyprland, etc.)

---

## >> Releasing a New Version

```
1. Edit version in all 6 files (table above)
2. Update releaseBody in .github/workflows/build.yml with full patch notes
3. Commit: git add -A; git commit -m "chore: bump version to vX.Y.Z"
4. Tag:    git tag vX.Y.Z
5. Push:   git push; git push --tags
```

GitHub Actions automatically builds and attaches all assets to the release.

Check build status at: https://github.com/Subham-Maity/CluaNote/actions

---

## >> Commit Message Convention

```
<type>(<scope>): <description>

Types: feat | fix | chore | docs | refactor | perf | test
Scope: desktop | mobile | sync-server | shared | ci
```

Example: `fix(mobile): prevent alarm crash on Android 14`

See `COMMIT-RULE.md` for full details.

---

## >> PR Checklist

- [ ] Version bumped in all 6 files (if this is a release PR)
- [ ] `releaseBody` updated in `build.yml` with this version patch notes
- [ ] Patch notes written in PR description
- [ ] `pnpm install` passes with no errors
- [ ] Desktop starts with `pnpm tauri dev`
- [ ] Mobile starts with `npx expo start`
- [ ] No TypeScript errors: run `pnpm typecheck` from root
