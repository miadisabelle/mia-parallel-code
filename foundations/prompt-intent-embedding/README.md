# Foundations — Prompt Intent Embedding

> How the Parallel Code desktop app embeds / injects context around the user's typed input
> prompt before it reaches the agent LLM. A repo-local `deep-research-foundations` packet for
> `miadisabelle/mia-parallel-code`, the fork slated to become **`miadi-parallel-code`** (the
> desktop surface of the Miadi Film Production Platform).

- **Generated:** 2026-07-23
- **Commit under investigation:** `main @ 0bc5806`
- **Method:** `deep-research-foundations` (MECE fields · primary-source code trace · source ledger · gap analysis · synthesis)

## The question, in one line

_"How does `parallel-code` inject around this very prompt I am filling within the Desktop UI?"_
— and the recursive answer: the `IMPORTANT: Maintain .claude/steps.json…` block at the
bottom of that prompt is `STEPS_INSTRUCTION`, appended by the app itself
(`src/store/tasks.ts:340`).

## Answer in three sentences

1. Parallel Code **augments** your text with orchestration preambles (prepended) and a steps
   instruction (appended after `---`) — plain string concatenation.
2. For coordinated sub-tasks it _also_ injects a mode preamble into **config files**
   (`AGENTS.md` / `.claude/settings.local.json` `systemPrompt`) and later **strips** them so
   they never enter git history.
3. It delivers the finished text by **typing it into the agent CLI's interactive terminal**
   (bracketed-paste + Enter over pty stdin) — no API, no `-p` argv.

The industry name is **prompt augmentation via terminal automation**; "embedding of user
intent" is a fair Miadi-native umbrella.

## Packet contents

| File                      | What it holds                                                                                                                        |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `context-layer.md`        | Canonical terms, MECE fields, placement, provenance rules, related artifacts                                                         |
| `intent-understanding.md` | Why this packet exists; the structural tension it resolves; audiences; decisions it supports                                         |
| `injection-mechanics.md`  | The line-by-line code trace: 4 injection layers + PTY transport, with `file:line` citations and a reuse-seam table                   |
| `synthesis.md`            | Bounded synthesis: naming, mechanism, the load-bearing insight, engineering implications for Miadi, academic grounding, gap analysis |
| `source-ledger.yaml`      | Every claim → source, with verification status                                                                                       |

## Companion GitHub issue

A webhook-recognizable issue in this fork points back to this packet so `MightyEagleMiadiBot`
can analyze the intent and relate it into `jgwill/Miadi` (the Relational Software Factory).
See `context-layer.md` → _Related artifacts_.
