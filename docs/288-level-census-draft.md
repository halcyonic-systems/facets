# #288 — Klir level census over the corpus and examples (DRAFT)

**Status: RESEARCH.** **This is a judgment draft: every assignment below awaits Shingai's ratification, and nothing here is declared in-file except the three entries whose prose already names a level.** Companion to [#288](https://github.com/halcyonic-systems/bert-lenses/issues/288); provenance in `strategy/research/klir-epistemological-levels-in-the-lens.md` (vault) and [`216-cross-lens-findings.md`](216-cross-lens-findings.md).

The hierarchy (*Facets* §4.5): **source → data → generative → structure → metasystem.** A source system is variables and observation channels with no relations among them yet; data adds observations; generative adds a rule that produces them; structure adds coupled subsystems; metasystem adds a rule for how the rule changes. Why the level matters (§5.4): "the modeling relation can be defined only within each particular epistemological category of systems."

## Count correction

The issue's 2026-07-29 census counted **32** entries. [#284](https://github.com/halcyonic-systems/bert-lenses/issues/284) (2026-08-05) added `examples/lake-observation.sl` and `examples/workshop-crew.sl`, so this draft covers **34**. One consequence: the issue found three entries naming a level in prose; there are now **four** — `lake-observation.sl` says "In Klir's hierarchy this sits at the SOURCE level". Its named level is used below, but per the #288 scope it receives **no in-file declaration** until ratified.

## The cross-cutting fork, stated once

Five entries raise the same question, so it is asked here rather than five times: **does engine-supplied dynamics over declared quantities count as an authored generating rule?** `watershed`, `supply-chain`, and `llm-market` declare amounts, stocks, and a time unit, and the compose engine runs them — the run *generates* the behavior series. But SL is structure-only by design commitment C5: no behavior function appears in any file, and the rule that generates lives in the engine's primitives, not in the author's text. Read strictly (the rule must be *authored*), all three are **structure**; read operationally (the model plus its declared quantities determines a generator), all three are **generative**. `parity-automaton` and `fsm-traffic` are the discrete-state face of the same question. The vault provenance doc takes the operational reading for fsm-traffic ("runs as a Klir DTMC — a transition rule that generates behavior, so generative"); the spec's C5 supports the strict reading. **This is one decision, and whichever way it goes should go the same way for all five.**

## Census

