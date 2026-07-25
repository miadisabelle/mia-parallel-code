# Bridge Design — Integration & Extension Aspects

> Packet: `tide-parallel-code-bridge` · Generated: 2026-07-23
> Subjects: `mia-parallel-code @ 0bc5806` (remote runtime) · `jgwill/Miadi` (tide contract/client/cockpit)
> **Read this as a menu of issue-sized work items.** Each aspect names _what_, _where_ (repo + file),
> _the seam_, and _the acceptance signal_ — so a future agent who opens the matching issue arrives
> already oriented.

## Aspect map (one row = one candidate issue/spec)

| #   | Aspect                                          | Repo              | Primary landing file(s)                                              | Kind              |
| --- | ----------------------------------------------- | ----------------- | -------------------------------------------------------------------- | ----------------- |
| A0  | Tailscale-reachable Connect-Phone QR            | mia-parallel-code | `src/components/ConnectPhoneModal.tsx`, `electron/remote/server.ts`  | fix (first stone) |
| A1  | Bridge auth surface (token without QR)          | mia-parallel-code | `electron/remote/server.ts`, `electron/mcp/client.ts`                | extension         |
| A2  | tide-contract: `parallel` Multiplexer           | jgwill/Miadi      | `packages/tide-contract/src/index.ts`, `schema/tide-api.schema.json` | spec + contract   |
| A3  | `@miadi/tide`: `parallel.ts` transport          | jgwill/Miadi      | `packages/tide/src/{parallel,client,index}.ts`                       | integration       |
| A4  | Identity & status mapping                       | jgwill/Miadi      | `packages/tide/src/parallel.ts`                                      | integration       |
| A5  | peek ← scrollback/output                        | jgwill/Miadi      | `packages/tide/src/parallel.ts`                                      | integration       |
| A6  | steer ← prompt/input (no TTY gate)              | jgwill/Miadi      | `packages/tide/src/{parallel,steer-gate}.ts`                         | integration       |
| A7  | posture ↔ token mapping                         | both              | `steer-gate.ts` ↔ `electron/remote/server.ts` pairing                | design            |
| A8  | discovery & config                              | jgwill/Miadi      | `.miadi/tide.yaml`, `packages/tide/src/client.ts`, episode lanes     | integration       |
| A9  | Direction-B shim (`/api/tide/*` in front of PC) | jgwill/Miadi      | `app/api/tide/*/route.ts`                                            | alternative       |
| A10 | Chronicle weave wiring                          | jgwill/Miadi      | `packages/inquiry-weave`                                             | deferred          |
| A11 | Chronicle awareness in the desktop UI           | mia-parallel-code | `electron/ipc/weave.ts` (new), `src/store/projects.ts`, `src/components/Sidebar.tsx` | feature (independent) |

---

## A0 — Tailscale-reachable Connect-Phone QR _(the first stone; unblocks William today)_

**Problem (root cause of "I can't access it").** The server binds `0.0.0.0:7777`
(`electron/remote/server.ts:1287,1333`) so the Tailscale interface _is_ listening — but the QR
encodes the **LAN** address by default: `primaryIp = ips.wifi ?? ips.tailscale ?? '127.0.0.1'`
(`server.ts:1293-1295`), and the modal defaults to `mode='wifi'`
(`src/components/ConnectPhoneModal.tsx:50`), only falling back to Tailscale when `wifiUrl` is null
(`:33-42`). Tailscale is detected heuristically as a non-internal IPv4 starting `100.`
(`server.ts:200`) and offered as a _disabled-if-undetected_ secondary pill (`:278,286`).

**The change.** Make Tailscale the preferred (or co-encoded) reachable URL when present:

- Simplest: default `mode` to `'tailscale'` when `tailscaleUrl` exists, else `'wifi'`
  (`ConnectPhoneModal.tsx:33-50`).
- Better: encode a URL the phone can _always_ reach on the tailnet — prefer the `100.x` address, or
  a MagicDNS `*.ts.net` hostname (note: MagicDNS also enables TLS, removing the plain-`http://`
  limitation at `server.ts:1295`).
- Fork-worthy: a "reachable-first" ordering that probes which interface the requesting client shares.

**Acceptance.** Scanning the QR from a phone that shares only the tailnet (no LAN) connects on first
try. **References:** the fork's frictionless direction (`#1`); it is the concrete complement to `#2`.

---

## A1 — Bridge auth surface (a token the bridge can hold without a QR)

