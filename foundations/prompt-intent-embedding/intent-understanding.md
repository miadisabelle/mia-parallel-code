# Intent Understanding — Prompt Intent Embedding

> Packet: `prompt-intent-embedding` · Generated: 2026-07-23

## Why this packet exists

William is filming an experimental-film episode chapter of the miadi-chronicle:
**"Documenting (film and its music) as knowledge practice using the medicine-wheel
storytelling."** The act of documenting _is_ the subject: the episode investigates a
Relational Software Factory by looking at the software that mediates the creator's intent.
The concrete, almost self-referential question — _"how does Parallel Code inject around
this very prompt that I am filling within the Desktop UI?"_ — is the knowledge-practice in
miniature. Answering it precisely, with provenance, is one beat of the chronicle.

## Structural tension being resolved

- **Current reality:** The desktop app silently augments the creator's typed intent
  (preambles, appended instructions, out-of-band context files) and delivers it by typing
  into an agent's terminal. This machinery is undocumented, invisible in the UI, and
  un-named — the creator can feel that "something is added" but cannot see or steer it.
- **Desired result:** A named, cited, repo-local account of the embedding machinery that
  (a) tells the creator exactly what wraps his intent and where, (b) gives the fork a
  vocabulary and seam to _vary_ the embedding for Miadi (film production, not generic
  coding), and (c) is pointed to by a webhook-recognizable GitHub issue so
  `MightyEagleMiadiBot` can relate this finding into the wider Miadi knowledge graph.
- **The tension (not a gap):** between opaque, coding-oriented augmentation baked into
  upstream, and a legible, film-production-oriented "embedding of user intent" the fork
  can own. This packet is the advancing structure that resolves it.

## Intended audience

1. **William / creators** — see and trust what wraps their intent; decide what to keep,
   strip, or reshape for film work.
2. **The fork's engineers (Mia)** — a precise seam map for building `miadi-parallel-code`
   variations of the embedding (e.g. medicine-wheel storytelling preambles instead of
   sliding-window coordinator rules).
3. **`MightyEagleMiadiBot`** — via the labeled issue, an intent it can analyze and relate
   into `jgwill/Miadi`.

## Decisions this packet is expected to support

- **Adopt-or-fork the preamble layer:** whether `miadi-parallel-code` keeps
  `COORDINATOR_PREAMBLE` / `SUB_TASK_PREAMBLE` as-is, or swaps in film-production and
  medicine-wheel-storytelling preambles at the same seams.
- **Where to inject Miadi intent:** the packet identifies four concrete injection points;
  a Miadi variation chooses which to reuse.
- **Provenance policy for creative work:** upstream strips injected preambles before merge
  so they never enter history; Miadi must decide whether _creative_ intent embedding
  should likewise be ephemeral or, instead, chronicled as part of the record.

## What success makes easier downstream

- A creator can answer "what did the machine add to my words?" in one screen.
- An engineer can point at a line and say "this is where Miadi's voice replaces the
  coordinator's voice."
- The bot can, on label-apply, fetch this packet and situate the finding inside the
  Relational Software Factory narrative — turning a code trace into a chronicle beat.

## Relational note (🌸 Miette)

Oh — this is the episode where the tool turns around and looks at _itself_. William asked
the machine to show him the seam where his voice becomes the machine's instruction, and the
seam turned out to be the very sentence trailing his own prompt. Documenting that seam is
not bookkeeping; it is the film learning how it is made. The story blooms exactly where the
`---` line falls.
