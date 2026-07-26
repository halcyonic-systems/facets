# Parked — the research ledger

**Status: LIVE.** The permanent record of work that was thought through, decided
on, or found out — and then deliberately not scheduled. Each entry below closed a
GitHub issue; this file is where its substance lives now.

## Why this file exists

The repo's doctrine is *keep only a few open issues at a time — no sprawling
backlog*. GitHub has no parked state, so a `parked` label removes an issue from
nothing: not the open count, not a board view, not an agent's context. In the W30
ratification audit (2026-07-25/26) 11 of 24 open issues were parked, and **8 of
them recorded a finding or a decision rather than a task**. An issue is the wrong
container for a finding. A finding does not get done; it gets *known*.

So the finding moves here and the issue closes. Two rules make that lossless
rather than a discard:

1. **Every closed issue links to its entry here**, so the trail from the board to
   the record is never broken.
2. **Every entry stands alone.** You should not need to open the closed issue to
   learn what was decided, what settled it, or what would change the answer.

**An entry here is not a backlog item.** Where an entry has a named condition
that would put the work back on the board, it is written under **Unpark
trigger**. Where it has none, that is stated plainly rather than implied — a
finding with no trigger is a finding, and it is finished.

**Unparking is cheap.** Nothing here is foreclosed. If a trigger fires, or the
situation changes, open a fresh issue for the *requirement* and link back to the
entry for the reasoning.

---

## Index

