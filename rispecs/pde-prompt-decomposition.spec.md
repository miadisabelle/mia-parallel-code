# PDE Prompt Decomposition in the Send Path

What this enables: a prompt typed into a task can pass through Miadi's Prompt Decomposition Engine before reaching the agent — surfacing implicit intents — and, in coordinator mode, its facets can become the sub-task plan.

## Desired Outcome Definition

A user toggles "Decompose with PDE" on a task, types a layered mission, and the agent receives the decomposition-enriched prompt while the raw text is preserved. The decomposition persists in Miadi (`.pde` record, reviewable at `pde/review/[uuid]`), and in coordinator mode the primary/secondary actions pre-shape the sub-task fan-out.

## Current Reality

- Every send path funnels through one choke point: `src/store/tasks.ts:706 sendPrompt` — with a working transform precedent at `:717` (`injectSteps` → `effectiveText`) and the convention that `lastPrompt` stores the human's text (`:738`).
- Constraint discovered in reverse-engineering: `prompt-verify.ts` compares echo output against the **caller's** `val` (`PromptInput.tsx:733→:761`), so a transform inside `sendPrompt` must return the transformed text to the caller, or verification breaks.
- Creation-time injection precedent: `src/store/tasks.ts:346-379` (STEPS_INSTRUCTION, COORDINATOR_PREAMBLE, raw text kept in `savedInitialPrompt`).
- Miadi's PDE family is integration-ready and explicitly designed for this split: **decomposition happens client-side (MCP/LLM); the API persists** — `POST /api/pde/decompose {decomposition, workdir?, sessionId?}` (bearer), `GET pde/[uuid]`, `GET pde/review/[uuid]`, `POST pde/validate`.
- The workspace already treats PDE as the East-direction opening (`/workspace/CLAUDE.md` mcp-pde workflow; parent-child PDE chaining in agent-pi).
- UI slots identified: checkbox beside Steps in `NewTaskDialog` (`:1303` pattern, default from a `store.defaultPdeEnabled`), "Staged for auto-send" chip (`PromptInput.tsx:843`) as the "Decomposing…" indicator, `SubTaskStrip` for facet visualization.

## Structural Tension

Prompts arrive flat while their compositions carry perceptual layers; a decomposition seam at the single choke point lets every prompt origin (input box, notes, remote, coordinator) gain depth without new paths.

## Behavior

### Where the transform lives

- **Hook**: creation time (`tasks.ts:346`) for the initial prompt of PDE-enabled tasks; send time (`sendPrompt`) for subsequent prompts on those tasks. Both call one `decomposePrompt(text, task)` in `src/lib/` that IPCs to main.
- **Contract fix**: `sendPrompt` returns the effective text; `handleSend` uses the returned value for echo verification (`PromptInput.tsx:756-761`). This also corrects the latent steps-injection blind spot.
- **Decomposition executor**: main process calls the local LLM path the workspace already uses (mcp-pde / `miaco decompose` seam) OR — minimal first version — wraps the prompt with a decomposition instruction and lets the agent itself decompose; either way the resulting `StoredDecomposition` POSTs to `pde/decompose` for persistence.
- **Timeout**: 10s budget; on timeout or lane-off, the raw prompt sends untouched (decomposition enriches, never gates).

### Persistence & review

- `pde/decompose` response `{id, redisKey, primaryAction, secondaryCount}` attaches to the task (`task.pdeId`, persisted); the Chronicle/PDE surface (see `chronicle-ui.spec.md`) links to `pde/review/[uuid]`.
- `.pde/` tree: when the task worktree is local, also write the decomposition under `<worktree>/.pde/<stamp>--<uuid>/` to match the `miaco` layout, so vessel tooling sees it.

### Coordinator fan-out (second iteration)

- PDE-enabled + coordinatorMode: primary action becomes the coordinator brief; secondary actions render as suggested sub-tasks in `SubTaskStrip` before the coordinator spawns — the human prunes the list (EAST before WEST: staged is not consented).

## Creative Advancement Scenario: The Mission That Unfolds

**User Intent**: hand a three-part voice-transcribed mission to a coordinator and keep all three parts alive.
**Current Reality**: the flat prompt reaches the coordinator; implicit intents get filtered by the first model pass.
**Natural Progression**:

1. PDE toggle on → prompt decomposes → primary + 2 secondaries persist to Miadi and `.pde/`
2. Coordinator receives the enriched brief; SubTaskStrip pre-lists the secondaries
3. Human trims one, confirms; sub-tasks spawn carrying their facet
   **Achieved Outcome**: nothing implicit was lost; the decomposition is reviewable at `pde/review/[uuid]` and chained for follow-ups.
   **Supporting Features**: single choke point, `savedInitialPrompt` convention, PDE API's client-side-decomposition design, SubTaskStrip.

## Data

### Task additions

`pdeEnabled?: boolean`, `pdeId?: string` — persisted via the 5-step settings chain (`types.ts`, `persistence.ts`, `autosave.ts`); `defaultPdeEnabled` in Settings → New Task Defaults.

## Exportation

- Iteration 1: toggle + wrap-instruction transform + persist to `pde/decompose` (no local LLM dependency).
- Iteration 2: real decomposition via mcp-pde seam + review links.
- Iteration 3: coordinator facet fan-out with human pruning.
