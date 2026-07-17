# The bert-lenses Kernel as a System

*What the kernel actually is, what it actually computes, and — honestly rated — how much of the LLM-integration story (`docs/design/llm-integration-research.md`) it can really bear. Written 2026-07-16 as a grounded verification pass: every claim below was checked against the source, with file:line, and rated by confidence. Read this when you want to trust (or distrust) the substrate before building on it.*

---

## What the kernel is (and isn't)

The kernel is the Rust core in `crates/`, compiled to WASM, that **owns systemhood** — it is a *decision procedure*, not a database and not a renderer. Given a model, it decides what is well-formed, what counts as a system vs an aggregate, what each faithful lens says, and (via the compose engine) what a conservation-faithful run does. Its verdicts are grounded in a machine-checked Lean formalization (`systems-science-foundations/`), not in house style. The React face computes **nothing** about systems — it renders kernel verdicts (`web/src` = face, `crates/` = truth).

Five crates:

| Crate | Role |
|---|---|
| `bert-core` | The truth core: `WorldModel`, all validators, `project`, mode-gating (`validate.rs`, `lib.rs`) |
| `bert-canvas` | The lens/authoring domain: `CanvasModel`, `lens_facts`, `describe`, `analyze` (`lenses.rs`, `canvas.rs`) |
| `bert-tether` | Boundary interface: CSV import, run manifest, forcing |
| `bert-compose` | The dynamical engine: conservation-faithful run (engine-only, wasm-clean) |
| `bert-lenses-kernel` | The JS↔wasm boundary — marshaling only; frozen append-only surface (`API.md`) |

---

## What it actually computes — the three things the LLM story rests on

All three were verified by direct read. They are **richer than the research doc claimed**, not thinner.

### 1. `describe(model, lens)` → the named per-lens formal object  — VERIFIED (rich)

`lenses.rs:305-347`. Returns a `#[serde(tag="lens")]` discriminated union — the model typeset in **each lens's own formal notation, with the actual named structure**, not just counts:

- **Klir** `S = (T, R)`: `things`, `relations`, `directed`, `neutral`, `note`.
- **Bunge** `σ = ⟨C, E, S, M⟩` (CESM): `composition[]` (named), `environment[]` (named), `endostructure`, `exostructure`, `bondage`, `mere_relations`, `boundary_components[]` (named), `verdict`, `mechanism_note`.
- **Mobus** `S = ⟨C, N, E, G, B, T, H, Δt⟩` (8-tuple): `c[]` (named), `n`, `e_objects[]` (named), `milieu_note`, `g`, `b_interfaces[]` (named), `porosity`, `perceptive_fuzziness`, `t_note`, `h_note`, `dt_note`, `self_loop_conflicts[]`.

Counts are "read off the same kernel facts the canvas renders — never re-derived" (`lenses.rs:344`). **This is the load-bearing fact for lens-faithful LLM reasoning: the kernel literally hands you the model in Bunge's or Mobus's vocabulary, named. The LLM never has to *know* a lens — it's fed the lens's own object.**

### 2. `lens_facts(model)` → faithful per-element facts  — VERIFIED

`lenses.rs:83-106` (struct), `:124` (fn). Everything the renderings + a critic need, keyed to canvas ids: `boundary_thing_ids` (components with an external flow), `environment_thing_ids`, `orphan_env_thing_ids`, `authored_interface_thing_ids`, `boundary_props` (porosity/fuzziness), `aggregate` (the Bunge Def 1.1 verdict, **surfaced verbatim from `validate_mode(Structural)`**), `edges: EdgeFact[]`, `ports: PortFact[]`. Each `EdgeFact` (`:33-48`) carries `bond`, `kind`, `locus` (endo ∈ N / exo ∈ G — kernel-computed), `self_loop`, and `mobus_ok` (false iff a self-loop with no Mobus preimage — a real cross-lens incompatibility the tool *states* rather than hides).

### 3. `validate_mode(model, mode)` → Lean-grounded legality per lens  — VERIFIED

`validate.rs:122-139`. This is the hard guarantee. It never asks "is the model valid" — it asks "may this model be authored *as* this mode," each rung adding its own faithful-view hypothesis proven in `ViewGeneration.lean`:

- **Core**: on-ness (every interaction endpoint resolves) — via `validate`'s reference checks.
- **Structural (Bunge)**: `check_bond` (`:143`) — requires ≥1 bond between *distinct* components, else an "aggregate" error. Mirrors Lean `Kernel.HasBond`.
- **Operational (Mobus)**: `check_self_loops` (`:158`) — no self-dependency (`k ≠ o`, Mobus §4.3), else error, canvas-navigable via `.with_subject`. Mirrors Lean `Kernel.Irreflexive`.
- **Full**: self-loops + `check_dynamical_face` (warns if T/H/Δt nowhere populated).

