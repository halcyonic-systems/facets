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
| `klir/criminal-court.sl` | George Klir | *Facets of Systems Science*, 2nd ed. (2001), Ch. 4, book pp. 77–78, Fig. 4.7 | A structure system over an institutional domain: five elements, ten directed variables, a feedback edge, and Klir's own legality rule (each variable is an output of exactly one element) checkable against the model. | The behaviour of every element — Klir's blocks are "initially source systems, which later become data systems". |

## Three entries that teach by what is missing

**`klir/serial-binary-adder.sl` is deliberately incomplete, and the gap is the lesson.** Klir's stated purpose is *"to illustrate the concept of structure systems of **higher orders**"* — and what makes his Fig. 4.8 second-order is that SUM and CARRY are themselves structure systems of logic gates. That gate-level sub-structure did not survive the PDF conversion, so it is not authored: **the corpus does not invent.** What ships is the first-order system, which Klir describes exactly (*"If these elements are viewed as generative systems, the resulting structure system is of first order"*), with the first-order wiring needing no inference. The honest residue — *this corpus cannot yet show higher-order structure* — is a real finding about the instrument, not a shortfall to hide.

## Two entries that teach by refusal

**`bunge/coupling-sigma3.sl` does not travel, and that is the lesson.** Bunge admits the diagonal — a thing may act on itself, and his coupling matrix records it. Mobus forbids it (§4.3 requires `k ≠ o`). So the file is a legal Bunge structure and a **refused** Mobus one. Open it and switch to the Mobus lens: *"self-dependency is not representable in the 8-tuple."* A real divergence between two traditions, shown rather than asserted.

**`bunge/coupling-sigma2.sl` is lossy in sign, and says so.** Bunge distinguishes excitation (+1) from inhibition (−1); SL has no signed relation, and design commitment C3 admits a word only if the kernel already carries the distinction. The polarity survives only in each flow's *name*, where nothing validates it. Recorded as lexicon pressure rather than papered over.

## The variant sets are the point

Two of the three groups above are **sibling sets that teach by diff**: one composition held fixed, the structure varied, the difference carrying the lesson. Klir does it with four goal-oriented paradigms; Bunge does it with three internal structures on two things. Neither cites the other for the device.

That is why they are separate indexed entries rather than one entry with variants — a reader should be able to open them side by side and see that the *only* thing that changed is the structure.

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

## A note on Klir and direction

Klir's relations are undirected unless the investigator says otherwise:
`@directed` is his observer commitment (spec §6.3), so its **absence** is the
faithful encoding of a symmetric relation. Do not reach for `mere` — that is
Bunge's bond / non-bond axis, a different distinction, and a `mere` relation
never projects, so an entry built from them would project to nothing and fail
the gate.
