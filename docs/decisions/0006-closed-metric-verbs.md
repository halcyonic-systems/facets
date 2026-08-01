# ADR 0006 — Declared metrics grow a closed verb vocabulary, never an expression language

*2026-08-01 · status: **ADOPTED*** (ratified by Shingai, 2026-08-01; #203)

## Context

Declared metrics (#203) let a model name readouts computed over a run — the
output twin of the `param` layer. A param names an input knob in the model's
own vocabulary; a metric names what the author wants to watch come out
("DeepSeek dev share", "Opus tokens served"), so a run answers the author's
questions first and the kernel-fidelity furniture second.

The design fork was how much a metric is allowed to say. Two roads:

1. **An open expression language.** `metric "x" : flow_a / (flow_b + flow_c)`
   — Petrinaut's approach. Maximally general on day one: any question a
   future model asks is already expressible.
2. **A closed verb vocabulary.** A small set of named question-forms
   (`share of flow`, `sum into`), each with defined semantics and its own
   refusal conditions, grown one verb at a time as models demand more.

The stakes are general infrastructure, not one model: whatever is chosen here
is what every future domain model uses to ask its questions.

## Decision

**The verb set is closed, and grows one checkable verb at a time.**

- Each verb names one question-form with stated semantics over the recorder's
  executed per-flow series (`Circuit::wire_history` → `RunResultRich.flows`).
- **Each new verb owes a separating instance** — a declaration a model can
  actually earn a refusal for (SSF #35: a check nothing can fail proves
  nothing). Seed instances: `share` over a single-outflow source is refused
  (identically 1 — nothing to watch); `sum into` a thing with no inflows is
  refused (it names a value the run never produces).
- **The growth rule:** when a model asks a question the verbs cannot state,
  the answer is a new verb with its own semantics, separating instance, spec
  row (§4.6), and lexicon entry — never a loosening of an existing verb and
  never an escape hatch into free arithmetic.
- **A ranking is not a verb.** Ordering a family of same-verb metrics is a
  *view* of declared readings, so the run deck sorts each family by endpoint
  (the leaderboard) and the grammar stays two verbs smaller than it looks
  like it should be. If a model someday needs a ranking as a *declared,
  referenceable object* (a scenario comparison across ranks, #202), `rank`
  returns as a verb through the growth rule above.

## Why not the expression language

An unbounded formula grammar is a second modeling language hiding inside the
first, and it fails the repo's own discipline three ways:

- **Nothing can refuse it.** Any arithmetic over any referents parses, so
  there are no separating instances and no faults — only bags (#112 register,
  rule 1 inverted).
- **Provenance goes soft.** "Computed from the run" stays technically true of
  any formula while the formula encodes an arbitrary fiction on top of the
  trace. The trichotomy (proven / observed / generated) stops being legible
  at exactly the layer users read numbers from.
- **It forecloses nothing to defer it.** An expression tier can be added
  LATER as an explicitly lower-provenance class if verb growth genuinely
  cannot keep up; walking back a formula language people already use cannot.

## Consequences

- The two seed verbs cover composition (`share`) and throughput (`sum`) — the
  two universal readouts over a flow network. Ratios of arbitrary flows,
  time-to-threshold, and stock-level reads are all *not yet expressible*, on
  purpose; each arrives as a verb when a model demands it.
- `rate` from the original sketch is deliberately absent: over the recorder
  it collapses into `sum` (the per-tick reading IS the rate; the endpoint is
  its integral). One verb, two renderings.
- A metric is a derived reading, never a new source of truth: evaluation is
  arithmetic over kernel-executed series, carries their provenance, and can
  state nothing the trace does not carry (#203's line, held).
- Endogenous-share compatibility (#269, decided 2026-08-01): `share` is named
  as a *produced* observable, so when an allocation becomes agent-chosen the
  same declarations read the endogenous result with no rewrite.

Spec: `docs/language/spec.md` §4.6. Grammar and refusals:
`crates/bert-canvas/src/sl.rs` + `tests/sl_metrics.rs`. Evaluation:
`web/src/metrics.ts` (+ `metrics.test.ts`). Recorder seam:
`crates/bert-compose/src/circuit.rs` (`wire_history`) →
`crates/bert-tether/src/forcing.rs` (`FlowSeries`) → `RunResultRich.flows`.
