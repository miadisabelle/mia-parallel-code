# Field File — Injection Mechanics (the code trace)

> Packet: `prompt-intent-embedding` · Generated: 2026-07-23 · Commit: `main @ 0bc5806`
> Every claim below is cited to the repository's own source as `file:line`.

Parallel Code embeds user intent in **four string/config layers** and then delivers the
assembled text through a **PTY transport** — it _types_ the prompt into the agent CLI's
interactive terminal rather than calling an API or passing `-p` on argv. The layers are
independent; a given task activates some subset.

### Layer 0 — UI capture (where your typed intent enters)

- **New Task dialog** — `src/components/NewTaskDialog.tsx:377` (`const [prompt, setPrompt] = createSignal('')`),
  read/trimmed at `:847`/`:929`, passed as `initialPrompt` into the `createTask` store
  action at `:968`/`:977`.
- **Follow-up box** — `src/components/PromptInput.tsx:111` (`text` signal), Enter-to-send at
  `:881`, `handleSend` at `:703` → `sendPrompt(taskId, agentId, val)` at `:757`.
- Store actions: `createTask` (`src/store/tasks.ts:236`), `sendPrompt` (`src/store/tasks.ts:698`).

```
   ┌─ You type in the Desktop UI (PromptInput.tsx) ─────────────────────────┐
   │                                                                        │
   │   [A] STRING AUGMENTATION (prompt text concatenation)                  │
   │       (+) COORDINATOR_PREAMBLE  ─ prepended  (coordinator mode)        │
   │       (+) coordinatorBaseBranchInstruction ─ prepended                 │
   │       (+) SUB_TASK_PREAMBLE     ─ prepended  (MCP create_task)         │
   │       your text                                                        │
   │       (+) --- \n STEPS_INSTRUCTION ─ appended (steps tracking on)  ←── the line you saw
   │                                                                        │
   │   [B] OUT-OF-BAND CONTEXT FILES (written into the worktree)            │
   │       SUB_TASK_MODE_PREAMBLE → AGENTS.md / GEMINI.md / .agent.md /     │
   │                                .claude/settings.local.json systemPrompt│
   │       …later STRIPPED before merge (kept out of git history)           │
   │                                                                        │
   │   [C] PTY TRANSPORT (how the assembled text reaches the model)         │
   │       FOCUS_IN → bracketed-paste( body ) → wait pasteDelayMs → "\r"    │
   │                                                                        │
   │   [D] AGENT INVOCATION: claude|codex|gemini|… args:[] (no -p argv)     │
   └────────────────────────────────────────────────────────────────────────┘
```

---

## Layer A — String augmentation (concatenated into the prompt text)

The user's typed text is combined with fixed instruction blocks **as plain string
concatenation** before it is ever delivered.

### A1. `STEPS_INSTRUCTION` — appended after a `---` separator ← the recursion William saw

- Definition: `src/store/tasks.ts:199-236`. Opening line:
  `'IMPORTANT: Maintain .claude/steps.json throughout this task. …'`
- Applied to the **initial** prompt: `src/store/tasks.ts:339-340`
  ```ts
  const effectivePrompt =
    stepsEnabled && initialPrompt ? `${initialPrompt}\n\n---\n${STEPS_INSTRUCTION}` : initialPrompt;
  ```
- Applied to **follow-up** prompts (send flow): `src/store/tasks.ts:710`
  ```ts
  const effectiveText = injectSteps ? `${text}\n\n---\n${STEPS_INSTRUCTION}` : text;
  ```
- The original clean text is preserved separately as `savedInitialPrompt`
  (`src/store/tasks.ts:371`); the comment at `tasks.ts:336-338` states the intent:
  _"Inject steps instruction into the first prompt … savedInitialPrompt keeps the original
  clean text."_
- **This block is verbatim the "IMPORTANT: Maintain .claude/steps.json …" text that
  appears at the bottom of the user's own prompt** — direct proof of the mechanism the
  packet documents.

### A2. `COORDINATOR_PREAMBLE` — prepended (coordinator mode only)