| Entry | Proposed level | Reason / citation | FORK? |
|---|---|---|---|
| `corpus/klir/criminal-court.sl` | **structure** | Named in prose: "A **structure system in Klir's own sense**: five elements, ten directed variables, and a feedback edge… Each variable is an output of exactly one element — Klir's own legality rule for structure systems." | — |
| `corpus/klir/cellular-array-cell.sl` | **structure** | Both levels named in prose; structure is the authored one. The teaches line: "the same 5×5 array admits 2²⁵ different **structure systems**"; the generative standing is what the entry *omits*: "Klir makes each cell a deterministic **generative system**… and none of that is structure." The elements are generative; the authored artifact (cell + four couplings) is the structure view. | — |
| `corpus/klir/serial-binary-adder.sl` | **structure** | Both levels named in prose; structure is the authored one: "If these elements are viewed as **generative systems**, the resulting **structure system** is of first order." The shipped model is that first-order structure system; the behavior functions (Table 4.3's quintuples) are in `omits`. | — |
| `corpus/klir/students-in-a-course.sl` | structure | Elements + a defined relation (Rg) = the S=(T,R) structure claim; no behavior function, no support. | **FORK — data vs structure.** Rg is *derived from observed data*: Table 2.1's grade column is a recorded observation over the student set, and Table 2.2's matrix is that data rendered. Klir presents this in Ch. 2, *before* the epistemological hierarchy exists, so imposing a level is our act either way. If the entry is read as "the observations that induce the relation," it is a data system; if as "the relation as authored," structure. |
| `corpus/klir/goal-oriented-feedback.sl` | structure | Two elements + directed variables among them, the same block-diagram form as criminal-court's Fig. 4.7; no behavior function ("the essential relationship between x and y… none of which is structure" — in `omits`). | — |
| `corpus/klir/goal-oriented-feedforward.sl` | structure | Same set, same form, same reasoning as feedback. | — |
| `corpus/klir/goal-oriented-full-information.sl` | structure | Same set, same form, same reasoning. | — |
| `corpus/klir/goal-oriented-informationless.sl` | structure | Same set, same form, same reasoning. | — |
| `corpus/mobus/steel-plant.sl` | structure | SOI + six environment entities with directed flows — blocks-with-variables, criminal-court's shape. | **FORK — source vs structure.** The model has ONE component: an opaque box whose interface variables are characterized and nothing else. Klir's structure system is *coupled subsystems*, and there is no second subsystem inside the boundary — an environment-and-boundary pass is closer to a source-system characterization of the crossing variables. Structure holds only if the environment blocks count as coupled elements, which is how criminal-court treats its `ENVIRONMENT OF S`. |
| `corpus/mobus/digital-computing-system.sl` | structure | Three coupled components (Hardware/Firmware/Software) + directed flows; everything below level 1, and all behavior, is in `omits`. | — |
| `corpus/mobus/typical-neuron.sl` | structure | Three coupled components with a feedback edge; the potentiation dynamics are "in prose only" (`omits`). | **FORK — structure vs metasystem.** The teaches line is about adaptation: a synapse's response "depends on the history of activations" — in Klir's terms a rule that changes with history is a *metasystem* claim, and that claim is the entry's stated lesson. But what is authored is only the structural returning edge; the changing rule itself is nowhere in the file. Declaring metasystem would assert the lesson; declaring structure would assert the artifact. |
| `corpus/mobus/mammalian-brain.sl` | structure | Coupled components on a single afferent path; no rule, no data — Mobus's own stub, and the boundary is the lesson. (The CAES framing gestures at adaptation/evolution, but unlike typical-neuron nothing in the teaches line rests on a changing rule.) | — |
| `corpus/mobus/human-social-system.sl` | structure | Two coupled components (Governance, Work Processes) + aggregated environment flows; the absence of a product output is the lesson, and it is a structural absence. | — |
| `corpus/bunge/coupling-sigma1.sl` | structure | A coupling graph IS coupled elements — Klir's structure notion in Bunge's notation; no rule, no observations, no environment even. | — |
| `corpus/bunge/coupling-sigma2.sl` | structure | Same form as σ₁ (the sign lives only in flow names). | — |
| `corpus/bunge/coupling-sigma3.sl` | structure | Same form; the diagonal changes which *traditions* accept it, not which Klir level it stands at. | — |
| `corpus/bunge/two-thing-ab.sl` | structure | Two components + one environment thing, directed actions among them — Def 1.2's C/E/S triple is a structure claim. | — |
| `corpus/bunge/two-thing-ba.sl` | structure | Same set, same reasoning. | — |
| `corpus/bunge/two-thing-bidirectional.sl` | structure | Same set, same reasoning. | — |
| `examples/bank-run.sl` | structure | Coupled components (Bank, Reserve) with a declared feedback loop; no amounts, no rule authored — the reinforcing dynamics live in the comments. | — |
| `examples/two-sided-market.sl` | structure | Four coupled mechanisms + two-sided environment; bonds and mere relations, no rule. | — |
| `examples/thermostat.sl` | structure | The sense–compare–act loop as coupled components; no setpoint, no transfer function authored. | — |
| `examples/predator-prey.sl` | structure | Two stocks + food-chain flows, no declared quantities or rule. | — |
| `examples/parity-automaton.sl` | generative | The four labeled transitions ARE δ's graph — "0 preserves parity and 1 flips it" is a stated generating rule, and the entry's teaches line is that an FSA is a DLG. | **FORK — generative vs structure.** The entry's own `omits` line pulls the other way: "The behaviour function δ as a runnable object… are not simulated here; this is the **structural DLG only**." If the transition *table* (fully present in the flows) counts as the rule, generative; if the rule must be runnable/authored as behavior, structure. Same decision as the cross-cutting fork, discrete face. |
| `examples/fsm-traffic.sl` | generative | The vault provenance doc assigns it: "fsm-traffic runs as a Klir DTMC — a transition rule that generates behavior, so **generative**" (`klir-epistemological-levels-in-the-lens.md`, the doc this issue is built on). | **FORK — generative vs structure.** The file's own header takes the other reading: "Klir's lens asks: what is the **STRUCTURE** that generates the observed behavior" — and unlike parity-automaton it authors no transition table (Controller states live in a comment, no weights). The vault doc's assignment may also have meant parity-automaton (the #67 DTMC entry). Ratify which reading, and note it decides the cross-cutting fork. |
| `examples/hal-harness.sl` | structure | Five coupled subsystems, endo/exo split as the stated lesson; no rule. | — |
| `examples/cell-metabolism.sl` | structure | Two coupled components + bloodstream environment; no quantities, no rule. | — |
| `examples/llm-market.sl` | structure | Eleven coupled processes with declared amounts, params, metrics — but no authored behavior function; the clearing rule is the engine's Splitting/Amplifying semantics. | **FORK — generative vs structure** (the cross-cutting fork). This is the strongest generative candidate in the library: it declares magnitudes, `ample` availability, and metrics over a run it exists to produce. If declared quantities + engine primitives = a generating rule, this is generative. |
| `examples/transformer-block.sl` | structure | Five coupled components around a residual-stream stock; no quantities, no rule. | — |
| `examples/watershed.sl` | structure | Two components + declared rainfall amount + stock + time unit; built to run the conservation ledger. | **FORK — generative vs structure** (the cross-cutting fork). |
| `examples/workshop-crew.sl` | structure | Bunge CES triple with bondage B and nonbonding B̄ stated as content; no rule, no data. | — |
| `examples/jung-functions.sl` | structure | Four coupled functions cascading energy; no quantities, no rule. | — |
| `examples/lake-observation.sl` | **source** | Named in prose (#284): "In Klir's hierarchy this sits at the **SOURCE level**: variables and observation channels, no generating rule declared" — and it is the one entry carrying the #154 source-system metadata (scales, state set, support variable). | Named, but flag for ratification: the entry declares four *relations* among its variables, and Klir's source systems "do not involve relations among the variables" (vault OCR line 3807). The header resolves this as "the relations are the investigator's"; the census keeps the named level and records the tension. No in-file declaration (outside #288's three). |
| `examples/supply-chain.sl` | structure | Four coupled components + declared supplier amount + stock + time unit; the reorder feedback loop is authored as wiring, its logic only in comments. | **FORK — generative vs structure** (the cross-cutting fork). |

## Counts (as proposed, forks at their proposed value)

- **source**: 1 (lake-observation — prose-named)
- **data**: 0
- **generative**: 2 (parity-automaton, fsm-traffic — both FORK)
- **structure**: 31 (3 prose-named + 28 proposed; 5 of the 28 FORK)
- **metasystem**: 0 (typical-neuron is the only candidate, FORKed)

## Findings the counts carry

1. **The library never authors data or (uncontested) metasystem.** Whatever the fork rulings, the corpus spans at most three of Klir's five levels — the "one level of five" flattening the vault doc measured against the *lens* is nearly as true of the *library*. A data-system entry (observed states over a named support) and a metasystem entry would be the two cheapest additions that make the level machinery earn its keep.
2. **Structure is the overwhelming attractor** because SL's own shape — things + relations, no behavior productions (C5) — is a structure-system notation. That is not a defect; it is the same fact the Klir register's GSPS diagnostic already states (`SE` for nearly everything).
3. **Every fork but one is the same fork.** Ratifying the cross-cutting question (authored rule vs engine-run rule) settles 5 of the 8 forked rows; only students-in-a-course (data), steel-plant (source), and typical-neuron (metasystem) are entry-specific judgments.

## FORK ledger (for ratification)

| # | Entry | Alternatives |
|---|---|---|
| 1 | students-in-a-course | data · **structure** |
| 2 | steel-plant | source · **structure** |
| 3 | typical-neuron | **structure** · metasystem |
| 4 | parity-automaton | **generative** · structure |
| 5 | fsm-traffic | **generative** · structure |
| 6 | llm-market | generative · **structure** |
| 7 | watershed | generative · **structure** |
| 8 | supply-chain | generative · **structure** |

(Bold = the draft's proposed value. Rows 4–8 are one decision; rows 4–5 and 6–8 differ only in whether the vault doc's fsm-traffic assignment is honored as written.)
