# The life-cycle thread: consolidated prior art

**Status: RESEARCH.**

*2026-07-23. Consolidates work done 2025-02 → 2026-05 across three archive trees and two repos, most of it never reconciled with the others. Provenance record for [`mobus-lifecycle-formalization.md`](mobus-lifecycle-formalization.md), which is the position; this document is what already exists and what state it is in.*

Every claim here was read at source. Citations were checked against CrossRef and the citing literature. Where an archived document is wrong, it is marked wrong rather than quietly corrected — several are still live on disk.

---

## 1. What George actually wrote

**The paper.** *"Revising and extending the mathematical framework for defining a system"* — a working draft, not a publication. Vault: `operations/systems-science/mobus/mobus-book-revisions.md`.

Two parts:

1. **The 7→8-tuple revision, complete.** `E = ⟨O, M⟩` promoted to a coordinate. `O` unifies the previously hidden `Src`/`Snk` sets, on the stated ground that many environmental objects are both at once; that unification is what lets `G` fall from a tri-partite construction to a simple graph where arrow direction alone carries the source/sink distinction. `M` is the milieu — ambient variables with no discrete point of contact.
2. **The life-cycle extension, abandoned mid-sentence.** `S_{t+1} = S_t ∪ ⟨ΔS⟩`, `ΔS = ⟨ΔC, ΔN, ΔE, ΔG, ΔB, ΔT, ΔH⟩`, four operators sketched informally, one structural claim made — then **five empty stage headers** (Origination, Development, Maturation and Stable Operation, Decline, Dissolution) and an empty Discussion.

**An earlier "Milieu" document** by George preceded it and is referenced in the Feb-2025 material, proposing the environment promotion and explicitly wanting the framework to "explicitly handle system dynamics." Not recovered.

**George's own words on H**, recovered from the archive and matching what `bert/docs/h-element-theory.md` §1.4 attributes to him:

> "Knowledge is embodied in a system's structure. History is the capture of an instance of structure in a series of instances so the connection might start there. Since structure can change from instance to instance, the history of the system represents the knowledge of the system's **possible states and trajectories, that is probable state transitions**. In other words, knowledge of itself. Is that a place to start?"

He is describing a set-valued transition structure in prose. This is the single most important sentence in the archive for the direction the formalization took, and it is his.

**George's own H mechanism, unintegrated.** `history/history_implementation.txt` reads as his working notes (informal register; cites "the modified cascade EWMA developed by Mobus called the adaptrode algorithm," linking his own UW faculty page). Two options: a bounded stack with forgetting, versus EWMA/adaptrode consolidation into multi-timescale tacit memory (short / intermediate / long traces) — and he notes the smoothed long-term trace "could be periodically sampled to trace the history of the system life cycle."

⚠️ **This has never been reconciled with this repo's settled H position.** `bert/docs/h-element-theory.md` §10 lands on Buffering-primitive-only at agent-kind level; the adaptrode idea is architecturally different and is George's own. Anything claiming to honour his contribution has to address it rather than route around it.

---

## 2. The formalism already chosen: discrete inclusions

`ΔS ∈ F(S)` — a set-valued map of permissible transitions, adapted from Veliov's `x_{k+1} ∈ F(x_k, k)`.

**Citations, verified.** The archive conflates two real, distinct 1989 Veliov works. Cite both correctly:

