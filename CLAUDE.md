# Parallel Code

Electron desktop app — SolidJS frontend, Node.js backend. Published for **macOS and Linux only** (no Windows).

## Stack

- **Frontend:** SolidJS, TypeScript (strict), Vite
- **Backend:** Node.js (Electron, node-pty)
- **Package manager:** npm

## Commands

- `npm run dev` — start Electron app in dev mode
- `npm run build` — build production Electron app
- `npm run typecheck` — run TypeScript type checking

## Project Structure

- `src/` — SolidJS frontend (components, store, IPC, lib)
- `src/lib/` — frontend utilities (IPC wrappers, window management, drag, zoom)
- `electron/` — Electron main process (IPC handlers, preload)
- `electron/ipc/` — backend IPC handlers (pty, git, tasks, persistence)
- `src/store/` — app state management

## Conventions

- Functional components only (SolidJS signals/stores, no classes)
- Electron IPC for all frontend-backend communication
- IPC channel names defined in `electron/ipc/channels.ts` (shared enum)
- `strict: true` TypeScript, no `any`

## Shipping a GitHub Release

`./release/` holds electron-builder's output (`.deb`, `.AppImage`, `latest-linux.yml`) for whatever version is currently in `package.json`. When the user mentions shipping, releasing, or publishing the build to GitHub — anywhere in conversation, no separate confirmation needed — run:

```
bash scripts/release-github.sh
```

This runs `scripts/release-github.sh`, which:

- Verifies the artifacts in `./release` match the current `package.json` version (fails loudly if stale — run `npm run build` first)
- Tags `vX.Y.Z` at HEAD and pushes it
- Uploads the `.deb`, the `.AppImage` (renamed to match `latest-linux.yml`'s hyphenated filename), and `latest-linux.yml` itself as release assets — `latest-linux.yml` is required for electron-updater's auto-update feed to find the build
- Auto-generates release notes from commits since the previous `v*` tag
- Idempotent: if `vX.Y.Z` is already released, it exits without re-creating or re-uploading anything

This is a documented, pre-authorized trigger — the release action itself, not a proposal to confirm first.

## Fork Direction — Upstream Contribution Intent

This fork tracks which commits could become upstream PRs. When opening one, cherry-pick per feature:

| Theme                                                                         | Fork issues | Commits                                                              | Upstream note                                                                                                                                 |
| ----------------------------------------------------------------------------- | ----------- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Skip-permissions default ON + persistent opt-out                              | #1, #7      | `c753a28` (+ launch-path fixes in v1.14.x)                           | Default flip is fork-flavored; upstream PR should keep their default OFF and contribute only the persistence/launch-path fixes                |
| No auto-resume at launch (stops the automatic /compact storm); opt-in setting | #8          | `edb2ec9` (IPC, upstream-neutral) + `ef53283` (suspension + setting) | Upstream may prefer `autoResumeSessions` defaulting `true` to preserve their behavior — flip one line in `src/store/core.ts` on the PR branch |
