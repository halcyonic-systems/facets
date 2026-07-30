# #216 — the cross-lens matrix, read

*First full read of the matrix, 2026-07-29. Reproduce with `cargo test -p bert-canvas --test matrix_report -- --nocapture`.*

The matrix had been runnable for some time and was never read. Two things came out of reading it: the report was answering two of #216's three questions, and the third question — *travels but reads differently* — turns out to have an answer already computed on every call and thrown away.

## The third outcome is measurable, and it was already in hand

`analyze` returns four things. The report used one of them. `residue` (#100) is the count of authored content a lens does not render — what the face is silent about. That is the third outcome, stated as a quantity: a model legal under two lenses that hides eleven declared facts from one of them travels, and reads differently.

The column added here is the **spread**: among the lenses that accept the model, the gap between the most and least blind. Zero means every accepting lens sees the same amount of what the author wrote.

## What the read says

**35 models × 3 lenses. 34 measurable, 34 divergent, 0 aligned, 1 unmeasurable.**

The unmeasurable row is `klir/cellular-array-cell.sl`: Klir accepts it with 5 facts unseen, Bunge refuses it (no bond between distinct components), Mobus refuses it (8 boundary crossings without interfaces). One accepting lens means no second reading to compare against — the spread is undefined, not zero.

So the count to state is **34 of 34, not 34 of 35**. **Nothing in this library is read the same way by two lenses that both accept it.** Calling `cellular-array-cell` "non-divergent" would be the same error as reading an all-green Klir column as agreement: absence of a measurement is not a measurement of zero.

This inverts the expectation in the task. The third outcome was framed as the rare and interesting case, the one worth hunting for. It is the default state of the corpus.

**Authored facts unseen, by lens: Klir 371 · Bunge 181 · Mobus 49.**

Monotone in the ladder, and in the order the ladder predicts. The convergence table says each tradition adds one ontological commitment on top of the shared fragment; these are the first numbers that say so over published models rather than over the abstract kernel.

**Klir refuses nothing — 0 of 35 — because it cannot see most of what it is accepting.**

The worst case is `examples/llm-market.sl`: legal under Klir, and Klir is blind to **70** declared facts in it. Then `two-sided-market` at 25 and `hal-harness` at 24. The zero-refusal column is not permissiveness, it is lossy projection. By the standard this repo already applies to its own checks — a constraint nothing can fail proves nothing (#220) — the Klir lens is not currently acting as a gate, and the residue count is the reason rather than the symptom.

That is not a defect to fix. Klir *is* the root, and the root is supposed to be permissive. What the number changes is the claim that can be made from an all-green Klir column: it is evidence about the projection, not about the models.

**Which lens is blindest tracks the vocabulary the model was written in.**

For the Mobus corpus and the examples, Klir is blindest (`klir>mobus`). For the Bunge and Klir corpora, Bunge often is — `criminal-court` at 3/20, `serial-binary-adder` at 5/16. Whichever tradition a model was *not* authored in is the one that loses it.

Stated for the thesis: **legality travels, meaning does not.** All 35 models are legal under the root, which is the existence half of K≅2 holding empirically over real entries for the first time. And every one of them means something different in each lens that accepts it, which is the part the abstract proof was always silent about.

**Mobus is blind to nothing in any example it accepts — 0 across all fifteen.**

This is a fact about the corpus, not about Mobus. The examples are authored in Mobus's own vocabulary, so they cannot test what Mobus loses. **The set needs Klir-native and Bunge-native examples before the Mobus column means anything.** That is the sharpest gap the read exposes, and it is a commissioning task, not a fix.

## What this does not establish

The spread is a count of unrendered items, not a semantic distance. Two models with the same spread can differ for unrelated reasons, and a low spread is not evidence that two lenses agree about meaning — only that they omit the same amount. Reading *what* differs still requires opening the residue labels, which the report prints per lens but does not diff item by item.

The refusal reasons also collapse harder than the counts suggest: 17 refused cells across 16 models, but only three distinct mechanisms — boundary-crossing without an interface (Mobus, ~11 models), self-dependency where `k = o` (Mobus, 2), and no bond between distinct components (Bunge, 4). Seventeen cells is not seventeen results.
