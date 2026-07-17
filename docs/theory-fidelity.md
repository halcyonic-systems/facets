# Theory fidelity — what each lens takes, drops, and why

*For a reader already convinced the tool is useful and now assessing the quality of the theory underneath — independently, or with an LLM/expert's help. Every claim below cites file:line so it's checkable against the current source, not taken on faith. A secondary, harder-nosed reading (a scholar looking for the weak points) is folded in where the two audiences ask the same question; where they diverge, this doc favors the assessing reader.*

## What the kernel actually is

The kernel (`crates/bert-core`, compiled to WASM) is a decision procedure, not a summary or a metaphor. Its verdicts are grounded in a machine-checked Lean formalization (`systems-science-foundations/Systems/Klir/ViewGeneration.lean`), not in house style or a reading of the source texts alone. One `Kernel` object (a `(T, R)` pair under `ActsOn`) generates three faithful views by three Lean-proven maps:

- `Kernel.toKlir` — unconditional (every kernel is a valid Klir system).
- `Kernel.toBunge`, gated on `Kernel.HasBond` (`ViewGeneration.lean:115,119`) — a system requires at least one bond between distinct components; an unbonded collection is an aggregate (Bunge Def 1.1).
- `Kernel.toMobus`, gated on `Kernel.Irreflexive` (`ViewGeneration.lean:163,203`) — no interaction depends on itself (Mobus §4.3, `k ≠ o`).
- `Kernel.toMobus_toBunge` (`ViewGeneration.lean:285`) — the one proven composite: when *both* preconditions hold, going Mobus-then-Bunge factors through Klir. This is the only entailment the Lean file proves between the two gated views; `HasBond` and `Irreflexive` are otherwise independent predicates. There is no Lean theorem that `HasBond ⟹ Irreflexive` or the reverse — see `docs/on-the-word-ladder.md` for why that matters to how you should read "mode" language elsewhere in this repo.

Rust mirrors this exactly: `validate_mode` (`crates/bert-core/src/validate.rs:123-146`) gates entry per mode — `check_bond` for Structural (`:150-162`), `check_self_loops` for Operational (`:165-179`). `crates/bert-core/src/transition.rs:6-9` states the poset precisely: "a meet-semilattice (tree-shaped); no joins by design — Core is the meet of every pair, Structural and Full are parallel leaves with no join." Treat that sentence as the canonical statement; everything else in the repo that talks about modes should agree with it.

## Per-tradition: take / drop / where / why

**Klir — General Systems Problem Solver, `S = (T, R)`**
- *Takes:* things and relations, undirected, arity-agnostic. Exposed via `describe(model, Klir)` (`crates/bert-canvas/src/lenses.rs:305-347`) as `things`, `relations`, `directed`, `neutral`.
- *Drops:* direction, substance/kind, bond-vs-mere distinction — everything Bunge and Mobus add. Klir is the unconditional floor; every kernel is a valid Klir system, which is precisely its scope: relational structure only.
- *Where:* `Kernel.toKlir` (Lean, unconditional) → `Mode::Core` (`lib.rs:634-644`) → no gate in `validate_mode` beyond on-ness (reference integrity).
- *Why this scope:* Klir's 1967 system is a single relational structure classifying things by relation-membership, not GSPS's later multi-level hierarchy (metasystem, structure system, etc.). This is a named scope decision — the kernel takes the 1967 kernel-system, not the full GSPS ladder of system types (see the perspectival-realist scope statement below).

**Bunge — CESM, `σ = ⟨C, E, S, M⟩`**
- *Takes:* composition (named components), environment (bonded externals), the bondage/mere-relation split, endo/exo-structure (locus), the aggregate-vs-system verdict. Exposed via `describe(model, Bunge)`: `composition[]`, `environment[]`, `endostructure`, `exostructure`, `bondage`, `mere_relations`, `boundary_components[]`, `verdict`, `mechanism_note`.
- *Drops:* mechanism as anything beyond a structural note (`mechanism_note` is prose, not typed structure), and everything outside bondhood/composition — materialist ontology commitments, emergence-as-process, historicity.
- *Where:* `Kernel.toBunge` gated on `Kernel.HasBond` (Lean) → `check_bond` (`validate.rs:150-162`) → `Mode::Structural`.
- *Why:* the bond-vs-mere predicate is author-declared, not derived from dynamics — `is_bond` is a declaration the kernel checks for legality against `HasBond`, not something computed from a run. `crates/bert-canvas/src/lenses.rs:37-39` states the Lean criterion directly: `FlowInducesAction` — a flow that modifies history is a bond. The kernel validates a claim about mechanism; it does not compute mechanism.