**Why.** Full task control needs the **coordinator token + `X-Coordinator-Id`** header
(`server.ts:987-990`; client pattern `electron/mcp/client.ts:27-31`). That token "never leaves the
main process" (`server.ts:1294`) and is written only into sub-agent `.mcp.json`
(`electron/ipc/register.ts:1704-1711`). A tide bridge is neither the phone nor a sub-agent, so it
needs a sanctioned way to obtain a token.

**The change (options).**

- Reuse the **paired lane**: `POST /api/pair/verify` (PIN → paired token) then `/api/mobile/tasks` +
  `/ws` `input` (`server.ts:786-838,1206`). Least-privilege; matches the phone.
- Or mint a **bridge/coordinator token** exposed to a trusted local caller (a new, explicit surface)
  — a fork extension, since the current design intentionally withholds it.

**Acceptance.** The bridge can create a task and send a prompt against a Tailscale URL using only a
token it legitimately holds.

---

## A2 — tide-contract: add the `parallel` Multiplexer

**Seam.** `Multiplexer = "tmux" | "herdr"` (`jgwill/Miadi packages/tide-contract/src/index.ts:17`;
absent ⇒ tmux for backward-compat). tide **already extended this once for herdr** — "the broadening
lives entirely in the client/contract packages" (`rispecs/tide-runtime/STATUS.md:255-256`).

**The change.** `Multiplexer = "tmux" | "herdr" | "parallel"`; add any `parallel`-specific envelope
types beside the existing `TideHerdrPaneInfo`/`TideHerdrInventory`. Regenerate types from
`schema/tide-api.schema.json` (tracked by `jgwill/Miadi#378`). Bump contract version; the drift-gate
test (`test/drift-gate.test.ts`) enforces sync.

**Acceptance.** Contract publishes with `"parallel"` and passes the drift gate.
**Label:** `specs`. **Kind:** RISE rispec (candidate `rispecs/tide-parallel-bridge.spec.md`).

---

## A3 — `@miadi/tide`: a `parallel.ts` transport

**Seam.** `@miadi/tide` is "the single place Miadi talks to the tide runtime" with pluggable
transports (`packages/tide/src/client.ts:1-11`); `herdr.ts` sits beside `client.ts` as the model.

**The change.** Add `packages/tide/src/parallel.ts` implementing the tide verbs against Parallel
Code's remote API (base `http://<host>:7777`, bearer/`?token=` auth, `/ws` protocol in
`mia-parallel-code electron/remote/protocol.ts`). Wire selection by `Multiplexer === "parallel"` in
`client.ts`/`index.ts`. **Direction A** (preferred).

**Acceptance.** `getContext({multiplexer:"parallel"})` returns live Parallel Code tasks as
`ContextSnapshot`.

---

## A4 — Identity & status mapping

**The mapping (already near-isomorphic).**

| Parallel Code (`protocol.ts` `RemoteAgent`) | tide (`tide-contract`)                          |
| ------------------------------------------- | ----------------------------------------------- |
| `agentId` / `taskId`                        | `TerminalContext.tmux_pane` (synthetic pane id) |
| task name / project                         | `TerminalContext` domain/workspace              |
| `RemoteAttentionState` `active`             | `TideAgentStatus` `working`                     |
| `needs_input`                               | `blocked`                                       |
| `ready` / `review`                          | `done`                                          |
| `idle`                                      | `idle`                                          |
| `error`                                     | `unknown` (or a new value)                      |

**Landing:** `packages/tide/src/parallel.ts`. **Acceptance:** every `RemoteAgent` maps to a valid
`TerminalContext` with a defined `TideAgentStatus`.

---

## A5 — peek ← scrollback / output

