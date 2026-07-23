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
4. Add a row to `corpus.json`. Entry order is gallery order — the one editorial
   field with no header counterpart. `citation` is composed mechanically as
   `author ", " work " (" year "), " locus [", " figure]`; the gate composes it
   and compares, so do not hand-write a variant.
5. `cargo test -p bert-canvas --test source_corpus`.

An unindexed file is a gate failure, not a silent omission from the gallery.

## A note on Klir and direction

Klir's relations are undirected unless the investigator says otherwise:
`@directed` is his observer commitment (spec §6.3), so its **absence** is the
faithful encoding of a symmetric relation. Do not reach for `mere` — that is
Bunge's bond / non-bond axis, a different distinction, and a `mere` relation
never projects, so an entry built from them would project to nothing and fail
the gate.
