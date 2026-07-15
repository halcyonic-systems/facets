# bert-lenses — Design System

> **⚠ ARCHIVED (egui-era).** This is the egui/Arc-2 visual grammar, superseded by
> the web rebuild. The live face design entrypoint is [`web/DESIGN.md`](../../web/DESIGN.md)
> (Halcyonic Frost) with the lens grounding in [`docs/design/lens-palettes.md`](../design/lens-palettes.md).
> Kept for history.

Status: **v0 foundation** · 2026-06-26 · the visual language for the direct-manipulation
authoring canvas. Built once, here, and scaled deliberately **Klir → Bunge → Mobus**. Visual
reference sheet: `docs/archive/mockups/design-system.html`. Maps directly to egui (`Color32`, `Painter`).

The governing idea: **one element, read with more structure as the lens deepens.** A thing on
the canvas *accretes* visual structure across lenses — a bare disc in Klir, a bounded system in
Bunge, a system with interface ports and typed flows in Mobus. The shape grammar mirrors the
thesis: the lenses read the *same kernel* with more on top.

---

## 1. Principles

1. **Warm, light, calm.** Paper-warm surfaces, ink text, generous space. Light mode is the
   default (public-facing, and easier on long modeling sessions).
2. **Shape carries meaning; color carries identity & type.** The *shape* tells you what a thing
   is (system vs environment, bonded vs aggregate). *Color* tells you the active lens and, for
   flows, the substance type. Never overload one channel.
3. **Beautiful and simple.** Circles, squares, clean strokes, one accent. No gradients on
   structure, no skeuomorphism. The diagram should look like careful systems drawing, not a UI.
4. **Progressive disclosure by lens.** Klir shows the least; each deeper lens adds exactly one
   structural layer. Detail is *gated by lens*, never crammed.
5. **One token source.** Every color/size below becomes a constant in the egui `theme` module;
   nothing hardcoded at call sites.

---

## 2. Palette

Warm-neutral base + a three-lens identity set + semantic + substance colors. `egui::Color32`
values given inline.

### Base (lens-neutral)
| Token | Hex | RGB | Use |
|-------|-----|-----|-----|
| `bg` | `#f7f4ee` | 247,244,238 | app background |
| `surface` | `#fffdf9` | 255,253,249 | canvas, panels |
| `panel-2` | `#f1ece2` | 241,236,226 | recessed groups, chips |
| `ink` | `#2c2722` | 44,39,34 | primary text, node labels |
| `ink-soft` | `#6b6258` | 107,98,88 | secondary text, plain arrows |
| `ink-faint` | `#9a9085` | 154,144,133 | hints, environment glyphs |
| `line` | `#e3dccf` | 227,220,207 | hairlines, dividers |
| `line-2` | `#d6cdbc` | 214,205,188 | borders, idle strokes |
| `accent` | `#c4622d` | 196,98,45 | actions, selection, brand (terracotta) |

### Lens identity (active-lens chrome, boundary stroke, selection halo)
| Lens | Hex | RGB | Character |
|------|-----|-----|-----------|
| **Klir** | `#3f6f8f` | 63,111,143 | slate blue — the bare kernel, epistemic |
| **Bunge** | `#8a5a9c` | 138,90,156 | muted violet — composition & structure |
| **Mobus** | `#2f8472` | 47,132,114 | teal-green — working anatomy & flow |

### Semantic
| Token | Hex | RGB | Use |
|-------|-----|-----|-----|
| `ok` | `#4f7a3f` | 79,122,63 | valid lens entry, kernel-invariant ✓ |
| `ok-soft` | `#e4eedd` | 228,238,221 | ok chip fill |
| `warn` | `#b07a16` | 176,122,22 | aggregate / missing bond / teaching warning |
| `warn-soft` | `#f3e8cd` | 243,232,205 | warn chip fill |