tide `peek` (read a pane's recent output) ← Parallel Code WS `scrollback` / `output` (base64) or
`GET /api/tasks/:id/output`. Map to `TidePeekResult`. **Landing:** `parallel.ts`. **Acceptance:**
`peek(agent)` returns decoded recent terminal text.

---

## A6 — steer ← prompt / input _(this is where tide's blocker dissolves)_

tide `sendKeys`/`steer` ← Parallel Code `POST /api/tasks/:id/prompt` (`server.ts:452-467`) or WS
`input` (`server.ts:1206`, ≤4096 bytes/msg `protocol.ts:94-134`). Because Parallel Code enforces its
**own** auth over HTTP(S)/Tailscale, the remote steer path **does not need tide's local-TTY gate**
(`packages/tide/src/steer-gate.ts:31-33,165-193`) — the very thing that made the web cockpit refuse
to act. **Landing:** `parallel.ts` (+ a gate exemption path for `parallel`). **Acceptance:** a steer
from the `/tide` cockpit reaches a real Parallel Code agent and it responds.

---

## A7 — posture ↔ token mapping (design)

Map tide's **controller/observer posture** and `TidePendingApproval` onto Parallel Code's **token
classes**: tide `observer` ↔ mobile (read) token; tide `controller` ↔ paired (write) token; tide
approval ↔ the pairing PIN. The bridge asserts controller posture by holding the paired/coordinator
token, so `requireSteerGate` is satisfied _by remote auth_ rather than a local TTY. **Landing:**
design note in the rispec (A2) + `steer-gate.ts` exemption for `parallel`.

---

## A8 — discovery & config

How tide learns Parallel Code's base URL + token: env (`TIDE_PARALLEL_URL`, token), the per-episode
`.miadi/tide.yaml` descriptor, or episode lanes `${MIADI_HOME}/episodes/<id>/tide-lanes.json`
(read at `packages/tide/src/client.ts:426-442`). Avoid the machine-specific fallback antipattern
(`client.ts:62` hardcodes `/home/jgi/anaconda3/bin/tide`). **Acceptance:** zero hardcoded hosts; the
bridge is configured per workspace/episode.

---

## A9 — Direction-B alternative (shim serving `/api/tide/*` in front of Parallel Code)

Instead of a client transport, implement the seven `/api/tide/*` route handlers
(`jgwill/Miadi app/api/tide/*/route.ts`) against Parallel Code so the **existing** `/tide` cockpit
and `scripts/fn_tide.sh` (`TIDE_API_BASE=http://localhost:3335`) work unchanged. Cleaner blast
radius but duplicates the contract surface. Keep as fallback if the Multiplexer extension is
undesirable. **Acceptance:** the unchanged cockpit renders Parallel Code tasks.

---

## A10 — Chronicle weave wiring _(deferred to session close)_

Use `@miadi/inquiry-weave` (`relate --artefact <this packet> --episode <id> --issue owner/repo#N`,
then `register`) to bind this inquiry's three identities — artefact · issue(s) · chronicle episode —
into an existing or new Chronicle episode. Env: `MIADI_INQUIRY_ROOT`, `MIADI_CHRONICLE_ROOT`,
`MW_API_URL`. **Do not run now** — this is the closing ceremony.

---

## A11 — Chronicle awareness in the desktop UI _(independent; can ship first)_

**Why.** After `inquiry-weave relate`, an artefact carries its own `.weave.yaml` **inside the repo** —
so the desktop app can answer *"which Chronicle episode is this work part of?"* with a **local file
read**: no network, no API dependency, works offline inside the worktree an agent is already using.
This is what turns generic *parallel-code* into **`miadi-parallel-code`**: upstream's app knows about
branches and tasks; ours would know **which story the work belongs to**.

**Resolution sources (increasing richness, decreasing availability).**

| Source | Yields | Cost |
| --- | --- | --- |
| `.weave.yaml` beside the artefact (in-repo) | episode number + slug + path, issue + issue_url, `related_at` | free, offline |
| `MW_API_URL` (medicine-wheel) | the episode card: title, goal, status | one HTTP call |
| `MIADI_CHRONICLE_ROOT` (if mounted) | `episode.yaml`, mission, lineage, sibling episodes | filesystem |

**The change.**

- New `electron/ipc/weave.ts` — scan a project's worktree for `.weave.yaml` (mirroring how `git.ts`
  reads repo state); parse `weave: 1` shape; return `{episodes[], issue, issue_url}`.
- `src/store/projects.ts` — project record carries an optional `episode` field.
- `src/components/Sidebar.tsx` — an episode badge on the project row, expanding to a card with the
  episode title and its linked issues.

**Caveats** — see `jgwill/Miadi#539`: `relate --dry-run` currently writes files; an artefact outside
`MIADI_INQUIRY_ROOT` reads as `artefactExists: false` via `status` (the desktop client should trust
the in-repo `.weave.yaml`, not re-resolve against the inquiry root); `lineage` is not yet shipped.

**Acceptance.** Opening a project whose repo contains `.weave.yaml` shows its episode badge; clicking
it reveals the episode title and issue links; no network required for the badge.

---

## Recommended sequence

0. **A11** (chronicle awareness) — independent of the bridge; only reads files we already write.
1. **A0** (access) — smallest stone, unblocks William, no cross-repo coordination.
2. **A2 → A3 → A4/A5/A6** (Direction A bridge) — the contract-first path, reusing the herdr pattern.
3. **A1/A7/A8** (auth, posture, config) — hardening the bridge.
4. **A9** only if the Multiplexer extension is rejected.
5. **A10** at session close.