**Mobus — 8-tuple, `S = ⟨C, N, E, G, B, T, H, Δt⟩`**
- *Takes:* components, endostructure (N), environment as first-class objects+milieu, exostructure (G), boundary/interfaces (B) with porosity and perceptive-fuzziness, and — thin — transformation/history/time-constant slots (T, H, Δt).
- *Drops (deliberately, stated in code):* T/H/Δt are "stringly-typed notes in v2.0 — typing deferred" (`validate.rs:177`). The structural tuple (C·N·E·G·B) is real, machine-checked structure; the dynamical slots are not yet typed structure, only prose.
- *Where:* `Kernel.toMobus` gated on `Kernel.Irreflexive` (Lean) → `check_self_loops` (`validate.rs:165-179`, `k ≠ o`) → `Mode::Operational`; `Mode::Full` adds `check_dynamical_face`, which only warns (never blocks) if no system populates T/H/Δt (`validate.rs:186-203`) — Full is the default view, so an empty face informs rather than blocks.
- *Why:* bert-lenses' own `CLAUDE.md` (`:28-34`) states the essential facts that get forgotten and must be cited from the Lean, not reconstructed from memory: **E (environment) is first-class**, **H is History, not hierarchy**, **Messages are copyable / not conserved** (unlike Material + Energy). Mobus's own knowledge is scattered across the book; `Systems/Mobus/Tuple.lean` is the single canonical, machine-checked source — a deliberate anti-hallucination discipline.

## Mode-stamp semantics

A `WorldModel.mode` field (`lib.rs:598-605`) records the lens an author committed to. "A mode is the lens an author committed to, not a constraint on the data: every model is a valid Core model regardless of this field" (`lib.rs:602-603`). `validate_mode` "never asks 'is the model valid'; it asks 'may this model be authored *as* a Mode'" (`validate.rs:110`). The stamp is descriptive of authorial intent, checked for consistency against the Lean-proven precondition for that mode — it does not retroactively make a model something it structurally isn't, and it is not a promotion mechanism: stamping Operational doesn't add Mobus content, it asserts (and the kernel checks) that the existing structure already qualifies.

The mode-transition machinery is honest about the shape. `transition.rs:16-22`: downgrade "strips, it does not restamp" — every out-of-mode field resets to a minimal witness, enumerated in a `LossWitness` so the transition is reversible field-for-field; upgrade "never edits: it checks the target edge's named hypothesis... and refuses with that name, leaving the required edits to the author." Neither direction invents structure on the model's behalf.

## The perspectival-realist scope statement

The kernel is the kernel of the **structuralist thing-relation lineage** — Klir, Bunge, Mobus, and the K ≅ **2** convergence thesis they instantiate. This is a scope claim, stated precisely, not a universal claim about systems science as a field:

1. **What each lens's gate actually certifies.** Each `describe()` output and `check_*` function targets a named, cited formal fragment of its tradition — never claims to *be* the tradition. A model passing `check_bond` has demonstrated the syntactic precondition Bunge's Def 1.1 requires; it has not been certified as materialist-ontologically correct, mechanistically complete, or emergence-faithful in the fuller sense of the *Treatise*. Similarly, Klir's Lean object is the 1967 single-structure kernel, not the full GSPS lattice of system types; Mobus's entry gate checks presence of irreflexive structure, not that operational commitments are semantically satisfied. The gates check *structure*, not *ontological furniture* — worth stating explicitly rather than letting a reader assume otherwise.
2. **The convergence is a convergence of one lineage, not of the field.** All seven traditions the K≅2 thesis surveys share the structuralist thing-relation lineage; second-order/autopoietic traditions — Varela's operational closure, Luhmann's communication systems, von Foerster's second-order observation — are outside its scope. Kernel **2** is the kernel *of a lineage*. The tool does not (yet, and makes no claim to) formalize operational closure or communication-as-the-unit-of-social-systems.