| Entry | What it is | Trigger |
|---|---|---|
| [#88 — SpacetimeDB as shared authority](#i88) | Decision (vendor rejected) | **Live** — named second editor, or a dated demo |
| [#105 — Constellation authoring](#i105) | Future epic + a shipped near-term slice | **Already fired** — needs restating, not parking |
| [#121 — RA bridge: ensemble dataset export](#i121) | Plan, subsumed as a consumer of #172 | Conditional on #172, which has no trigger |
| [#125 — Two-reader fork in the README](#i125) | Approved task — **done in this change** | None (retired) |
| [#126 — Illustrated quickstart](#i126) | Approved task, unbuilt | None |
| [#127 — Symbol-anchored citations + issue-link liveness](#i127) | Approved task, partly overtaken | None as filed; a candidate is proposed below |
| [#144 — Formalizing the system life cycle](#i144) | Research position + findings against a published paper | None (the paper is the live work, elsewhere) |
| [#150 — Rung 3: the extraction theorem](#i150) | Decision (rung 2 rejected) + a scoped fidelity upgrade | None; two open decisions gate any start |
| [#166 — External↔external flows render as stubs](#i166) | Bug-shaped finding with an unresolved design question | None |
| [#172 — The neutral interchange](#i172) | Parked epic / design frame | None, by its own text |
| [#197 — Mobus's illustrative models as executable examples](#i197) | Program + the rule it established | None; a precondition on doing it well |

---

<a id="i88"></a>
## #88 — SpacetimeDB as shared authority: realtime collaboration via kernel-in-the-database

*Opened 2026-07-18 · closed 2026-07-26 · the precedent this file is modelled on.*

**What it is.** An R&D investigation into whether bert-lenses could go
realtime-collaborative on SpacetimeDB without compromising the architecture. It
is the model entry for this file because it states three things: what was
decided, what evidence settled it, and **which half of its own findings was not
real**.

### What was decided

**The vendor question is closed. Do not run the SpacetimeDB spike. Do not build
the relay.** Rejected on **sovereignty grounds**, not on a license-audit outcome:
adopting a BSL-family vendor as *the shared authority* for a program whose spine
is ontology sovereignty costs more in the argument than the feature earns. Two
sharper forms of the same point:

- The refusal guarantee is the tool's identity. "No CRDT needed" rests on the
  vendor's **reducer serialization semantics** — so the load-bearing property
  would sit downstream of an unverified third-party concurrency contract.
- A spike whose best outcome is *"works, but we probably shouldn't ship it"* **is
  not a spike, it's an attractive nuisance.** The fallback (a relay running
  `bert-core` natively) already delivers the core property — server-side refusal
  plus ordered SL replay — so the vendor spike answers a question we do not have.

The seam design is retained, and a **relay is pre-designated** as the answer if
realtime is ever unparked. It is not built now: *"a plain WebSocket relay running
bert-core natively"* is a sentence, not a scope — auth, session lifecycle,
presence, reconnect/backfill, persistence, deploy, ops surface. That is the
substrate SpacetimeDB exists to sell, which is the tell that it is a product, not
a weekend.

### The evidence that settled it

A blind three-model bake-off, 2026-07-24 (halcyonic vault,
`operations/calibration/blind-pick-ledger.md`). Three models answered an
identical brief in isolated contexts and were ranked without provenance. The
brief deliberately put a live NO on the table and invited them to call the
kernel-in-the-database story flattery if it was. **Unanimous across all three
arms: leave realtime parked.**

All three arms also **volunteered, unprompted, that a solo researcher does not
walk away from a half-working spike** — it converts into sunk cost plus a
maintenance obligation plus a genuinely interesting unsolved problem, which is
precisely this repo's named failure mode. A kill criterion you will not honor is
theater; the only reliable kill is a spike never begun. So the kill criterion was
replaced by an unpark trigger.

### Which half of the findings was real

- **GENUINELY DEEP, and ours: SL-as-wire-protocol.** SL is line-oriented and
  compiles deterministically, so `flow "Source 1" -> "Process M" : matter
  "material A"` already *is* an operation. Server-authoritative ordering plus a
  deterministic compile means replaying the statement log rebuilds the model
  bit-for-bit — no CRDT library, no operational transforms — and the
  collaboration log is human-readable SL, so a session's edit history is itself a
  document in the language. This comes from the tool's own semantics, not a sync
  library, which is why it survives parking. One arm noted it is *itself an
  argument against the vendor*: the harder our own semantics carry the load, the
  less SpacetimeDB contributes.
- **COINCIDENCE DRESSED AS DESTINY: "bert-core is already SpacetimeDB-shaped."** A
  pure Rust crate with no I/O and no async runtime compiles into *any* WASM host
  — that is what purity buys, and it is true of every well-factored pure crate.
  It is the *absence* of coupling reading as the *presence* of destiny.
  SpacetimeDB makes validator-in-the-authority convenient, not possible;
  convenience is not alignment.
- **Multiplayer is currently a solution in search of a problem here.**
  Credibility rests on refusal, and refusal is already fully enforced client-side
  by the Lean-bound validator plus the gates oracle. Moving it to a shared
  authority makes it *more social*, not more true — "the shared world refuses
  loudly" is a great sentence about an empty world.

### A cost the original findings undercounted

Server-side validation means an optimistic local edit can be **rejected after the
fact**. Serialization removes *merge*, but it does not remove *conflict* — it
relocates it into optimistic-apply-and-rollback UX in the React store. **"No
CRDT" is not "no concurrency work."** Record this against any future relay build.

### What the arc became instead

The Phase-0 invariants were already adopted, which captured the issue's entire
strategic value at zero ongoing cost. Realtime is a one-milestone-away option,
indefinitely, and **we do not need to cash the option to own it.** What is worth
doing is justified by the resident co-author (#10) and single-player provenance,
not by multiplayer:

- **Edits as named ops / SL statements**; model on disk = **log + materialized
  state** rather than blob. Buys undo/redo, model diffs, statement-granularity
  accept/reject of agent proposals, and a replayable provenance trail — all
  single-player, all wanted regardless of a second user, and all the same work
  realtime would need later.
- **UUID minting out of `bert-core`** — correct independently; a kernel that
  mints identifiers is a kernel with a hidden clock. Also required for
  reproducible replay.
- **CI property test: `replay(log) == model`, bit-for-bit.** The cheap binary
  check on the load-bearing claim, with no server and no vendor: if replay is not
  bit-exact, the realtime design is unsound regardless of backend. Unlike a
  spike, it has no half-works failure mode.

### The Phase-0 audit, corrected against the code (2026-07-23)

The issue's own premises were wrong in two of three places; the read-only audit
is recorded here because it is the true starting state for any future work:

- **Kernel purity (uuid)** — *partially* done. `Parameter`/`SmartParameter` ids
  already default to `Uuid::nil()` with a determinism test. The one live impurity
  is `ModelId::mint()` → `Uuid::new_v4()`, reached from
  `decomposition::derive_child` — genuinely in the semantic path. Small
  mechanical fix (push the RNG to the caller/edge), standalone value for
  replay/undo.
- **Storage isolation** — *not* satisfied, contrary to the issue's own claim.
  `App.tsx` imports and branches between both backends; `AnalystPanel.tsx` hits
  `localStorage` directly. A contained `modelStore`-owned facade would fix it.
  Standalone win.
- **Ops vocabulary** — *not* satisfied (`modelStore.ts` still blob-puts).
  Correctly gated behind editing-surface work; SL (#82, closed) exists but is not
  wired as the mutation vocabulary.

### The autosave policy tiers, recorded here because tier 3 is native to this world

From Shingai's field question, 2026-07-21, after walking the #111 fix — *"the
door's save-on-decompose is really useful, and I'm questioning if decompose is the
right place to put it; is there a more logical higher level?"* Stated as policy
rather than accreted fixes:

1. **Door save = referential integrity, not autosave** — writing a `decomposes`
   reference into a model obligates persisting both ends. Stays at the door
   permanently.
2. **Navigation-boundary autosave = the current policy**, now uniformly
   implemented (breadcrumb exits since #108; all 7 walk-reset paths since #113):
   crossing any document boundary persists what you are leaving. This is the
   "higher level" the field instinct pointed at — the system reached it via three
   fixes; this states it as the principle.
3. **Continuous autosave** (every edit persists; the dirty flag disappears) is
   **deliberately parked**. The blocker is structural: the library is
   put-overwrite with no version history, so continuous autosave makes *exploring
   = editing* — idle drags silently rewrite saved models with no way back.
   Versioning-as-substrate is native to the kernel-in-the-database direction; if
   realtime is ever unparked, tier 3 is a design input, not an afterthought.

### Unpark trigger — LIVE, and the best-written one on the board

> A **named second person** needs to edit a **named specific model**
> concurrently — or a hosted multi-viewer demo becomes a **required deliverable
> for a specific audience on a specific date**. The resident co-author (#10)
> becoming real enough to need server-side write gating also counts.

Until one of those blanks is filled, this stays parked. If it fires, **open a
fresh issue for the requirement — not for the vendor.**

### Why it was closed rather than left open

The decision was made 2026-07-24; the board still said "SpacetimeDB as shared
authority" and said it as an **open** issue. To an outside reader that reads as an
open intention to adopt a BSL-licensed vendor — the exact reputational cost the
decision was made to avoid. The decision was right; the board was wrong.

One arm's closing observation, worth keeping: **#88 as written already
demonstrates the architectural judgment a build would demonstrate — at zero
engineering cost. The design is the artifact.**

---

<a id="i105"></a>
## #105 — Constellation authoring: the library as a systems-of-systems instrument

*Opened 2026-07-20 · a future epic whose stated gate has already opened.*

### The trigger has already fired — this needs restating, not parking

The issue gates itself on *"Nothing here starts until the current issue-closing
sweep and the #89 dependency ladder are done"* and *"Once #89 ships…"*. **#89
closed 2026-07-21.** So the gate is open and the issue was parked anyway, on a
different and unstated basis: that the epic is large, unstarted, and not yet
demanded by usage.

That is a defensible reason to not do it. It is not the reason written down. The
honest restatement, adopted here:

> The #89 gate is open. The epic is deferred on **demand**, not on dependency:
> it waits until the constellation scale actually arrives in usage — enough
> linked models that the flat library becomes the thing in the way.

Recording this matters beyond bookkeeping. A trigger that has fired and was not
honoured is indistinguishable, six months later, from a trigger that was wrong.

### What the epic is

Post-#89 the unit of authorship stops being a file and becomes a **constellation
of flat models linked by `decomposes` references**. Every level stays one clean SL
paragraph; hierarchy lives in the edges between documents — Mobus's own
presentation, recursion in the index scheme, never on the page. The epic is the
tooling that makes authoring at that scale elegant, for humans and LLM co-authors
alike: models of models, managed beautifully.

**The four surfaces:**

1. **Library as map.** Post-#89 the library is a graph — models as nodes,
   references as edges. Browsing should read like a map of your
   systems-of-systems: roots, shared interiors, orphans nothing references. (Reuse
   — one child decomposing two matching components — is a recorded open design
   decision; the map is where it would become visible.)
2. **Seam health as ambient status.** Every reference edge carries a boundary
   contract (β) that holds, fails, or is unresolved. The library shows it — green
   seam / broken seam / missing referent — the constellation-scale analog of the
   per-canvas residue register: *nothing partial is ever silent*. Because
   contracts are checkable per pair (foundations doc §3), this is O(edges) with no
   global pass — the math is why the tooling stays simple.
3. **Navigation as reading.** Enter/exit plus breadcrumbs is the floor. The
   art-form version: a tour through the tree reads like Mobus's book — one
   paragraph per level, the index carrying you. Candidate: a tiny declarative
   manifest paragraph (root model plus its tree) in SL's own style.
4. **Per-level context as the LLM contract.** A co-author working on one level
   needs exactly one flat paragraph plus its contract terminals — never the whole
   tree. Flat-per-level is what makes each level fit a small local model's context
   window: the 12B floor and Option B are secretly the same design decision.

Relations as filed: #89 (the mechanism; steps 4/5a/5b are prerequisites, not
parts), #100 (residue register — surface 2 is its constellation-scale sibling),
#10 (resident co-author — surface 4 is its context contract), #12
(usage-seeded vocabulary), #88 (a shared library *is* the multiplayer
constellation). Vault: `operations/sessions/2026-07-20/references/sl-joy-design-seeds.md`
(lever 7).

### The field note that sharpened it

Shingai, 2026-07-21, first live walk day — the library-flattening problem arrived
on day one of real decomposition use. Every child created by the door lands as a
top-level peer on the home screen:

> "In one sense this is logical, and it seems to be proof that the
> systems-of-systems vision is emerging — and yet there's something about intent
> and purpose that is missing. I want to navigate by system of interest, not a
> sprawling screen of every subsystem I've ever created."

The frame that follows: the landing surface should be organized by **intent**
(choose an SOI, walk down), not **inventory** (all models flat). **SOI vs
subsystem is the load-bearing distinction.**

### The near-term slice shipped — this is not all unbuilt

PR #119, merged 2026-07-21. The library and Switch menu render the
reference-graph tree: root SOIs as cards, children nested beneath with
connectors, recursive to any depth; "pick your SOI" = pick a card. Cycles,
self-references and corrupt records are handled; parents with unresolvable
referents get a quiet "*n* referents missing" meta note. Pure read-side — the
store already held every `decomposes` reference, so the referenced-as-child set
is computed at library-list time. No schema change, no new metadata.

**One honest deviation, and it is a finding, not a shortfall.** The spec'd orphan
badge (a child whose parent was deleted) is **unimplementable read-side**: the
parent's refs are the *only* record of the relationship, so an ex-child is
graph-indistinguishable from a hand-authored root. Doctrinally that is consistent
— *SOI-ness is a reading*, so unreferenced ⇒ root. A true badge would need stored
parentage, which is write-side metadata the field note forbade. If ever wanted,
that is a deliberate rider on the epic, not a bug. Shared children currently show
under their newest parent only; multi-parent rendering belongs to the epic's map
surface.

The same caveat governs the real design: a model can be a child today and
promoted tomorrow (#89's promotion rider), so SOI-ness is a reading, not an
intrinsic property. That fits the lens doctrine exactly.

### Status

The near-term slice is **shipped**. The epic — the four constellation-authoring
surfaces — is **unbuilt**, and confirmed so: no library-as-graph map, no
seam-health surface. Deferred on demand, per the restatement above.

---

<a id="i121"></a>
## #121 — RA bridge: ensemble dataset export and the independent-study toolchain

*Opened 2026-07-21 · a plan, subsumed as a consumer of [#172](#i172).*

### What it is

Make lenses/compose the data generator and companion instrument for the Fall 2026
Joslyn independent study (*"Parts and Wholes in Complex Multivariate Systems:
From GSPS to Causal Models"*) and, more durably, give BERT a Reconstructability
Analysis bridge. Plan: halcyonic vault,
`strategy/phd/joslyn-ra-independent-study-plan.md`.

**The core capability — RA-ready ensemble export.** Given an authored model,
generate a multivariate categorical dataset with known ground-truth structure:

1. **Ensemble sampling, not trajectory sampling.** N independent bert-compose
   runs with exogenous inputs/parameters drawn from documented distributions;
   record designated variables at steady state (or a fixed horizon); one row per
   run, giving iid-ish rows — which is what RA's sampling frame assumes.
2. **Discretization by design.** Variable state cardinalities (3–5 levels) chosen
   in the generator config, not binned post hoc.
3. **Provenance bundle.** Seeds, generator version, model JSON hash and sampling
   config exported alongside the data (CSV/parquet plus metadata) —
   reproducible and pre-registerable.
4. **A graded difficulty series as the fixture set** (primitive-test-models discipline):
   (a) deterministic decomposable; (b) noisy decomposable; (c) synergistic
   coupling (parity/XOR — pairwise methods must fail); (d) nested/hierarchical
   decomposition; (e) a minimal pair with identical pairwise margins and
   different higher-order structure.

**Toolchain wiring**, thin and notebook-level, not deep integrations: **dit**
(James/Crutchfield discrete information theory) for entropies, co-information,
O-information, PID; **PyOCCAM**, with the export format compatible with its input
so the round trip asks "does RA recover the authored decomposition?";
**HyperNetX** (PNNL) to render candidate structure hypotheses and RA lattice
neighborhoods as hypergraphs; **marimo notebook templates**, one per difficulty tier,
following the finite-toy → compute → name-the-concept → positive-check plus
negative-control format.

**Why it is lenses-native, not a side quest.** The round trip is the first
empirical test of the two-faces loop: lenses authors structure → compose generates
behavior → RA (the epistemic inverse) recovers structure → score against ground
truth. **Reconstruction error = lens fidelity, measured.** Scope guard: learning
instrument first — a CLI/script plus notebooks is enough, no UI work implied.

### The feasibility check, and what it changed (2026-07-21)

Checked against bert-compose. The headless engine already exists (`circuit.rs`,
UI-free; operational gate plus 30-tick conservation proven in tests since 7/09),
and the Troncale sweep is an in-repo precedent for programmatic headless runs with
artifact emission — ensemble export is *"sweep, but emitting rows."* Two
refinements came out of it:

1. **A hierarchy tier without nesting.** Build holarchy as weakly-coupled
   clusters in flat wiring — dense intra-cluster, thin inter-cluster flows.
   Near-decomposability constructed per Simon's actual definition; dial the
   inter-cluster coupling to trace where RA recovery breaks. The limitation
   becomes the best experiment in the series.
2. **A two-generator strategy.** (a) compose-dynamical ensembles for the
   realistic rungs — conservation-faithful, the two-faces-loop story; (b) direct
   structural sampling from the authored BERT coupling graph — SCM-style,
   exogenous draws pushed through typed couplings, parity where needed,
   controlled noise — for the logical rungs. XOR/synergy fights compose's
   continuous physics, and structural sampling matches the causal-discovery
   benchmark idiom anyway. Both generators share kernel-validated ground truth.

### Why it closed

**Subsumed as a consumer of [#172](#i172)**, the neutral-interchange epic. The
ensemble dataset export rides on the interchange's `trajectory`/`entities`
serialization rather than a bespoke pipeline; the RA-specific toolchain is then a
thin adapter over it.

### Trigger — named, but it cannot fire on its own

The stated condition is *"parked until #172 provides the export substrate."* That
is a real trigger with a real subject, but #172 is itself parked with **no**
trigger, so this one is conditioned on something nothing will start. Two things
would move it: #172 being scheduled, or the Fall 2026 independent study arriving
with a date, at which point the bespoke pipeline is worth revisiting on its own
merits rather than waiting for the general substrate.

---

<a id="i125"></a>
## #125 — Put the two-reader fork in the README's first screenful

*Opened 2026-07-21 · **approved by @rsthornton**, then parked · **done** in the
change that created this file.*

### The approved-then-parked problem, stated honestly

The body carries *"approved by @rsthornton"* and the issue was then parked with no
trigger. An approved-then-parked issue is **neither a decision nor a plan** — it
has the authority of the first and the schedule of the second, and reads as
either depending on which line you stop at. Three issues were in this state
(#125, #126, #127). Recording it is the point: the state was reached by drift, not
by a call.

### The finding

The README's newcomer-vs-auditor framing (*"Who this is for"*) is its best
structural idea, and it arrived **after** the dense material. By line 27 a
first-time reader had met "K≅2", "Id-functor over ℝⁿ stocks" and three
philosophers' names; the fork sat at line 93, after four Lean identifiers
(`toKlir`, `toBunge`/`HasBond`, `toMobus`/`Irreflexive`, `toMobus_toBunge`) and a
category-theoretic claim. **Density before orientation.**

Proposed order: **value proposition → audience → mechanics → theory.** The *what*
and the *why-not-something-else* already landed by line 29 and are the strongest
part of the document, so the fork belongs immediately after.

Acceptance as written: a newcomer can pick their path without scrolling; **no
claims weakened or removed — rigor reordered, not diluted.**

The second half of the proposal — *a light shorter-declaratives pass on the
newcomer-facing sections only (README top and `docs/quickstart.md`), several
paragraphs currently packing three qualified claims into one sentence, with full
nuance staying in `theory-fidelity.md` where the auditor already goes* — is
**not** done. It is a real observation and is left here rather than carried
forward as a task; do it opportunistically when next editing those sections.

Provenance: proposed by the Buzz agent team (Fizz/Honey/Bumble) from a doc review
session, 2026-07-21.

### Status

The fork now sits immediately after the three-bullet value proposition, before
the Lean identifiers. **No unpark trigger — retired.**

---

<a id="i126"></a>
## #126 — Illustrated quickstart: annotated screenshots, refusal front and centre

*Opened 2026-07-21 · **approved by @rsthornton**, then parked · unbuilt.*

### The finding

bert-lenses is a **visual instrument whose quickstart is text-only**. The
product's core idea — a verdict panel refusing loudly and citing the formal
precondition it rests on — is conveyed only in prose, and no paragraph
communicates it as fast as one annotated image.

The proposal: 3–4 annotated figures in `docs/quickstart.md` covering the core
loop — (1) author `fixtures/sl/bathtub.sl`; (2) the canvas render; (3) **a
verdict panel citing a failed precondition — the money shot**; (4) the fix, and a
passing verdict or run.

Acceptance as written: the quickstart *shows*, not just tells, at least one
refusal and one passing verdict; and the stale #80 references in README and
quickstart are updated or removed.

### What was true when it was filed, and what changed

The quickstart deferred illustration to **#80**, which closed 2026-07-20 without
the walkthrough shipping — so the gap was untracked and the #80 pointers in README
and quickstart were stale. **That half is now fixed**: the stale pointers were
corrected in the change that created this file, and the quickstart no longer
defers to a closed issue. The figures themselves remain unbuilt.

This is the same approved-then-parked state as [#125](#i125) — see there for why
that state is worth naming.

Provenance: proposed by the Buzz agent team (Fizz/Honey/Bumble), 2026-07-21.

### Status

Unbuilt, no trigger. The obvious moment to do it is the next time the quickstart
is walked end to end on a real machine — the screenshots are a by-product of that
walk, not a separate project.

---

<a id="i127"></a>
## #127 — Symbol-anchored citations and issue-link liveness in `doc_lint`

*Opened 2026-07-21 · **approved and rescoped onto `doc_lint` by @rsthornton**,
then parked · partly overtaken by later work.*

### The finding

Doc citations drift. A spot-check of `docs/theory-fidelity.md` found the **claims
hold but the `file:line` pointers lag the code** — `validate_mode` cited at
123–146, since moved to ~254 in `crates/bert-core/src/validate.rs`. Separately,
README and quickstart still pointed at **#80**, which was closed: the same
disease, second symptom.

The proposal was to **extend the existing gate** — `scripts/doc_lint.py`, already
run by `just check` and CI — with two detectors, and explicitly *no new parallel
script*:

1. **Symbol-anchored citations.** Citations name a symbol (e.g.
   `validate.rs::validate_mode`); the lint fails only if the symbol is gone from
   the cited file. No line-number fuzz window, so zero false positives from
   routine code motion, while still catching real rot. Requires a one-time
   migration of existing `file:line` cites to symbol anchors.
2. **Issue-link liveness.** Flag references to closed issues in the scanned docs
   — via `gh`/API lookup or a committed issue-state snapshot, whichever fits CI.

Scope as filed: `docs/theory-fidelity.md`, `docs/kernel-architecture.md`,
`README.md`, `docs/quickstart.md`. Acceptance: current docs pass after the
one-time citation migration; a removed symbol, or a newly-closed referenced issue,
fails `just check`.

Provenance: Buzz agent team — drift found by Bumble, stale-issue links by Honey,
2026-07-21.

### What has since overtaken part of it

The cross-repo half of the citation problem was solved differently and better.
`docs/lean-provenance.md` plus `docs/lean-manifest.json` anchor every SSF citation
**by declaration name and Lean kind**, generated rather than hand-written, with
Gate A resolving them at the pin and Gate B against SSF HEAD. That is
symbol-anchoring for the citations that cross a repo boundary — the ones where a
line number is, in `theory-fidelity.md`'s own phrase, *"a coincidence with a
timestamp."*

What is **not** covered is the in-repo half: `docs/*.md` citing
`crates/**/*.rs` by `file:line`. Those still rot silently, and the
`validate_mode` example is still the live instance.

The issue-link-liveness half is untouched, and the #80 sweep in this change is the
manual version of it — done by hand this time.

### Why it closed without a trigger, and what a real one would look like

Issue #234 observes that #127 documents a risk and then disables the reminder.
The durable fix for the citation-drift class is the generated provenance manifest,
and **Gate B failing is the natural trigger** — that is the moment a citation
demonstrably stopped resolving. That is a trigger for the *cross-repo* half,
which is already built; it does not cover in-repo `file:line` cites.

For those, the honest statement is: no trigger exists, and the cheap version is
smaller than the issue proposed — a `path.rs:NNN` line-number citation in a LIVE
doc could simply be **banned in favour of a symbol name**, checkable with the same
machinery `doc_lint` already uses for the status carrier. That is a candidate, not
a decision.

---

<a id="i144"></a>
## #144 — Formalizing the system life cycle: finishing Mobus's unfinished paper

*Opened 2026-07-23 · research position with findings against a published paper ·
the largest entry here, and the least compressible.*

### What it is

Picking back up a thread that ran 2025-02 → 2026-05 and stopped: formalizing the
system life cycle, and finishing George Mobus's unfinished paper **with him**.
Parked deliberately as post-sweep work, and filed at the time because *"the
research is done and the findings are perishable if they stay in a session log."*

The design docs landed in `c5fda0b`:
[`design/mobus-lifecycle-formalization.md`](design/mobus-lifecycle-formalization.md)
(the position) and
[`design/lifecycle-prior-art.md`](design/lifecycle-prior-art.md) (consolidated
prior art, corrected). Subordinate to #86 (the adopted dynamics position), which
it **amends in nothing** — it lands in a cell that document already names.

**The situation.** Mobus's paper revises the 7-tuple to the 8-tuple — the repo's
semantic authority for that tuple is `Tuple.lean`, not the book's printed form,
per the terminology concordance — then opens a life-cycle extension it does not
finish: `S_{t+1} = S_t ∪ ⟨ΔS⟩`, four operators
sketched, **and five stage headers with nothing under them.** He appears to have
been waiting on the formalization. Two things have changed since: the Lean 8-tuple
exists, and #86 settled what counts as dynamics.

### The thesis

> **F(S) = F_coh(S) ∩ F_φ(S)**
>
> `F_coh` is **derivable** — the set of changes yielding a well-formed 8-tuple is
> fully determined by the coherence fields of `MobusSystem`. Nothing is chosen;
> the type is the specification.
>
> `F_φ` (phase constraints) is **stipulated**, and every arbitrary threshold in
> the informal treatment lives there.

The derivable/stipulated boundary *is* the principled/arbitrary boundary. It gives
the empty stage sections an organizing distinction, and gives Lean a job prose
cannot do: force stipulations to appear as explicit hypotheses rather than
dissolve into a bullet list.

### The five findings against the paper, each with the line that licenses it

1. **Union cannot express three of his own five stages.** `∪` is monotone;
   Decline and Dissolution require removal. His own `ΔB = ⟨B \ {b_k}, …⟩` uses set
   difference three lines later. **The stages section is empty because the
   equation preceding it cannot reach them.** The obvious add/remove patch
   *provably fails* on his own `replaceInterface` (atomic — as add-then-remove it
   passes through a tuple violating `interfaces_sub`) and on his own capacity
   modification (a relabel, neither add nor remove). The repair is structural:
   replace `∪` with operator application, deletion as a first-class constructor.
2. **His one asymmetry claim is one of three.** `ΔC ⟹ ΔN` is a theorem,
   essentially definitional — forced by his own Eq. 4.4 from 2022. The
   constraints generate a three-way taxonomy by *logical shape*: **equality**
   forces unconditionally (`network_components`); **subset** forces conditionally
   (`interfaces_sub` → ΔC ⟹ ΔB, `externalFlows_nodes` → ΔB ⟹ ΔG — neither stated
   by him); **disjointness** forces nothing (`disjoint` is a legality
   precondition, not a consequence).
3. **Origination is threshold-free.** `MobusSystem` admits a composition-empty
   pre-system; `ConcreteSystem` requires `bondage_nonempty` and `toBunge` demands
   a nonempty edge set. So **Origination is exactly the tick at which the Bunge
   bridge becomes definable**, Dissolution its dual. Two of the five empty
   sections filled with no free parameters — `F_coh` doing work `F_φ` was being
   asked to do.
4. **ΔT and ΔH presuppose what the 8-tuple does not assert.** `transforms : τ` is
   opaque carried data; there is no `∪` on `τ`.
5. **Precondition catalogue** — his informal operators omit legality conditions
   entirely.

### Sequencing (both increments outstanding)

**Increment 1 — self-contained, and it is the entire paper contribution.**
Forced-change taxonomy, non-reciprocity witness, stage predicates,
`originates_iff_bunge_definable`. Depends only on `Tuple.lean`; **does not require
`apply`.**

**Increment 2.** Primitive operators, `F_coh`, `apply` (hard: the
`removeComponent` B/G repair cascade), an ordered `List Δ` — the primitives do not
commute, so the informal `P(ΔS)` cannot name a transition — and `reach_semigroup`,
Kleisli composition in the powerset monad, discharging #86's Mesarovic–Takahara
acceptance test.

**Dynamics typing, no amendment to #86:** axis B = bare set · axis C = `P(X)`, the
powerset functor (a discrete inclusion *is* the `P(X)` kind, already listed) ·
axis D = no declared invariants, correct, since with no additive carrier
conservation is not expressible · axis E = generative. Adjacent: #112 (universal
coalgebra), #67 (FSA/Markov).

**Explicitly not doing:** ΔT/ΔH (blocked on τ-refinement, scheduled separately in
#86); a symmetric operator suite over all seven Δ-components; the phase constraint
sets as written — importing "optimal" / "higher rate" / "rapid" into Lean as
opaque predicates *looks* rigorous and is **worse than prose**; a five-stage
partition theorem, which is false, since stages are interval predicates and a
trajectory may satisfy none, some, or several in alternation; numeric life-cycle
shapes; fitness-directed decline (that is `Evolution.lean`'s territory).

### The architecture pass, and three corrections it forced (`860efc7`)

**Verdict: a bert-lenses extension** — not compose, not a third face, not a kernel
change.

- **The decisive evidence against "structure is just more state" is empirical.**
  bert-compose already meets structural change at runtime and its considered
  answer is to *destroy the history* — history rows are indexed by node count and
  cleared on topology change. Dragging a node onto a running canvas *is* ΔC, and
  the engine says "this is a different system, start over." Corroborated by this
  repo already listing carrier-shape change as explicitly out of scope, and by
  compose's own sweep bucket for "structural, not flow-dynamical."
- **Fixed: the Origination result built a tower.** *"Origination = the tick the
  Bunge bridge becomes definable"* defines a *Mobus-side* boundary via a
  *Bunge-side* precondition. `HasBond` and `Irreflexive` are independent, the mode
  poset is a meet-semilattice with no joins by design, and mode language must
  never be read as an ascending path. Re-stated as a theorem **about the bridge**,
  caveat attached. Still the best result here — *the pre-system is
  Mobus-representable and Bunge-inadmissible* is a real finding about where the
  lenses come apart — but it is a cross-lens claim and now says so.
- **Fixed: coherence is axis B, not "the structural conservation law."**
  Conservation is *declared*, optional and violable, hence a real-valued residual.
  Coherence is a Lean structure field that **cannot be violated, because a bad
  tuple does not typecheck**. As axis B, `f : X → P(X)` is coherence-preserving
  *by typing* — no ledger, no residual, free. And nothing obvious is conserved
  across a Δ; the slot is reported empty rather than filled.
- **Corrected: "Bunge and Klir are static, Mobus extends them" is false**, and
  refuted by citations in this repo. Klir's metasystem is precisely the apparatus
  for structural change, excluded by a *named scope decision*; Bunge's qualitative
  change is a *deliberate drop*. So this is where all three traditions have an
  account and the formalization has taken none — which makes structural change
  **the next real test of K≅2**, a stronger test than anything the static core has
  faced. Hard rule: **the delta renders in all three vocabularies or it does not
  ship.**

### The first increment is narrower than the sequencing above

**A typed structural diff between two models already in the library.** No sequence
metadata, no schema change, no SL syntax, no stage vocabulary, no run
integration, no H. Seam: `StructuralDelta` in `transition.rs` as a sibling to
`LossWitness` over `CanvasModel`s; coherence-preservation joining the `check_*`
family in `validate.rs`; rendered through `describe()` in all three vocabularies.

**What it teaches, and why it goes first.** `ΔC = ⟨C ∪ c_new⟩` presupposes you can
say which `c` at *t+1* **is** which `c` at *t*. In Lean that is free (`Set α`, α
stable by assumption); **in the tool it is not** — ids are renumbered on
canonicalization and names are author-editable, so *"renamed a component"* and
*"deleted one, added another"* are the same diff. If the diff is stable on two
real saved versions, everything downstream is buildable. If it drowns in renames,
**Mobus's ΔS algebra has an unsolved identity problem at its base and we learned
it in days rather than a quarter.** Publishable either way.

Validate it free against the corpus: Klir's four paradigms and Bunge's three
structures are ΔN with ΔC = ∅ — the degenerate case, two traditions, known-correct
answers. **But that rhyme is a pun in modality**: those are *alternatives* (what a
composition admits), a life cycle is a *succession*. Identical diff, opposite
semantics. Relation kind must be author-declared — `variant-of` / `revision-of` /
`succeeds` — which also stops a typo fix from reporting a life-cycle event.

**The git test:** without stage semantics ΔS *is* `git diff`. The three things git
does not give are typing by tuple coordinate, checking against the constraints,
and readability in three traditions. Deliver all three or use git.

**Hard line:** none of this reaches `circuit.rs`. A life-cycle step drives a run
only as a metasystem replacement — stop φ₁, re-base, start φ₂, discontinuity
witnessed — never as mutation inside the stepping loop.

### The paper plan, and how it is presented to George

The paper plan lives in SSF, not here — this is a formalization paper, and
`Tuple.lean` and the closure theorem live there:
`systems-science-foundations/docs/paper/mobus-lifecycle-paper-plan.md`.
Provenance: synthesized winner of a blind model bake-off, 2026-07-24 (halcyonic
vault `operations/calibration/blind-pick-ledger.md`) — three models answered the
identical framing brief blind, ranked without provenance.

- **Spine = closure under lawful change.** Central theorem, machine-checked:
  `S ⊨ WF ∧ S' ∈ F(S) ⟹ S' ⊨ WF`. The typed relations are the `WF` predicate;
  Veliov's `ΔS ∈ F(S)` is the admissibility relation; their composition fills the
  five empty stage sections. **Neither horn** — not the elegant-accounting win
  (static, footnote-grade), not defect-and-repair (adversarial to a senior
  co-author).
- **Generous reading of ∪:** union is `F` restricted to the Growth regime — a
  special case, not an error. His own `ΔB` already uses set difference; the repair
  recovers his intent.
- **Scope:** §2 WellFormed tuple / §3 `∈ F` replaces ∪ / §4 closure theorem / §5
  the five stages as constraints on `F` (the deliverable) / Lean in an appendix.
  **`F_φ` deferred to the sequel**, consistent with the `F = F_coh ∩ F_φ` split:
  paper 1 ships `F_coh` (derivable) plus the stages structurally; `F_φ` (the
  stipulated φ machinery) is the dynamics follow-up. Also cut: `V_min`/`V_opt`
  (hand to Aubin viability theory as the sequel's thesis), history/adaptrode (keep
  `H` opaque, require only that `F` may depend on `H`), BERT (one line). **George
  first author.**
- **Presentation:** send the five written sections plus a 2-page cover memo — not
  the Lean, not a full draft. Two-beat opener: his Milieu "you were right"
  membership quote, then the `ΔB` closure catch. Quote his Knowledge/History note
  back as prose-`F(S)`. Lean mentioned once. Send inside two weeks. Contingency:
  **die on closure, not on the Veliov citation.**

### Status correction — the closure theorem landed, and four points went stale

SSF #30 / PR #34 merged 2026-07-25 (`8e2f5fa`). `Systems/Mobus/Lifecycle.lean`,
zero `sorry`, CI green.

**What landed is NOT Increment 1.** Increment 1's deliverables — forced-change
taxonomy, non-reciprocity witness, stage predicates,
`originates_iff_bunge_definable` — were **none of them built**. What landed is the
closure theorem and its scaffolding: `wellFormed_of_reaches` (well-formedness
persists along a trajectory of any length); `PreTuple`/`WellFormed` (the tuple as
raw data with the coherence constraints reified as a predicate); adequacy both
ways — `wellFormed_toPre` (no stronger than the type), `toMobus`/`toPre_toMobus`
(no weaker); and `additive_components_monotone`, `growthStep_additive`,
`step_not_additive` (the ∪ monotonicity argument plus a non-vacuity witness).
Overlapping motivation, disjoint deliverables. **Increments 1 and 2 remain fully
outstanding.**

Four corrections to the body above:

1. **"Five coherence fields" is now six.** SSF #31 added `interfaces_carry_flow`
   (every interface must carry an external flow — the converse of `bipartite`,
   which only ever quantified over edges). Load-bearing, not cosmetic: the thesis
   `F_coh` is *derivable from the coherence fields*, so **the field set is the
   specification**, and any `F_coh` derived against five fields is now
   under-constrained.
2. **"The repo has never constructed a `MobusSystem`" is partly discharged.**
   `PreTuple.toMobus` builds one from any well-formed `PreTuple`, discharging all
   six coherence fields, and `witness` is a concrete instance (two components, one
   internal flow). The cost note stands for a *derived* tuple from an operator
   application; it no longer stands in general.
3. **The `∪` finding is now a theorem, and more generous than the body puts it.**
   `additive_components_monotone`: under *any* additive regime, no trajectory of
   any length ever loses a component — so Decline and Dissolution are
   **unreachable**, not merely awkward. But `growthStep_additive` gives the
   reading to actually use with George: **union is not wrong, it is `F` restricted
   to the Growth regime**, and his own `ΔB` already used set difference. Frame it
   as his notation having been ahead of his master equation.
4. **The derivable/stipulated boundary got an unplanned datapoint.** #31 landed
   while the closure work was in progress; on rebase the file stopped compiling at
   `toMobus` **and nowhere else**, because `WellFormed` no longer matched the type.
   `wellFormed_toPre` kept compiling — a weaker predicate of a strengthened
   structure still is one — so the "no stronger" direction is **structurally blind
   to that drift**. Two-way adequacy is what couples a reified predicate to a type
   someone else is still editing. Any `F_coh` reification in Increment 2 needs the
   same, or it rots silently while passing `#print axioms`.

### A limitation this issue predicted, and which the merged work has

Finding 1 warns that an add/remove patch *"provably fails on his own
`replaceInterface`."* **`Step` has exactly that shape**, and its `decline` side
condition `a ∉ p.interfaces` is precisely the dodge. So `replaceInterface` —
Mobus's own operator — **is not expressible as a `Step` sequence**, and neither is
anything else atomic that transits an ill-formed intermediate. Also out: interface
removal (needs external-flow retraction as a second edit) and
Dissolution-as-terminal. Reachable today: **Growth, Decline**; Maturity near-free.
Formation is newly *expressible* (reification supplies the not-yet-a-system to
form from) but nothing about it is proved. **§5 must not claim more than this.**

### Owed to George, and routed internally

- **His H insight is the direction we took**: *"the history of the system
  represents the knowledge of the system's possible states and trajectories, that
  is probable state transitions."* He described a set-valued transition structure
  in prose before the formalism was chosen. **Cite as his.**
- **His adaptrode/EWMA history mechanism is unintegrated** — multi-timescale tacit
  memory, periodically sampled to trace the history of the life cycle.
  Architecturally different from our settled H position, and from his own.
  Honouring the contribution means addressing it, not routing around it.
- **Route internally, not to Mobus:** two defects in `bert` docs, both predating
  #86 and unreconciled with it — the φ-definition inconsistency in
  `lifecycle-dynamics.md` (φ cannot be both a total function of the state and
  dependent on the previous phase; fix by carrying the phase, `PhasedSystem :=
  MobusSystem × Fin 5`), and `h-element-theory.md`'s
  `T(t+1) = f(T(t), H(t), Input(t))`, which #86 forbids — if T reads H the
  semigroup axiom fails.

### Status

No unpark trigger, and it does not need one: **the live work is the paper, and it
lives in SSF.** That plan's gate was "only results that are done or directly
entailed"; §4 was the unmet one and is now met, so **the next move is drafting §5,
not more formalization.** The Increment 1/2 work is deliberately *after* George has
the paper. If it resumes, it resumes as a bert-lenses extension per the
architecture pass, starting from the typed structural diff.

---

<a id="i150"></a>
## #150 — Rung 3: the extraction theorem (Aeneas-translated gates proved against the Lean preconditions)

*Opened 2026-07-23, split out of #24 · the last of that issue's series still
open, and the only part that is a fidelity upgrade rather than a performance
escape hatch.*

### What it is

Aeneas-translate the Rust mode gates and prove `extracted_gate ⟺
named_precondition` in Lean.

Today the binding is **falsifiable in both directions** — the Lean-emitted truth
table and the live oracle would both catch drift as a CI regression
([`../spec/LENS_ENTRY_SPEC.md`](../spec/LENS_ENTRY_SPEC.md) §D,
[`lean-provenance.md`](lean-provenance.md)). But it is still a **correspondence
checked on vectors**, not a proof about the shipped code. Rung 3 would retire the
hand-mirroring in §C's mapping table by making the shipped Rust *the proved
object*.

**Feasibility is favourable**: the gates are pure predicates over `(T, R)` —
exactly the fragment Aeneas handles.

### The decision that closed Rung 2

**Rung 2 (embedded oracle) is decided: not adopted.** The recorded rule was "only
if oracle latency bites." Measured 2026-07-21 — the full 365-model corpus is one
batched subprocess call, ~30 ms of oracle process time, 0.29 s total test wall
time. **Re-open only if call volume grows orders of magnitude**, e.g. per-model
property tests replacing the batched corpus. That is a live, named condition, and
it belongs to Rung 2, not to Rung 3.

### Two open decisions, before any work starts

1. **Where do the extracted Lean artifacts and theorems live?** SSF, or a Lake
   package inside this repo? A real fork: SSF keeps all Lean in one place and one
   toolchain but couples this repo's CI to an external pin; a local Lake package
   inverts both.
2. **Toolchain pinning.** Charon/Aeneas/Lean version drift is the pipeline's
   *documented* failure mode. Pin hard, and decide who owns the bump.

### The status quo is honest without this

Worth stating so the entry does not read as a gap: Rungs 1 and 1.5 already give
two-sided falsifiability, and `spec/LENS_ENTRY_SPEC.md` §C presents the mapping as
**hand-mirrored rather than proved**. **Nothing currently overclaims.** This work
would remove the hand-mirroring; it does not fix a misstatement.

Provenance complement: #128, [`lean-provenance.md`](lean-provenance.md).

### Status

No unpark trigger. The two open decisions above are the real gate — either would
have to be settled before an hour of work is worth spending, and neither is
urgent while the two-sided falsifiability holds.

---

<a id="i166"></a>
## #166 — External↔external flows render as non-interactive unlabeled stubs

*Opened 2026-07-24 · a bug-shaped finding whose fix is an unresolved design
question.*

### What was observed

In `predator-prey` (declared `Concrete/Biological`), the flow `Sunlight -> Grass`
— a source → environment flow, **both endpoints outside the boundary** — renders
as a dashed, `pointer-events: none`, **label-less** stub. It cannot be selected,
unlike every flow that touches the boundary.

Confirmed by live DOM inspection of the rendered canvas: `predation`
(internal→internal), `grazing` (environment→internal) and `mortality`
(internal→environment) each render a first-class edge — a clickable hit path
(`pointer-events: auto`) **and** a rendered label. `photosynthesis`
(`Sunlight → Grass`, external→external) has **no label rendered at all** and is
one of three dashed `pointer-events: none` paths. Not a missed hit-target — it is
**degraded by construction**.

### Root cause

Edge classification is **boundary-relative** — endo / exo / bond / self-loop
(`edgeFactById` in `Canvas.tsx`, kernel edge facts). A flow whose **both**
endpoints are external has no boundary relationship to anchor to, so `EdgeView`
falls through to a non-interactive dashed stub instead of a first-class edge. The
renderer also routes it toward the boundary before degrading (observed: solid
Sunlight→boundary, then dashed toward Grass).

### Why it matters

The underlying **tuple and formalism permit environment↔environment relations** —
the flow is well-formed and the model **compiles clean** (`✓ clean`, zero faults).
The lens just cannot draw it. Motivating cases: feedback loops among environment
objects (wanted in earlier BERT), and systems-of-systems, where relationships
*between* external objects are exactly what you model. Right now the tool
**silently degrades** such a flow rather than rendering it first-class or flagging
it at author time.

### The Mobus-lens tension — the design question to resolve

Mobus centres a single concrete **system of interest**, with the environment as
sources and sinks: boundary conditions, not a place to trace internal mechanism.
Under that framing, mechanism *within* the environment (Sunlight→Grass) is
arguably out of frame. But it is **orthogonal to concrete-vs-conceptual** — the
concrete model trips it while the one Conceptual/Social model (`jung-functions`)
has zero external↔external flows — and the **general tuple does not forbid**
environment↔environment relations, which systems-of-systems genuinely need. So the
boundary-relative edge model is a **Mobus-lens simplification, not a formalism
limit.**

Three candidate semantics, one to be picked:

- (a) render external↔external as a first-class edge type (needed for
  systems-of-systems and environment feedback loops);
- (b) reject or warn at author time when a flow leaves the SOI frame;
- (c) keep it degraded but make it **explicit** — labelled and documented, never
  silent.

### Not systemic, and where the doctrine now lives

Only `predator-prey` among the 10 #14 sweep candidates has an external↔external
flow; every flow in the other nine touches at least one `component`. Low urgency.

The canonical **why** is recorded in
[`theory-fidelity.md`](theory-fidelity.md) → *The single system-of-interest scope
(Mobus lens) and the systems-of-systems seam*, plus an Honest-boundary-table row
(PR #167). This entry is the tracked **tool gap**; that section is the load-bearing
doctrine.

### Status

No unpark trigger. The doctrine is recorded and the tool behaviour is known and
documented; what remains is a semantics choice between (a), (b) and (c), which
wants a real systems-of-systems modelling need to decide it rather than an
argument.

---

<a id="i172"></a>
## #172 — The neutral interchange: CSV as a serialization of the kernel

*Opened 2026-07-24 · a parked epic, captured while the thinking was hot, to design
against.*

### What it is

A neutral data interchange that is a **serialization of the kernel** — `(T, R)`
plus the coalgebraic dynamics — with domain-legibility falling out of the lenses.
A small sheet family (**entities / relations / transitions / trajectory**),
grounded in Klir's epistemological hierarchy. Composition = gluing on shared
variables (cospan pushout). A first-class **Proven / Observed / Generated**
provenance trichotomy, per cell, that composes.

The spec and framing are the design doc:
[`design/neutral-interchange.md`](design/neutral-interchange.md), seeded
2026-07-24. Its core claim: the interchange is **not "CSV for a domain," it is a
serialization of the kernel** — everything domain-specific is a *lens over* that
serialization, so "legible across many domains" falls out for free. A domain
author reads and writes tables, the tool ingests them as a kernel object, and the
**lenses do the domain interpretation on ingest**. (Lineage: Cliff's point that a
pandas DataFrame is another view of Klir's things-and-relations — the same K≅2
discipline pushed down to the file format.)

### Why it is one epic and not many issues

It **consolidates**, and that consolidation is the finding:

- **Subsumes as consumers:** #67-thread-1 (model CSV round-trip) and
  [#121](#i121) (ensemble dataset export) are special cases of this general
  interchange.
- **Compose semantics live in #112** (universal coalgebra); the Baez cospan
  mapping feeds it.
- **[#166](#i166)** (env↔env, systems-of-systems) is the same "compose by shared
  variables" seam.
- **#67 lays the first brick** — the minimal transition round-trip the DTMC needs
  is forward-compatible with this.

### Deliberately out of scope — "the long conversation"

Exact schema; 3-vs-4 sheets; the tether refactor (subsume, do not extend); the
provenance UI grammar; the LLM ingest(Observed)/generate(Generated) discipline;
and how far to lean on decorated cospans versus a pragmatic first cut.

### Status

**Blocked on nothing; blocks nothing.** No unpark trigger, by its own text — it
was filed as a frame to design against, not as scheduled work. The design doc is
the durable artifact; this entry records that the consolidation call (four
issues become consumers of one interchange) was made deliberately.

---

<a id="i197"></a>
## #197 — Finish Mobus's illustrative models as executable examples

*Opened 2026-07-25 · explicitly filed as PARKED — recorded, not scheduled.*

### The idea

Mobus's models are **illustrative**. He never stamped them with his own
work-process primitives, never attached dynamics, never made them runnable — he
was teaching a method, not shipping executable models. Ch. 7 says so itself: each
analysis goes only *"sufficiently deep to give a good accounting of the first few
levels,"* and §7.5 is left to the reader as an exercise.

The corpus preserves that faithfully, and authoring `mobus/` (#191, #192) forced
the discipline explicitly: **no `primitive` on any ch. 7 component** — the taxonomy
is Mobus's, but he does not apply it there, and stamping it would have been our
reading, not his; one `gate: core` on the brain, because the source walks only the
afferent path; and an untyped disturbance flow on the HSS, because typing it would
be our commitment.

### The rule this established

> **The corpus holds what the source says. Examples hold what we say.**

Which is exactly what makes the work possible: the faithful transcription is
preserved *and* the finishing work has a legitimate home.

### The work, if unparked

A parallel set under `assets/examples/` — the same systems Mobus drew,
**finished**: primitives applied (what work process *is* the neuron's Σ? the
axonal hillock? the HSS's governance?), dynamics attached where the structure
supports it, and actually executable — run, not just drawn.

Each one would be a claim: *this is what Mobus's illustration becomes when you
carry it through.* **The diff between the corpus entry and its finished example is
itself the teaching artifact** — the same "one lesson by diff" device the Klir set
uses, but across the faithful/finished boundary instead of across structures.

### Why it is parked rather than scheduled

It is a **real program, not a task**: 5 models × (primitive assignment + dynamics
+ validation), each a genuine modelling judgment that wants Shingai's eye rather
than an agent's. It also gets easier as the dynamics work matures (#112 — the
typed transition, homogeneous composition). **Unparking is cheap; doing it badly
is not.**

### The companion, and the standard they share

The **build** half is this entry. The **consolidation** half is separate: running
the existing corpus through all three lenses and recording where they disagree —
the K≅2 cross-check, systematically. Different work, different outputs — one adds
dynamics to faithful structural models, the other crosses existing models between
traditions — so they are deliberately not bundled. They share a standard, recorded
in `assets/corpus/README.md`: **a model that cannot embarrass us is not testing
anything.**

Worth restating for this entry specifically, since it is the one that *adds* our
own reading: **the diffs between a corpus entry and its finished example are the
findings.** If finishing a model produces no surprise — no primitive that turns out
ambiguous, no dynamics that refuse to close, no invariant that fails — then either
the model was already complete or we finished it toward what the tool made
convenient. Both are worth noticing.

### Precondition for unparking (not a trigger)

The primitive assignments must be **defensible as *our* reading, stated as such,
and not smuggled back into the corpus.** That is a condition on doing it well, not
an event that fires. Related: #14 (the modeling target queue), #112 (dynamics),
#194 (corpus drift-gates, closed 2026-07-25).
