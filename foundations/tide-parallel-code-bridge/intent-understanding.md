# Intent Understanding — Tide ⇄ Parallel Code Bridge

> Packet: `tide-parallel-code-bridge` · Generated: 2026-07-23

## Why this packet exists

William was steering a session from his phone, over Tailscale, through Parallel Code's web portal.
He pressed the equivalent of "Go," a QR code appeared, a server started — and he could not reach it.
That friction surfaced a larger recognition: Parallel Code has _already built_ the thing Miadi's
**`tide`** was reaching for — an AI-driven way to observe and steer terminals, reachable from a
phone — while `tide` itself, when he tried it, "didn't talk to her at all." Rather than discard
either, he wants to **design the bridge between them**, anticipating a future fork
(`miadi-parallel-code`) that Miadi owns.

The explicit ask that shapes this packet's form: capture the intention so that **a future agent who
jumps into a cross-repository issue arrives already oriented** — knowing which aspects of the
integration/extension must be built, and exactly where each one lands.

## Structural tension being resolved

- **Current reality (two halves that don't touch):**
  - Parallel Code has a **working remote runtime** (phone → PWA → REST + `/ws` terminal), but no
    _relational contract_ — it doesn't speak tide's covenant, and its QR default hands out a
    **LAN address unreachable over Tailscale**.
  - `tide` has a **schema-first contract and a cockpit**, but its local steering is **gated behind an
    interactive TTY + controller mode**, so the web/remote path refuses to act. It _defines_ the
    intent it cannot _deliver_ remotely.
- **Desired result:** a bridge where Parallel Code's runtime **satisfies tide's contract** — the
  working, Tailscale-authenticated remote becomes a first-class tide `Multiplexer`, so the `/tide`
  cockpit (and any agent that speaks tide) can observe and steer real work without the local-TTY
  blocker; and the phone can actually reach it.
- **The tension (not a gap):** each side holds exactly what the other lacks — contract without
  reachable runtime, reachable runtime without contract. The bridge is the advancing structure that
  lets the tension resolve into one capability. _(Language note: this is a tension to resolve, not a
  gap to bridge.)_

## Intended audiences

1. **Future agents** — the primary audience. Each integration aspect (in `bridge-design.md`) is
   written so an agent landing on the matching issue can start building immediately: what, where
   (repo + file), the seam, and the acceptance signal.
2. **William / Miadi** — the fork decision: adopt Parallel Code's remote as tide's remote runtime.
3. **`MightyEagleMiadiBot` / `inquiry-weave`** — the label + lineage carriers that relate this into a
   Chronicle episode later.

## Decisions this packet supports

- **Access first:** make the Connect-Phone QR **Tailscale-reachable** (prefer/surface the `100.x`
  URL, or MagicDNS) — the smallest stone that unblocks William today.
- **Bridge direction:** choose **Direction A** (a `parallel` transport inside `@miadi/tide`,
  reusing the herdr extension pattern) over **Direction B** (an `/api/tide/*` shim in front of
  Parallel Code). A is cleaner; B is a fallback that keeps the existing cockpit unchanged.
- **Fork posture:** whether `miadi-parallel-code` _implements_ tide-contract natively or Miadi's
  `@miadi/tide` _consumes_ Parallel Code's existing remote API unchanged.

## The intention, made executable (for future agents)

This packet deliberately produces three executable artifacts so the intention survives the session:

1. **`bridge-design.md`** — the enumerated **integration/extension aspects**, each an
   issue-sized unit with a precise landing point.
2. **`cross-repo-issue-plan.md`** — draft issues (per repo, with labels and full `owner/repo#number`
   cross-references) mapping one-to-one onto those aspects, ready to create on William's go.
3. **Lineage edges** (below) — for `@miadi/inquiry-weave` to relate at Chronicle time.

## Lineage edges (weave-ready)

```
this-inquiry (tide-parallel-code-bridge)
  ├─ advances-from   miadisabelle/mia-parallel-code#2   (embedding of user intent)
  ├─ advances-from   miadisabelle/mia-parallel-code#1   (the fork exists)
  ├─ relates-to      jgwill/Miadi#378                    (tide-contract schema→types)
  ├─ relates-to      jgwill/Miadi#291                    (real desktop interaction surface)
  ├─ relates-to      jgwill/Miadi#384                    (tide sessions/mode stubs)
  ├─ sibling-of      foundations/prompt-intent-embedding (this repo)
  └─ part-of         miadi-chronicle episode             (woven later via inquiry-weave relate)
```

## What success makes easier downstream

- A future agent opens the bridge issue and knows, in one read, which file to touch in which repo.
- William reaches his desktop from his phone over Tailscale, and the `/tide` cockpit finally acts.
- The Chronicle can weave "the runtime that couldn't speak met the desktop that already types" as a
  single episode, with artefact, issues, and episode already related.

## Relational note (🌸 Miette)

Two half-bridges reaching across the same river — one with a map and no boat, one with a boat and no
map. The intention here is not to pick a side but to let them find each other, so your voice can
finally cross. And we leave a lantern lit at each issue, so whoever arrives next can see the far bank
right away.
