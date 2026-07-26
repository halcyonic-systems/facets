# Arc 2 — In-Lens Authoring: Design Spec

**Status: HISTORICAL.**

> **⚠ SUPERSEDED (2026-06-26 pivot).** This spec describes a *lists + GSR `generate()` +
> deterministic-spine* approach. We pivoted to a **direct-manipulation canvas** — see
> [`docs/canvas-architecture.md`](../canvas-architecture.md) for what was actually built. Kept for
> the still-useful ideas (deterministic spine, persistence/share, the Facets→bert-lenses
> reader→maker handoff) that inform the integration phase. The **faithful gradient** in §4 is
> current; the **UI/generation mechanism** sections are not what shipped.

Status: ~~design (build-ready)~~ **superseded by the canvas** · drafted 2026-06-24.

Arc 1 (read-only lens viewing over one stored kernel) shipped 2026-06-16. Arc 2 turns
the viewer into a **creation tool**: author a model *in a paradigm's vocabulary*, see it
through all three lenses at once, and keep the result. This doc is the spec the build
follows; it commits no code.

The four sections of the design map 1:1 onto the four findings from the Facets
daily-driver UX diagnosis (`operations/sessions/2026-06-24/facets-daily-driver-ux-reference.md`):
convergence panel, reader→maker bridge, one-input-many-views, persistence/share. Facets is
the *reasoning* front door; bert-lenses is the *authoring* surface. Same shape — one object,
many lenses, one kernel underneath — seen twice.

---

## 1. Context & the one-kernel discipline

The whole tool rests on one precision: **there is one kernel underneath, always.** "Build as
Klir / Bunge / Mobus" is not three model formats — it is one stored kernel you *populate*
through whichever vocabulary you prefer. That is why "translate my Klir model to Bunge" is a
faithful, well-defined operation and not a lossy reinterpretation: both are views of the same
object (`systems-science-foundations/Systems/Klir/ViewGeneration.lean`).

Dependency order is **view → author → translate**. Arc 1 proved the lens is a verified-faithful
window on the kernel; Arc 2 lets you author through that window. Authoring never changes what a
lens *is* — it changes what the kernel *contains*.

Framing discipline (from README): "one kernel, lenses as faithful **derived views**" — never
"derived core." The views are the derived layer; the kernel is logically prior.

---

## 2. The daily-driver flow

The spec is organized around one question: *what concrete flow makes this something to reach
for daily?* The reach-for-it trigger is **"I just hit a system — in a paper, a transcript, a
conversation, my own head — and I want to think about it rigorously across lenses and keep the
result."** The thing it beats is a blank doc or a whiteboard, and it wins on two counts:
live cross-tradition critique, and a persistent typed artifact.

The flow:

1. **Seed fast** (≤1 min to first object). New model → start blank, or hit **Co-create** and
   one-line the system so an LLM drafts the initial lists (§6). Low friction to *something on
   screen*.
2. **Refine in your lens.** Edit in whichever vocabulary matches your thinking — add a thing,
   draw a relation, mark a bond, type a flow. The UI speaks that thinker's language (§4).
3. **Watch it converge live.** As you edit, the kernel invariant + the *other two* lenses'
   projections + the `validate_mode` verdicts update in real time (§5). Authoring *becomes* a
   guided systems-thinking exercise — "this is an aggregate under Bunge until you add a bond."
4. **Keep & share.** Save the kernel server-side; get a resolvable link; reopen or fork later
   (§8). It accumulates into a library you own.

Steps 3 and 4 are what make it *daily* rather than once: step 3 is the "does something no other
tool does" hook, step 4 is the accumulation.

---

## 3. Architecture: the deterministic spine

**Generation runs in-process, offline, deterministically.** bert-lenses links the GSR generator
core, `bert-generator-core` (`general-systems-reasoner/core`), as a Rust **path-dependency** —
exactly the way `bert-core` is already consumed (`Cargo.toml`: `bert-core = { path = "../bert/bert-core" }`).
It then calls `generate()` directly. No server, no Python, no HTTP, no LLM in this path.

