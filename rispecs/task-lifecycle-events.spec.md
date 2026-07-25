# Task Lifecycle → Narrative Events

What this enables: the desktop's task lifecycle — spawn, done, landed, merged, reviewed — writes itself into Miadi's episode record, diary, and structural-tension charts as it happens.

## Desired Outcome Definition

A coordinator run leaves a narrative trail without anyone narrating: each sub-task landing becomes a diary reflection with a chronicle reference, an a2a envelope any Miadi module can consume, and (when the project has an STC chart) an action-step observation. The episode record and git history tell the same story.

## Current Reality

- Every coordinated-task event already funnels through one point: `coordinator.ts:2545 notifyRenderer` (MCP_TaskCreated, MCP_TaskStateSync, notification staging…).
- The richest payload in the codebase is assembled at `coordinator.ts:1652` — `LandedMetadata {taskId, taskName, coordinatorTaskId, targetBranch, landedCommit, landedAt, landedOrder, summary, verification[]}`.
- Non-coordinated origins: worktree create/remove at `electron/ipc/tasks.ts:33/:59`; merge at `src/store/tasks.ts:617` (renderer — needs one IPC notify to reach main).
- Miadi receiving surfaces (integration-ready): `POST /api/ceremonial-diary?action=reflection|intention` (medicine-wheel JSONL store, chronicle refs projected fail-open), `POST /api/a2a/v2/send` (typed envelopes, `@miadi/a2a-contracts`), `POST /api/stc/charts {action:'add-observation'|'add-beat'|'add-action'}`.
- Not used: `narrative-bridge/*` (lookup-table classification, webhook-side), `ceremony` Gen-1 (fabricates GitHub identifiers), `live-story-monitor` (prototype).

## Structural Tension

Ground truth accumulates on the desktop while the narrative surfaces sit ready on the platform; one sink function beside `notifyRenderer` lets the record grow at the pace of the work itself.

## Behavior

### The sink

- `electron/ipc/miadi-client.ts` exports `miadiEmit(event: MiadiEvent)` — non-blocking, bounded in-memory queue (drop-oldest at 100), retry with backoff, disabled when the lane is off.
- Tap points (see master spec event table): `notifyRenderer` fan-out + `tasks.ts:33/:59` + one new IPC notify from `mergeTask`.

### Event → Miadi mapping

| Desktop event        | Miadi write                                                                                                            | Notes                                                                     |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `task.spawned`       | `ceremonial-diary?action=intention` `{content: prompt summary, phase, chronicle}`                                      | chronicle ref from project's episode binding (see `chronicle-ui.spec.md`) |
| `task.landed`        | `ceremonial-diary?action=reflection` + `a2a/v2/send` (iface: coordination event)                                       | diary content renders LandedMetadata: commit, order, verification results |
| `task.merged`        | `stc/charts {action:'add-observation'}` when the project maps to an STC workspace (`stc/workspaces` GET by repository) | lines ±, branch → chart observation                                       |
| `batch.review_ready` | `a2a/v2/send`                                                                                                          | lets a Miadi dashboard mirror the desktop's review queue                  |
| `task.reviewed`      | `ceremonial-diary?action=reflection`                                                                                   | closes the loop the landing opened                                        |

### Correlation

- Every payload carries `{source:'parallel-code', taskId, coordinatorTaskId?, episodeUri?, traceId}`; `traceId` = taskId so a2a envelopes, diary entries, and chart observations join on one key.
- Episode binding: the project's `episode` field (issue #5's A11 design in `foundations/tide-parallel-code-bridge/bridge-design.md:180`) supplies `miadi-chronicle://` URIs; absent binding → events still emit, without chronicle refs.

## Creative Advancement Scenario: Five Landings, One Episode Page

**User Intent**: run a five-sub-task coordinator and later read the episode page as the session's story.
**Current Reality**: five `landedMetadata` blobs in `state.json`; the episode folder untouched.
**Natural Progression**:

1. Each `landSelf` → `task.landed` → diary reflection with chronicle ref + a2a envelope
2. Merge of the coordinator branch → STC observation on the project's chart
3. Chronicle tab (or the Miadi web app) lists five beats in landed order, verification badges intact
   **Achieved Outcome**: the episode page reads as a chronological account of what actually landed, written by the events themselves.
   **Supporting Features**: single-point sink, LandedMetadata richness, diary chronicle projection, a2a v2 typed envelopes.

## Data

### MiadiEvent

`{type, at: ISO, source:'parallel-code', taskId, coordinatorTaskId?, episodeUri?, traceId, payload}` — types union per the mapping table. Shared TS types live outside `electron/` and `src/` (dependency-cruiser rule), e.g. `shared/miadi-events.ts`.

## Exportation

- Order: sink + `task.landed` → diary (one visible win) → a2a envelopes → STC observations (needs workspace lookup cache).
- All desktop-side; Miadi needs no changes. The no-auth caveat on `ceremonial-diary` reinforces the trusted-network posture from the master spec.
