# Context Layer — Prompt Intent Embedding

> Packet: `prompt-intent-embedding` · Generated: 2026-07-23 · Method: `deep-research-foundations`
> Repo-local root: `foundations/prompt-intent-embedding/` in `miadisabelle/mia-parallel-code`

## Shared language / canonical terms

The user (William) observed that when he types a prompt into the Parallel Code desktop
UI, additional text and context appear "alongside" or "around" his intent before it
reaches the agent LLM, and asked what this practice is called. This packet fixes the
vocabulary so the fork, the `MightyEagleMiadiBot`, and the Miadi Film Production Platform
all name the same thing the same way.

| Term (canonical)              | Meaning in this packet                                                                                                                                                                                         | Common synonyms in the field                      |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| **Prompt augmentation**       | Any transformation the app applies to the user's typed text before delivery to the model                                                                                                                       | prompt scaffolding, prompt wrapping               |
| **Preamble injection**        | Prepending a fixed instruction block to the prompt string (the codebase's own word is _preamble_)                                                                                                              | system-prompt injection, meta-prompt              |
| **Instruction appending**     | Appending a fixed instruction block _after_ a `---` separator (recency-biased) to the prompt string                                                                                                            | suffix prompting                                  |
| **Out-of-band context files** | Writing instructions into agent config files in the worktree (`AGENTS.md`, `GEMINI.md`, `.agent.md`, `.claude/settings.local.json` `systemPrompt`) rather than into the prompt text                            | steering files, agent memory files, context files |
| **PTY / terminal automation** | Delivering the assembled prompt by _typing it into the agent CLI's interactive terminal_ (pseudo-terminal stdin) — bracketed-paste framing then a carriage-return submit — instead of an API call or `-p` argv | headless TUI driving, terminal I/O automation     |
| **Preamble stripping**        | Removing injected instructions from files before a branch merges, so orchestration text never enters git history                                                                                               | branch hygiene, provenance scrubbing              |
| **Embedding of user intent**  | William's phrase → in this packet it is the _umbrella_ for the four augmentation layers above plus the PTY delivery that carries them                                                                          | intent embedding, context injection               |

**Naming answer for William:** the practice is **prompt augmentation** (industry term).
The specific act he saw at the bottom of his own prompt is **instruction appending**
(a _preamble_ in Parallel Code's vocabulary). "Embedding of user intent" is a fair
Miadi-native name for the whole orchestration envelope.

## Fields in scope (MECE decomposition)

1. **Prompt augmentation & context injection** — LLM prompting + HCI. The string-level
   preambles and appended instructions (`COORDINATOR_PREAMBLE`, `SUB_TASK_PREAMBLE`,
   `STEPS_INSTRUCTION`, `coordinatorBaseBranchInstruction`).
2. **Agent instruction-file conventions** — knowledge organization / config-as-context.
   The out-of-band `SUB_TASK_MODE_PREAMBLE` written to per-agent files, and its stripping.
3. **Terminal / PTY automation as agent transport** — software architecture. Bracketed
   paste, stdin typing, echo-verification, no API/argv one-shot.
4. **Multi-agent orchestration preambles & provenance** — agent systems / governance.
   Coordinator vs sub-task modes, the MCP tool surface, and keeping injected text out of
   merged branches.

## Repo placement

- This packet lives where the work is consumed: `miadisabelle/mia-parallel-code`, the
  fork slated to become **`miadi-parallel-code`** (desktop surface of the Miadi Film
  Production Platform).
- Mighty Eagle may reference it from a higher registry; QMD may index its content.
- The companion GitHub issue (labeled for `MightyEagleMiadiBot`) is the outward,
  webhook-recognizable pointer back to this packet.

## Provenance & source-quality rules

- **Primary sources = the repository's own code** at the commit under investigation
  (`main` @ `0bc5806`). Every mechanism claim is cited as `file_path:line`.
- Secondary sources = recognized field literature and official CLI/agent docs (see
  `source-ledger.yaml`). Where a claim rests on training knowledge rather than a verified
  URL, the ledger marks `verified: false`.
- The code trace is authoritative for _what Parallel Code does_; the literature is
  authoritative for _what the practice is called and why it matters_.

## Related artifacts

- `miadisabelle/mia-parallel-code#1` — first fork decision (skip-permissions default-on).
- Fork memory: `fork-direction-skip-permissions` — the fork evolves "toward our directions."
- `jgwill/Miadi` — Relational Software Factory; the miadi-chronicle episode this packet documents.
- Workspace: `JGWILL.md` (Platform Layer → consumes Technical/Ceremonial layers).
