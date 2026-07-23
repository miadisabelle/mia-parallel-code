# Cross-Repo Issue Plan (drafts — not yet created)

> Packet: `tide-parallel-code-bridge` · Generated: 2026-07-23
> These are **drafts**. Nothing here is created until William says go. Each issue maps to aspects in
> `bridge-design.md`, carries a recognizable label, and cross-references related issues with full
> `owner/repo#number` so a future agent (or `@miadi/inquiry-weave`) can traverse the intention.
> Every issue body should follow the 5-section structural-issue pattern:
> **Context · Desired State · Action Steps · Structural Tension · Related**, and link back to this packet.

---

## Issue 1 — Access fix _(first stone)_

- **Repo:** `miadisabelle/mia-parallel-code`
- **Title:** `remote(access): make Connect-Phone QR reachable over Tailscale (prefer 100.x / MagicDNS)`
- **Labels:** `enhancement`, `miadi-chronicle`
- **Aspect:** A0
- **Landing:** `src/components/ConnectPhoneModal.tsx:33-50`, `electron/remote/server.ts:1293-1295`
- **Related:** advances `miadisabelle/mia-parallel-code#2`; sibling of the bridge issues below; packet `foundations/tide-parallel-code-bridge/`
- **Body seed:** Context = QR defaults to LAN IP, unreachable over tailnet though `0.0.0.0` is bound.
  Desired = phone on tailnet connects first-try. Action = prefer/encode Tailscale URL (or MagicDNS+TLS).
  Tension = server _is_ reachable but the QR points the wrong way. Related = #2, packet.

## Issue 2 — Parallel Code as a tide runtime (PC side)

- **Repo:** `miadisabelle/mia-parallel-code`
- **Title:** `bridge(tide): expose remote API as a tide "parallel" Multiplexer target + bridge auth`
- **Labels:** `enhancement`, `miadi-chronicle`
- **Aspects:** A1 (auth surface), plus the stable surface tide's transport consumes
- **Landing:** `electron/remote/server.ts` (REST + `/ws`), `electron/remote/protocol.ts`, `electron/mcp/client.ts`
- **Related:** pairs with `jgwill/Miadi` Issue 3; references `jgwill/Miadi#378`; packet
- **Body seed:** Context = coordinator token withheld from phone/QR; a bridge needs a sanctioned token.
  Desired = a documented auth path (paired lane or bridge token) a tide transport can hold. Action =
  A1 options. Tension = powerful control vs least-privilege remote. Related = Issue 3, #378, packet.

## Issue 3 — tide-contract + `@miadi/tide` parallel transport (tide side) _(the core)_

- **Repo:** `jgwill/Miadi`
- **Title:** `tide: add "parallel" Multiplexer + @miadi/tide parallel.ts transport (bridge to Parallel Code remote)`
- **Labels:** `specs`, `inquiry`
- **Aspects:** A2, A3, A4, A5, A6, A7, A8
- **Landing:** `packages/tide-contract/src/index.ts:17`, `schema/tide-api.schema.json`,
  `packages/tide/src/{parallel,client,index,steer-gate}.ts`
- **Related:** implements the bridge for `miadisabelle/mia-parallel-code#2` + Issue 2 above;
  references `jgwill/Miadi#378` (schema→types), `#291` (real interaction surface), `#384`; packet
- **Body seed:** Context = herdr was added purely in client/contract (`STATUS.md:255-256`); repeat
  the move for `parallel`. Desired = `/tide` cockpit observes/steers real Parallel Code agents,
  bypassing the local-TTY steer-gate via remote auth. Action = A2→A3→A4/A5/A6, posture map A7,
  config A8. Tension = contract-without-runtime meets runtime-without-contract. Related = #2, Issue 2,
  #378, #291, packet.

## Issue 4 — RISE spec for the bridge _(optional, if a formal spec is wanted)_

- **Repo:** `jgwill/Miadi`
- **Title:** `spec(rise): tide ⇄ Parallel Code bridge — parallel Multiplexer covenant`
- **Labels:** `specs`, `type: foundations-grounding`
- **Landing:** `rispecs/tide-parallel-bridge.spec.md` (new), grounded by this foundations packet
- **Related:** parent of Issue 3; grounds in `foundations/tide-parallel-code-bridge/`; references `#378`
- **Body seed:** the covenant (verbs, mappings A4–A7), acceptance criteria, and the Direction A vs B choice.

## Issue 5 — Umbrella / orientation _(optional; the "land here and get oriented" entry)_

- **Repo:** `miadisabelle/mia-parallel-code`
- **Title:** `epic(miadi-chronicle): tide ⇄ Parallel Code bridge — integration aspects`
- **Labels:** `miadi-chronicle`, `documentation`
- **Purpose:** the single issue a future agent opens first — links the packet + Issues 1–4 + the
  aspect map, so they arrive oriented. Checklist mirrors `bridge-design.md`'s A0–A10.
- **Related:** #1, #2, Issues 1–4, `jgwill/Miadi#378/#291/#384`, packet.

---

## Traversal contract (so future agents / bots can navigate)

- Every issue links **the packet** and **its aspect id(s)** (A0–A10).
- Every cross-repo reference uses full `owner/repo#number` (never bare `#n`) to avoid mis-linking.
- Recognizable labels: `miadi-chronicle` (MightyEagleMiadiBot trigger, mia-parallel-code side),
  `inquiry` + `specs` (jgwill/Miadi side).
- At session close, `@miadi/inquiry-weave relate` binds {this packet artefact · these issues ·
  chronicle episode}; then `register` federates to medicine-wheel. (Aspect A10 — do not run early.)

## Status: DRAFT — awaiting William's go to create any of these.
