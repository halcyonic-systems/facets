# Decomposition Foundations — the 8-Tuple Math Under Option B

*Status: RESEARCH, 2026-07-18. Tracking issue: #89. The mathematical layer beneath
`hierarchical-decomposition-investigation.md` (PROPOSED), which surveyed the
flat-by-construction ground truth and recommended Option B (decomposition by
reference). That doc answers "which mechanism"; this one answers "what must be
true, stated over our Lean-specified 8-tuple, before any of it is implemented."
Per the implementation gate recorded in the investigation's §5: the math is done
from `Tuple.lean`'s 8-tuple ⟨C, N, E, G, B, T, H, Δt⟩ (the semantic authority),
not the book's printed 7-tuple.*

**Non-goals, explicit:** no grammar change, no kernel change, no nesting in the
neutral spec. This doc's job is to make the gate's opening condition precise.

*Gate met 2026-07-20 (SSF `Systems/Core/Decomposition.lean` merged). This PR is
step 2 of §7's dependency order: the kernel grows `System.child_model:
Option<ModelRef>` plus the pairwise boundary-contract check (`crates/bert-core/
src/decomposition.rs`), transcribed row-for-row from the merged Lean. No
serialization (step 3), SL grammar (step 4), or UI (step 5) yet.*

---

## 1. The question

The neutral spec (`CanvasModel` minus view state) is flat by construction, and
the kernel's every active path assumes it. Decomposition — Mobus Eq. 4.3's
`c_{i,j,l} = S_{i,j,l+1}` — is the point where SL stops being flat. The
investigation established that the mechanism should be *by reference* (each
level stays a flat model; hierarchy is a relation over models, gated by a
parent↔child boundary contract). What remains open, and what blocks
implementation, is the contract's exact content: **what does the substitution
do to each slot of the 8-tuple, and which parts must the Lean prove before the
kernel grows a field?**

## 2. The substitution, slot by slot

Fix a parent system `S = ⟨C, N, E, G, B, T, H, Δt⟩` (one level, one flat
model) and a complex component `c ∈ C` to be decomposed into a child system
`S′ = ⟨C′, N′, E′, G′, B′, T′, H′, Δt′⟩`. Mobus's footnote that the
environment is *relative to each level* is the key that determines most slots.

| Slot | At the seam |
|---|---|
| **C′** | The child's own components — invisible to the parent. The parent sees `c` as atomic (`Complexity::Atomic` today); decomposition replaces that opacity with a model, not with parent-visible detail. |
| **E′** | Derived, not authored freely. The child's environment is the parent's *interior neighborhood of `c`*: every parent-level entity (sibling component, or parent-boundary interface for flows that cross the parent membrane through `c`) that a flow connects to `c`. Nothing else may appear in `E′` — a child bonding with something its parent slot never touches would falsify the substitution. |
| **G′** | `G′ = ⟨Src′, Snk′⟩` must **biject** with the flows incident to `c` in `N`: each inbound flow at `c` becomes exactly one child source, each outbound flow exactly one child sink, preserving substance kind and direction. This bijection IS the boundary contract (§3). |
| **N′** | The child's internal flow network — free, subject only to its own level's lens verdicts. No parent constraint beyond the terminals fixed by `G′`. |
| **B′** | The child's boundary. `c`'s interface designation in the parent (membership in the parent's I) does not transfer inward; instead, the child components that receive/send the contract flows are exactly the child's interface members `I′ ⊆ C′`. (Attribution note: interfaces-as-components-of-the-boundary-subsystem is the book's claim, Ch. 4; the flat `I ⊆ C` subset is the Lean formalization's convention — see the concordance, row 9.) |
| **T′** | The refinement obligation. Leaf case: `T′` is one atomic work process (the simplest-process stopping rule F6 — combine, split, impede, propel, buffer, with no internal decision rules). Composite case: the parent's `T` at `c` should be *recoverable* from the composition of the children's `T′`s — this is the aggregation semantics that does **not** exist yet and is explicitly deferred (the multi-timescale thread). Structural decomposition must not wait for it. |
| **H′** | The child keeps its own history record. **H = History, not hierarchy** — the level structure lives in the recursion (the tree of tuples), never in a tuple slot. Nothing about `H` crosses the seam. |
| **Δt′** | The child's characteristic timescale, typically ≤ the parent's. Cross-level `Δt` consistency is part of the deferred dynamical composition, not of the structural contract. |

The residue of this table: **exactly two slots carry the seam** (`E′` derived
from the parent's neighborhood of `c`; `G′` bijective with `c`'s incident
flows), one slot carries the deferred hard problem (`T′` aggregation, with
`Δt′` attached), and the rest are level-local. That is why decomposition by
reference is cheap: the contract is small.

## 3. The boundary contract, stated precisely

Let `flows(c) ⊆ N` be the parent flows incident to `c`, split as
`in(c) ⊎ out(c)`. The contract is a bijection

```
β : Src′ ⊎ Snk′ ≅ in(c) ⊎ out(c)
```

such that (i) `β` restricts to `Src′ ≅ in(c)` and `Snk′ ≅ out(c)`
(direction-preservation), (ii) `β` preserves substance kind
(matter/energy/message), and (iii) every element of `Src′ ⊎ Snk′` is hit by a
child flow whose child-side terminal lies in `I′` (the contract lands on
interface members, honoring the interface-as-subsystem reading).

Without (i)–(iii) the two models are just adjacent diagrams; with them, the
reference is Eq. 4.3's substitution made literal. This is the Lean
`WellFormed` bijection (children ↔ composition) lifted from the in-place tree
to the reference seam — same shape, different carrier.

Two structural consequences worth pinning now:

- **The contract is checkable per pair**, parent-side only needing `flows(c)`
  and child-side only `G′` and `I′` — no global tree pass. A reference tree is
  well-formed iff every edge's contract holds, which is why each level can keep
  validating with today's machinery unchanged.
- **A name genuinely earns its place here** (lexicon rule C3): the child model
  must know *which* parent slot it decomposes only through the reference edge,
  never through content — the same model may in principle decompose two
  different components whose flow signatures match. Reuse falls out of the
  formulation for free; whether to allow it is a design decision, not math.

## 4. What this does to the neutral spec

Two candidate shapes for nesting in `CanvasModel`:

1. **Inline children** (`Thing` gains `children: Vec<CanvasModel>` or similar)
   — the neutral spec becomes recursive. This is Option C's data shape: it
   forces every consumer (project, operational, compose, tether, serialization,
   goldens, round-trip contract) to grow a recursion story simultaneously, and
   the digit-for-digit SL round-trip contract would need a nested-text form in
   the same breath.
2. **By reference** (`Thing` gains `child_model: Option<ModelRef>`) — the
   neutral spec stays flat per model; the only new spec content is an opaque
   stable reference plus, at load/validation time, the §3 contract check
   against the referenced model. Serialization, diffing, goldens, and the
   round-trip contract survive unchanged; a reference is just one more
   attribute that must round-trip.

The math is indifferent between them (both implement the same substitution);
everything else is not. The investigation's Option B verdict holds at the spec
level for the same reason it held at the kernel level: the contract is the
only load-bearing addition, and by-reference isolates it.

`ModelRef` requirements (design inputs, not yet decisions): a stable identity
that survives renames (not a display name), a resolution story for the web
face (models live in browser storage/files), and a defined failure mode when
the referent is missing or the contract fails (a validation issue, never a
silent drop — the kernel's existing loud-failure discipline applies).

## 5. What the Lean must prove FIRST

The gate's opening condition, as three statements over
`systems-science-foundations` (in dependency order):

1. **The seam structure.** A `Decomposition` object: parent tuple, chosen
   component, child tuple, the bijection `β` with properties (i)–(iii) of §3.
   This is new — `RecursiveSystem`'s `WellFormed` states the in-place
   children↔composition bijection but has no notion of a *derived environment*
   (`E′` as the parent's neighborhood of `c`). The 8-tuple's first-class `E`
   is exactly what makes this statable — the printed 7-tuple, with environment
   folded into `G`, cannot even express "the child's E is determined by the
   parent's interior." (The Lean improvement pays off precisely here.)
2. **Assembly.** A tree of flat systems linked by `Decomposition` edges
   assembles into a `RecursiveSystem`, and the assembled tree is `WellFormed`.
   This is the theorem that says by-reference and in-place are the same
   mathematics — Option B loses nothing against the fidelity bar.
3. **Substitution soundness (Eq. 4.3).** Substituting a contracted child for
   its component preserves the parent's structural well-formedness (flow
   conservation at the seam: every parent flow at `c` continues into exactly
   one child flow through `β`). Stated structurally only — no claim about `T`
   composition or `Δt`, which are the deferred dynamical face.

Explicitly *not* required first: verdict-preservation across levels (each
level is validated at its own rung by construction — conjecture it, don't
block on it) and any aggregation semantics for `T′`/`Δt′`.

## 6. SL sub-paragraph syntax — sketch only, gated

Gated on: the kernel field existing, the §5 Lean statements existing, and the
spec deciding the reference shape. Nothing below is grammar. Two forms match
the two data shapes:

```text
# reference form (matches Option B — the child is its own model/file)
component Furnace primitive Combining interface
  decomposes "furnace-interior"        # ModelRef, resolved at load