- Veliov, V. M. (1989). *Approximations to Differential Inclusions by Discrete Inclusions.* IIASA Working Paper **WP-89-017**. — Extant; widely cited in the difference-methods literature. Not in CrossRef because IIASA working papers generally are not indexed there.
- Veliov, V. (1989). "Second order discrete approximations to strongly convex differential inclusions." *Systems & Control Letters* **13**(3), 263–269. DOI [`10.1016/0167-6911(89)90073-x`](https://doi.org/10.1016/0167-6911(89)90073-x).

**What was actually borrowed**, beyond the headline equation: Proposition 1 (local *s*-th order approximation ⟹ global (*s*−1)-th order, via Hausdorff-metric bounds, Lipschitz continuity, Grönwall, and support-function representation of reachable sets); and the **strongly-convex versus polyhedral distinction** — strongly-convex constraint sets admit constant-input second-order Runge–Kutta, polyhedral sets need an input jump per step and a two-parameter representation for the same accuracy.

**Also carry forward:** Zargham & Shorish (2022), *Generalized Dynamical Systems: Part I Foundations*, arXiv:2209.01306. Already named in [`dynamics-principled-position.md`](dynamics-principled-position.md) as "the citable modern restatement for engineers," so it is load-bearing in two places.

**Honest state: digestion, not construction.** Multiple synthesis passes (Veliov+Mobus; +Bunge; +Rashevsky/Bertalanffy), two extraction documents, and one outline — Shingai's companion paper *"Discrete Inclusions for General System Dynamics: Formalizing System Life Cycles in the Mobusian Framework"* (`gsd_formal_outline.md`, March 2025). **No proof was carried out. No `F(S)` was ever instantiated for any domain. No code exists.**

---

## 3. The φ phase machinery — newer, and not what the archive says

The phase-function formalism (`φ : S → {0..4}`, phase-specific constraint sets `F_φ(S)`, transition predicates `τ_{i,j}`, viability predicates `V_min` / `V_opt`) is **2026 work in the `bert` repo** — `bert/docs/lifecycle-dynamics.md` — not 2025 archive material. It appears in that form nowhere in the archive.

Consequently: **the φ machinery has never been reconciled with the Veliov proof apparatus.** Nobody has expressed `F_φ(S)` in Veliov's strongly-convex/polyhedral terms, which is where the approximation results actually live.

Three defects in it, all fixable, all found by formalizing against the kernel:

1. **`V_min` and `V_opt` are named placeholders in every file that mentions them.** Never defined mathematically, never critiqued, never implemented. `V_opt` — "true if S has reached an optimal configuration for its environment" — names no objective function anywhere. It is not a predicate; it is a promise of one.
2. **`F_φ(S) = {δ ∈ P(ΔS) | C_φ(S,δ)}` is ill-typed for the job.** The powerset is unordered, but the primitive changes **do not commute**: `removeComponent c` then `addFlow e` (with `e` incident to `c`) is illegal, while the reverse order is legal-then-invalidated. An unordered subset does not name a transition. It must be ordered sequences — `List Δ`, the free monoid.
3. **φ is defined two incompatible ways.** As a total function of the state, *and* by `φ(S_{t+1}) = { j | φ(S_t) = i ∧ τ_{i,j}(S_{t+1}) }` with "select the minimal `j > i`". If φ is a function of `S` alone, the `j > i` rule is contradictory — a system returning to a previously occupied structural state would have to be assigned a higher phase than before. The doc also lists irreversibility as a property that *emerges*; it does not emerge, it was assumed in that selection rule.

---

## 4. ⚠️ Contamination: `H = Hierarchy`

**H is History.** Files still carrying the error, all under `halcyonic-archive/2025/halcyonic-systems/org/research copy/basic/systemness/concepts/`:

`veliov-mobus-synthesis.md:26` · `veliov-mobus-rashevsky-synthesis.md:27` · `systems-theory-summary.md:33` · `comprehensive-systems-synthesis.md:40` · `veliov-extract.md:80` · `veliov-extract-comprehensive.md:147` · `core/life-cycle/lifecycle-dynamics-approach.md:18`

Correct in: `bunge-mobus-veliov-synthesis.md:117` · `process-primitives/frameworks/mobus_framework.md:110`.

The error was caught and fixed exactly once — during the 2026-05 migration into `bert/docs/lifecycle-dynamics.md` — and only in the file that migrated. **Re-read before reusing any archive synthesis document.**

---

## 5. Where the material lives

Three near-identical archive trees, **not equivalent**:

| Tree | Contents |
|---|---|
| `2025/halcyonic-systems/research/basic/systemness/concepts/` | the May 2025 original |
| `2025/june-reorganization/research_backup_20250629_115906/foundations/systems-theory-expanded/systemness/concepts/` | byte-identical dated backup; nothing new |
| **`2025/halcyonic-systems/org/research copy/basic/systemness/concepts/`** | the same `core/` subtree **plus a flat layer present nowhere else** — every Veliov extract and synthesis, `gsd_formal_outline.md`, `revising-system.md`, three abstracts |

**All the Veliov material is in the third tree only.** A directory-name search misses it entirely.

**Chain of custody:** `boundary-refinement.md` + PDF (Feb 17 2025) → `revising-system.md` (a word-for-word draft of George's paper, life-cycle section *already* empty headers at that point) → `gsd_formal_outline.md` (Mar 2025) → `bert/docs/lifecycle-dynamics.md` (May 2026).

**On the "correspondence":** despite its filename, `boundary_refine_george_questions.pdf` is *Shingai Thornton + Claude, "Refining The Boundary Object," Feb 17 2025* — eight questions posed **to** George. His replies are not archived. `boundary-refinement.md` shows a real exchange happened ("addressing George's note on their integration") but records only one side.

---

## 6. Dead ends, recorded so they are not re-walked

- **Catlab / Topos line.** `process-primitives/future_research/catlab_roadmap.md` + `catlab_prototype.jl` + `phoenix_cycles.md`: a fully-scoped three-phase plan to re-implement Troncale/Giammarco's Monterey Phoenix "Cycles" in Catlab.jl, pitched as a lead-in to a Topos Institute meeting. No evidence it was executed or that the meeting happened. The idea survives only as competitive-landscape framing in `bert-compose/POSITIONING.md`.
- **The boundary-formation function.** Feb 2025 proposed dissolving `B` into a formation function over interface properties, moving `I` into `C`. Sidelined then as "promising but not prioritized" — and now **superseded**: `Tuple.lean`'s `interfaces_sub : boundary.interfaces ⊆ components` gets the insight (interfaces *are* components) without dissolving `B`. See [`mobus-lifecycle-formalization.md`](mobus-lifecycle-formalization.md) §1.

## 7. Not yet swept

`process-primitives/{research_plan, synthesis, taxonomic_framework, lit_review, cross_domain_testing, system_science_perspective}.md` and `mobus_troncale_synthesis.pdf`. Also unrecovered: George's original "Milieu" document, and the body of `Quick thought — …md` (the Gmail export captured page chrome only; a referenced screenshot may hold it).
