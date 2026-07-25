# Three faithful palettes — Klir · Bunge · Mobus

> **Status: LIVE** (implemented 2026-07-15, Phase 3 [#44](https://github.com/halcyonic-systems/bert-lenses/issues/44)). The two kernel
> primitives are `bert-core::{boundary_components, edge_locus}` surfaced
> canvas-keyed via `bert-lenses-kernel/src/lenses.rs` (`lens_facts`,
> `describe`); the renderings live in `web/src/canvas/Canvas.tsx` and the
> formal face in `web/src/FormalPanel.tsx`. **The per-lens authoring palette is
> DESIGNED AND SHIPPED (§ The authoring palette, 2026-07-15: #50 design → #51
> implementation, both closed)** — including boundary-property authoring
> (porosity/fuzziness author via the boundary inspector) and interface
> designation (authored I; a flowless interface is **refused** at Operational since SSF #31 — see the interface row). Still open from this doc: Δt/H
> dynamical markers, work-process badges beyond the primitive dot, agent
> designation (§ Agents — gated on the § Process-type taxonomy source pass),
> and **P's dynamical semantics** (porosity is authored + rendered but does
> not yet modulate crossing flows in bert-compose — structural-only today).

*Design reference for the canvas lens rendering. Grounded in the primary sources
in the vault (not priors): Klir, *Facets of Systems Science*; Bunge, *Treatise on
Basic Philosophy* Vol. 4, *A World of Systems* (1979); Mobus, *Systems Science:
Theory, Analysis, Modeling, and Design* (the 16-chapter text).*

## ⭐ Authoritative source — read this first

**Mobus's knowledge is scattered across a book, unpublished revisions, and prose.
For THIS project the canonical, machine-checked authority is the Lean formalization
— cite it, don't reconstruct from memory or the 2022 book chapters:**

> **`systems-science-foundations/Systems/Mobus/Tuple.lean`** — the 8-tuple
> `S = ⟨C, N, E, G, B, T, H, Δt⟩`, machine-checked. Companions: `Environment.lean`,
> `Boundary.lean`, `Interface.lean`, `FlowNetwork.lean`, `Composition.lean`,
> `Bridge.lean` (a formal Mobus↔Bunge bridge). Applied element table:
> `bert/docs/mobus-reference.md`.

**Core facts that get forgotten (because the knowledge is scattered) — treat as
essential:**
- It is the **8-tuple `⟨C, N, E, G, B, T, H, Δt⟩`**, NOT the book's 7-tuple. Do not
  "correct" it down.
- **E = ⟨O, M⟩ is a first-class Environment** — environmental **objects** O
  (sources/sinks) + milieu M. `C ∩ E = ∅` (Lean: *"mirrors Bunge Def 1.2"*).
- **H is History** (accumulated state / stored knowledge / memory; it conditions T)
  — **NOT hierarchy.** Hierarchy is just the recursion of C (a component may be a
  system one level down), not a tuple element.
- **Messages are copyable and NOT conserved** (unlike Material and Energy, which are
  conserved). Message is a peer substance type, not a kind of energy-signal.
- **G (external flows) is bipartite: environment-object ↔ boundary interface** — a
  crossing flow never connects straight to an interior component.
- Structural constraints live in **C, N, E, G, B**; **T, H, Δt are parametric /
  domain-specific by intent** (the tool fills the open parameter slot — licensed).

## Why this exists

The lens toggle must do more than recolor. Each lens should read as **that
author's actual conception of a system** — so switching lenses is switching
*ontologies*, and the model visibly gains or sheds structure. The gradient is not
decorative: it is **literal enrichment of Mobus's tuple** (his own recapitulation
claim, §4.3.3.1), so "constrained → empowered" is grounded in the mathematics.

```
Klir  (constrained)   →   Bunge  (middle)   →   Mobus  (empowered)
relation + observer       + real bonds,          + first-class Environment,
(epistemic skeleton)        composition/env,        membrane boundary B=⟨P,I⟩,
                            boundary-as-COMPONENT-   interfaces, typed flows,
                            set, aggregate cut,        dynamical face (8-tuple)
                            mechanism (CESM)
```
- **The boundary is ONE concept, progressively REIFIED (not three different
  boundaries).** Bunge and Mobus deeply agree: the boundary is **relational, not
  geometric** (Bunge's hydrogen-atom/TV-network ≈ Mobus's "implied by relative
  interaction strength"), **environment-coupling-based**, and **computable, not
  drawn**. The difference is reification (not merely cosmetic): **Bunge leaves it a
  *derived component-subset*** (a predicate over C — which components couple to E);
  **Mobus *reifies* it** as a first-class element `B=⟨P,I⟩` whose interfaces are
  **protocol-bearing subsystems** `r=(S_{i,l+1}, φ)` with gating semantics (not just
  marked components), with boundary properties (porosity, fuzziness). Mobus's
  boundary *is* Bunge's boundary-component set, promoted to an object and equipped
  with a crossing mechanism —
  Bunge's "input/output terminals" and Mobus's "interfaces in the boundary" are
  **the same nodes**. So: Klir doesn't foreground it → Bunge *identifies* it →
  Mobus *reifies + equips* it. (Nuance: Mobus's binding-force asymmetry — internal
  links denser than external — is a cohesion-gradient framing, compatible with but
  not identical to Bunge's per-component "touches outside.")
- **The convergence is FORMAL, not loose (machine-checked).** Both define the
  boundary as a **subset of the components**: Bunge — boundary ⊆ C (a reading of C);
  Mobus Lean (`Interface.lean:7`, `Boundary.lean:39`) — *"interface components
  **I ⊆ C**, the subset of components that transport flows across the boundary."*
  Both call the interior **"shielded"** (Bunge 1992 verbatim; `Boundary.lean:51`
  *"non-interface components are 'shielded' from the environment"*). "Every external
  flow passes through an interface" is `IsBipartiteFlow` (forces one endpoint to
  env-objects, the other to interfaces) **together with** `BoundaryComplete`
  (Showcase #3) — the connector is `bipartite_implies_boundary_complete`; cite both,
  not `BoundaryComplete` alone. This is the formal capstone of Bunge's "I/O terminals
  are boundary members." So:
  > **boundary (Bunge) = interfaces (Mobus) = { c ∈ C : coupled to the environment }**
  — the SAME set, machine-checked; reification (Mobus's interfaces carry properties +
  protocols) is the difference.
- **Design consequence:** ONE kernel primitive `boundary_components(model)` =
  `{c ∈ C : has an external flow}` feeds both lenses — the **Bunge** lens *marks*
  those nodes; the **Mobus** lens reifies them into a membrane + ports *on the same
  nodes*. Toggling Bunge→Mobus reifies the same set in place — a continuous,
  formally-grounded accretion, not a swap.
- **The gradient is a forgetful projection (Lean), rendered as enrichment (UI).**
  Not "tuple subsetting" — `MobusSystem.toBunge` (Showcase #1) *keeps* C→composition,
  O→environment, `N∪G → S` via `totalRelation`, and leaves `I⊆C` derived; it
  *discards* `{π, τ, η, δ, μ}` (boundary properties, transforms, history, time,
  milieu) AND collapses/de-capacitates N,G into one undifferentiated relation. Bunge
  then *adds* its own semantic predicates the 8-tuple doesn't carry (bond-vs-mere-
  relation, connection-kinds, the aggregate verdict). So the Lean arrows point
  Mobus→Bunge→Klir (forgetting); the UI toggle runs them backward (enriching).
- **Klir = foreground the relational/behavioral skeleton** — abstract away
  substance-typing and boundary; direction optional; the *observer* stands behind.

Each lens maps to a kernel `Mode` the kernel already validates (Klir→Core,
Bunge→Structural, Mobus→Operational), so the palette **surfaces the kernel's
verdict**, it never invents one.

## The formal skeleton — two machine-checked convergences (K≅2 made concrete)

The lens toggle rests on two structural identities in the Lean. **Nodes converge on
the boundary theorem; edges converge on a flow→bond→relation ladder.** Together they
are the spine of "one kernel, three faithful views."

**1. The boundary identity (nodes)** — `boundary(Bunge) = interfaces(Mobus) =
{c∈C : coupled to E}`, above.

**2. The edge ladder (edges)** — the edge-side twin, equally machine-witnessed:
> **flow** (Mobus `FlowEdge` with capacity κ + substance type) —*forget κ*→
> **bond-candidate** (Bunge: directed pair + action test) —*forget direction*→
> **relation** (Klir: neutral pair, orientation a toggle).
Witnesses: `FlowNetwork.toRelation` forgets κ; **`FlowInducesAction` (`Bridge.lean`)
IS Bunge's bond criterion** — a flow that modifies history is a bond (a▷b);
`toRelation_irrefl` gives Klir's irreflexive `R ⊆ T×T`; dropping direction yields the
neutral relation (grounding Klir's "neutral lines by default" *formally*, not by
assertion). **Design:** one kernel primitive `edges(model)` feeds all three — Mobus
paints κ + substance, Bunge paints connection-kind + bond-vs-mere, Klir paints
arity/signature ± direction. And **endo/exo = N/G** (Bunge's split = `edge∈N` vs
`edge∈G`, above) is the same kernel-computed classification.

**3. Enrichment is real, and enumerable** — `toBunge_eq_of_structural_eq`: two Mobus
systems that agree on `(C, O, totalRelation)` are Bunge-indistinguishable. So the
Bunge lens is **provably blind** to `{π (boundary properties/porosity), τ
(transforms), η (history), δ (time scale), μ (milieu)}`; the Mobus lens makes them
visible. This is the machine-checked answer to "what does switching lenses *do*."

**4. The milieu `μ` is the one element with NO cross-lens preimage.** `Environment.
lean` keeps `milieu : μ` parametric/opaque; `MobusEnvironment.toBungeEnvironment`
discards it; `milieuOnly_bunge_empty` proves a milieu-only environment has empty
Bunge image. Klir has no environment primitive; Bunge's E = a flat set of things
(= Mobus's O); **only Mobus has M.** This is the strongest formal argument that
Mobus is *strictly* richer, not relabeled.

**The commuting triangle** `Mobus → Bunge → Klir` (with a direct `Mobus → Klir`
edge) is stated in `Bridge.lean:20` — the formal backbone of "one kernel, three
views." Each edge is a forgetful map; the Klir edge additionally strips the
ontological warrant (realist → observer-constituted).

---

## Klir — the epistemic relational skeleton (Core)

**The object.** For Klir a system is `(T, R)`: thinghood `T` (a set) and
**systemhood `R` — a relation, a subset of a Cartesian product**. The *relation*,
not the thing, is what makes a system (Ch. 2). Systems are **constructed by an
observer**: "a system is what is distinguished as a system by the investigator"
(constructivist, explicitly *not* ontological, Ch. 2/5).

**Distinctives (vs Bunge/Mobus).** Epistemic not ontological. **Direction is
optional** — "neutral systems" are undirected by default; "directed systems"
merely add an input/output partition (Ch. 4). **No boundary** as a primitive — the
system/environment distinction is the *observer's* methodological act (boundary is
observer-constituted, not a property the system earns; a topological "boundary as
goal" surfaces only in the self-organization chapter). No ontological composition —
only shared-variable coupling. Whole/part is a **reversible role** (holon), not
fixed containment.

**Palette (the "bare relational algebra with an observer behind it" feel):**
- The **relation/line is the salient, designed element**; nodes are minimal,
  backgrounded placeholders (thinghood is taken for granted).
- **Undirected neutral lines by default** — no arrowhead. Direction is an explicit
  per-relation toggle (neutral ⇄ directed), never assumed.
- **No boundary, no container chrome.** (A dashed "distinction frame" around the
  whole canvas is allowed — it cues *this is a drawn distinction*, the observer's
  frame — but it is NOT a system boundary.)
- **Relations typed by signature** — arity / Cartesian form (binary, n-ary), the
  mask — NOT by material/energy/message (that vocabulary is Mobus's, importing it
  here misrepresents Klir).
- Nesting reads as "treated-as-a-part right now," reversible — loose block-diagram
  coupling, not physical enclosure.

---

## Bunge — real bonds, composition, the aggregate cut (Structural)

**The object.** σ = ⟨C, E, S⟩: Composition, Environment, Structure — real,
observer-independent **things** (ontological realist). Composition/Environment are
**disjoint set membership** (C ∩ E = ∅), level-relative.

**The load-bearing move — bond vs aggregate.** A **bond** is *action*: a▷b iff at
least one thing modifies the other's history (Def, §1.1). A **mere relation**
("older than") makes no difference and does not bond. **A system requires ≥1 bond;
a collection with no bonds is an *aggregate / heap*, not a system** (Def 1.1). This
is Bunge's, and only Bunge's, criterion for systemhood-as-earned — and the kernel
already enforces it (`validate_mode(Structural)` → the Bunge Def 1.1 error).

**Distinctives.** Directed, **typed-by-kind** bonds: *n directed graphs, one per
connection-kind* (mechanical / chemical / informational / social — §2.1). Structure
splits into **endostructure** (bonds within C) and **exostructure** (C↔E). Self-
loops are native to Bunge (feedback, diagonal `M_pp`) — **but this is a real
cross-lens INCOMPATIBILITY, not a reification difference:** the Mobus Lean enforces
`no_self_loops` (`FlowNetwork.lean:68`, Mobus §4.3 `k ≠ o`) → `toRelation_irrefl`,
so a Bunge diagonal bond has **no Mobus preimage**. Mobus represents feedback as a
2-cycle or via internal H/T dynamics, not a self-loop. The tool must state this
asymmetry, not silently support self-loops in one lens and forbid them in another.

**Boundary — Bunge DOES have one (1992), but it is RELATIONAL, not a ring.** The
1979 Treatise rejects *geometric* boundary as definitory; Bunge 1992 (*System
Boundary*, `RY7Z24Q7`) then settles it: *"every concrete system, except the
universe as a whole, has at least one boundary"* — but a **topological** one.
A **boundary component** is a component directly coupled to the environment (its
neighborhood contains both a system component and an environment thing); the
**boundary is the *set of boundary components*** — *"a certain set of components;
there is no suggestion of shape or surface."* Interior components are shielded from
E. *"Drawing the boundary is not a matter of drawing — it consists in identifying
the components directly coupled to environmental items"* → **it is computed, not
drawn** (a kernel verdict). Input/output terminals are boundary members — exactly
what **Mobus promotes into first-class interfaces on his membrane** (the boundary
concept *accretes*: Klir none → Bunge boundary-component-*set* → Mobus first-class
membrane `B=⟨P,I⟩` with ports). So the Bunge lens marks **which components are on
the boundary**, but draws **no ring** (the ring is Mobus's).

**Mechanism (M) — mature Bunge is CESM, not just CES.** Bunge's later model adds a
fourth element: `σ = ⟨C, E, S, M⟩`, where **M = mechanism = "one of the processes
in a concrete system that makes it what it is, that makes it behave the way it
does"** (its "peculiar functioning or activity") — Bunge 2004, *How Does It Work?
The Search for Explanatory Mechanisms* (Zotero `HLSEVZIT`); Bunge 1997, *Mechanism
and Explanation* (`99SYJ2HP`). M is a **dynamical/behavioral** element, not
structural. It is **conceptually parallel to Mobus's T** (both are the process/
mechanism layer) — but **formally UNbridged in the current Lean**: `Bridge.lean`'s
information-loss section lists T among what the Mobus→Bunge projection *discards*
("away: milieu M, boundary properties π, transforms T, history H, time…"). The
current bridge is CES, not CESM; there is no `toBunge_transforms`. So M↔T is a
**candidate for a future dynamical bridge, not an extension of the existing one** —
the math panel may display both, but must not claim formal backing the Lean
contradicts. M's visual home is the dynamical/formal layer (math panel + run), NOT
the structural palette. Document now, implement with the dynamical face.

**Palette (structural):**
- **Composition vs Environment as a set partition** — a soft color *wash* /
  grouping (inside-C vs outside-E), **NOT a boundary ring** (that would smuggle in
  Mobus). Environment things a distinct fill.
- **Boundary components highlighted (1992), no ring** — mark the components
  directly coupled to E (the kernel-computed boundary-component set) distinctly from
  interior components (e.g. a subtle rim accent on boundary nodes). The boundary is
  *which nodes touch outside*, a marked subset — never a drawn perimeter.
- **Directed, kind-colored bonds** (arrowheads always; color by connection-kind).
  Mere relations (non-bonds) rendered distinctly (dashed, muted).
- **The aggregate warning is first-class** — if the selection/model has zero bonds
  among distinct components, the lens **flags it as an aggregate/heap** (surfacing
  the kernel's Structural verdict), not silently drawing a "system." This is the
  single most Bunge-specific visual rule.
- **Endo/exo as an edge split** — internal bonds vs C↔E relations stroked
  differently.
- Self-loops shown in Bunge (with the Mobus-incompatibility caveat above). **No
  ports, no flow-rates, no capacity** (Mobus additions).
- **Endo/exo = N/G, computed not stylistic.** The Lean makes the endo/exo split an
  *equality*: endostructure = `internalNetwork.toRelation` (edges within C),
  exostructure = `externalFlows.toRelation` (the bipartite C↔E), and
  `totalRelation = toRelation(N) ∪ toRelation(G)`. So the stroke split is a
  kernel-computed classification (`edge ∈ N` vs `edge ∈ G`), same kind as
  `boundary_components` — not a hand-drawn choice.

---

## Mobus — first-class environment, boundary, interfaces, typed flows (Operational)

**The object — the 8-TUPLE (authoritative, not the book's 7-tuple).**
`S_{i,l} = ⟨C, N, E, G, B, T, H, Δt⟩` — Mobus's post-2022 "book-revisions,"
machine-checked in `systems-science-foundations/Systems/Mobus/Tuple.lean` (BERT
element table: `bert/docs/mobus-reference.md`). **Use this 8-tuple; do NOT
"correct" it back to the 2022 book's 7-tuple.** (Provenance: the 8-tuple is
Mobus's unpublished revision — see `reference_mobus_8tuple_provenance`; keep that
in mind for anything public-facing.)

| element | | render |
|---|---|---|
| **C** | Components | subsystem discs; zoom = recursive decomposition |
| **N** | internal Network | internal flows between components |
| **E** = ⟨O, M⟩ | **Environment (first-class)** | environmental **objects** O (sources/sinks) + milieu M (ambient) |
| **G** | external flows | boundary-crossing flows, **bipartite: env-object ↔ interface** |
| **B** = ⟨P, I⟩ | Boundary | the ring (P properties) + interfaces I |
| **T** | Transformation | protocols on interfaces / component transfer |
| **H** | History | accumulated state (conditions T) |
| **Δt** | Time scale | per-node time unit |

C, N, E, G, B carry the **structural** constraints; T, H, Δt are parametric /
domain-specific by intent (bert-compose fills the open parameter slot — licensed,
not a deviation).

**What's NEW in the 8-tuple — ENVIRONMENT is first-class (the user's emphasis).**
The book's 7-tuple folded the environment into G; the 8-tuple promotes **E = ⟨O, M⟩**
to a peer element: the environment *consists of objects* O (the external
sources/sinks are real environmental **objects**, not faint background) plus a
milieu M (ambient opaque variables). Formally **C ∩ E = ∅** — components and
environment objects are disjoint node types (the Lean comment: *"mirrors Bunge
Def 1.2"* — so Mobus's C/E recapitulates Bunge's composition/environment). Render
environment objects as **first-class shapes outside the boundary**, connected only
via **G** — and G is **bipartite: an environment object connects to a boundary
INTERFACE, never straight to an interior component**.

**BOUNDARY — first-class.** `B = ⟨P, I⟩`. Mobus *names* this his break from prior
formalisms and rejects "boundaries are just modeler choices" — boundaries are real,
grounded in **binding-force asymmetry** (internal links denser than external).
Properties: **porosity** (0 = solid → permeable), **perceptive fuzziness** (crisp →
fuzzy), **type** (CONCRETE vs DYNAMIC). The user's #1 visual ask.

**Interfaces / ports.** `I ⊂ B`; each interface `r = (S_{i,l+1}, φ)` — a subsystem
with a **protocol** φ. Sited *in* the boundary ("round-edged rectangles that
penetrate the boundary," Fig. 4.9). **RECEIVES / EXPORTS / hybrid.** Interfaces
*gate*, they don't transform. Mobus: ignoring the interface is "the single biggest
mistake" in systems analysis (§4.3.3.3).

**Typed flows.** Material / Energy / **Message** — three peer substance types,
Message promoted to co-equal (Principle 7, §3.5.2.2.5.4). N = internal network, G =
environment bipartite graph; both directed, capacity-typed.

**The dynamical face.** T (per-component transforms), H (history/memory), Δt
(time scale — multi-timescale by *design intent*: "higher levels have larger Δt" is
Mobus's stated intent, but in the Lean `Δt` is a single parametric field on the
system, not a formalized per-node map). These mark the "empowered / executable" end.

**Palette:**
- **The boundary ring is the star** — a real membrane around the system's
  components. Porosity → ring solidity / dash-density; fuzziness → edge blur;
  concrete → solid stroke, dynamic → textured/animated stroke.
- **Interface ports notched into the ring** — pill notches breaking the stroke,
  each with a protocol label + direction glyph (in / out / bidirectional). Highest-
  priority element.
- **Typed flow strokes** — material (solid heavy), energy (glow/gradient), message
  (thin, pulsed); subtype badge (iron / electricity / …).
- **Work-process badges** on leaf components (combine / split / buffer / impede /
  propel / copy / sense / amplify / modulate — the "simplest process rule").
- **Dynamical markers** — a per-node Δt clock badge; an H/memory sparkline glyph on
  nodes with history.
- **Environment Src/Snk as open/unfilled shapes OUTSIDE the boundary** — the
  epistemic asymmetry (their internals are unknowable, §4.3.3.2.2).
- Hierarchy as nested containment with dotted indices; tree ⇄ nested-ovals views.

---

## The formal face — the math panel (the K≅2 thesis, made legible)

Beside the diagram, a **formal panel** renders the current model as its **formal
object in the active lens's own notation** — the same model read three ways. This
is not decoration: it is where "one kernel, many faithful views" (K≅2) becomes
*visible* — the counts hold, the words change — and it is the natural home for the
**dynamical elements** (Bunge's M, Mobus's T / H / Δt) that don't belong in a
structural palette.

- **Klir:** `S = (T, R)` — the relation as a subset of a Cartesian product; the
  epistemological level (source / data / generative / structure); `|T|` things,
  `|R|` relations.
- **Bunge:** `σ = ⟨C, E, S, M⟩` — `|C|` components, `|E|` environment; endostructure
  vs exostructure; the bondage `𝔹` and the **aggregate-vs-system verdict**; M the
  mechanism (the processes).
- **Mobus:** `S = ⟨C, N, E, G, B, T, H, Δt⟩` — the 8-tuple with each element's
  content; `B = ⟨P, I⟩`; `E = ⟨O, M⟩`; flows typed (Material / Energy / Message).

**Architecture (keeps the invariant):** the formal reading is **computed by the
kernel** — `describe(model, lens)` **typesets exactly what the named bridge maps
return**, it does not assemble the math independently: Mobus = the 8-tuple with each
element's content; Bunge = the `toBunge` image + the bondage/aggregate verdict + the
derived boundary-component set; Klir = `(T,R)` via `totalRelation` (+ the observer's
epistemological level). The face only renders it (KaTeX). The math is never
assembled in JS. Live-updating
as the model changes; rendered as a first-class, beautiful artifact in the lens's
own notation/color, not an afterthought panel. (The egui version's Math tab is the
precedent — "did a decent job"; the SVG/React frontend can make the formal object
genuinely elegant.)

## Interaction per lens (click a flow / element → do things)

- **Klir:** click a relation → toggle **neutral ⇄ directed**; set its **arity/mask**
  signature. (Relation-as-type is the Klir verb.)
- **Bunge:** click a bond → set its **connection-kind**; toggle **bond ⇄ mere
  relation**; reverse direction. Click empty structure → the **aggregate warning**.
- **Mobus:** click a flow → set **substance type** + **drive with data** (the
  existing tether); click the boundary/interface → set **protocol + direction**.

## The authoring palette — how each lens ADDS its kinds (#50, designed 2026-07-15)

Decisions of record (`design-system-draft.md` §Decisions): dock = **left rail**;
rail chrome tints via the `--lens-accent` seam (slate/indigo/teal) bound to kernel
`Mode`; the KIND channel stays reserved. This section settles the rest of #50.
Ground rule throughout: **the rail offers, the kernel decides** — legality is the
before/after issue-delta of `validate_connection` (`bert-canvas/src/canvas.rs:425`)
at the active Mode, never a UI list (design-system rule 8).

### Birth modes are the grammar

Carried forward from the archived creation model (`docs/archive/design-system.md`
§9): every addable kind has one of three birth modes, mirroring the arity of the
mathematical act — **PLACE** (nullary: add to T / C), **CONNECT** (binary: add to
R / S / N∪G), **DERIVE** (a consequence the kernel computes, never authored).
"Lenses accrete meaning, not placeable types" survives as the accretion rule for
the rail: toggling a lens adds/removes *rows*, it never resets the canvas. What
the left-rail decision supersedes is only §9's "no toolbox needed" conclusion —
and §9's parked fallbacks (drag-out token, contextual radial) stay parked.

**One correction to §9, forced by the sources (below): Mobus interfaces move OUT
of the DERIVE row.** A fourth verb joins the grammar: **DESIGNATE** (unary on an
existing element: mark a component as carrying a status the tuple declares —
interface membership, work-process primitive). Gesture: arm the tool, click a
*component* (not empty canvas).

### Variant sketch and pick (fun gate, Q1)

- **A. Flat stamp rail** — armable ToolButtons per kind; click to arm, click
  canvas to place; Esc / second click disarms; double-click stays the un-armed
  shortcut for the lens default.
- **B. Grouped verb rail** — the same armable ToolButtons, sectioned by birth
  mode: **Place** (armable stamps) · **Designate** (arm, then click a component) ·
  **Connect** (the drag gestures, listed as gesture hints) · **Derived** (greyed,
  non-armable, tooltip text from `describe` — "computed by the kernel").
- **C. Drag-out** — drag a kind chip from the rail onto the canvas.

**Pick: B, without a blind pick — this is not a genuine fork.** B strictly
subsumes A's gesture (its Place entries *are* A's stamps) and adds exactly what
Q2/Q3 need made visible: derived kinds shown-not-armable, and per-lens absence
legible as rows that appear/disappear with the toggle. C collides with the
connect-drag gesture space and was already parked in §9. The rail is therefore
not a Gaphor type-toolbox; it is the lens's **verb list**.

### Addable kinds per lens (the table)

Columns: birth mode · gesture · where the kernel rules. Double-click on empty
stage remains the shortcut for the lens's **default PLACE kind** (bolded row) —
the existing `useCanvasGestures.ts` path, unchanged.

#### Klir (Core) — `--accent-slate`

| kind | birth | gesture | kernel verdict path |
|---|---|---|---|
| **thing** | PLACE | stamp / double-click | member of T (`project()`) |
| relation (neutral) | CONNECT | drag node→node | `check_interaction_references`; neutral⇄directed, arity/mask are EDITs (§ Interaction) |

**Absent at Klir (by ontology, not omission):** environment things, bond-vs-mere,
connection kinds, substance types, boundary, interfaces, sources/sinks, work
processes. A system is `S = (T, R)` — "a set of some things and a relation (or,
possibly, a set of relations) defined on T" (*Facets*, Eq. 1.1; thinghood in T,
systemhood in R). Everything richer is the investigator's construction: "a system
is what is distinguished as a system by the investigator" (Gaines, in *Facets*
ch. 4, the epistemological hierarchy; §2.4 — richer classes "must be introduced").
Note Klir licenses **multiple named relations** on T ("or, possibly, a set of
relations") — the rail's single CONNECT verb may spawn distinct named relations,
which is faithful, not an extension.

#### Bunge (Structural) — `--accent-indigo`

| kind | birth | gesture | kernel verdict path |
|---|---|---|---|
| **component** | PLACE | stamp / double-click | member of 𝒞 (Def 1.2 i) |
| environment thing | PLACE | stamp | in ℰ **only once bonded** — Def 1.2(ii) defines ℰ as the things that act on / are acted on by components, so `project()` dropping orphan terminals (`canvas.rs:241`) is Bunge-faithful; an unbonded env dot renders as *pending* (muted), not silently discarded |
| bond (kind-typed) | CONNECT | drag node→node (also node→empty: births the env thing + bond in one act) | `check_bond` — the aggregate/heap verdict (Def 1.1); kind, bond⇄mere, direction are EDITs |
| mere relation | CONNECT | drag, then toggle bond⇄mere | contributes nothing to systemhood (𝔹̄, the nonbonding set) |

**Absent at Bunge:** ports/interfaces, typed sources/sinks, capacities, boundary
*authoring*. ℰ is a flat **set of things** (Def 1.2 ii) — no interface object
exists anywhere in the CES model. The boundary is **computed, never placed**:
"the boundary of s is the set ∂C(s) of all the boundary components of s … a
certain set of components … there is no suggestion of shape or surface" (Bunge
1992, Def 3) — a Derived row, greyed. Bonding is the only edge distinction:
structure decomposes into the bondage 𝔹 and the nonbonding relations 𝔹̄ (§1.2;
1992 Def 1 makes it state-trajectory action). *Fidelity note:* Bunge's 𝒮 is a
**set of relations** {Rᵢ}, not one flat relation — the kernel's single-relation
form is the SSF formalizers' flagged simplification
(`Systems/Bunge/StructureFamily.lean:8–24`), not Bunge's text.

#### Mobus (Operational) — `--accent` (teal)

| kind | birth | gesture | kernel verdict path |
|---|---|---|---|
| **component / subsystem** | PLACE | stamp / double-click | member of C |
| environment object | PLACE | stamp | member of E.O; **Source vs Sink is DERIVED from flow direction** (`project()` originates-test) — one tool, not two; unbonded = pending, as at Bunge |
| interface | **DESIGNATE** | arm, click a component | I ⊆ C (`Tuple.lean` `interfaces_sub`). **An interface must carry a boundary-crossing flow** (`interfaces_carry_flow`, SSF #31, proven non-redundant in SSF #35): Mobus's Listing 4.2 makes `recievesFrom`/`exportsTo` mandatory, so a flowless interface is not writable in his own description language. Refused at Operational (#219), audit-time only — you stamp before you draw the flow. The port is a drop target (#222). |
| typed flow | CONNECT | drag node→node / node→**port** / node→empty (births env object + flow) | `check_self_loops` (k ≠ o, §4.3, `FlowNetwork.lean:68`); crossing flows must land on interfaces — bipartite G (`Tuple.lean:103`) |

**Dropping on a port (#213).** An interface port is a connection target, and it
resolves to the component that owns it — `I ⊆ C`, so the port IS that component
seen at the membrane and the edge built is the same `env ↔ component` edge a drop
on the component builds. There is no third node type to land on and no third hop
in the result. A port with no crossing flow yet is drawn tethered to its
component and labelled with its name, so the notch is never an anonymous mark
floating on the ring.
| work-process primitive | **DESIGNATE** | arm a primitive, click a leaf component | `bert-core` `Vec<ProcessPrimitive>`; `validate_operational` instantiates `.first()` |

**Derived rows (shown greyed, never armable):** boundary ring + P rendering,
Source/Sink identity, endo/exo edge classification, the aggregate verdict.

### The interface correction (Q2) — sources overturned the Phase-3 assumption

Phase 3 (and archive §9) treated interface ports as DERIVE-only — "arising from
flows, never placed." **The authority says otherwise, in both the Lean and the
prose:**

- `B = ⟨P, I⟩` with `interfaces : Set α` an **author-supplied field** of the
  boundary structure (`Boundary.lean:35–42`) — not a computed value. The 8-tuple's
  coherence constraints (`Tuple.lean:86–107`) require `I ⊆ C` (`:97`) and
  bipartite external flows (`:103`, `Interface.lean:33–36`), but contain **no
  coverage constraint from flows onto interfaces: a flowless interface is
  well-formed.**
- Mobus §4.3, Eq. 4.6: "B = ⟨P, I⟩ … the second set, I, is the set of interfaces"
  — I is a primitive element of the boundary tuple. (Quoted via the SSF
  transcription `systems-science-foundations/docs/reference/mobus-bunge-system-definitions-reference.md:165–177`;
  the primary 2022 PDF is not on disk — the Lean is this project's declared
  authority regardless, CLAUDE.md invariant #7.)
- BERT's applied doc is already interface-first: "Subsystems MUST attach to
  existing interfaces" (`bert/docs/mobus-reference.md:82`).

**The true asymmetry runs the other way: flow ⇒ interface** (every crossing flow
passes through one — `bipartite_implies_boundary_complete`,
`Interface.lean:47–63`), never interface ⇒ flow. Design consequences:

1. **The Mobus rail offers interface DESIGNATION** (arm → click a component →
   it joins I). Placing a new component pre-designated is the same verb composed
   with PLACE.
2. **Auto-designation on flow-crossing survives as ergonomics of flow ⇒
   interface**: drawing a crossing flow onto a non-designated component
   designates it rather than erroring. Effective I = authored ∪ flow-crossing —
   the union keeps bipartite G satisfied while honoring authored flowless
   interfaces.
3. **Flowless interfaces are a lens-enrichment fact**: an authored interface with
   no flow is in Mobus's I but not in Bunge's derived ∂C (no environmental
   coupling) — so the § boundary-identity equation above holds exactly on the
   *flow-crossing* interfaces; authored-flowless ones are part of what the Bunge
   lens is provably blind to (`toBunge` discards them with π).
4. This is **kernel-first work**: today `PortFact` is derived solely from exo
   bonds (`bert-canvas/src/lenses.rs`); authored designation needs the 8-step
   checklist from step 1 (bert-core carries authored I; `PortFact` gains
   provenance authored|derived).

### Boundary-property authoring (Q4)

Porosity and perceptive fuzziness live in the **inspector, Mobus-only**, as
labelled range rows shown when a boundary/interface is selected — an *edit* on an
existing element, never a rail verb (the boundary itself stays a Derived row).
Writes go to the kernel's `B.P`; the face flips `BOUNDARY_PROPS_AUTHORING`
(`web/src/FormalPanel.tsx:38`) only when the write path exists, per its comment.

### Gesture spec

- **Rail anatomy:** Card chrome on the left rail; `data-lens` on the canvas root
  drives `--lens-accent`; sections Place / Designate / Connect / Derived;
  ToolButton rows (icon + label + tooltip), one armed at a time, armed = accent
  fill (interaction vocabulary, `design-system-draft.md`).
- **Arm → place:** crosshair cursor; click empty canvas places at point and
  *stays armed* for repeat-stamping; Esc or second click on the tool disarms.
  Double-click on empty stage = the lens default kind, unchanged.
- **Arm → designate:** click a component applies (interface membership /
  work-process primitive); Esc disarms. Empty-canvas click: a **primitive tool
  stamps a new component that IS that process** (glyph-first, one gesture —
  #100 phase 4, from the #81 harvest; the place-then-stamp two-step still
  works); the interface tool does nothing but stays armed (a status on an
  existing component has no nullary reading).
- **Connect:** unchanged drag-handle gesture; node→empty births the environment
  thing/object plus its bond/flow in one act (§9's relational birth, retained).
- **Illegal adds:** rows a lens's ontology lacks simply don't render (absence is
  ontology, Q3). A gesture the kernel rejects surfaces the `validate_connection`
  delta message via the shared Banner — the same voice as the aggregate banner.
- **Lens toggle:** the rail re-renders its rows and re-tints; the canvas never
  resets (accretion pattern).
- **Inspector (harvest #5):** a persistent read/edit surface sharing the
  EdgePopover row vocabulary. Work-process section: the stamp DESIGNATE appends
  to `Vec<ProcessPrimitive>`; the inspector lists all, marks `.first()` as
  *instantiated*, and reorders/removes — fixing the "re-stamp-only editing is
  write-only UX" finding. Audit navigation: clicking a red audit row centers +
  selects the offending element; the panel stays read-only.
- **Registration:** each rail row is a per-lens descriptor in the LensRegistry
  (`web/src/canvas/lenses/registry.ts`) alongside the views — never a
  `lens ===` conditional.

### Agents and the palette (chs. 10–11) — accounted for, deliberately deferred

Mobus's paradigm is agent-centric, and the palette must build TOWARD agents
without conflating them with what it stamps today:

- **An agent is an archetype WITHIN C, not a tuple slot.** "Agents are
  specialized decision-making information processes the outputs of which
  generate control activities… Any decision-making mechanism that affects the
  state of the system and/or its environment is an agent" (ch. 10; vault
  `operations/systems-science/mobus/10-model-archetypes.md`). Mobus offers and
  rejects `C₀ = {economy, governance, agents}` as "too abstract" — agents are
  the orange ovals INSIDE process ovals. Operationally: agent = computational
  engine + decision model + experiential memory (ch. 11), kinds
  Reactive / Anticipatory / Intentional, autonomy graded.
- **Agency ≠ work process.** Work processes are Economy-side; agents MANAGE
  them (Agency archetype). bert-compose already corrected one category error
  here ("agency on a primitive" — `bert-compose/src/circuit.rs`); the rail's
  stamp section therefore says **work process**, never agent. The standing
  tension that `bert-core::AgentModel.primitives` carries Economy content
  under an Agency name is documented (run-surface-grounding.md, 2026-07-11)
  and stays deferred: document now, restructure on demand.
- **The kernel is already agent-ready**: `bert-core` carries
  `HcgsArchetype::Agent` + `AgentModel { kind, agency_capacity, primitives:
  Vec<ProcessPrimitive>, … }`; only the canvas seam lacks archetype exposure.
- **How agents will enter the palette**: as a **DESIGNATE verb** on components
  (arm "agent", click a component — same gesture as the work-process stamp),
  kernel-first via the 8-step checklist (Thing gains archetype exposure;
  `Designation` union in `registry.ts` gains an archetype member). The
  multi-primitive question (#5) resolves WITH agent designation — the Vec
  lives on `AgentModel`, so a component's several work processes arrive when
  its agent-hood does, not before.

### Process-type taxonomy (PROVISIONAL — verify before building on it)

Raised at slice-2 review (Shingai, 2026-07-15): is work-process stamping
theoretically justified, can primitives function without managing agents, and
does it differ by type? The working answers, with status flags:

**Grounded (chs. 10–11, verified 2026-07-15):**
- Stamping = Economy-side transformation authoring (the "simplest process
  rule"); it claims what the component DOES, never that it is managed.
- Primitives function agent-free, open-loop (a tank buffers, a pipe impedes);
  agents enter where regulation against disturbance is needed. In a CAS/CAES
  every process oval acquires internal managing agents (ch. 10) — so
  stamped-but-unmanaged is **valid for simple systems, incomplete for
  adaptive ones** (not ill-formed at Operational mode).
- Agents are BUILT FROM primitives ("the work processor of an agent is the
  computational engine," ch. 11 — the 2025-08-29 agents-from-primitives
  principle); Mobus's minimal reactive agent is the thermostat.

**Inferred (UNVERIFIED — do not build on without a source pass):**
1. **The two-family split**: matter/energy primitives (combining, splitting,
   buffering, impeding, propelling) run agent-free most naturally; information
   primitives (sensing, copying, modulating, amplifying, inverting) are what
   agents are composed of. Plausible from ch. 11's computational-engine
   framing; NOT yet checked against Mobus's own primitive taxonomy (ch. 3 /
   the process-vocabulary source the badges came from).
2. **Reactive agent-hood as a kernel VERDICT**: a sensing → decision →
   actuation loop closing on system state matches ch. 10's agent definition
   ("any decision-making mechanism that affects the state of the system"),
   so the reactive kind may be structurally DETECTABLE (computed like the
   boundary) with designation reserved for anticipatory/intentional kinds.
   Attractive ("computed, not drawn") — but needs verification that Mobus
   licenses structural sufficiency, and a Lean-side statement before it
   becomes a validate tier.
3. **A future adaptive-mode gate**: "process without a management loop"
   warning, one rung above the Structural aggregate verdict. Follows from
   the ch. 10 archetype claim; scope and severity unvetted.

Verification pass (when agent work begins): read Mobus's primitive-vocabulary
chapter directly for the family split; check chs. 10–12 for whether reactive
agency is structurally sufficient; only then promote any of the three into
kernel semantics via the 8-step checklist.

### Source citations for this section

Klir: *Facets of Systems Science* (2001), Eq. 1.1 + §2.1 (S=(T,R)), §2.3–2.4,
ch. 4 epistemological hierarchy (Gaines quote). Bunge: *A World of Systems*
(1979) Defs 1.1–1.2 + §1.2 (bondage 𝔹/𝔹̄); Bunge 1992 *System Boundary* Defs 1, 3.
Mobus: §4.3 Eq. 4.6 via the SSF transcription (primary PDF not on disk);
authority = `Systems/Mobus/{Tuple,Boundary,Interface,FlowNetwork}.lean` at the
lines cited inline. Verified 2026-07-15 (two independent source-check passes).

## Implementation order (highest faithful leverage first)

1. **Mobus boundary ring + interface ports** — the headline; the accretion egui
   never shipped. Compute the ring from the component convex hull / bounding
   region; place ports where flows cross it.
2. **Bunge aggregate-vs-system flag** — surface `validate_mode(Structural)` on the
   canvas (heap vs system), + C/E wash, + endo/exo edge split.
3. **Klir relation-primary** — neutral lines foregrounded, nodes recessed, the
   observer distinction-frame, relation-signature labels, direction toggle.
4. Typed-flow strokes (M/E/Msg), work-process badges, Δt/H markers — the Mobus
   dynamical/typed enrichments.
5. **The authoring palette** (§ above) — shared primitives + seam first, then the
   face-only rail rows, then the kernel-first interface designation + boundary-P
   authoring. Tracked in #51 (slicing there).

Each step is gated on faithfulness (cite the source in the code comment) and on the
invariant (verdicts from the kernel, never JS). egui "did a decent job"; with SVG +
this grounding we can make each lens *feel like its author*.