# block form (matches Option C — shown only to mark the road not taken)
component Furnace {
  system "Furnace" : Concrete/Technical
  component Burner primitive Propelling interface
  ...
}
```

The reference form keeps SL line-oriented and each SL file one flat paragraph —
Mobus's own presentation (one system paragraph per level, the recursion in the
*index scheme*, not the page layout). The block form would make SL recursive
text and re-couple everything Option B decoupled. When the gate opens, the
reference form is the presumptive candidate; `decomposes` earns its place in
the lexicon only when `ModelRef` exists in the kernel (rule C3, same as
`system "Name"` waited for #84).

## 7. Honest dependency order

1. Lean: `Decomposition` seam structure + assembly theorem + substitution
   soundness (§5.1–5.3) — *the gate*.
2. Kernel: `Thing.child_model: Option<ModelRef>` + `boundary_contract`
   check surfacing as validation issues.
3. Neutral spec: serialization + round-trip contract for the reference
   attribute; fixture.
4. SL: `decomposes` reference form (§6).
5. Web: enter/exit + breadcrumb + "decompose this component" seeding a child
   whose `G′` is pre-filled from `flows(c)` (turns bert-lenses#5's
   one-primitive-per-component rule from a dead-end prompt into an action).
6. Deferred, tracked separately: `T′` aggregation / multi-timescale
   composition (`Δt`), verdict-preservation as a theorem, Option-D flattened
   zoom-out views.

Each step is independently shippable; none may start before the step above it
lands. That ordering is the doc's one hard claim: **the gate is Lean-first**,
because the contract is the only new mathematics and everything downstream is
its transcription.
