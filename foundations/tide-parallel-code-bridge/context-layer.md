# Context Layer — Tide ⇄ Parallel Code Bridge

> Packet: `tide-parallel-code-bridge` · Generated: 2026-07-23 · Method: `deep-research-foundations`
> Repo-local root: `foundations/tide-parallel-code-bridge/` in `miadisabelle/mia-parallel-code`
> Cross-repo subject: `miadisabelle/mia-parallel-code` (remote runtime) ⇄ `jgwill/Miadi` (tide contract + cockpit)

## Purpose of this layer

This packet exists to make an **intention legible across repositories** so that future agents (and
`@miadi/inquiry-weave` at session close) can reconstruct it, author or relate **cross-repository
issues**, draft **potential specifications**, and weave it into a Chronicle episode — without
re-deriving the investigation. The technical trace lives in `bridge-design.md`; the executable
cross-repo intention lives in `intent-understanding.md` + `cross-repo-issue-plan.md`.

## Canonical terms

| Term                       | Meaning                                                                                                                                                                                                                 |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Parallel Code remote**   | The phone-steerable HTTP+WS server in `mia-parallel-code` (`electron/remote/server.ts`, default `0.0.0.0:7777`), serving a mobile PWA + a coordinator/mobile REST API + a `/ws` terminal protocol.                      |
| **Connect-Phone QR**       | The QR shown by `ConnectPhoneModal` encoding `http://<ip>:7777?token=<mobileToken>`. Default `<ip>` = LAN/WiFi, not Tailscale.                                                                                          |
| **Tailscale reachability** | The property that a phone on the tailnet can reach the desktop by its `100.x` address / MagicDNS name. Currently _not_ the QR default.                                                                                  |
| **tide**                   | Miadi's AI-driven terminal/tmux(+herdr) observation-and-steering runtime (formerly hermes-navigator; `ironsilk` packaging). Python daemon + `tide` CLI + `@miadi/tide` client + `/api/tide/*` routes + `/tide` cockpit. |
| **tide-contract**          | `@miadi/tide-contract` — the schema-first JSON covenant shared by runtime, client, routes, UI. Home of the `Multiplexer` discriminator.                                                                                 |
| **Multiplexer seam**       | `Multiplexer = "tmux" \| "herdr"` in `tide-contract/src/index.ts`. The proven extension point; a bridge adds a third value (`"parallel"`).                                                                              |
| **steer-gate**             | tide's `requireSteerGate` — refuses steering unless target is in local inventory + `mode: controller` + an interactive TTY. The blocker that makes the web cockpit "not talk."                                          |
| **bridge**                 | A `parallel.ts` transport in `@miadi/tide` implementing tide verbs against Parallel Code's remote API (Direction A), or a shim serving `/api/tide/*` in front of Parallel Code (Direction B).                           |
| **weave**                  | `@miadi/inquiry-weave` relating the three identities of one inquiry — artefact · GitHub issue · chronicle episode — via `weave.yaml`.                                                                                   |

## Cross-repository relationship graph

```
  miadisabelle/mia-parallel-code                     jgwill/Miadi
  ┌────────────────────────────┐                    ┌────────────────────────────┐
  │ #1 fork exists (skip-perms)│                    │ tide-contract  (Multiplexer)│
  │        │ advances           │                    │ @miadi/tide    (transports) │
  │        ▼                    │   BRIDGE           │ /api/tide/* + /tide cockpit │
  │ #2 embedding of user intent │◄── resolves ─────► │ tide-runtime (py daemon)    │
  │        │ advances           │   tension          │ steer-gate (TTY blocker)    │
  │        ▼                    │                    │ #378 schema→types           │
  │ THIS: remote access + bridge│═══ relates-to ════ │ #384 sessions/mode stubs    │
  │  ├ Access fix (Tailscale QR)│                    │ #291 real desktop overlay   │
  │  └ Parallel as Multiplexer  │                    │ inquiry-weave (relate/register)
  └────────────────────────────┘                    └────────────────────────────┘
                    \                                         /
                     └──────── part-of: miadi-chronicle ─────┘
                        (woven later via @miadi/inquiry-weave)
```

## Label conventions the intention rides on (so bots/agents recognize it)

| Repo                             | Existing recognizable labels                                                    | Use for this inquiry              |
| -------------------------------- | ------------------------------------------------------------------------------- | --------------------------------- |
| `miadisabelle/mia-parallel-code` | `miadi-chronicle` (MightyEagleMiadiBot trigger), `documentation`, `enhancement` | `miadi-chronicle` + `enhancement` |
| `jgwill/Miadi`                   | `inquiry`, `specs` (RISE), `type: foundations-grounding`                        | `inquiry` + `specs`               |

## Related issues & artifacts (full `owner/repo#number` for traversal)

- `miadisabelle/mia-parallel-code#1` — fork exists (skip-permissions default-on).
- `miadisabelle/mia-parallel-code#2` — embedding of user intent (miadi-chronicle beat).
- `jgwill/Miadi#378` — generate `tide-contract` types from schema (the seam's own TODO).
- `jgwill/Miadi#384` — `tide_sessions` / `tide_mode` scaffold stubs.
- `jgwill/Miadi#291` — first real desktop overlay ("the running interaction surface").
- `miadisabelle/Etuaptmumk-RSM#161` (+ children) — the article-derived tracking family (IAIP), per `/workspace/JGWILL.md`.
- Sibling packet: `foundations/prompt-intent-embedding/` (this repo) — the embedding investigation.
- Miadi packages: `packages/tide-contract`, `packages/tide`, `packages/inquiry-weave`; cockpit `app/tide/`.

## Placement & federation

- Packet lives in `mia-parallel-code` (the consumer that would expose the bridge surface), with a
  **crosswalk** to `jgwill/Miadi` (where the contract + transport live). A mirror/summary may be
  registered in Miadi via `inquiry-weave register`.
- QMD may index this packet; `@miadi/inquiry-weave` federates the relation into medicine-wheel
  (`POST {MW_API_URL}/api/inquiry-weaves`).

## Provenance rule

Technical claims are cited to code at the investigated commits: `mia-parallel-code @ 0bc5806` and
`jgwill/Miadi` current tree. See `source-ledger.yaml`.