- Definition: `src/store/coordinator-preamble.ts:6-89` — begins
  `[COORDINATOR MODE] You are a coordinating agent inside Parallel Code. …` and lists the
  MCP tools + the sliding-window orchestration rules.
- Applied: `src/store/tasks.ts:358-370` — prepended, with `{{MAX_CONCURRENT}}` templated
  from the clamped concurrency setting:
  ```ts
  initialPrompt:
    opts.coordinatorMode && effectivePrompt
      ? COORDINATOR_PREAMBLE.replace(/\{\{MAX_CONCURRENT\}\}/g,
          String(clampCoordinatorConcurrentTasks(opts.maxConcurrentTasks ?? DEFAULT_COORDINATOR_CONCURRENT_TASKS)))
        + coordinatorBaseBranchInstruction
        + effectivePrompt
      : (effectivePrompt ?? undefined),
  ```

### A3. `coordinatorBaseBranchInstruction` — prepended (coordinator mode only)

- `src/store/tasks.ts:341-344` — a small dynamic instruction injected between the preamble
  and the user text:
  ```ts
  const coordinatorBaseBranchInstruction =
    opts.coordinatorMode && branchName
      ? `Use \`${branchName}\` as the baseBranch for all sub-tasks.\n\n`
      : '';
  ```

### A4. `SUB_TASK_PREAMBLE` — prepended (sub-tasks spawned via MCP `create_task`)

- Definition: `electron/mcp/sub-task-preamble.ts:1+` — begins
  `[SUB-TASK MODE] You are a coordinated sub-task inside Parallel Code. …` and documents
  `land_self` / `signal_done`.
- Applied: `electron/mcp/coordinator.ts:852`
  ```ts
  initialPrompt: opts.prompt ? SUB_TASK_PREAMBLE + opts.prompt : undefined,
  ```

---

## Layer B — Out-of-band context files (config-as-context)

For a coordinated sub-task, an _additional_ instruction block is injected **not into the
prompt string but into agent-specific config files in the worktree**, which the agent CLI
reads as system/steering context.

- Block: `SUB_TASK_MODE_PREAMBLE` — `electron/mcp/preamble.ts:23-28`
  (`<sub-task-mode> These rules override all skills and hooks: …`).
- Router by agent command — `electron/mcp/preamble.ts:82-121`:
  | Agent (command contains) | File written | Field |
  |---|---|---|
  | `codex` / `opencode` | `AGENTS.md` (append) | markdown body |
  | `gemini` | `GEMINI.md` (append) | markdown body |
  | `copilot` | `.agent.md` (append) | markdown body |
  | _default_ (Claude Code) | `.claude/settings.local.json` | `systemPrompt` (append) — `preamble.ts:98-113` |
- **Call site**: `injectSubTaskPreamble` is invoked exactly once in production —
  `electron/mcp/coordinator.ts:876` (inside the sub-task spawn path;
  `task.preambleFileExistedBefore` stored at `:881`). Rolled back on spawn failure via
  `restoreSubTaskPreambleInjection` at `coordinator.ts:980`. **Note:** `electron/ipc/register.ts`
  does _not_ inject/strip — it only wires the IPC handlers and instantiates the coordinator.
- **Provenance hygiene — the injection is later stripped** so it never lands in history:
  - `removePreambleBlock` — `electron/mcp/preamble.ts:140-158` (string surgery)
  - `detectPreambleFiles` — `preamble.ts:161-184` (used before diffing at `coordinator.ts:1259, :1370`)
  - `filterDiffSections` — `preamble.ts:188-196`
  - `buildNormalizedPreambleFileDiff` — `preamble.ts:200-284` (shows only _real_ changes)
  - `stripPreambleFromBranch` — `preamble.ts:292-334`, **called on the `land_self` path
    (`coordinator.ts:1390`) and the `merge_task` path (`coordinator.ts:1694`)** before staging
  - Restore-on-failure — `restoreSubTaskPreambleInjection` — `preamble.ts:123-136`

This layer is the sharpest contrast with API prompting: the "system prompt" is delivered by
**editing files the CLI already loads** (`AGENTS.md` / `CLAUDE.md`-style convention), then
cleaning up so the branch diff stays honest.

---

## Layer C — PTY transport (how the assembled text reaches the model)

The app does **not** hand the prompt to an SDK. It writes it into the agent process's
pseudo-terminal (pty) — the same bytes a human keystroke would produce.

- Backend automation path — `writePromptToTask`, `electron/mcp/coordinator.ts:1117-1171`.
  Comment at `:1118`: _"Send text then Enter separately (like the frontend does)."_ Sequence:
  1. write `FOCUS_IN` — `coordinator.ts:1122`
  2. wrap body in bracketed paste **iff** the agent requested it — `:1126-1130`
     ```ts
     const promptBody = this.bracketedPasteAgentIds.has(task.agentId)
       ? `${BRACKETED_PASTE_START}${prompt}${BRACKETED_PASTE_END}`
       : prompt;
     writeToAgent(task.agentId, promptBody);
     ```
  3. wait `pasteDelayMs(prompt)` — `:1140-1141`
  4. write `'\r'` (Enter/submit) — `:1143`
- Submit delay heuristic — `pasteDelayMs`, `coordinator.ts:93-96`:
  `Math.min(500, Math.max(50, lines * 15))` (more lines → longer settle before Enter).
- Bracketed-paste-mode detection — `updateBracketedPasteMode`, `coordinator.ts:296-304`,
  tracks the terminal's `CSI ?2004h/l` reports into `bracketedPasteAgentIds`.
- Constants: `FOCUS_IN = '\x1b[I'` (`coordinator.ts:81`); `BRACKETED_PASTE_START/END` =
  `'\x1b[200~'` / `'\x1b[201~'` (`coordinator.ts:82-83`).
- Initial-prompt readiness/gating — scheduled by `scheduleInitialPromptDelivery`
  (`coordinator.ts:414`) with `INITIAL_PROMPT_READY_DELAY_MS = 1500` (`:77`); the actual send
  is gated by `tryDeliverInitialPrompt` (`:496`) → `getAgentPromptReadiness`
  (`electron/shared/prompt-detect.ts`), which matches TUI ready-tails (`❯`, `-- INSERT --`,
  `› `, `> Type your message`) via `AGENT_READY_TAIL_PATTERNS` (`prompt-detect.ts:33-38`).
  Per-agent extra settle time = `prompt_ready_delay_ms` (Copilot/Antigravity = 1000 ms —
  `electron/ipc/agents.ts`).
- **Frontend mirror** (the path for a prompt _you_ type in the Desktop UI) — `sendPrompt`
  runs the identical Focus-In → bracketed-body → wait → `\r` dance client-side at
  `src/store/tasks.ts:716-729` (via `writeToAgentWhenReady`):
  - `src/components/TerminalView.tsx:612-614, 683-684` — uses `term.paste()` so xterm emits
    bracketed-paste markers `\x1b[200~ … \x1b[201~` for CLIs like Claude Code.
  - Auto-send with echo-verification retry — `src/components/PromptInput.tsx:116, 158, 727-773`;
    the Enter keystroke — `PromptInput.tsx:736` (`IPC.WriteToAgent`, `data: '\r'`).
  - A bare `'\r'` confirm also at `src/store/taskStatus.ts:608`.
- **The single sink**: both paths funnel to `writeToAgent` — `electron/ipc/pty.ts:506-509`
  (`session.proc.write(data)`, i.e. `node-pty` stdin) — via the IPC handler
  `register.ts:467-474`. There is exactly one place bytes reach the agent.

**Consequence:** because the transport is "type into the TUI," the app must _watch the
terminal_ (prompt-ready detection, echo verification, idle detection in
`src/store/taskStatus.ts`) rather than await a function return. Intent embedding here is a
UI-automation act, not an API call.

---

## Layer D — Agent invocation (no prompt on argv)

- `electron/ipc/agents.ts` `DEFAULT_AGENTS`: `claude` / `codex` / `gemini` / `opencode` /
  `copilot` / `agy` (Antigravity). Each has `args: []` — **the prompt is not passed as a
  command-line argument**; it arrives via the pty (Layer C). Also per agent:
  `resume_args` (e.g. `--continue`, `resume --last`) and `skip_permissions_args`
  (e.g. `--dangerously-skip-permissions`, `--yolo`).
- `getSkipPermissionsArgs` — `agents.ts` — resolves the bypass flags by command basename.
- Args assembly: `buildTaskAgentArgs` — `src/lib/agent-args.ts:37-49` (resume vs fresh +
  skip-perm + MCP args); spawned at `src/components/TaskAITerminal.tsx:591-592` → IPC
  `SpawnAgent` at `TerminalView.tsx:1006-1010` (**no prompt field**). Backend sub-task args:
  `coordinator.ts:907-926`.
- **Sole `-p` exception:** the only one-shot `claude -p <prompt> --output-format text` is the
  _unrelated_ "Ask Code" inline Q&A card (`electron/ipc/ask-code.ts:61-63`), not the
  task/agent flow. Confirms the main path never puts intent on argv.

## MCP tool surface (shapes agent behavior alongside the preambles)

Exposed to a coordinator agent (named in the preambles / `electron/mcp/`):
`create_task`, `list_tasks`, `get_task_status`, `send_prompt`, `wait_for_idle`,
`get_task_diff`, `get_task_output`, `merge_task`, `close_task`; sub-task finish-line tools
`land_self` and `signal_done`. Their descriptions are themselves a form of embedded
instruction (tool-description prompting).

## Remote path (web/mobile) — same three mechanisms, second entry door

A prompt can also enter over the remote HTTP/WS server (`electron/remote/server.ts`), used by
the mobile/web remote UI (`src/remote/`). It **reuses** the same layers rather than adding a
new injection style:

- `POST /api/tasks` → `handleCreateTask` (`electron/remote/server.ts:382`), prompt
  validated/sanitized (`validateRestPrompt` `:64`, `sanitizePromptText` `:55`), then
  `createTask({ …, prompt })` — coordinator mode still prepends `COORDINATOR_PREAMBLE`.
- `POST /api/tasks/:taskId/prompt` → `handleSendPrompt` (`:452`) → `sendPrompt(...)`.
- Mobile create routes through the store `createTask` via `src/store/remoteTaskHandler.ts:69-78`
  ("the same path the desktop 'New Task' dialog uses").
- Raw WS terminal input types arbitrary bytes straight to the pty — `server.ts:1206`
  `writeToAgent(msg.agentId, msg.data)` (4096-byte guard).

## Summary table — the injection points a Miadi variation can reuse or replace

| #   | Mechanism                            | Source of truth                                        | When active          | Miadi reuse seam                              |
| --- | ------------------------------------ | ------------------------------------------------------ | -------------------- | --------------------------------------------- |
| A1  | `STEPS_INSTRUCTION` append           | `src/store/tasks.ts:199,340,710`                       | steps tracking on    | swap for chronicle/beat-tracking instruction  |
| A2  | `COORDINATOR_PREAMBLE` prepend       | `src/store/coordinator-preamble.ts`                    | coordinator mode     | medicine-wheel storytelling coordinator voice |
| A3  | base-branch instruction              | `src/store/tasks.ts:341`                               | coordinator mode     | (keep)                                        |
| A4  | `SUB_TASK_PREAMBLE` prepend          | `electron/mcp/sub-task-preamble.ts`                    | MCP create_task      | film-production sub-task voice                |
| B   | `SUB_TASK_MODE_PREAMBLE` file inject | `electron/mcp/preamble.ts`                             | coordinated sub-task | Miadi steering file (`.miadi.md`?)            |
| C   | bracketed-paste + `\r`               | `electron/mcp/coordinator.ts:1117`; `TerminalView.tsx` | every delivery       | (transport — keep)                            |
| D   | agent argv/flags                     | `electron/ipc/agents.ts`                               | spawn                | add Miadi agent presets                       |