## The #5 collapse — a worked example of the honesty discipline

GitHub issue #5 (bert-lenses) decided how a component carries a Mobus work-process primitive, shipped 2026-07-11 (bert-core `adbc6ddb`, bert-lenses `f07b3d9`). It's a concrete modeling-granularity decision, not a philosophical argument — but it's a useful worked example of a discipline this repo holds itself to elsewhere: refuse rather than silently drop authored structure.

- *Take:* Mobus work-process granularity at exactly the resolution the 8-tuple licenses — one component performs one fundamental process. `AgentModel.primitive: Option<ProcessPrimitive>` (`crates/bert-core/src/lib.rs:1181`): "One component, one fundamental process: a component that seems to need two primitives is a signal to decompose further — the plurality belongs one level down, expressed as structure, never as a list on one node" (`lib.rs:1166-1170`).
- *Drop:* multi-process components as a representable primitive-level construct. A component doing two Mobus primitives is, structurally, two components with a bond between them — decomposition *is* the representation of the plurality, not a list attached to one node.
- *Where:* `AgentModel.primitive` was `Vec<ProcessPrimitive>` pre-#5, collapsed to `Option<ProcessPrimitive>`. Backward compatibility runs through `primitive_compat` (`lib.rs:1209-1234`): the legacy `primitives` array reads as empty → `None`, one entry → `Some`, and **more than one entry is refused at deserialization** — `lib.rs:1227-1231` cites "a component performs exactly one fundamental process — decompose it into subsystems (one primitive each) and re-save." A legacy file with a 2+ entry array will not load; it will not silently keep the first entry.
- *Why:* two disciplines converge. Decomposition faithfulness — a component doing two processes is a category mismatch with the 8-tuple unless it's actually two components, the same move as Bunge's bond/mere-relation split (plurality as more structure, not a richer label on one node). And refuse-don't-truncate — the repo-wide policy that the kernel errors loudly rather than silently drops authored content (see also `check_duplicate_edges`, and `LossWitness` on mode downgrade). The pre-#5 behavior in `validate_operational` took `.first()`; #5 replaced "drop the extras" with "refuse and name what to do about it."

## Honest boundary table

| Layer | What it covers | Confidence |
|---|---|---|
| Hard / Lean-grounded | Structural legality: reference integrity, the bond requirement (Bunge), irreflexivity (Mobus). The kernel will reject ill-formed or out-of-lens structure. | **Solid** — machine-checked; `check_bond`/`check_self_loops` mirror Lean theorems. |
| Derived & translated | Boundary identity set, endo/exo locus, aggregate verdict, ports, per-edge facts — computed from the projection, surfaced to canvas ids, never re-derived in the face. | **Solid** — verified in `lens_facts`; single source. |
| Declared & validated | Bond-vs-mere is author-declared (`is_bond`), checked for consistency against `HasBond` — not derived from dynamics. An LLM proposing bonds proposes a declaration, checked for legality, not something the kernel infers from behavior. | Real but partial. |
| Noted / thin | The dynamical face T/H/Δt is stringly-typed notes in v2.0 (typing deferred); `check_dynamical_face` only warns. The structural tuple (C·N·E·G·B) is real; the dynamical slots are not yet typed structure. | Thin — do not over-trust the dynamical face as machine-checked. |
| Reachability / dead-end / duplicate-edge checks | `check_dead_ends`, `check_reachability`, `check_duplicate_edges` in `validate.rs` (`:134-135,141`), all Warning-severity (legitimate absorbing states stay legal), surfaced through `analyze` → `issue_targets`. | **Landed 2026-07-17 (#66).** |

## Cross-refs

- `docs/kernel-architecture.md` — the fuller verification pass this doc's claims are drawn from (file:line audit of `describe`/`lens_facts`/`validate_mode`/`analyze`).
- `docs/on-the-word-ladder.md` — the three distinct senses of "ladder/rung" in this repo's docs and code, and which one is the actual vocabulary debt.
- `docs/design/llm-integration-research.md` §11 — how lens-fidelity is enforced for LLM-generated reasoning (`describe()` as injected, kernel-translated vocabulary).
- `systems-science-foundations/Systems/Klir/ViewGeneration.lean`, `Systems/Mobus/Tuple.lean` — the machine-checked source.
