# Session Registration & Plan Flow

What this enables: every agent session the desktop spawns announces itself to Miadi, and every plan an agent produces can return as narrated insight — read on screen or heard aloud.

## Desired Outcome Definition

A PTY session starts in Parallel Code and, within a second, exists as a record Miadi can relate to episodes and lattices. When the agent exits plan mode, the plan travels to Miadi's insight pipeline; Miette's perspective comes back as a file beside the plan and optionally as an audio message in the voice queue.

## Current Reality

- Parallel Code spawns agents in `electron/ipc/pty.ts:420 spawnAgent` with full knowledge of taskId, worktree cwd, command, args — and tells no one.
- Miadi's `/api/session/newsession` (bearer `THREEWAY_EH_TOKEN`) ingests exactly this shape: `{event:"new_session", session_id, namespace, prompt, mcp_configs[], add_dirs[], executed_in_folder, launcher_path, session_dir}` — built for CLI hooks (jgwill/Miadi#354), integration-ready.
- `/api/session/plan-insight` (bearer) accepts Claude Code `ExitPlanMode` payloads, dedupes on sha256(session_id + plan_filename + plan_content), 7-day TTL, async job + `GET plan-insight/[job_id]` poll with `miette_perspective` as a top-level convenience field.
- `/api/voice/review` models `plan_pane_id`, `source_session_id`, `review_pack_id` (jgwill/Miadi#457) — but the whole `voice/` directory is untracked in Miadi's git.
- Parallel Code already watches plan files: `electron/ipc/plans.ts` watcher → `IPC.PlanContent` push → `setPlanContent`.
- The other 11 `session/*` routes are self-declared unstable (`session/AGENTS.md`) — not used here.

## Structural Tension

The desktop knows everything about a session at spawn time and the platform holds the relational memory sessions want to join; registration is one POST at the moment of richest knowledge.

## Behavior

### Session registration

- **Where**: end of `spawnAgent` (`pty.ts:420`, after `sessions.set`) — covers every origin (task, shell, sub-task, restart). Skip when Miadi lane disabled or agent is a plain shell.
- **Payload mapping**: `session_id` = agentId; `namespace` = project name + branchName; `prompt` = task initialPrompt (untransformed, per `savedInitialPrompt` convention); `executed_in_folder`/`session_dir` = cwd; `mcp_configs` = the task's mcpConfigPath if present; `launcher_path` = 'parallel-code'.
- **Behavior:** fire-and-forget through `miadi-client`; failure logs and never delays the spawn.

### Plan → insight

- **Where**: the plan watcher push (`electron/ipc/plans.ts`, where `IPC.PlanContent` fires) — main process already holds `{worktreePath, fileName, content}`.
- **Behavior:** POST `/api/session/plan-insight` with `session_id` = agentId, `plan_filename`, `plan_content`, `source_agent` = agent def id. Poll `[job_id]` with backoff (pattern: `pr-checks.ts:159` tick + `__runTickForTests` convention). On completion, write `<plan>.miette.md` beside the plan file in the worktree and push to renderer over the existing `IPC.PlanContent` channel family so the Plan tab can offer both voices.
- Dedupe is server-side (idempotency key) — resending on watcher re-fire is safe.

### Plan → voice review (optional toggle, off until Miadi commits `voice/`)

- **Behavior:** after insight completes, POST `/api/voice/review` `{text: miette_perspective, persona:'miette', source_session_id: agentId, plan_pane_id: taskId, project_path}`; `?dry_run=1` respected when the Settings toggle is "preview only".

## Creative Advancement Scenario: The Plan That Speaks

**User Intent**: hear Miette's read of a plan while reviewing its diff.
**Current Reality**: plan renders as markdown in the Plan tab; review is silent reading.
**Natural Progression**:

1. Agent exits plan mode → watcher fires → plan POSTs to insight
2. Job completes → `miette.md` lands beside the plan → Plan tab shows a second voice
3. Voice lane on → review audio queued → any `voice/stream` listener (phone, speaker) plays it
   **Achieved Outcome**: plan review through two eyes and one ear, no manual step.
   **Supporting Features**: plan watcher, miadi-client, insight job poll, voice review payload fields that already name this exact use.

## Data

### MiadiSessionRecord (desktop-side, in-memory)

`{agentId, taskId, registeredAt, miadiOk: boolean}` — kept in `miadi-client` module state for retry/telemetry; never persisted to `state.json`.

## Exportation

- Ship registration first (one call site, no UI); insight second (adds the poller + file write); voice last (blocked on Miadi committing `app/api/voice/`).
- Upstream note: registration + insight are fork-flavored (Miadi-specific); keep them behind the Settings lane toggle, default off, so upstream cherry-picks stay clean.
