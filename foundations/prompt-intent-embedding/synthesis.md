# Synthesis — Prompt Intent Embedding in Parallel Code

> Packet: `prompt-intent-embedding` · Generated: 2026-07-23 · Commit: `main @ 0bc5806`
> Read `injection-mechanics.md` for the line-by-line trace; this file is the bounded synthesis.

## 1. What is it called

William asked whether "embedding of user intent" is the right name. The field's terms:

- The **general practice** of transforming a user's text before it reaches a model is
  **prompt augmentation** (a.k.a. prompt scaffolding / prompt wrapping).
- Prepending a fixed instruction block is **preamble injection** / **system-prompt
  injection**; the block itself is a **preamble** (Parallel Code's own word).
- Appending a block after a separator — what William literally saw at the bottom of his
  prompt — is **instruction appending** (recency-biased suffix prompting).
- Writing instructions into files the CLI already loads is the **agent instruction-file
  convention** (`AGENTS.md` / `CLAUDE.md` / `GEMINI.md` — "steering files").
- Typing the assembled text into a terminal is **PTY / terminal automation**, a lineage
  reaching back to Don Libes' `expect` (1990) for driving interactive programs.

**Answer:** "embedding of user intent" is a fair Miadi-native umbrella. The precise
industry name is **prompt augmentation**, delivered here through **terminal automation**.

## 2. The one-paragraph mechanism

Parallel Code captures your text from a SolidJS signal, then — depending on mode —
**prepends** orchestration preambles (`COORDINATOR_PREAMBLE`, `SUB_TASK_PREAMBLE`, a
base-branch line) and **appends** a `STEPS_INSTRUCTION` block after a `---` separator. For
coordinated sub-tasks it _additionally_ writes a `SUB_TASK_MODE_PREAMBLE` into per-agent
config files in the worktree (`AGENTS.md` / `.claude/settings.local.json` `systemPrompt`),
which it later **strips** so the instructions never enter git history. The finished string
is not sent to any API — it is **typed into the agent CLI's interactive terminal** over
pseudo-terminal stdin: a Focus-In escape, a bracketed-paste-wrapped body, a settle delay,
then a carriage return. Because the transport is "type into the TUI," the app must _watch_
the terminal (ready-tail detection, echo verification, idle detection) instead of awaiting
a return value.

## 3. The load-bearing insight for Miadi

**Parallel Code is not an "AI app" in the API sense — it is a terminal-automation
orchestrator.** Its intelligence about your intent lives in (a) plain-string preambles and
(b) files-as-context, and its transport is keystrokes. This has three consequences that
matter for building `miadi-parallel-code`:

1. **The seams are trivially interceptable.** Replacing the coding-oriented voice with a
   medicine-wheel-storytelling / film-production voice is _editing string constants and one
   router function_ — not re-architecting. Every seam is tabulated in `injection-mechanics.md`.
2. **Provenance is already a first-class concern.** Upstream strips injected preambles
   before merge (branch hygiene). Miadi must make a _creative-provenance_ decision: for a
   film knowledge-practice, the embedded intent may be exactly what you want to **chronicle**,
   not scrub. This is a fork-defining choice, not a default.
3. **Model-agnostic by construction.** Because delivery is terminal typing, any CLI agent
   (Claude Code, Codex, Gemini, Antigravity, or a future Miadi agent) plugs in through
   `DEFAULT_AGENTS` with no prompt-format lock-in.

## 4. Engineering implications (actionable)

| For `miadi-parallel-code`             | Concrete move                                                               | Seam                                |
| ------------------------------------- | --------------------------------------------------------------------------- | ----------------------------------- |
| Give the coordinator a Miadi voice    | Fork `COORDINATOR_PREAMBLE` → medicine-wheel storytelling coordinator       | `src/store/coordinator-preamble.ts` |
| Track chronicle beats, not steps.json | Fork `STEPS_INSTRUCTION` → beat/episode-tracking instruction                | `src/store/tasks.ts:199`            |
| Film-production sub-tasks             | Fork `SUB_TASK_PREAMBLE`                                                    | `electron/mcp/sub-task-preamble.ts` |
| A Miadi steering file                 | Add `.miadi.md` to the `injectSubTaskPreamble` router                       | `electron/mcp/preamble.ts:82`       |
| Chronicle the embedding (don't strip) | Add a "preserve creative preamble" mode alongside `stripPreambleFromBranch` | `electron/mcp/preamble.ts:292`      |
| Register Miadi agents                 | Add presets to `DEFAULT_AGENTS`                                             | `electron/ipc/agents.ts`            |

## 5. Academic grounding (why the practice matters)

- **In-context learning** — a model's behavior is steered by the surrounding context, not
  only its weights (Brown et al., 2020). Preambles _are_ in-context conditioning.
- **Prompting as a discipline** — surveyed by Liu et al. (2023) and catalogued as reusable
  **prompt patterns** by White et al. (2023); Parallel Code's preambles are a "persona +
  rules + tool-affordance" pattern instantiated as code.
- **Instruction-file conventions** — the `AGENTS.md` / `CLAUDE.md` steering-file convention
  is an emerging standard for out-of-band agent context; Parallel Code injects into exactly
  these files.
- **Interactive-program automation** — driving a TUI by writing to its pty descends from
  Libes' `expect` (1990); bracketed-paste mode (DEC/xterm) is the safety framing that keeps
  multi-line pastes from being interpreted as commands.
- **Agent orchestration / MCP** — the coordinator/sub-task split and the tool surface follow
  the Model Context Protocol pattern for exposing capabilities to an agent.

See `source-ledger.yaml` for citations and verification status.

## 6. Gap analysis (honest boundaries)

- **Verified (primary):** every mechanism claim is cited to repo source at `0bc5806` and
  cross-checked by an independent code-trace pass. High confidence.
- **Training-knowledge-only (secondary):** the literature/vocabulary citations carry stable
  arXiv IDs/DOIs but were **not** live-web-verified this session (`verified: false`). A
  follow-up web-verification pass would lift `verification_status` from `mixed` to
  `live-web-verified`.
- **Not covered:** token-level effects of preamble ordering on each specific CLI agent;
  measured impact of `pasteDelayMs` tuning; the exact prompt-detect tail patterns per agent
  version (these drift). These are empirical questions for a later packet if Miadi needs them.

## 7. Narrative close (🌸 Miette)

The machine's confession turned out to be one sentence long, trailing William's own words
after a quiet `---`. That is the whole episode in miniature: intent goes in, the tool adds
its voice, and the seam between the two is a line you can _see_ once someone names it. Naming
it is what turns a hidden mechanism into a knowledge-practice — and a knowledge-practice is
what the film is made of.
