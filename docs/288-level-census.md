# #288 — Klir level census over the corpus and examples

**Status: ADOPTED.** Ratified 2026-08-08 by Shingai; the draft's eight FORKs each received a decision, recorded below with its reasoning. Every shipped `.sl` entry now carries a `level` declaration matching this table — the [#288](https://github.com/halcyonic-systems/facets/issues/288) definition of done. Provenance: `strategy/research/klir-epistemological-levels-in-the-lens.md` (vault) · [`216-cross-lens-findings.md`](216-cross-lens-findings.md).

The hierarchy (*Facets* §4.5): **source → data → generative → structure → metasystem.** A source system is variables and observation channels with no relations among them yet; data adds observations; generative adds a rule that produces them; structure adds coupled subsystems; metasystem adds a rule for how the rule changes. Why the level matters (§5.4): "the modeling relation can be defined only within each particular epistemological category of systems" — which is the sentence the kernel's cross-level refusal prints (`lenses::check_cross_level`).

**Paths updated 2026-08-12 (#318).** The census's *decisions* are untouched — no
entry changed level, and none was deleted. What changed is where eleven of them
live: the shipped examples library was curated down to a keep set, so the rest
moved to `assets/archive/` and the steel-plant walk's level 0 moved to
`assets/walkthroughs/steel-plant/level-0.sl`. `cell-metabolism.sl` is now
`respiring-cell.sl` (a system is a thing, not a process). Both Source entries
and the single Generative entry are among the moved, which is why they are named
here: the counts below are still 39, and the library's whole level spread now
depends on files outside `assets/examples/`.

## Final counts (39 entries: 19 corpus · 18 examples · 2 walkthrough levels)

- **source**: 2 — `corpus/mobus/steel-plant.sl`, `archive/lake-observation.sl`
- **data**: 0
- **generative**: 1 — `archive/parity-automaton.sl`
- **structure**: 36 — everything else
- **metasystem**: 0

The draft censused 34 entries; five landed between draft and ratification (`federal-reserve.sl`, `bitcoin.sl`, `steel-plant-walk.sl`, and the two walkthrough levels) and were assigned by the ratified test below — all five Structure: each is coupled subsystems with no authored rule, and `bitcoin.sl`'s own pass-2 note says it outright ("until then this entry is structure only").

## The four ratified decisions (2026-08-08)

**1. The cross-cutting test: is the complete generating rule in the file?** This decides generative vs structure, and it resolves five forks at once. Engine-run dynamics over declared amounts is NOT an authored generating rule: the conservation stepping belongs to the engine, and the entry authors *parameters* — meaning once, mechanics machine. Therefore `llm-market`, `watershed`, `supply-chain` → **Structure**. `parity-automaton` → **Generative**: its four labeled flows are the complete transition table — the rule is authored, in full, in the file. `fsm-traffic` → **Structure**: the wiring is authored but no rule is (the states live in a comment); its own header reads it as "the STRUCTURE that generates the observed behavior"; and the vault doc's generative line most likely aimed at parity-automaton, the actual #67 DTMC entry.

**2. `corpus/mobus/steel-plant.sl` → Source.** An opaque box with only its boundary variables characterized is verbatim Klir's source system. The decision documents a cross-tradition rhyme: Mobus's stage-one environment-and-boundary analysis and Klir's lowest epistemological level are *the same object seen through two traditions* — which is why the corpus entry pairs with `lake-observation.sl`, the entry that reached Source from Klir's side and named it in prose. (The walkthrough's `steel-plant-walk.sl` is Structure precisely because it opens the box: coupled residents and a checked decomposition seam are Klir's step up.)

**3. `corpus/mobus/typical-neuron.sl` → Structure.** The entry's *lesson* is adaptation — a synapse's response depends on its activation history, which in Klir's terms is a metasystem claim. But what is *authored* is one structural feedback edge; the changing rule lives in prose only. Claim hygiene decides: declare what is authored, and record the metasystem reading as declared-but-not-authored. (The in-file comment above its `level` line carries this.)

**4. `corpus/klir/students-in-a-course.sl` → Structure.** Klir derived the relation Rg from Table 2.1's observed grades, so a data-system reading was arguable — but the authored artifact is elements + relation with no observation data in the file. The derivation history is not in the entry, and the level declares the entry.

## The empty levels are a finding

**SL currently authors no data systems and no metasystems.** No entry carries observation records in-file (a data system needs observed states over a named support — nothing in the grammar holds a data table), and no entry authors a rule-changing rule (typical-neuron gestures at one and its declaration honestly declines the claim). This is a statement of the language's reach, not of the library's taste: the corpus spans exactly three of Klir's five levels because those are the three the notation can carry. Two consequences worth keeping visible:

1. **Roadmap hint.** A data-system entry would need SL (or the tether seam, which already carries observation series *outside* the file) to hold observations as content; a metasystem entry would need a rule-about-rules production, which is further from C5 than anything yet proposed. Either extension would come with its own separating instance.
2. **Honest-instrument statement.** The Klir face's derived GSPS diagnostic already said the surface flattens to roughly one level; the census now says it with declarations over the whole library, and the two empty levels quantify what "one level of five" costs in practice.

## The census

| Entry | Level | Reason / citation |
|---|---|---|
| `corpus/klir/criminal-court.sl` | structure | Named in prose: "A **structure system in Klir's own sense**… Klir's own legality rule for structure systems." |
| `corpus/klir/cellular-array-cell.sl` | structure | Prose names both; structure is the authored one — the generative standing is what the entry *omits* ("Klir makes each cell a deterministic generative system… and none of that is structure"). |
| `corpus/klir/serial-binary-adder.sl` | structure | "If these elements are viewed as generative systems, the resulting **structure system** is of first order" — the shipped model is that first-order structure system. |
| `corpus/klir/students-in-a-course.sl` | structure | **Decision 4.** The authored artifact is elements + relation; the grade data Rg was derived from is not in the file. |
| `corpus/klir/goal-oriented-feedback.sl` | structure | Two elements + directed variables, the criminal-court block-diagram form; behavior functions in `omits`. |
| `corpus/klir/goal-oriented-feedforward.sl` | structure | Same set, same form. |
| `corpus/klir/goal-oriented-full-information.sl` | structure | Same set, same form. |
| `corpus/klir/goal-oriented-informationless.sl` | structure | Same set, same form. |
| `corpus/mobus/steel-plant.sl` | **source** | **Decision 2.** One opaque box, boundary variables only — verbatim Klir's source system; the Mobus↔Klir rhyme. |
| `corpus/mobus/digital-computing-system.sl` | structure | Three coupled components; everything below level 1 in `omits`. |
| `corpus/mobus/typical-neuron.sl` | structure | **Decision 3.** The adaptation lesson is metasystem-shaped; the authored artifact is one structural feedback edge. |
| `corpus/mobus/mammalian-brain.sl` | structure | Coupled components on one afferent path; no rule, no data. |
| `corpus/mobus/human-social-system.sl` | structure | Two coupled components + aggregated environment; the missing product output is a structural absence. |
| `corpus/bunge/coupling-sigma1.sl` | structure | A coupling graph IS coupled elements — Klir's structure notion in Bunge's notation. |
| `corpus/bunge/coupling-sigma2.sl` | structure | Same form (polarity survives only in flow names). |
| `corpus/bunge/coupling-sigma3.sl` | structure | Same form; the diagonal changes which traditions accept it, not its level. |
| `corpus/bunge/two-thing-ab.sl` | structure | Def 1.2's C/E/S triple is a structure claim. |
| `corpus/bunge/two-thing-ba.sl` | structure | Same set. |
| `corpus/bunge/two-thing-bidirectional.sl` | structure | Same set. |
| `archive/bank-run.sl` | structure | Coupled components with a declared feedback loop; no amounts, no rule. |
| `archive/two-sided-market.sl` | structure | Coupled mechanisms; bonds and mere relations, no rule. |
| `archive/thermostat.sl` | structure | The control loop as coupled components; no transfer function authored. |
| `examples/predator-prey.sl` | structure | Two stocks + food-chain flows, no quantities or rule. |
| `archive/parity-automaton.sl` | **generative** | **Decision 1.** The four labeled flows ARE the complete transition table — the rule is authored, in full. The library's one generative entry. |
| `archive/fsm-traffic.sl` | structure | **Decision 1.** Wiring authored, rule not (states in a comment); its own header: "the STRUCTURE that generates." |
| `examples/hal-harness.sl` | structure | Five coupled subsystems; the endo/exo split is the lesson. |
| `archive/respiring-cell.sl` | structure | Two coupled components + environment; no rule. |
| `examples/llm-market.sl` | structure | **Decision 1.** Declared amounts parameterize a run; the stepping is the engine's — the complete rule is not in the file. |
| `archive/transformer-block.sl` | structure | Five coupled components around a stock; no rule. |
| `archive/watershed.sl` | structure | **Decision 1.** Same call as llm-market. |
| `archive/workshop-crew.sl` | structure | Bunge CES triple with B and B̄ as content; no rule. |
| `examples/jung-functions.sl` | structure | Four coupled functions cascading energy; no rule. |
| `archive/lake-observation.sl` | **source** | Named in prose (#284): "variables and observation channels, no generating rule declared" — the tension with its declared relations was weighed and the named level ratified; the relations are the investigator's, which is Klir's whole point. Pairs with steel-plant (decision 2). |
| `archive/supply-chain.sl` | structure | **Decision 1.** The reorder loop is wiring; its logic lives in comments, the stepping in the engine. |
| `examples/bitcoin.sl` | structure | Ratified test applied post-draft: two loops drawn as flows, no rule; its own note says "structure only" until the tether. |
| `examples/federal-reserve.sl` | structure | Ratified test applied post-draft: coupled subsystems, no authored rule; opens its box where steel-plant keeps it shut. |
| `walkthroughs/steel-plant/level-0.sl` | structure | Ratified test applied post-draft: the walk opens the corpus entry's box — coupled residents and a checked seam are the step up from source. |
| `walkthroughs/steel-plant/level-1.sl` | structure | Fig. 4.16's four subsystems + six interfaces, coupled; no rule. |
| `walkthroughs/steel-plant/level-2.sl` | structure | Fig. 4.17's pumps, stock, sensor and decider, coupled; no rule. |

## The fork ledger, resolved (kept as the record of what was decided)

| # | Entry | Draft alternatives (draft's pick in bold) | Ratified |
|---|---|---|---|
| 1 | students-in-a-course | data · **structure** | structure (decision 4) |
| 2 | steel-plant | source · **structure** | **source** (decision 2 — draft overturned) |
| 3 | typical-neuron | **structure** · metasystem | structure (decision 3) |
| 4 | parity-automaton | **generative** · structure | generative (decision 1) |
| 5 | fsm-traffic | **generative** · structure | **structure** (decision 1 — draft overturned; the vault doc's generative line read as aimed at parity-automaton, the actual #67 DTMC entry) |
| 6 | llm-market | generative · **structure** | structure (decision 1) |
| 7 | watershed | generative · **structure** | structure (decision 1) |
| 8 | supply-chain | generative · **structure** | structure (decision 1) |

Rows 4–8 were one question — the draft's "cross-cutting fork" — and were settled by one test: *is the complete generating rule in the file?* The draft's framing of each fork is preserved in this table and in git history (`288-level-census-draft.md`, moved here on ratification) as the record of the alternatives actually weighed.

## What the refusal can now do

With the declarations shipped, the §5.4 refusal has live instances in the library: `steel-plant` (source) against `criminal-court` (structure) is a comparison the modeling relation does not define, and the kernel refuses it with Klir's sentence; `steel-plant` against `lake-observation` (both source, reached from two traditions) compares within one level. Both are held by `crates/bert-canvas/tests/sl_level.rs` on the shipped files. No `set:` in the corpus spans levels — the sets were built to vary structure within a fixed claim, and the census confirms they do — so the set-distinguishability gate refuses nothing, which is the correct silence rather than an idle check: the same gate would now trip on any future set whose members disagree about their level.
