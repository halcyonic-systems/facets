# Contributing to bert-lenses

The kernel is the brain, the web layer is the face, and decisions are written
down. This page covers how to propose a change, how a proposal becomes a
decision, what the status words mean, and what "done" means before a change lands.
Read [`README.md`](README.md) for what the instrument is and
[`docs/README.md`](docs/README.md) for the indexed docs tour first.

## Before your first command

Every command in this repo is a `just` recipe, so install `just` first
(`brew install just`, or `cargo install just`) and then run `just preflight` —
it names every other prerequisite and prints the exact install line for whatever
is missing. The full table is [README's Prerequisites](README.md#prerequisites).
`python3` is one of them: `scripts/doc_lint.py` is the **first** step of
`just check`.

## Proposing a change

Small, self-evident changes (a bug fix, a doc typo, a test) just need a green
[`just check`](README.md#develop) and a PR.

A change that takes a **position** — a new invariant, a shift in what a lens
requires, an architecture call, a normative doc — gets an **ADR** (Architecture
Decision Record) in [`docs/decisions/`](docs/decisions/). ADRs are numbered and
append-only; the format is fixed by the two that exist:

- [`0001-canvas-rendering-svg.md`](docs/decisions/0001-canvas-rendering-svg.md) —
  hand-rolled React+SVG over a graph library.
- [`0002-web-first-rebuild.md`](docs/decisions/0002-web-first-rebuild.md) —
  the egui → React/wasm rebuild (written retrospectively).

Copy an existing ADR's shape: a title line, a byline
(`*date · phase · status: **…***`), then **Context · Decision · Rationale ·
Consequences**. Number it as the next free integer. If you're recording a call
that was already made, say so in a banner at the top, as ADR-0002 does — honest
provenance beats a tidy fiction.

## PROPOSED → ADOPTED

A position doesn't have to be settled to be written down. The lifecycle runs
through the **status vocabulary** below, tracked by a GitHub issue:

1. **Write it as PROPOSED**, citing its tracking issue (`PROPOSED (#N)`). The
   document states the position; the issue is where it's argued.
2. **Keep normative content honest while it's pending.** A live/normative section
   may not lift text verbatim from a PROPOSED document (the invariant in
   `docs/README.md`). If normative content is *conditional* on the pending
   decision, mark it **CONTINGENT(#N)** rather than asserting it.
3. **On adoption, flip it to ADOPTED** and record the deciding issue in the
   byline — as `dynamics-principled-position.md` does ("adopted via #86"). Where
   the new decision supersedes an older doc, both documents say so.

Research that others build on but that isn't itself a decision stays **RESEARCH**
— it never needs to "graduate" to ADOPTED.

## Status vocabulary

Every doc under `docs/` and `spec/` carries exactly one status, and
`scripts/doc_lint.py` enforces it. The canonical definitions live in
[`docs/README.md`](docs/README.md); in short:

| Status | Meaning |
|---|---|
| **LIVE** | Current, load-bearing reference. |
| **ADOPTED** | A decision in force. |
| **PROPOSED** | A position awaiting adoption — see its tracking issue. |
| **CONTINGENT(#N)** | Normative content conditional on a pending decision (issue #N). |
| **RESEARCH** | A foundation others build on; not itself a decision. |
| **HISTORICAL** | Kept as record, superseded. |

New docs must be added to the `docs/README.md` index with their status; where one
doc supersedes another, both say so.

### Where the status goes

The status lives **in the file**, above the first `## ` heading, so it is on
screen when the document opens. Two shapes are accepted, both already in use:

```markdown
**Status: LIVE.** A ten-minute path through the instrument…
```

```markdown
*2026-07-18 · dynamics doctrine (#86) · status: **ADOPTED***
```

The first is the prose form (a `> ` blockquote prefix is fine, as the archive
banners use). The second is the ADR byline, whose format is fixed above. The word
is uppercase and is one of the six; `CONTINGENT(#N)` carries its issue number.

**A fixed line, not frontmatter.** The defect this rule fixes is *invisibility* —
`theory-fidelity.md`, the auditor's front door, carried its status only in the
`docs/README.md` index, so a reader who opened the file (the normal case, and how
an agent reads) saw none. YAML frontmatter is metadata: GitHub renders it as a
detached table, a plain editor shows a fence above the title, and some renderers
hide it. A carrier that can be hidden is the same bug with a parser attached. A
prose line also carries the sentence of context the status usually wants, which
frontmatter would force you to write twice.

A doc that is an execution record rather than a position — a plan, a draft — is
**RESEARCH**: it is something later work builds on, and it is not itself a
decision. `docs/design/README.md` groups those separately for readability; the
status word is still one of the six.

## Definition of done

Before a change lands, it must clear the gate and keep the docs honest:

- **`just check` is green.** It runs exactly what CI enforces, in this order:
  `doc_lint.py`, `cargo test`, clippy `-D warnings`, the wasm32 build,
  `wasm-pack`, then `check:tokens`, `tsc --noEmit`, `vitest`, and `vite build`.
  A crate change must never silently serve stale wasm; rebuild with
  `just wasm` / `just dev`.
- **A new gate gets its own workflow file.** `.github/workflows/ci.yml` is the
  core gate and mirrors `just check`; a new check (fuzzing, provenance, a
  desktop build) lands as `.github/workflows/<gate>.yml` rather than a step
  there. Independent gates land independently, and `ci.yml` stays readable.
- **Boundary changes update the contract.** A change to the JS↔wasm surface
  updates [`crates/bert-lenses-kernel/API.md`](crates/bert-lenses-kernel/API.md)
  (frozen, append-only) **and** its serde↔TS contract fixture in
  `fixtures/contract/`. The face and the kernel agree by fixture, not by trust.
- **New docs get a status entry.** Add the doc to the `docs/README.md` index with
  one of the six status words above.

## Corpus precedence (SL fixtures)

The three `.sl` files in [`fixtures/sl/`](fixtures/sl/) carry three roles at once:
round-trip golden, spec example, and teaching set. When those roles conflict,
**round-trip correctness comes first** — pedagogy does not. Do not change SL
syntax to make a fixture read better as a lesson; a teaching improvement that
would perturb a golden's round-trip belongs in a dedicated teaching fixture, not
these files. The full rule is in
[`docs/language/README.md`](docs/language/README.md) ("Corpus precedence"), and
the round-trip contract is tested in
`crates/bert-canvas/tests/sl_roundtrip.rs`.