**Crucial subtlety (verified, `:107-116`): the rungs are parallel lenses, not a tower.** Structural needs a bond, Operational needs irreflexivity, but *neither inherits the other* — they share only Core's on-ness. So "valid in Bunge" and "valid in Mobus" are independent, Lean-proven claims about the same model. This is precisely what makes cross-lens disagreement meaningful.

### 4. `analyze(model, lens)` → all three from ONE projection  — VERIFIED (this is the substrate)

`lenses.rs:356-407`. Bundles `{validation, issue_targets, facts, description}` from a single projection. Its own doc comment: "the atomic canvas verdict … one round trip, not a three-call waterfall that re-projects the same model each time." `issue_targets` are resolved here to canvas `{thing, relation}` ids via the projection's id maps — so a critic's claim can point at the exact element. **This is the `ModelContext` substrate the research doc calls for, already built — it just isn't exposed to an LLM yet.**

---

## The layered guarantee — honestly rated

| Layer | What it covers | Confidence |
|---|---|---|
| **Hard / Lean-grounded** | Structural legality: reference integrity, the bond requirement (Bunge), irreflexivity (Mobus). The kernel **will reject** ill-formed or out-of-lens structure. | **Solid** — machine-checked; `check_bond`/`check_self_loops` mirror Lean theorems. |
| **Derived & translated** | Boundary identity set, endo/exo locus, aggregate verdict, ports, per-edge facts — computed from the projection, surfaced to canvas ids, never re-derived in the face. | **Solid** — verified in `lens_facts`; single source. |
| **Declared & validated** *(honesty)* | Bond-vs-mere is **author-declared** (`is_bond`; Lean criterion `FlowInducesAction` = a flow that modifies history is a bond), checked for consistency — **not derived from dynamics**. An LLM proposing bonds proposes a *declaration*, checked for legality, not something the kernel infers from behavior. | Real but partial — the kernel validates the declaration; it doesn't compute bondhood from a run. |
| **Noted / thin** *(honesty)* | The dynamical face T/H/Δt is **stringly-typed notes in v2.0** (`validate.rs:177` — typing deferred); `describe`'s `t_note`/`h_note`/`dt_note` are prose, and `check_dynamical_face` only *warns*. The structural tuple (C·N·E·G·B) is real; the dynamical slots are not yet typed structure. | Thin — do not over-trust the dynamical face as machine-checked. |
| **Was missing → LANDED** *(2026-07-17, #66)* | Reachability, dead-end, and duplicate-*edge* checks now live in `validate.rs` (`check_reachability`, `check_dead_ends`, `check_duplicate_edges`), all **Warning**-severity, surfaced through `analyze`→`issue_targets` (`check_duplicate_ids` still catches duplicate *ids* only). | Closed gap — Warnings, not Errors, so legitimate absorbing states stay legal. |

---

## What this means for feeding the LLM (answering the skepticism directly)

**What the kernel CAN reliably feed an LLM, today, from one `analyze` call:** the model as each lens's *named formal object* (`describe`), the faithful per-element facts (`lens_facts`), and a Lean-grounded legality verdict (`validate_mode`), all keyed to canvas elements. That is real, deterministic, rich grounding — the LLM reasons over kernel-*translated* structure, not a raw graph it has to interpret. The lens-vocabulary guarantee (research doc §11) is **as solid as claimed**: the kernel does speak each lens, by name.

**What it CANNOT do yet, and where the LLM story is therefore thinner than the confident prose suggested:**
- It cannot derive bondhood from behavior — bonds are declared + checked, so LLM reasoning about "is this really a bond" is reasoning about a *declaration's plausibility*, not reading a kernel-derived fact.
- It cannot ground reasoning about the dynamical face — T/H/Δt are notes. LLM analysis of *dynamics* has thin kernel support until those slots are typed.
- It cannot yet catch dead-ends / unreachable states / duplicate edges — so a structural critic depends on **#66** landing first (which is exactly why the research doc puts the kernel checks *before* the LLM leg).

**Honest bottom line:** the substrate is real and *richer* than the research doc claimed for the two things that matter most — lens vocabulary and per-element structural facts. The caveats are narrow and specific: the dynamical face is thin, bondhood is declared-not-derived, and three graph checks are missing (#66). None of these undermine the analysis-first / lens-faithful plan; they scope it. Trust the structural + lens-vocabulary grounding; treat the dynamical face as aspirational; land #66 before leaning on structural critique.

---

## Where the guarantees are documented (cross-refs)

- `crates/bert-lenses-kernel/API.md` — the frozen wasm boundary (every exported fn's shape + error contract).
- `docs/canvas-architecture.md` — the canvas/face side.
- `systems-science-foundations/Systems/` — the Lean proofs the verdicts mirror (`Klir/ViewGeneration.lean`, `Mobus/Tuple.lean`, `FlowNetwork.lean`).
- `docs/design/llm-integration-research.md` — the LLM story that rests on this kernel (its §4 substrate and §11 lens-fidelity claims are the ones this doc verifies).
