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

## Shipping a Release

Three independent things can happen around a version bump. They are not the same action — don't assume one covers the others.

**`npm run release`** (package.json script) is `npm run typecheck && npm version patch && git push --follow-tags`. It bumps the version and pushes the tag. **It does not build anything and does not ship anything** — those are separate steps that always follow it. `.npmrc` sets `message=chore(release): %s`, so `npm run release` (or plain `npm version`) produces the conventional `chore(release): X.Y.Z` commit; don't fold a version bump into an unrelated commit by hand. Correct order for a patch: commit the fix (no version change in it) → `npm run release` → `npm run build` → `bash scripts/release-github.sh`. For a minor/major bump, or to pin an exact version, `npm version patch` can't express it — bump manually instead with `npm version 1.16.0 --no-git-tag-version`, then build, then let `scripts/release-github.sh` (below) create the tag as part of shipping.

**`bash scripts/release-github.sh`** ships the already-built `./release/` (electron-builder's `.deb`, `.AppImage`, `latest-linux.yml`) as a GitHub Release, for whatever version is currently in `package.json`. Run `npm run build` first — this script does not build, it fails loudly if `./release` is stale. When the user mentions shipping, releasing, or publishing the build to GitHub — anywhere in conversation, no separate confirmation needed — run:

```
bash scripts/release-github.sh
```

It:

- Verifies the artifacts in `./release` match the current `package.json` version (fails loudly if stale — run `npm run build` first)
- Tags `vX.Y.Z` at HEAD and pushes it (if the tag doesn't already exist)
- Uploads the `.deb`, the `.AppImage` (renamed to match `latest-linux.yml`'s hyphenated filename), and `latest-linux.yml` itself as release assets — `latest-linux.yml` is required for electron-updater's auto-update feed to find the build
- Auto-generates release notes from commits since the previous `v*` tag
- Idempotent: if `vX.Y.Z` is already released, it exits without re-creating or re-uploading anything

This is a documented, pre-authorized trigger — the release action itself, not a proposal to confirm first.

**apt repository** — `https://apt.sanctuaireagentique.com`, a Cloudflare Worker (`apt-sanctuaire`) in front of the R2 bucket `apt`, signed with our own key. `scripts/release-github.sh` calls `scripts/apt-publish.sh` at the end, so shipping a GitHub Release updates `apt install parallel-code` in the same command — re-running the script after a release already exists republishes the apt index alone. Only the indices live in R2: the pool redirects to the release asset on GitHub, so no large file is copied.

Publishing needs `APT_PUBLISH_TOKEN` (in `~/.config/sanctuaire-apt.env`) and the signing key `43AEC70665D2B71FC9B53C7DB936F575CFCBE635` in the local gpg keyring. On a machine without them the step is skipped with a message and the GitHub Release still ships.

Other applications publish into the same repository — point `scripts/apt-publish.sh` at their `.deb` and its download URL. Nothing else needs to change.

`.github/workflows/apt-publish.yml` does the same on a published release, so the CI path is: push a `vX.Y.Z` tag → `release.yml` builds Linux and attaches the artifacts to a **draft** release → you publish that draft → `apt-publish.yml` fires and updates the apt index. Publishing the draft is the only manual step; `draft: true` in `release.yml` is what keeps it there. `release.yml`'s macOS job skips itself unless `DMG_CERT` and `APPLE_API_KEY` are set.

Use one path or the other for a given version. `release-github.sh` and `release.yml` both want to create the release for the tag, and the tag push starts the workflow, so running the script after `npm run release` can race the draft. If the release already exists the script says so and republishes the apt index only, which is the safe outcome.

This replaced Buildkite Package Registries, whose `miadi-apt` registry has answered 403 to every request since the organization's trial expired.

## Fork Direction — Upstream Contribution Intent

This fork tracks which commits could become upstream PRs. When opening one, cherry-pick per feature:

| Theme                                                                         | Fork issues | Commits                                                              | Upstream note                                                                                                                                 |
| ----------------------------------------------------------------------------- | ----------- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Skip-permissions default ON + persistent opt-out                              | #1, #7      | `c753a28` (+ launch-path fixes in v1.14.x)                           | Default flip is fork-flavored; upstream PR should keep their default OFF and contribute only the persistence/launch-path fixes                |
| No auto-resume at launch (stops the automatic /compact storm); opt-in setting | #8          | `edb2ec9` (IPC, upstream-neutral) + `ef53283` (suspension + setting) | Upstream may prefer `autoResumeSessions` defaulting `true` to preserve their behavior — flip one line in `src/store/core.ts` on the PR branch |
