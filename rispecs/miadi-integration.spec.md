# Miadi Integration — Master Architecture

What this enables: a desktop where every agent session, task landing, and prompt is also a first-class event in the Miadi narrative platform — and where Miadi can observe and (with consent) steer desktop panes. One workspace, two vantage points.

## Desired Outcome Definition

Parallel Code and Miadi operate as peers on a trusted network. The desktop emits its lifecycle as structured events Miadi renders into chronicle, diary, and structural-tension state; Miadi offers services (PDE decomposition, plan insight, voice review, chronicle resolution) the desktop consumes in place. A user watches a coordinator land five sub-tasks and finds, without any manual step, five beats in the episode record and one audio review waiting.

## Current Reality

- Parallel Code has **zero** Miadi references in source; all bridge thinking lives in `foundations/tide-parallel-code-bridge/`.
- Miadi exposes 216 handlers; maturity is uneven (see README legend); auth is per-route bearer that fails open outside production; `middleware.ts` skips `/api/*` entirely.
- Miadi's `tide/*` family already steers tmux/herdr panes — a parallel implementation of what Parallel Code does with PTYs, with no shared vocabulary yet.
- Both systems already model the same trio: a session (PTY ↔ tide pane), a task (worktree ↔ STC workspace), a narrative record (none ↔ chronicle/diary).

## Structural Tension

The desktop produces the richest ground-truth events (real commits, real verification, real PTY output) but keeps them private; Miadi holds the narrative and coordination surfaces but receives no ground truth. That asymmetry resolves naturally by giving the desktop one outbound client and Miadi's callers one inbound door.

## Integration Topology

```
┌───────────── Parallel Code (Electron) ─────────────┐
│ renderer (src/)          main (electron/)          │
│  UI surfaces  ──IPC──►  miadi-client.ts ──HTTP──►  │──► Miadi :3335 /api/*
│  (chronicle tab,         (outbound, holds secrets) │
│   PDE toggle, badges)                              │
│                          remote/server.ts ◄──HTTP──│◄── Miadi tide/steer-style calls
│                          (inbound, 'miadi' token)  │
│                          mcp config injection ─────│──► sub-agents get mcpServers.miadi
└────────────────────────────────────────────────────┘
```

Three lanes, independently shippable:

### Lane 1 — Outbound client (`electron/ipc/miadi-client.ts`)

- **Pattern**: mirror `electron/ipc/ask-code-minimax.ts:58` — main-process `fetch`, base URL + token held in module variables set via a new `IPC.SetMiadiConfig`, never echoed to the renderer, `AbortController` + `RequestRegistry` concurrency.
- **Config**: Settings → new fields (base URL default `http://localhost:3335`, bearer token, per-lane enable toggles). Token storage follows the MiniMax convention (main-process only).
- **Liveness**: `GET /api/health` (`mode`, `port`, version) on config change; surface as a connected/not-configured pill (pattern: `ConnectPhoneModal.tsx:277` mode pills).

### Lane 2 — Inbound door (`electron/remote/server.ts`)

- Add a **fifth token class `'miadi'`** in `classifyCandidate` (`server.ts:705`), minted from a user-configured shared secret; scope it beside `server.ts:918`.
- New route entries in `COORDINATOR_ROOT_ROUTES` (`server.ts:625`) under `/api/miadi/*` — Miadi (server-to-server) then drives the desktop the way a coordinator does: list tasks, read output, send prompts — see `steering-parity.spec.md`.
- Live streams: mirror `broadcast()` (`server.ts:1114`) messages to authenticated `miadi`-class websocket clients.

### Lane 3 — MCP + preamble injection (zero CLI changes)

- `buildSubTaskMcpConfig` (`electron/mcp/config.ts:60`) and the coordinator merge (`register.ts:1782`) gain an optional `mcpServers.miadi` entry so every agent can call Miadi tools directly.
- `preamble.ts:23` injects episode/project identity (`miadi-chronicle://` URI) so agents self-report to the right record.

## Event Vocabulary (outbound, Lane 1)

Single tap point: `coordinator.ts:2545 notifyRenderer` fans every `IPC.MCP_*` event; a `miadiSink(channel, data)` beside `webContents.send` covers coordinated tasks. Desktop/mobile-origin events are captured at `electron/ipc/tasks.ts:33/:59` (worktree create/remove) and `src/store/tasks.ts:617` (merge, via one IPC notify).

| Event                     | Source anchor                                                 | Payload core                                                              |
| ------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `task.spawned`            | `coordinator.ts:959`                                          | taskId, name, branchName, coordinatorTaskId, prompt                       |
| `task.landed`             | `coordinator.ts:1652`                                         | full `LandedMetadata` (commit, targetBranch, landedOrder, verification[]) |
| `task.signal_done`        | `coordinator.ts:2273`                                         | taskId, signalDoneAt                                                      |
| `task.reviewed`           | `register.ts:1475`                                            | taskId                                                                    |
| `task.merged`             | `src/store/tasks.ts:617`                                      | branchName, baseBranch, lines ±                                           |
| `batch.review_ready`      | `coordinator.ts:733`                                          | batchId, rendered text, autoFireAt                                        |
| `agent.attention_changed` | `src/store/remoteStatusSync.ts:18` (already computes the map) | taskId → attention state                                                  |

Delivery: fire-and-forget POST with a small in-memory retry queue; a Miadi outage never blocks the desktop (fail-open, log via `electron/log.ts`).

## Creative Advancement Scenario: One Landing, Whole Story

**User Intent**: land a sub-task and have the episode record grow by itself.
**Current Reality**: landing writes `landedMetadata` to `state.json` and a UI notification; nothing external.
**Natural Progression**:

1. `landSelf` succeeds → `task.landed` event reaches `miadi-client`
2. Client POSTs a diary entry (`/api/ceremonial-diary?action=reflection`, chronicle ref attached) and an `a2a/v2/send` envelope for any listening module
3. Chronicle tab (see `chronicle-ui.spec.md`) refreshes and shows the new beat
   **Achieved Outcome**: the landing exists in three places — git, desktop state, episode — from one action.
   **Supporting Features**: Lane 1 client, event vocabulary, `ceremonial-diary` (integration-ready, no-auth caveat).

## Security posture (explicit, because Miadi's is open)

- Desktop → Miadi: bearer token per lane where Miadi supports it (`THREEWAY_EH_TOKEN` family for session/pde); assume any Miadi route may be open — never send secrets in payloads.
- Miadi → Desktop: only through the `'miadi'` token class; the remote server keeps binding `127.0.0.1` unless Connect-Phone/Tailscale is explicitly on (fork issue #4).
- Trusted-network assumption is documented in Settings copy; no internet exposure of either door.

## Exportation

- Implement order: Lane 1 client + `task.landed`/diary (smallest visible win) → chronicle UI reads → PDE lane → inbound door.
- Each lane lands as its own PR-able commit series (fork CLAUDE.md upstream-intent table).
