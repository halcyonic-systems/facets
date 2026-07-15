# Three faithful palettes — Klir · Bunge · Mobus

> **Status (2026-07-15): implemented — Phase 3 (#44).** The two kernel
> primitives are `bert-core::{boundary_components, edge_locus}` surfaced
> canvas-keyed via `bert-lenses-kernel/src/lenses.rs` (`lens_facts`,
> `describe`); the renderings live in `web/src/canvas/Canvas.tsx` and the
> formal face in `web/src/FormalPanel.tsx`. Still open from this doc: boundary
> property *authoring* (porosity/fuzziness are rendered but always 0.0 until
> the canvas can set them), work-process badges beyond the primitive dot, Δt/H
> dynamical markers, and the per-lens authoring palette (§ Interaction).

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

Each step is gated on faithfulness (cite the source in the code comment) and on the
invariant (verdicts from the kernel, never JS). egui "did a decent job"; with SVG +
this grounding we can make each lens *feel like its author*.
