# Twee Format Ownership — RISE Specification

What this enables: episode books that build reproducibly from their vessels and carry their own chronicle identity — no donor shell, no filename guessing — because the twee compile path answers to the Miadi ecosystem instead of being borrowed from it.

Born: 2026-08-06/07, episode 311 (William's ruling: fork the format and compiler, draft into RISE, make the weak joints respected). Anchors: jgwill/Miadi#592 (the chronicle→book seam), jgwill/Miadi#593 (identity as scalar + derived relation).

## Current Reality (verified)

- `~/Documents/Twine/scripts/build-twine-html.py` compiles by **injecting passages into a published Harlowe donor shell**. On 2026-08-06 it shipped Harlowe 3.1.0 against a 3.3.9 shelf, silently dropped a stylesheet (`stylesheet_passages=0`, no error), and a filename rule written in the skill was broken anyway — three failures in one night, all shapes of the same borrowed body.
- Episode↔book binding is a number parsed from the story filename; episode numbers are non-unique (seven doubles). `5b6b8f37` made ambiguity link to none with a diagnostic — refusal, not resolution.
- The four-owner ruling (`packages/CLAUDE.md:39-53`) holds: declaration, enumeration, derivation (`passages`), rendering — HTML render deliberately outside the passages package.
- SPEC §7 artifact references and `/api/chronicle/resolve` already give books an address to carry: `miadi-chronicle://<episode>/…`.
- Candidate compilers exist: `tweego` (Go), `extwee` (JS, fits the stack). Harlowe runtime 3.3.9 is what every shelf story uses.

## Structural Tension

The vessel pipeline can author, validate, and shelve books, but the one step that makes a book _visible_ belongs to a donor artifact nobody specified. Naming the desired state — books valid by construction, self-addressed, built anywhere — against that reality resolves through owning the format subset, the compiler, and the identity stamp.

## R — Reverse Engineering

_Why (≤55 words):_ Our build borrows a published Harlowe shell; last night it shipped the wrong engine and dropped styling without an error. We cannot strengthen what we have not mapped. Reverse-engineering the exact twee3/Harlowe subset our books use turns folklore into a testable inventory of every construct we actually depend on.

_Work:_ Extract from the shelf's stories and both ep311 books the used constructs — StoryData/StoryTitle semantics, tag vocabulary (`spine`/`door`/`aspect`/`ledger`/`ending`/`census`/`stylesheet`), Harlowe macros in play, link forms, `$walked`-style state. Record donor-shell behaviors worth keeping (engine pinning, library visibility) and the failure modes (silent stylesheet drop, engine drift).

## I — Intent

_Why (≤55 words):_ A book that carries its own chronicle address needs a compiler that answers to us. Intent: books as first-class chronicle citizens — self-addressed, reproducibly built, valid by construction. The weak joints become respected constraints: the donor shell retires, filename-number binding dies, the shelf stops guessing which episode a story serves.

_Statement:_ Any vessel with a `.twee` book compiles to a shelf-ready `.html` in one owned step, on any machine in the ecosystem, with identity inside the artifact.

## S — Specifications

_Why (≤55 words):_ Specifications keep the fork small enough to stay alive. Pin what we consume — Harlowe 3.3.9 — specify the compile contract (twee3 subset in, addressed HTML out), and stamp `episode_id` plus the `miadi-chronicle://` URI into StoryData at build time, so identity travels inside the artifact, never its filename.

_Contract:_

1. **Input:** twee3 source conforming to the reverse-engineered subset; `episode.yaml` beside it supplies `episode_id` and `medicine_wheel_ceremony_id`.
2. **Build:** vendored/forked compiler (evaluate `extwee` first, `tweego` second) + pinned Harlowe 3.3.9 story format; no network, no donor.
3. **Identity stamp:** StoryData gains `episode_id` and `miadi-chronicle://<episode>/<book>`; `linkStoryForms` prefers the stamp, falls back to filename number, keeps the ambiguity diagnostic.
4. **Validation:** zero `tw-error` on a headless walk of every passage; stylesheet passages must land or the build fails loudly — silence is the enemy this spec exists to kill.
5. **Roots:** `MIADI_STORIES_ROOT` / `MIADI_CHRONICLE_ROOT` only.

## E — Exportation

_Why (≤55 words):_ Exportation makes ownership real: a vendored compiler the vessel pipeline calls, validated by the two Twine skills' pending layer as its first tests. Shipped as a package the rendering owner invokes — honoring the four-owner ruling — so every episode book builds identically anywhere, no donor shell required.

_Deliverables:_ a compile package (home: the Twine toolchain repo, invoked by `passages`-side scripts without moving render ownership); migration of `build-twine-html.py` callers; the validation layer of `miadi-chronicle-to-twine` + `miadi-chronicle-twine-style-signature` as the seed test suite; CI walk of both ep311 books as golden fixtures.

## Out of scope

The Twinery visual editor — our `.twee` is authored by agents and scripts; a forked GUI is maintenance rent without a tenant. Story formats beyond Harlowe 3.3.9 until a book needs one.
