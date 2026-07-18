# Fidelity Audit — Klir & Bunge (2026-06-27)

> **Status: completed egui-era audit; code pointers stale, findings live.** This
> was a one-shot source-fidelity audit of the egui canvas (`src/bin/canvas.rs`),
> resolved in the 2026-06-27 A-block + B8 pass. The code references predate the
> web rebuild, but the "Still open" faithfulness items (interaction `⋈` +
> self-loops, edge strength, internal/external split, n-ary relations) remain
> open reference for lens work and are tracked against `docs/design/lens-palettes.md`.

Two source-grounded auditors checked the canvas (`src/bin/canvas.rs`), the math view, and the
design grammar against the primary texts (`klir-facets.md`, Bunge *Treatise* Vol. 4). Headline:
**the code is a faithful, minimal rendering of each tradition's core; most fidelity debt is in
(a) design-doc prose that over-claims and (b) a few features the doc already promises but the
code hasn't built.**

## What's faithful (confirmed against the text)
- **Klir** K1 `S=(T,R)`, K2 undirected/neutral rendering, K3 named-relation family (`R = {set of relations}`), K5 no-bond/no-heap (any relation ⇒ a system).
- **Bunge** B1 `σ=⟨C,E,S⟩`, B2 `C∩E=∅`, B3 derived `E` (bonded externals only), B4 boundary excluded (Mobus-only), B5 bond `B` vs mere relation `B̄`, B7 directed bonds (`a ▷ b`).

## Fidelity debt

### A. Honesty / accuracy fixes (cheap — prose + small code)
| ID | Issue | Fix |
|----|-------|-----|
| **K9 / E3** | Doc says Klir's relata are *"variables"* (that's GSPS, Ch. 4) while the tool models concrete **things** (common-sense `S=(T,R)`, Ch. 1–2). Category error. | Declare the tool implements the **common-sense definition; relata = things**; **delete "among variables"** from the canonical gradient. |
| **K7** | Framing Klir's constructivism as a detachable *"play mode"* is **not faithful to Klir** (he held it as a substantive position). | Relabel as our **editorial departure**: realist kernel by our choice; Klir's constructivism noted, not adopted. Stop calling the demotion "faithful." |
| **K4** | Klir relations are **ordered tuples** by definition; symmetry is a *property*, not the primitive. Rendering pairs as unordered `{a,b}` misstates him. | Math view: show Klir pairs **ordered `(a,b)`** like the other lenses. Keep the undirected *line* — but justify it as "neutral system: no input/output declared" (the directed/neutral distinction), not "unordered." |
| **E1** | "Klir = neutral" overclaims. Klir has **both** directed and neutral system categories; neutral is the *default when no I/O is declared*, not anti-direction. | Soften: "we render the neutral case." (Strengthens convergence: direction is *available* in Klir, *recovered* in Bunge.) |
| **K8** | Binary-only; Klir's `R` is general **n-ary**. | Disclose in the math panel/doc: "binary fragment of Klir's n-ary R." (Hyperedges = later.) |
| **B6** | Aggregate warning cites "Def 1.1" loosely. Def 1.1 = *"composed of at least two **different connected** things"*; the heap is the *unbonded collection* of §1.1. | Reword the citation; honor "**different**." |
| **Extra-7** | The `{ } Math` toggle tooltip is hardcoded `S = (T, R)` regardless of lens. | Make it lens-aware. |
| **K1** | `R ⊆ T × T` note is the simplest case (T a single set). | Annotate as the simplest relational form. |

### B. Feature fixes (bigger — code catches up to the design doc / text)
| ID | Issue | Fix |
|----|-------|-----|
| **B8** | **Biggest gap.** No **kind taxonomy** / "*n* directed graphs, one per kind of connection" (mechanical/chemical/informational/social). A free-text `name` ≠ Bunge's typed connection. Design doc already commits to this; code doesn't. | Add a `kind` enum on relations (distinct from `name`); group the Bunge math `S` into one relation-set per kind (`B_mech`, `B_chem`, …) — Bunge's typed directed multigraph. |
| **B7 / Extra-2** | Only one-way arrows; can't express Bunge's **interaction `a ⋈ b`** (mutual) or **self-action/feedback** (`tgt != src` forbids self-loops). | Add bidirectional/interaction rendering; allow self-bonds. |
| **B9 / Extra-1** | Math `S` as named relations is the legit *minimal (qualitative) model*, but drops **edge strength/weight** and the "structure presupposes ≥1 bond" point (`S=∅` when no bonds). | Optional per-bond strength; show `S = ∅` when bond-free; label the panel "minimal model." |
| **Extra-6** | **Internal vs external structure** (C↔C vs C↔E) is in the text and computed but unsurfaced. | Cheap faithful addition to the Bunge math panel. |

## Resolved (2026-06-27)
- **A-block**: K4 (Klir pairs now ordered `(a,b)`; undirected line = neutral case), B6 (Def 1.1 citation: "≥2 *different connected* things"; heap = §1.1), Extra-7 (lens-aware Math tooltip), K8/K1 (binary-fragment + simplest-case disclosures in the Klir note).
- **K9 / K7** (honesty): "among variables" deleted from the gradient (relata = *things*, common-sense `S=(T,R)`); the realist-kernel demotion relabeled as our **editorial departure** from Klir's constructivism. Propagated to archive/design-system.md §9 + memory.
- **B8** (typed-by-kind): `Kind` enum on relations (mechanical/chemical/informational/social); `K` cycles the kind of a selected bond; Bunge colors bonds by kind and groups `S` into one relation-set per kind (`mechanical = {…}`, `chemical = {…}`, …). Bunge's typed directed multigraph, implemented.

Still open: B7/Extra-2 (interaction `⋈` + self-loops), B9/Extra-1 (edge strength; `S=∅` when bond-free), Extra-6 (internal/external structure split), K8-full (n-ary/hyperedges).

## Recommended order
1. **A-block honesty/accuracy fixes** (prose in archive/design-system.md + the propagated docs; small code for K4 ordered pairs, Extra-7 tooltip). Restores accuracy of what we already shipped.
2. **B8 typed-by-kind** — the one real missing Bunge primitive; code catches up to the doc.
3. **B7/Extra-2 interaction + self-loops**, then the rest (weights, internal/external split, n-ary) as warranted.

Full agent reports archived in this session's transcript.
