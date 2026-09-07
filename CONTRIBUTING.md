# Contributing to Facets

The kernel is the brain, the web layer is the face, and decisions are written
down. This page covers how to propose a change, how a proposal becomes a
decision, what the status words mean, and what "done" means before a change lands.
Read [`README.md`](README.md) for what the instrument is and
[`docs/README.md`](docs/README.md) for the indexed docs tour first. Conduct is
governed by [`CODE_OF_CONDUCT.md`](CODE_OF_CONDUCT.md); security reports go
through [`SECURITY.md`](SECURITY.md), never a public issue.

## Filing an issue

Pick the template that fits when you open a new issue: **bug** (the app or CLI
did something wrong), **model refusal** (the kernel accepted or refused a model
you believe it should not have; this one asks for the SL, the lens, and the rule
you expected, because a verdict is only arguable against a cited definition),
or **docs**. Anything else is a blank issue. Labels are applied by the
maintainer; the ones that matter for finding work are `good first issue` and
`help wanted`, and every such issue carries a comment saying why a stranger can
do it and what green looks like. The forward plan is the
[roadmap board](https://github.com/orgs/halcyonic-systems/projects/12), grouped
by milestone.

## Sending a change

Fork or branch, make the change, run `just check`, open a pull request. The PR
template asks four things and nothing more. Commit subjects follow conventional
commits with a lowercase descriptive clause (`fix(run): step advances the
cursor`, `docs(language): the missing param lexicon row`); the scope is the
crate, face, or doc area. This is a one-maintainer research project: expect a
first response within a week, and a review that reads the diff against the
invariants in [`CLAUDE.md`](CLAUDE.md) rather than against taste. `main` is
protected; nothing merges without the checks.

By contributing you agree your contribution is licensed under the repository's
[MIT licence](LICENSE), inbound the same as outbound. There is no CLA.

## What not to touch

- The **`live` branch** and **`_site/`**: build output of `scripts/publish-site.sh`,
  force-pushed as an orphan snapshot. Never commit to it, never hand-edit it.
- **`crates/*/pkg/`**: wasm-pack output; `just wasm` regenerates it.
- **`shared/frost.css`**: generated from `web/src/index.css` by
  `scripts/gen-frost-shared.mjs`; edit the source.
- **Goldens** (`fixtures/cli/canonical.json`, the minted demo JSON under
  `assets/demos/`) except through their bless variables (`BLESS_CLI_GOLDEN=1
  cargo test -p bert-cli`, `BLESS_SL_DEMOS=1`), and only after reading the diff:
  an unexplained change is the finding, not the fix.
- The **generated tables in `docs/lean-provenance.md`**; `just provenance`
  rewrites them from `docs/lean-manifest.json`.

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
append-only; the format was fixed by the first two and the six that exist follow
it:

- [`0001-canvas-rendering-svg.md`](docs/decisions/0001-canvas-rendering-svg.md) —
  hand-rolled React+SVG over a graph library.
- [`0002-web-first-rebuild.md`](docs/decisions/0002-web-first-rebuild.md) —
  the egui → React/wasm rebuild (written retrospectively).
- 0003 conservation declared, not assumed · 0004 the neutral archive is
  `CanvasModel` JSON · 0005 vocabulary tiers · 0006 closed metric verbs — all
  indexed under Decisions in [`docs/README.md`](docs/README.md).

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

- **`just check` is green.** It is the full local gate — everything CI enforces
  that can run on this machine, in CI's order, now including the boundary gate.
  One gate inside it is conditional: **Gate A** (every Lean `claim_id` resolves
  at the pinned commit) runs only when a `systems-science-foundations` checkout
  is present beside the repo or passed with `--ssf`; without one it prints
  SKIPPED and CI runs it for you. A local green with that line skipped and a
  red CI on push almost always means a citation moved.
  What a green run means, which is more than "it compiled":

  | | is checked by |
  |---|---|
  | the code compiles, the tests pass, clippy is clean under `-D warnings` | `cargo test` · `cargo clippy -D warnings` |
  | **the wasm boundary still behaves** — the marshaling layer every verdict crosses | `just wasm-exec`, 189 checks against the real package |
  | **no doc is unreachable** — nothing indexed is an orphan, nothing is missing from the index | `doc_lint.py` |
  | **no relative link is broken** | `doc_lint.py` |
  | **every doc declares exactly one status** from the six words | `doc_lint.py` |
  | **no Lean citation has gone stale** — every `claim_id` resolves at the pin *with its declared kind* | `doc_lint.py` → Gate A (skipped when no SSF checkout is present) |
  | provenance and hedge vocabulary hold in LIVE docs | `doc_lint.py` |
  | the design tokens have not drifted; TS type-checks; the bundle builds | `check:tokens` · `tsc --noEmit` · `vite build` |
  | **the canonical six still read the same way through the CLI** — every word of the verdict under each of the three lenses, the formal object, the layout, the trajectory | `cargo test -p bert-cli`, against `fixtures/cli/canonical.json` |
  | **every other bundled model still parses and the door still answers** — exit code and shape only, no content snapshot, so a rename costs no re-bless | `crates/bert-cli/tests/library_survey.rs` |
  | **the wasm gate has not widened** — `bert-cli` is the only package excluded from the workspace `wasm32` build, in both `justfile` and `ci.yml` | `crates/bert-cli/tests/wasm_gate.rs` |

  **Two gates run in CI only**, because they cannot run everywhere: `desktop.yml`
  bundles the macOS `.app` (needs macOS), and `deny.yml` checks licences and
  advisories (needs the advisory database). A green `just check` does not cover
  those two — open the PR and let CI say.

  A crate change must never silently serve stale wasm; `just check` and
  `just dev` both rebuild the pkg first.
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
