# The source corpus

Author-grounded teaching models: each entry is lifted from a **source text's own
worked example** and carries its citation in a provenance header. These ship — a
user opens one from the gallery and reads it on the canvas — so every file is
gated by `crates/bert-canvas/tests/source_corpus.rs` (header well-formed,
compiles with zero faults, pins its tradition's lens, projects clean).

Three sets of `.sl` files exist and "the corpus" alone is ambiguous between them,
so the qualified names are always used:

| Set | Name | Obligation |
|---|---|---|
| `fixtures/sl/*.sl` | the **golden corpus** | round-trip fidelity first |
| `fixtures/sl/teaching/` | the **teaching fixtures** | pedagogy only; out of every suite |
| `assets/corpus/**/*.sl` | the **source corpus** (this) | ships clean; explicitly *not* a round-trip golden |

Being kept out of the round-trip set is what lets a pedagogical rewording land
here without perturbing a golden.

## Entries

| File | Author | Citation | Teaches | Omits |
|---|---|---|---|---|
| `klir/students-in-a-course.sl` | George Klir | *Facets of Systems Science*, 2nd ed. (2001), Ch. 2, Table 2.1 and Table 2.2, Fig. 2.2a | An equivalence relation on a named set, given as a set, a matrix, and a node-edge diagram — the same system in three registers, with the relation partitioning the set into equivalence classes. | The other three characteristics in Table 2.1 (major, age, full-time status) and the relations they induce; Klir's `Rm` on majors is a sibling lesson, not this one. |
| `klir/goal-oriented-*.sl` (4) | George Klir | *Facets of Systems Science*, 2nd ed. (2001), Ch. 10 §10.2, Fig. 10.1 | Four paradigms over one fixed composition, varying only what the goal-seeking element may read: nothing, the output, the input, or both. | The essential relationship between x and y, the goal itself, and the partial ordering of the paradigms by severity of restriction. |
| `bunge/two-thing-*.sl` (3) | Mario Bunge | *Treatise on Basic Philosophy*, Vol. 4 (1979), Ch. 1 §1.2, Definition 1.2, Example, Fig. 1.2 | "The simplest possible system" in his words — two connected things in an environment lumped into one thing, under each of the three conceivable internal structures. | The caveat that not every conceivable structure is nomologically possible; and the quantitative model of §2.2. |
| `bunge/coupling-sigma{1,2,3}.sl` | Mario Bunge | *Treatise on Basic Philosophy*, Vol. 4 (1979), Ch. 1 §2.1 | The graph half of Bunge's "two standard and equivalent ways" of representing a system: a symmetric chain, a cycle carrying inhibition, and a graph with self-action. | The matrix half (SL has no matrix register), and — in σ₂ — the sign of each coupling. |
| `klir/cellular-array-cell.sl` | George Klir | *Facets of Systems Science*, 2nd ed. (2001), Ch. 4, book pp. 83–84, Fig. 4.11 | That the environment is **placed by the observer**: this cell's environment is four other cells of the same array, and the same 5×5 array admits 2²⁵ structure systems depending which subset of cells is chosen. | The behaviour function — each cell is a deterministic generative system over two states, and none of that is structure. |
| `klir/serial-binary-adder.sl` | George Klir | *Facets of Systems Science*, 2nd ed. (2001), Ch. 4, book pp. 78–79, Fig. 4.8 | A **cycle as pure structure** — the carry leaves CARRY, is held one tick by MEMORY, and returns as the previous carry both SUM and CARRY depend on. No dynamics run, no state stored. | **The second order**, which is what Klir chose the example to show — see below. |
| `mobus/steel-plant.sl` | George Mobus | *Systems Science: Theory, Analysis, Modeling, and Design* (2022), Ch. 4 §4.5, Fig. 4.14 and Listing 4.1 | The SL exemplar Mobus teaches the language with: the SOI Steel-Plant as an opaque box among three sources and three sinks, matter and energy crossing the boundary in both directions. | Everything after Fig. 4.14 — the boundary interfaces of Fig. 4.15, the internal components and message interface of Fig. 4.16, the Iron-Inventory decomposition of Fig. 4.17, and the delivery schedules of Listing 4.1. |
| `mobus/digital-computing-system.sl` | George Mobus | *Systems Science: Theory, Analysis, Modeling, and Design* (2022), Ch. 7 §7.2.3–§7.2.3.1, Figs. 7.2 and 7.3 | A merely complex system at level 1: the boundary, four environmental entities, and the hardware/firmware/software triple. Nothing adapts, and that is why the chapter starts here. | Every level below 1 — hardware, CPU, ALU, registers, D-latches, transistors — and the operating system Mobus names and sets aside. |
| `mobus/typical-neuron.sl` | George Mobus | *Systems Science: Theory, Analysis, Modeling, and Design* (2022), Ch. 7 §7.3.2–§7.3.3.1, Figs. 7.7 and 7.8 | A complex adaptive system at the same level as the computer. The diff carries the lesson: the environment is now made of things of the SOI's own kind, and one flow runs backwards — the membrane's feedback to the synapses, which is where adaptation lives. | The level-2 synapse (the Adaptrode work), and everything that makes the neuron a living cell — nutrient and waste, excluded by Mobus himself. |
| `mobus/mammalian-brain.sl` | George Mobus | *Systems Science: Theory, Analysis, Modeling, and Design* (2022), Ch. 7 §7.4.4–§7.4.5, Figs. 7.12 and 7.13 | A complex adaptive and evolvable system, and the one entry in the set that does not close: Mobus walks one afferent path and stops. The hard part here is the boundary, fixed by a footnote rather than a figure. | The entire efferent side — motor and glandular control — which is what leaves the last cortical stage hanging; see below. Also the gross anatomy, the Brodmann map, and the cortical column. |
| `mobus/human-social-system.sl` | George Mobus | *Systems Science: Theory, Analysis, Modeling, and Design* (2022), Ch. 7 §7.6.3, Fig. 7.17 | The whole human enterprise as one SOI in the Earth, and the only entry whose lesson is an absence: resources in, wastes and heat out, and no product returning anything of value to the environment. | The decomposition of the HSS, which Mobus defers to Ch. 9; and the individuation of each aggregated source, sink and interface, which he flags as the next step. |
| `klir/criminal-court.sl` | George Klir | *Facets of Systems Science*, 2nd ed. (2001), Ch. 4, book pp. 77–78, Fig. 4.7 | A structure system over an institutional domain: five elements, ten directed variables, a feedback edge, and Klir's own legality rule (each variable is an output of exactly one element) checkable against the model. | The behaviour of every element — Klir's blocks are "initially source systems, which later become data systems". |

## Three entries that teach by what is missing

**`klir/serial-binary-adder.sl` is deliberately incomplete, and the gap is the lesson.** Klir's stated purpose is *"to illustrate the concept of structure systems of **higher orders**"* — and what makes his Fig. 4.8 second-order is that SUM and CARRY are themselves structure systems of logic gates. That gate-level sub-structure did not survive the PDF conversion, so it is not authored: **the corpus does not invent.** What ships is the first-order system, which Klir describes exactly (*"If these elements are viewed as generative systems, the resulting structure system is of first order"*), with the first-order wiring needing no inference. The honest residue — *this corpus cannot yet show higher-order structure* — is a real finding about the instrument, not a shortfall to hide.

**`mobus/mammalian-brain.sl` has no exit, and the missing exit is Mobus's.** Ch. 6 says to start a decomposition from the outputs. §7.4.4 says he is not going to: *"What is shown is not following the suggestion in Chap. 6 to start with the outputs (i.e., motor control and glandular control)… For illustration purposes, however, it is easier to show the internal message flow mapping from a sensor (in the retina), through a relay nucleus (thalamus), to the primary vision processing cortex in the occipital lobe."* So the afferent path is all there is, and the last cortical stage is a dead end at Operational. The entry declares the `gate: core (…)` escape rather than inventing a motor path to close the graph — the escape is load-bearing, and removing it turns the ship gate red on exactly that warning.

## Two entries that teach by refusal

**`bunge/coupling-sigma3.sl` does not travel, and that is the lesson.** Bunge admits the diagonal — a thing may act on itself, and his coupling matrix records it. Mobus forbids it (§4.3 requires `k ≠ o`). So the file is a legal Bunge structure and a **refused** Mobus one. Open it and switch to the Mobus lens: *"self-dependency is not representable in the 8-tuple."* A real divergence between two traditions, shown rather than asserted.

**`bunge/coupling-sigma2.sl` is lossy in sign, and says so.** Bunge distinguishes excitation (+1) from inhibition (−1); SL has no signed relation, and design commitment C3 admits a word only if the kernel already carries the distinction. The polarity survives only in each flow's *name*, where nothing validates it. Recorded as lexicon pressure rather than papered over.

## Why this is a test bench and not a showcase

The corpus is the **empirical arm** of the formalization. You cannot find that `Tuple.lean` under-constrains `I` by reading `Tuple.lean` — it is internally consistent and it typechecks. You find it by modelling a steel plant and noticing the diagram implies a hop the mathematics denies (bert-lenses#213). Every entry exercises the kernel, the notation, and the Lean at once, and a defect surfaces in whichever of the three is weakest. That is why authoring an entry keeps finding things that proof-reading does not.

It is also where the three lenses have to **agree**. A model authored under one lens and read under another is a live cross-check on K≅2: if two lenses disagree about the same kernel object, one of them is wrong. `bunge/coupling-sigma3.sl` above is that check firing. The convergence claim is therefore **tested here rather than asserted** — which is worth more than any paper, and is exactly what a doctrine-per-notebook tool cannot do, because its notebooks never have to agree with each other.

**The standard that keeps this true, and it is the whole discipline:**

> **A model that cannot embarrass us is not testing anything.**

An entry earns its place by being able to come out wrong — by refusing, by failing a gate, by disagreeing with a sibling lens, by exposing a gap in the kernel. The moment entries get added for volume, or quietly shaped toward what the tool finds convenient rather than what the source actually says, the corpus stops probing and starts **confirming the tool to itself**. That failure is silent: nothing breaks, the gallery just grows.

This is what the corpus/examples split defends. **The corpus holds what the source says; `assets/examples/` holds what we say.** When Mobus does not apply his own work-process taxonomy in ch. 7, the entry carries no `primitive` — stamping one would be our reading wearing his name. When he leaves §7.5 as an exercise, there is no entry. When his Listing 4.1 assigns `F-1.4` twice, the entry records the erratum instead of reproducing it. Those refusals are not fastidiousness; they are the thing that keeps the library evidence.

## The variant sets are the point

Two of the three groups above are **sibling sets that teach by diff**: one composition held fixed, the structure varied, the difference carrying the lesson. Klir does it with four goal-oriented paradigms; Bunge does it with three internal structures on two things. Neither cites the other for the device.

That is why they are separate indexed entries rather than one entry with variants — a reader should be able to open them side by side and see that the *only* thing that changed is the structure.

The Mobus ch. 7 entries are deliberately **not** a `set`, and the reason fixes the word's meaning. Klir and Bunge hold the composition fixed and vary the structure; the diff *is* the lesson. Mobus's four vary everything — they share no component, no flow, and no domain. What they hold fixed is only the *level*: each is the first pass, at the chapter's own resolution ("we… take the process sufficiently deep to give a good accounting of the first few levels"), and what varies is the complexity class. That is a **ladder**, not a set, and a ladder is carried by *order*, not by grouping: read down the shelf and the environment stops being made of other kinds of thing (computer), starts being made of the SOI's own kind (neuron), acquires a boundary no figure can fix (brain), and finally contains the observer (HSS). Each entry's `teaches` names its rung.

So `set` keeps one meaning across the corpus — one composition, several structures — rather than being stretched to cover any group that reads well together.

## Adding an entry

1. Write `<tradition>/<name>.sl` — the directory is the only carrier of
   tradition, so the filename never repeats it. One model per file, no
   `decomposes`, so there is no build and no resolution order.
2. Open it with the header of §2.1 (`corpus-entry: v1`, then `title`, `author`,
   `work`, `year`, `locus`, optional `figure`, `teaches`, `omits`, any number of
   `note` lines). `teaches` and `omits` are a pair: a file that cannot honestly
   fill `omits` is probably too ambitious to be an entry. Add a `note` whenever
   any part of the model is our construction rather than the author's own
   drawing.
3. Pin the lens with `@lens`, matching the directory.
4. Add the file to `ORDER` in `scripts/reindex_corpus.py` and run it. Entry order
   is gallery order — the one editorial field with no header counterpart, which
   is why the script will not invent a position for you and fails loudly on an
   unlisted file. Everything else in the index is projected from the header, so
   `citation` cannot drift from its composition rule.
5. `cargo test -p bert-canvas --test source_corpus`.

An unindexed file is a gate failure, not a silent omission from the gallery.

## One shelf, one book

Each tradition declares the works it may cite, as `(author, work, year)` triples
in `SHELVES` at the top of `crates/bert-canvas/tests/source_corpus.rs`. Every
entry's header must match one of its shelf's triples exactly. All three shelves
hold a single book today.

The list is an allow-list rather than "whichever book the shelf already uses"
because the failure mode is a *new* work appearing by accident — a title typo, a
hallucinated edition, or a chapter transcribed against the wrong book. Deriving
the rule from the shelf's contents would accept the second book as readily as
the first. Typing it out means a shelf that genuinely spans works (Klir's
*Architecture of Systems Problem Solving* alongside *Facets*) is a one-line
declaration made deliberately, in the same commit as the entry that needs it,
and everything else is a red test.

This is not decoration. On 2026-07-24 two branches were one merge away from
shipping Mobus's ch. 7 series under two different books, caught only because a
reviewer noticed. The citations are the corpus's entire claim to being evidence.

## A note on Klir and direction

Klir's relations are undirected unless the investigator says otherwise:
`@directed` is his observer commitment (spec §6.3), so its **absence** is the
faithful encoding of a symmetric relation. Do not reach for `mere` — that is
Bunge's bond / non-bond axis, a different distinction, and a `mere` relation
never projects, so an entry built from them would project to nothing and fail
the gate.
