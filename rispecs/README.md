# rispecs — Parallel Code ↔ Miadi Integration Specifications

RISE specifications (Reverse Engineering → Intent → Specifications → Exportation) for integrating this fork of Parallel Code (Electron desktop multi-agent orchestrator) with the Miadi platform (`/a/src/Miadi/app/api`, Next.js, port 3335).

**Provenance**: Synthesized 2026-07-25 from a three-agent reverse-engineering sweep — Miadi API surface (216 handlers / 165 routes, maturity-graded), Parallel Code electron hooks, and Parallel Code UI surfaces. Fork issues: miadisabelle/mia-parallel-code#3 (tide bridge intent), #5 (chronicle awareness), #10 (this spec set).

## How to use these specs

Each spec is autonomous prose-code: an agent (or human) can implement its domain from the spec alone. Dispatch one agent per spec; `miadi-integration.spec.md` is the shared context every agent should read first.

| Spec                                                                     | Domain                                                                     | Reads Miadi                              | Writes Miadi                                                 |
| ------------------------------------------------------------------------ | -------------------------------------------------------------------------- | ---------------------------------------- | ------------------------------------------------------------ |
| [`miadi-integration.spec.md`](./miadi-integration.spec.md)               | Master: topology, auth reality, transport, client shape                    | —                                        | —                                                            |
| [`session-registration.spec.md`](./session-registration.spec.md)         | Desktop sessions announce themselves; plans flow to insight + voice review | `plan-insight/[job_id]`                  | `session/newsession`, `session/plan-insight`, `voice/review` |
| [`task-lifecycle-events.spec.md`](./task-lifecycle-events.spec.md)       | Task spawn/land/merge/review become chronicle beats & diary entries        | —                                        | `ceremonial-diary`, `a2a/v2/send`, `stc/charts`              |
| [`pde-prompt-decomposition.spec.md`](./pde-prompt-decomposition.spec.md) | Prompts decompose before send; facets become sub-tasks                     | `pde/[uuid]`, `pde/review`               | `pde/decompose`, `pde/validate`                              |
| [`chronicle-ui.spec.md`](./chronicle-ui.spec.md)                         | Episode badges, Chronicle tab, STC panel, Settings 'miadi' tab             | `chronicle/resolve`, `stc/*`, `lattice*` | —                                                            |
| [`steering-parity.spec.md`](./steering-parity.spec.md)                   | Miadi's tide can see & steer desktop panes with consent                    | `tide/*` (pattern source)                | — (Miadi calls us)                                           |

## Maturity legend (from the API sweep)

- **integration-ready**: `tide/*`, `session/plan-insight`, `a2a/v2/*`, `session/newsession`, `pde/{decompose,list,[uuid],review,validate}`, `stc/{workspaces,charts,files,jsonl}`, `chronicle/resolve`, `lattice*`, `ceremonial-diary`, `ceremony/list`, `health`
- **do not depend on**: `session/{start,current,list,end,restore,…}` (self-declared unstable), `agent/*` (vercel-kv split-brain), `ceremony` Gen-1 (fabricates GitHub identifiers), `narrative-performance/*`, `live-story-monitor/*`, `spiral-agents`, `workflow/{engine,qstash,story-generate}`, `mobile-payload` GET, `pde/consume`
- **caveat**: `voice/*` is the best-written family but the entire directory is **untracked in Miadi's git** — commit it upstream before depending on it

## Non-negotiable constraints (both codebases)

1. **Miadi has no API-level auth** — `middleware.ts` skips `/api/*`; per-route gates fail open outside production. Every integration fronts Miadi with its own secret handling and treats Miadi as a trusted-network peer, never an internet-exposed dependency.
2. **Parallel Code renderer never talks HTTP** — outbound calls live in the main process (`electron/ipc/miadi-client.ts`, modeled on `ask-code-minimax.ts`); secrets never enter `state.json`.
3. **New IPC channels are a triple edit** — `channel-manifest.json` + `preload.cjs` allowlist + handler; guarded by `electron/preload-allowlist.test.ts`.
4. **Dependency direction** — Miadi may know about Parallel Code; `electron/mcp/` must not import `src/`; shared types live outside both (`.dependency-cruiser.cjs` rules).
