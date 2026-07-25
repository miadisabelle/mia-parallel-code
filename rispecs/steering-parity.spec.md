# Steering Parity — Miadi's Tide Reaches Desktop Panes

What this enables: Miadi's tide cockpit (which today sees tmux and herdr panes) can list, peek at, and — with explicit consent — steer Parallel Code's agent panes, making the desktop a third multiplexer domain in one steering vocabulary.

## Desired Outcome Definition

`GET /api/tide/terminals` on Miadi includes the desktop's tasks alongside tmux sessions and herdr panes; `peek` shows a task's recent output; `steer` types into a task's PTY under the same consent discipline the desktop's own coordinator observes. One cockpit, three domains, one contract.

## Current Reality

- Two independent implementations of the same idea exist:
  - **Miadi tide** (`/api/tide/*`, `@miadi/tide@0.3.0` over `@miadi/tide-contract@0.2.4`): pane detection, `peek` (lines clamped 1-200), `steer` (message ≤2000, `submit`, `preview` returning argv, durable `paneLabel` re-resolved at execution), health separating "socket exists" from "daemon answered". Newest structural work in the Miadi tree — and **zero auth** on keystroke injection.
  - **Parallel Code remote server** (`electron/remote/server.ts`): HTTP + WS on one port, four token classes with constant-time compare + pairing PIN elevation, `GET /api/agents/:id` (full scrollback), WS `input` to any PTY, coordinator route tables (`server.ts:625/:636`) where a route is one array entry.
- The desktop's own consent discipline exists in prompt-delivery: readiness probing, human-hold respect (`coordinator.ts:496 tryDeliverInitialPrompt`), bracketed-paste writes (`writePromptToTask:1117`).
- Fork issue #3 names this direction (tide bridge); `foundations/tide-parallel-code-bridge/` holds the aspect analysis.

## Structural Tension

One steering vocabulary already resolves panes durably across multiplexer restarts; the desktop holds the richest panes with the strongest auth. Adopting the contract on the desktop's inbound door gives both sides what the other has.

## Behavior

### Desktop side — `/api/miadi/tide/*` on the remote server

- **Token class**: new `'miadi'` in `classifyCandidate` (`server.ts:705`), minted from the shared secret configured in the Settings Miadi tab; scoped so it can never use coordinator-only mutation routes (`merge`, `land`, `close`).
- **Routes** (entries in the route tables, `@miadi/tide-contract` shapes):
  - `GET /api/miadi/tide/terminals` → tasks as panes: `{paneId: agentId, paneLabel: task name + branch, domain:'parallel-code', status: attention state}` (list already built at `server.ts:212 buildAgentList`).
  - `GET /api/miadi/tide/peek?pane=&lines=` → tail of scrollback (`getAgentScrollback`, clamp 1-200 to match tide semantics).
  - `POST /api/miadi/tide/steer {pane|paneLabel, message ≤2000, submit?, preview?}` → **preview returns exactly what would be written** (argv-equivalent honesty); send path reuses `writePromptToTask` semantics: readiness probe first, refuse with **409** when the agent is busy or a question is pending (dispatch refusal is a data answer, mirroring tide's own 409 discipline).
- **paneLabel durability**: labels resolve to current agentId at execution — a task restart (new generation/PTY) keeps its label steerable, the exact property tide prizes in herdr.

### Consent discipline (Sunwise: staged is not consented)

- Per-task opt-in: steering only reaches tasks whose `controlledBy` allows it; default is **peek-only**. A steer against a non-consenting task returns 403 with the reason — never queues silently.
- Every steer emits a `task.steered_externally` event (lifecycle spec sink) so the episode records who spoke into which pane.

### Miadi side (documented for that repo)

- Register the desktop as a tide domain: transport entry pointing at the desktop's remote server URL + `'miadi'` token; `tide/health` gains a `parallel-code` transport row. Gate `tide/steer` itself with a writer token, as `stc/steer` was gated on 2026-07-25 — parity of protection across steering funnels.

## Creative Advancement Scenario: One Cockpit, Three Domains

**User Intent**: from the tide cockpit on the phone, nudge a desktop agent that has been idle on a question.
**Current Reality**: tide sees tmux and herdr; the desktop's panes are invisible to it; the phone can only reach them through Parallel Code's own remote PWA.
**Natural Progression**:

1. Cockpit lists `parallel-code` domain panes with attention states
2. `peek` shows the agent's pending question
3. `steer` (task is opt-in) delivers the answer through the readiness-probed write path; the episode gains a steering beat
   **Achieved Outcome**: one steering surface spans every place agents live, with the desktop's auth and consent discipline intact.
   **Supporting Features**: `'miadi'` token class, tide contract adoption, readiness-probed writes, per-task consent, steering beats.

## Exportation

- Desktop first (terminals + peek, read-only — immediately useful, low risk), steer behind per-task consent second.
- Miadi-side domain registration is a `jgwill/Miadi` issue (cross-linked); adopting `@miadi/tide-contract` types keeps the two implementations from drifting.