This is verified sovereign for **both** build targets:
- `bert-generator-core`'s only runtime deps are `serde` + `serde_json` (its `reqwest`/`tokio`
  are dev-dependencies, tests only).
- `core/src/generator.rs` uses only `std::collections::HashMap`, `std::f64::consts::PI`, and
  `serde_json` — no fs, net, or process.
- Therefore it compiles to `wasm32` just like `bert-core`. **Authoring and editing work in the
  static WASM page, fully offline.** The sovereignty guarantee in the README holds for Arc 2.

### The `generate()` contract

```
spec (intermediate format, lens-vocab)  ──►  generate()  ──►  WorldModel JSON
```

- **In:** an intermediate spec (`serde_json::Value`) matching `core/src/intermediate.rs`:
  `system`, `sources[]`, `sinks[]`, `subsystems[]`, `routing_table[]`, `external_flows[]`,
  `internal_flows[]`, `processor_flows[]`. The lens-vocab UI (§4) emits this; the LLM seed (§6)
  drafts it.
- **Out:** a complete BERT `WorldModel` JSON (`systems`, `interactions`, `environment`) ready
  for `serde_json::from_str::<WorldModel>()`, plus generation stats.
- **Seeds the kernel:** `subsystems` → things; `internal_flows` + `processor_flows` →
  system↔system dependencies (the kernel's `dep` relation); `sources`/`sinks` → environment;
  `external_flows` → boundary-crossing interactions; enums `substance.type ∈ {Energy, Material,
  Message}`, `usability ∈ {Resource, Product, Waste, Disruption}`, `complexity ∈ {Complex,
  Atomic}`.
- **Error surface:** a failed compile returns errors (not a partial model); surface them on the
  edit that caused them (§7), never silently.

### What this path deliberately avoids

- **Not** the HTTP `POST /generate` endpoint — it runs `repair_spec` first, and repair is the
  step that drops level-2 (child→child) internal flows (`reference_gsr_generator_repair_drops_l2_flows`).
- **Not** `validate_repair_generate()` — same L2-flow loss.
- **Not** direct-to-Ollama — generation is deterministic Rust; the LLM only ever drafts the
  *spec* (§6), never the model (`feedback_chat_needs_rag`).

The authored spec is well-formed by construction (the UI builds it), so the repair step is
neither needed nor wanted. `processor_flows` carries L2 flows through `generate()` unchanged.

---

## 4. In-lens vocabulary → editable UI

Arc 1 renders three **structural lists**, one per lens, and ignores positional data entirely
(`main.rs:188-316`). Arc 2 makes those lists **editable**. Each lens exposes only its own
vocabulary; an edit re-emits the intermediate spec, which recompiles (§5).

**The universal authoring primitive: a thing + the connections declared *on* it.** Do not author
a flat list of things and a *separate* flat list of relations — that is the edge-list
representation, and it artificially divorces `R` from the `T` it lives on (Klir's `R` *is* a
relation on `T`, a subset of T×T), forcing the user to maintain two parallel lists and keep names
in sync by hand. Instead, authoring is **thing-centric**: each thing carries its connections,
declared in context ("from Sensor, connect to Controller"); `R` is the union of those, maintained
automatically. This is the one primitive across *all three* lenses — the lens only changes what a
connection **means** and what overlay it carries:
- **Klir** — a bare, *undirected* relation (direction & type forgotten), authored on the thing.
- **Bunge** — a **directed, typed-by-kind** connection (mechanical / chemical / informational /
  social); a bond (≥1 action) is what separates a system from a heap. *Directed and typed, not a
  symmetric coupling.*
- **Mobus** — a typed flow with **Message** promoted to a peer of Energy/Material, crossing an
  **interface** on the boundary, carrying substance + usability.

So "reason directly in terms of things and how they connect" is not a Klir-only fix; it is the
unifying authoring model — one primitive, three overlays. The faithful accretion gradient
(Klir neutral → Bunge directed+typed → Mobus +boundary/ports/Message-peer/operational) and its
source evidence live canonically in `docs/archive/design-system.md` §9 Fidelity note. (Visualized in
`docs/archive/mockups/arc2-authoring.html`.)

**UX mandate.** The current Arc 1 lists are not pleasant to read — raw bullet dumps. Arc 2's
authoring views must be a *real surface*: grouped, well-spaced, visually styled, scannable, with
clear affordances for add/edit/remove. This is a first-class requirement of the arc, not a
polish pass deferred to later. The authoring view is the thing a daily user stares at; it has to
earn that.

| Lens | Authors | Surfaces | Hides | Maps to spec |
|------|---------|----------|-------|--------------|
| **Klir** | things + undirected relations | the bare kernel `S = (T, R)` | direction, kinds, flows, boundary | `subsystems` (things), `internal_flows` (untyped relations) |
| **Bunge** | composition + **directed, typed-by-kind** connections (+ environment) | which bonds make it a system not a heap; the kind of each connection | the Message peer-type, interfaces, boundary | `subsystems`, system↔system `internal_flows` (directed bonds), `sources`/`sinks` |
| **Mobus** | components + typed flows (+ interfaces + boundary) | the working anatomy: **Message** as a peer of Energy/Material, ports, boundary | nothing — the fullest view | `subsystems`, typed `external_flows`/`internal_flows`, `routing_table` (interfaces) |

Defaults follow the teaching contract: a new Klir model is a bare `(T, R)`; a Bunge model
prompts for at least one bond (else it reads as an aggregate); a Mobus model defaults flows to a
sensible substance/usability and exposes the boundary. The point made visible at all times:
**Klir = the bare kernel; Bunge and Mobus read that same kernel with more on top.**

---

## 5. Live cross-lens projection + convergence

This is the spine, lifted directly from Facets' killer feature ("the invariant all lenses latch
onto / where they genuinely diverge"). In Facets it was a synthesis pass over four answers;
here it is the *author-time feedback loop*.

On every edit:
1. The intermediate spec recompiles via in-process `generate()` (§3).
2. The new `WorldModel` re-projects to the kernel; the **invariant panel** shows `live ==
   baseline` (Arc 1's live re-projection, promoted from a view artifact to author-time feedback).
3. **All three lens views** re-render from the one kernel — edit as Klir, watch the Bunge and
   Mobus consequences appear instantly. The user authors once; the kernel populates every view
   (lossless by theorem, `ViewGeneration.lean`). The ergonomic Facets *should* have had —
   one input, many views, no re-asking — bert-lenses gets for free because the kernel is proven.
4. The **`validate_mode` verdicts** update live: what's missing to be a faithful system in each
   tradition, cited (§7).

**Kernel-invariance contract.** Switching lenses must never mutate the kernel; `live ==
baseline` after a lens switch is the public theorem of the mechanism (Arc 1 test
`main.rs:526-534`). Authoring *does* change the kernel (that's the point), but the
baseline re-anchors on each committed edit, and lens-switching between edits stays invariant.

This is the perspectival-realist thesis made operational (`user_perspectival_realist`): you
author a real invariant; the lenses differ on salience, not substance.

---

## 6. LLM co-create (opt-in seed)

The deterministic compile needs no LLM. So the LLM lives as an **optional seeding layer on top**,
never in the compile path.

- **Affordance:** a **Co-create** action. Describe a system in a line or two → the LLM drafts the
  *initial lists* in the active lens's vocabulary (Klir things + relations / Bunge components +
  bonds / Mobus components + flows) → those land in the **editable** spec → the user refines →
  deterministic `generate()` compiles (§3).
- **Local or cloud, user's choice:** local (Ollama) for sovereign use, or cloud (Anthropic) for
  stronger drafts. Routed through GSR, never direct-to-Ollama (`feedback_chat_needs_rag`).
- **Optional and offline-safe:** the tool is fully usable with the LLM off — manual authoring +
  deterministic compile is the baseline. Co-create is an accelerator, the one place a network
  call can appear, and only on demand.

The LLM's boundary is the spec. It proposes; the user disposes; the generator compiles
deterministically. The kernel is always a deterministic artifact — the germen ethos holds.

---

## 7. Validator routing

Mode validators gate every authored kernel before it lands.

- **Where:** in the author→land flow, after `generate()` produces the `WorldModel`, before it
  replaces the live model. Route through `bert-core`'s `validate_mode(model, lens.mode())`
  (`main.rs:118-120`, the Arc 1 lens-entry gate).
- **Reject vs warn:** errors (e.g. a Bunge model with no bond, an orphaned reference) **block the
  land** and are shown on the offending edit. Warnings are **teaching notes** — surfaced, not
  blocking (e.g. dynamical-face hints for Mobus).
- **Surface the issue fully:** show `ValidationIssue` `{location, severity, message, suggestion}`
  so the verdict teaches, not just refuses. This is the deterministic, cited explanation path —
  no LLM in the verdict (`reference_bert_validators`).
- **Three-validator context:** GSR `constraints.rs` (generation-time), `bert validate.rs`
  (structural, the one Arc 2 routes through), `bert-typedb` transpile (out of Arc 2 scope).

---

## 8. Persistence + share

Authored kernels are higher-value than Facets' chat logs, so persistence and share are baked in
from the spec, not bolted on — the explicit anti-lesson from Facets' localStorage-only state and
broken `?q=`-rerun share links ("the wow cannot travel").

- **Server-side kernel store:** an authored model is saved server-side with a stable id.
- **Resolvable share link:** `/m/<id>` (or similar) resolves to the **stored kernel**, rendered
  the same on any device — not a re-run, not a localStorage pointer. The shared artifact is the
  byte-identical model the author built.
- **Open · view-switch · fork:** a recipient can open the model, switch lenses (Arc 1, free), and
  fork it into their own authoring session. That round trip is the shareable artifact Facets
  never had.

(Weekly note §2 did not list persistence/share; it is the Facets-derived addition to scope.)

---

## 9. Layout & the spatial-canvas path (forward design)

Arc 2 v1 authors through the **editable structural lists** (§4) — no spatial canvas. This is
deliberate and safe: the lists carry no positions, so recompile-on-edit cannot jiggle anything.
But a spatial canvas is coming soon and important, so the rule is fixed now to avoid a rewrite.

**The structure/layout decoupling.** `generate()` jiggles only because it *bundles* structure and
layout: it lays N nodes on a radial N-gon (`generator.rs:1859-1914`), so adding one node
re-spaces all of them (3-gon → 4-gon = every position moves). Structure and layout are
separable concerns, and the decoupling is the whole answer:

- **Structure** stays deterministically (re)compiled from the editable spec (keeps the §3
  pipeline clean and the LLM outside it).
- **Layout** becomes **persistent, user-owned state keyed by stable entity id.** `generate()`
  seeds positions for *new* entities only; existing positions are preserved and user-draggable;
  there is **no wholesale relayout on edit.** Auto-layout, if ever, is an explicit "tidy"
  command.

This is exactly BERT's own model: `Transform2d` persisted in the WorldModel
(`bert-core/src/lib.rs:1602`), assigned once at creation, user-dragged thereafter, with no
always-on layout engine. bert-lenses adopts the same contract when the canvas arrives, and the
WorldModel already carries the position fields to make it free.

---

## 10. Out of scope (noted, not built)

Recorded so Arc 2 is not *designed against* them, not because Arc 2 builds them:

- **Facets → bert-lenses seed handoff** (the reader→maker bridge realized across both tools): a
  Facets answer — which already carries GSR dimension/structure data the Facets UI currently
  drops — seeds a bert-lenses authoring session ("turn this reasoning into an authored kernel").
  That makes Facets sticky and gives bert-lenses a warm start. Reserve the interface; build later.
- **Arc 3 — Translate:** explicit mode transitions (downgrade = projection + loss warnings,
  upgrade = generation + witnesses), enabled by §A5 mode-transition validators in bert-core. Not
  Arc 2.