### Substance (Mobus typed flows — color = substance)
| Type | Hex | RGB |
|------|-----|-----|
| **Energy** | `#b06a1f` | 176,106,31 (ochre) |
| **Material** | `#5a7a4f` | 90,122,79 (green) |
| **Message** | `#5566b0` | 85,102,176 (blue) |

> Usability (Resource / Product / Waste / Disruption) is **not** a color — it's a small marker
> on the flow (a dot/notch or a one-letter cap), so substance-color stays unambiguous.

---

## 3. Typography

- **UI / labels:** system sans (Inter / SF / Segoe). Node label 13.5px 600; section caps 12px
  700 letterspaced; hints 11.5px.
- **Spec / quick-capture text:** monospace (SF Mono / Menlo) 12.5px — the connection-line lane,
  if/when surfaced, reads as code, distinct from canvas labels.
- Node labels sit *inside* the disc (Klir/Bunge) or just below it when ports crowd the ring
  (Mobus). One label per element; never wrap more than two lines.

---

## 4. Shape grammar — the core language

Two primitive silhouettes carry the whole system; everything else is an overlay.

- **Circle = a thing / system** (lives *inside* the model).
- **Square = an environment entity** (source/sink, lives *outside* the boundary). A source reads
  `←` (into the system), a sink `→` (out of it); drawn in `ink-faint`, smaller than systems.

That single circle-vs-square distinction is the spine. The rest accretes by lens — and the
accretion is **progressive de-abstraction**, not "adding parts" (see the fidelity note below):

| Layer | Introduced in | Visual |
|-------|---------------|--------|
| the disc | **Klir** | a soft filled circle (`surface` fill, `line-2` stroke), label inside — a *thing/distinction* |
| **composition vs environment** | **Bunge** | components cluster (optional soft `composition halo`, *not* a hard boundary); environment entities (squares) sit outside |
| **bonds** | **Bunge** | **directed, typed-by-kind** connections among components — the structure that makes a system rather than a heap |
| **aggregate** state | **Bunge** | no bond yet → components un-joined + a small `warn` dot: "a heap, not yet a system" |
| the **boundary ring** | **Mobus** | the circle gains a real boundary stroke in the lens color — boundary is a *Mobus* primitive (see fidelity note) |
| **interface ports** | **Mobus** | small notches/dots on the boundary ring where flows attach |
| **interior parts** | Mobus | sub-discs nested inside the boundary, laid out radially |

Relations also accrete — *neutral* (Klir) → *directed & typed* (Bunge) → *operational* (Mobus):

| Lens | Relation | Drawn as |
|------|----------|----------|
| **Klir** | a general relation | **undirected line** (no arrowhead), `ink-soft` — "there is a relation," direction *and* type *forgotten* |
| **Bunge** | a **directed, typed-by-kind** connection | a **directed arrow** in lens-violet, optionally tagged by kind (mechanical / chemical / informational / social); a bond (≥1 action) is what makes a system not a heap. *Bunge is already directed and typed* — not a symmetric coupling (see fidelity note) |
| **Mobus** | a **typed flow** | directed arrow **colored by substance**, with **Message promoted to a peer type** (Energy / Material / Message), attaching to **interface ports** on the boundary, with a usability marker |

### Why this scales cleanly
The canvas code gates detail by `Lens`: **Klir** draws discs + undirected lines; **Bunge** adds
the composition/environment distinction, **directed bonds typed by kind**, and the aggregate
warning (**no boundary**); **Mobus** adds the boundary ring, interface ports, the **Message** peer
flow type + substance coloring, and the operational apparatus. The build ladder *is* this
progression — Klir layer first, then Bunge, then Mobus, on the same node core.

This keeps us consistent with **BERT** (systems as circles with boundaries and interfaces — at
the *Mobus* grain), so the eventual fold-in is visual-continuity, not a re-skin.

### Fidelity note — why the grammar is shaped this way
Checked against Klir (*Facets* Ch. 2), Bunge (*Treatise* Vol. 4, 1979), and our own Lean
(`systems-science-foundations`). Two corrections were load-bearing:

- **Boundary is not Bunge's.** Bunge's system is the triple ⟨C, E, S⟩; he *explicitly excludes*
  "having a boundary" from the definitory properties, and our Lean `ConcreteSystem` has **no
  boundary field** — boundary appears only in `MobusBoundary`. So the boundary ring lives in
  **Mobus**, not Bunge. Bunge's contribution is **bonds** (couplings that make a system not a
  heap, `bondage_nonempty`) + the composition/environment split.
- **Direction is real; Klir forgets it (and this is *our* call, not Klir's).** Our kernel commits
  to a *directed* relation ("a system IS a morphism") — the **realist** stance, grounded in Bunge's
  asymmetric action `a ▷ b`. We model the **common-sense definition** `S = (T, R)` (Ch. 1–2), whose
  relata are **things** — *not* the GSPS variable-level layer (Ch. 4). Klir's relation is general,
  *ordered* (symmetry/direction are *properties* a relation may have, not the primitive), and at the
  source level he leaves direction undeclared — his "**neutral system**" (one of his two categories,
  alongside *directed systems*). So the Klir lens renders **neutral/undirected** — faithfully *the
  neutral case*. **Fidelity caveat (audit 2026-06-27):** Klir held **constructivism** as a
  substantive position ("systems do not exist in the real world independent of the human mind").
  Our realist, directed kernel is an **editorial departure** from Klir — *our* convergence thesis,
  not a faithful reading of him. We keep his lens as a usable *stance*; we do **not** claim the
  demotion is Klir-faithful. Direction is *recovered* at **Bunge** (action `a ▷ b` is directed) and
  carried into Mobus. (Math view shows ordered `(a,b)` in every lens; only the *line* drops its
  arrowhead in Klir, signalling the neutral case — not unordered pairs.)
- **Bunge already types *and* directs (revised 2026-06-26).** Earlier we placed direction and
  typing at Mobus; checking Bunge Ch. 1 shows otherwise. §2.1: a system has *"n different kinds of
  connection… mechanical, chemical, informational, social,"* each a **directed graph** with
  per-edge **strength** — a typed, weighted, directed multigraph. §1.3 names **flows of energy,
  matter, field, and information**. So **Bunge bonds are directed and typed-by-kind**, not
  symmetric couplings. The genuine **Bunge → Mobus** line is *not* typed-vs-untyped — it is (a) the
  **ontological status of *Message***: Bunge treats information as a derived aspect that *"rides on
  some energy flow,"* whereas **Mobus promotes Message to a co-equal flow type**; plus (b)
  **boundary, interface ports, and the operational 8-tuple**, which remain Mobus-only.

**The faithful accretion gradient (canonical — other docs point here):**

| Lens | Recovers |
|------|----------|
| **Klir** | a general relation (binary fragment here; n-ary in general) among **things** — *ordered* tuples, rendered **neutral** (direction undeclared, the "neutral system" case). Realist kernel is our editorial departure from Klir's constructivism |
| **Bunge** | **directed, typed-by-kind** connections (mechanical/chemical/informational/social) · energy/matter/field flows (info as a derived aspect) · structure-vs-process · inputs/outputs — direction & typing **recovered** |
| **Mobus** | **+ boundary · + interface ports · + Message promoted to a peer flow type · + the operational 8-tuple** (transforms, history, time) |

---

## 5. States & interaction affordances

| State | Treatment |
|-------|-----------|
| idle | `line-2` stroke, `surface` fill |
| hover | stroke → lens color at 60%, subtle lift shadow |
| selected | lens-color stroke + a soft outer **halo** ring (lens color @ ~18% alpha) |
| dragging | halo + drop shadow; snap-free (positions are user-owned, per the spatial-canvas rule) |
| spawning a relation | rubber-band line in `accent` from source toward cursor until it lands on a target |
| invalid target | rubber-band turns `warn`; release cancels |

Selection and rubber-band use `accent` (terracotta) so the *action* color is distinct from the
*lens* color — you always know "this is me editing" vs "this is the lens."

---

## 6. Canvas chrome

- **Background:** `surface`, with an optional faint dot-grid (`line` @ low alpha) for spatial
  reference — off by default, toggle later.
- **Kernel-invariant readout:** a small `ok` chip pinned to a corner — `✓ kernel · N things · M
  dependencies` — the convergence spine, always visible (from the spec).
- **Lens switch:** the three lens identities as a segmented control; switching recolors chrome
  and re-gates structural detail, never mutates the model.

---

## 7. egui mapping

- A `theme` module holds the palette as `Color32` constants and a `lens_color(Lens) -> Color32`.
- Draw helpers on `egui::Painter`: `circle_filled` / `circle_stroke` (discs, boundary, ports),
  `line_segment` + a small `arrow_head` path (relations), `dashed` ring for aggregate
  (`Painter::add(Shape::dashed_line(...))`).
- Sizes (v0, tune in-GUI): system radius 34px; sub-part radius 12px; env square 22px; port dot
  4px; idle stroke 1.5px, boundary stroke 2.5px, bond 2.5px, dependency 1.5px.
- Hit-testing: `Rect`/distance checks per element for drag and relation-spawn; positions persist
  on the model's `Transform2d` (user-owned; `generate()` seeds new entities only).

---

## 8. Scope of v0 (what we build first)

Klir layer only, on the real canvas: **discs (things) you can drag**, **undirected relation
lines** between them (neutral — the pseudo-constructivist play mode), the **circle/square**
grammar, the palette, and the kernel-invariant chip. Bunge (composition/environment, bonds,
aggregate state) and Mobus (boundary ring, ports, directed typed flows) layer on after the Klir
core feels right. Documented here so each layer has a fixed target before it's coded.

---

## 9. Creation model — gestures map to the math (and the parked fallbacks)

Elements aren't a flat palette of placeable types; they have **three birth modes**, and the
gesture for each mirrors the *arity of the underlying mathematical act*:

| Birth mode | Math act | Gesture | Elements |
|------------|----------|---------|----------|
| **PLACE** | add an element to T / composition (nullary — "exists, here") | **double-click** at a point | thing · component · nested subsystem |
| **CONNECT** | add a pair to R / structure / flows (binary — needs two relata) | **drag between** two nodes | neutral relation (Klir) · directed typed-by-kind bond (Bunge) · typed flow (Mobus) · source/sink (drag to empty) |
| **DERIVE** | a *consequence*, not authored | none — rendered by the lens | boundary (from composition/env) · interface port (from a flow crossing) |

The key property: **lenses accrete *meaning*, not *placeable types*.** Bunge/Mobus richness is
either an **overlay** (the same kernel rendered with more) or a **property set on an edge**
(substance/usability, chosen contextually after a CONNECT) — never a new placement tool. So the
gesture vocabulary stays fixed at **place · connect · (auto-derive)** all the way to Mobus, and
no Gaphor-style toolbox is needed (a toolbox solves *type-selection among many placeable types* —
a problem this grammar doesn't create).

**Chosen for v0:** PLACE = **double-click**, guided by the empty-state copy. Keeps the gesture
faithful (a point makes a point in T), spatial (you choose position as you place — position is
user-owned from birth), and chrome-free.

**Parked fallbacks (pivot here only if double-click proves unintuitive in use):**
- **Draggable "thing" token** — one self-announcing element you drag onto the canvas (D&D
  tactility, +1 bit of standing chrome). Not a palette.
- **Contextual 2-way on double-click** — only in Bunge+ where a second *placeable* node exists
  (thing vs environment square); a tiny radial/menu, not a toolbox. Preferred even then over a
  persistent palette.
- **Explicit `＋ Add` button** — most discoverable, but splits create-from-position and adds chrome.
- **Source/sink default** = born *relationally* (drag a boundary-crossing flow to empty space),
  since a source is defined by what it feeds — keeps it out of the placement path entirely.
