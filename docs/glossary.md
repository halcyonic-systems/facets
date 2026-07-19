# Glossary

**Status: LIVE.** Fast definitions for the terms the docs use as load-bearing. Each is grounded in a fuller source; follow the link when the one-liner isn't enough. See the [quickstart](quickstart.md) for these terms in motion and the [terminology concordance](language/terminology-concordance.md) for the Klir·Bunge·Mobus lineage of each word.

### System

A thing-in-relation that holds under a tradition's precondition — not any collection of parts. Whether a described structure *is* a system is the kernel's verdict, decided per lens, never assumed. See [`theory-fidelity.md`](theory-fidelity.md).

### Lens

One of the three faithful views the kernel generates from a single model: Klir, Bunge, Mobus. They are not styles or skins — each is a mathematically faithful view entered through its own machine-checked [precondition](#precondition). Author once; read the model as any tradition. See [`design/lens-palettes.md`](design/lens-palettes.md).

### Bond / mere

Bunge's distinction between two kinds of relation. A **bond** couples distinct components so that one modifies the other's history (Lean criterion `FlowInducesAction`); a **mere** relation is any other relation, carrying no such coupling. Bond-vs-mere is author-declared and checked for legality against `HasBond`, not derived from a run. See [`theory-fidelity.md`](theory-fidelity.md) (Bunge).

### Conservation invariant (declared)

A conserved quantity or bound the *model* declares on its state space — not a premise the engine assumes. Conservation is one optional declaration among several possible invariants, per the adopted [dynamics position](design/dynamics-principled-position.md). The current engine interprets one such declaration (an additive invariant over ℝⁿ stocks).

### WorldModel

The mode-stamped artifact that Export writes: what the author asserts is true as of a given lens, and the object other tools consume. Its `mode` field records the lens committed to; it does not constrain the data (every model is a valid Core model regardless). See [`theory-fidelity.md`](theory-fidelity.md) (mode-stamp semantics).

### Save vs Export

**Save** keeps working canvas state — the shape mid-authoring. **Export** writes a mode-stamped [`WorldModel`](#worldmodel): a committed assertion under a lens. A [run ledger](#run-ledger) is neither; it is a result shown in the run panel, not a saved tier. See the README, "What this tool believes".

### Run ledger

The per-step accounting a run produces in the run panel: the declared [conservation invariant](#conservation-invariant-declared) tracked across the run, showing it holds (or where it breaks). A result, not a saved artifact.

### SL

The bert-lenses **s**ystem **l**anguage: a human-writable, line-oriented textual notation that compiles deterministically (a compiler, never an LLM) into a model. The third concrete syntax over the [neutral spec](#neutral-spec), alongside canvas and JSON. See [`language/`](language/).

### Systemhood

The property the kernel decides: whether a model holds as a system under a given lens, versus being a mere aggregate. The SL parser judges no systemhood — legality stays the kernel's verdict. See [`kernel-architecture.md`](kernel-architecture.md).

### Mode / lens

A **mode** is the lens an author commits a model to (Core, Structural/Bunge, Operational/Mobus, Full). The modes are parallel lenses sharing only Core's on-ness — a meet-semilattice, not a linear tower — so committing to one lens implies nothing about the others; each is an independent precondition over the same kernel. See [`theory-fidelity.md`](theory-fidelity.md).

### Neutral spec

The single abstract model that canvas gestures, SL text, and JSON are all concrete syntaxes over. None of the three is the source of truth — the neutral spec is. See [`language/README.md`](language/README.md).

### Golden

A committed fixture whose exact output is pinned by a test. The three [`fixtures/sl/`](../fixtures/sl/) files are round-trip goldens: each parses, emits, and re-parses identically (`crates/bert-canvas/tests/sl_roundtrip.rs`). See [`language/README.md`](language/README.md), "Corpus precedence".

### Dynamics-kind

The shape of a dynamics record's transition functor — deterministic map, input-driven table, distribution, and so on. A model *declares* its kind; engines interpret declarations and are separately verified against the semigroup contract. The current engine supports one kind (Id-functor over ℝⁿ stocks). See [`design/dynamics-principled-position.md`](design/dynamics-principled-position.md).

### Precondition

The named, machine-checked hypothesis a lens's entry gate requires: `HasBond` for Bunge (Structural), `Irreflexive` for Mobus (Operational). A refusal cites its failed precondition rather than shrugging. Klir is unconditional. See [`theory-fidelity.md`](theory-fidelity.md).

### Concordance

The Klir·Bunge·Mobus terminology grid: 12 kernel distinctions × 3 traditions, every cell primary-cited. The SSOT for the spec's lexicon attribution and the K≅2 convergence exhibits. See [`language/terminology-concordance.md`](language/terminology-concordance.md).
