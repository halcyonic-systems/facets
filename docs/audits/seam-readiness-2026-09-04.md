# Seam-readiness of the shipped models

**Status: RESEARCH.** A one-shot audit run on 2026-09-04, immediately after continuous zoom across the decomposition seam shipped ([#139](https://github.com/halcyonic-systems/facets/issues/139)). It reports what the shipped models are, not what they should be; every judgment column is an opinion and no model was changed. Regenerate the mechanical half with `python3 scripts/seam_audit.py`.

## The question

Continuous zoom opens only where a model asserts a process inside a process. The kernel says why. A decomposed component points at a child model whose boundary must *refine* every crossing of the parent component: same substance kind, same environmental counterparty matched by name, landing on a named child interface. That contract is transcribed row by row from the Lean `Decomposition` and `InterfaceDecomposition` structures into [`crates/bert-core/src/decomposition.rs`](../../crates/bert-core/src/decomposition.rs), whose header table is the authority for everything below.

The consequence is blunt. A component joined to its neighbours by untyped arrows has nothing for a child boundary to refine. A model built network-first — peers joined by relations, nothing crossing anything — cannot open at all, no matter what the surface offers. So: which of the models that ship with the Model face could carry a seam today, and which are not systems models in the first place?

## Method

`scripts/seam_audit.py` is read-only. It enumerates the shipped set exactly as `web/src/home.ts` does, compiles each `.sl` with the real kernel through the headless `bert compile` door, and reads the compiled canvas model. It decides nothing the kernel does not already carry: role, primitive, interface flag, bond kind, substance name, counterparty, and the `decomposes` reference are all fields of the compiled model.

Per component:

| Verdict | Means |
|---|---|
| READY | at least one crossing, every crossing carrying a declared substance kind and a named counterparty |
| ONE-STEP | crossings exist, but one or more is untyped or its counterparty is unnamed |
| NONE | no crossings at all — an isolated node, or joined only by `mere` relations, which never project |

An untyped bond counts against READY even though `kind_to_substance` in `canvas.rs` maps the unspecified kind to `Energy` at projection. The seam check would then compare two multisets of `Energy` and pass. The author never said so, and a seam that holds because of a default is not a seam the author asserted.

Per model, `SYSTEM` means a boundary exists (environment things, or components stamped as interfaces) and something either transforms or carries a typed flow. `NETWORK` means peers and relations, no boundary, nothing transforming. `FLAT-BY-DESIGN` is the same shape as NETWORK, but on a corpus entry that carries a citation: the source stopped at one level on purpose, and typing its arrows would falsify the transcription.

Two limits worth stating. The `.json` beside each walkthrough level is the archive of the same model, held to the `.sl` by the `steel_walkthrough` gate, so auditing the `.sl` audits both and no JSON path was needed. And READY is a claim about the *parent* side only — it says the crossings are authored well enough for a child to be built against them, not that a child exists or that opening the component would teach anything.

## What the kernel's own seam check says

`check_decomposition` was run, on the only two seams that ship. `cargo test -p bert-lenses-kernel --test steel_walkthrough` passes all three tests, including `walkthrough_seams_are_clean`, which runs `check_decompositions_canvas` over both the level 0 to level 1 seam and the level 1 to level 2 seam. It was not run on any other model, because no other shipped model contains a `decomposes` reference.

## Totals

Thirty-one models audited: the twenty-nine rows the gallery shows, plus the two walkthrough interiors that the Steel-Plant row's `decomposes` references resolve to.

| | Count |
|---|--:|
| SYSTEM models | 21 |
| FLAT-BY-DESIGN models | 10 |
| NETWORK models | 0 |
| READY components | 78 |
| ONE-STEP components | 36 |
| NONE components | 0 |
| Models containing a `decomposes` reference | 2 |

The headline finding is not the one the framing predicted. There is no network-first wreckage on the shelf: every model has crossings, nothing is an isolated node, and no component is joined only by mere relations. The split is cleaner and more awkward than that. Twenty-one models are already seam-ready on the parent side and have simply never been asked to open, and ten are faithful transcriptions of sources that were drawn as graphs. Depth is missing from the shelf because nobody authored it, not because the models cannot carry it.

The second finding is quieter. Substance *names* are largely absent even where substance kinds are declared: of the 269 bonds across all thirty-one models, only 54 carry a substance name. The seam contract does not read the name, so this costs nothing today. `check_stock_dimensions` does read it, so it costs something the moment a decomposed model is run.

## Judgment

One verdict per model. KEEP means it is ready or flat by design and teaches something. REFINE means it is one typed flow or one assertion away. REBUILD means it would have to be re-conceived. REMOVE means it teaches nothing the others do not.

| Model | Kind | READY / ONE-STEP | Verdict | Why |
|---|---|---|---|---|
| LLM Market | SYSTEM | 11 / 0 | KEEP | The largest runnable model on the shelf and the only one with a real data panel behind it. |
| Translation Apparatus | SYSTEM | 9 / 0 | REFINE | Fully typed, runnable, nine components with genuine interiors, and no `decomposes` anywhere. See the note on Ribosome below. |
| Bitcoin | SYSTEM | 3 / 0 | KEEP | Three buffering and combining processes with typed crossings. Mining is an obvious future parent. |
| Federal Reserve | SYSTEM | 3 / 0 | KEEP | The most carefully authored example on the shelf — every flow carries a description, most carry a substance name. |
| hal | SYSTEM | 5 / 0 | KEEP | The only Bunge-lens example. Earns its place on lens coverage alone. |
| Jungian Cognitive Function Stack | SYSTEM | 4 / 0 | REFINE | It declares itself `Conceptual/Social`, but the gallery groups by genus and drops the kingdom, so the hedge is invisible where a reader needs it. The blurb should carry it. |
| U.S. Federal Economic Policy | SYSTEM | 2 / 0 | REFINE | Two typed policy channels, and its `Federal Reserve` component is the same system the Federal Reserve model draws. The pairing is the shelf's most obvious second walkthrough and is described below. |
| Predator-Prey Ecosystem | SYSTEM | 2 / 0 | KEEP | The minimal two-stock model. Small on purpose. |
| Ribosome | SYSTEM | 4 / 0 | REFINE | Four components, all four of which also appear by name in Translation Apparatus. As shipped these are the same system at two boundary choices, and nothing in the gallery says so. Either wire them together or say in both blurbs that the pair teaches boundary choice. |
| The Steel-Plant, three levels deep (level 0) | SYSTEM | 1 / 0 | KEEP | The only model on the shelf that teaches decomposition, and the seam is machine-checked. |
| Steel-Plant walk, level 1 | SYSTEM | 10 / 0 | KEEP | Ten components, every one seam-ready, one of them already decomposed. |
| Steel-Plant walk, level 2 | SYSTEM | 5 / 0 | KEEP | The floor of the walk. |
| Students in a course | FLAT-BY-DESIGN | 0 / 10 | KEEP | Klir's equivalence relation on a named set. It is a graph because the source is a graph; typing "same grade" as a substance would be a lie. |
| Goal-oriented systems, four paradigms | SYSTEM | 2 / 0 each | KEEP | The sibling set teaches by difference over one fixed composition. Its value is the diff, not depth. |
| The two-thing system, three variants | FLAT-BY-DESIGN | 0 / 2 each | KEEP | Bunge's Definition 1.2 example. "a acts on b" is an action, not a substance. |
| Coupling graphs σ₁, σ₂, σ₃ | FLAT-BY-DESIGN | 0 / 3, 0 / 4, 0 / 3 | KEEP | Bunge's coupling graphs are graphs by construction. Typing them would falsify the source. |
| A cell in a cellular array | FLAT-BY-DESIGN | 0 / 1 | KEEP | One component, eight untyped couplings to four neighbour cells. Klir's Fig. 4.11 is about the coupling pattern. |
| A serial binary adder | FLAT-BY-DESIGN | 0 / 3 | REFINE | Filed as flat, but this is not a relation on a set. It is a block diagram of three processes exchanging bits, and the bits are information. See below. |
| Criminal courts and probation | FLAT-BY-DESIGN | 0 / 5 | REFINE | The largest gap on the shelf between what a model is and what it declares. Five phases, cases entering from the environment and leaving through an exit, ten untyped arrows. See below. |
| The Steel-Plant in its environment | SYSTEM | 1 / 0 | KEEP | Mobus's Fig. 4.14 stopping point, deliberately opaque. The walkthrough is the deep version and the pair is the lesson. |
| A digital computing system | SYSTEM | 3 / 0 | KEEP | Hardware, firmware, software with typed crossings. Mobus draws the hardware interior in the next figure, so a child is a transcription away. |
| A "typical" neuron | SYSTEM | 3 / 0 | KEEP | Three compartments, typed crossings, two of them stamped as interfaces. |
| The mammalian brain | SYSTEM | 3 / 0 | KEEP | The thinnest Mobus entry — three components, three flows, a straight chain. It survives on the interface stamp and the citation, not on richness. |
| The human social system in the Ecos | SYSTEM | 1 / 1 | REFINE | One untyped flow away from complete. See below. |

Nothing is marked REBUILD and nothing is marked REMOVE. That is the honest reading of the data: the network-first models the framing expected are not there. The closest thing to a duplicate is the Ribosome and Translation Apparatus pair, and the fix there is to state the relation rather than delete either one.

## The three to fix first

**Criminal courts and probation.** Ten flows, every one untyped, feeding five named phases with an environment on both ends. Cases enter as complaints, are transformed by arraignment, sentencing, and probation, and leave through an exit. That is a work process, and it is currently filed as a graph because nobody typed the arrows. Adding one substance kind per flow moves five components from ONE-STEP to READY in a single pass, and each of those phases has a real interior in the source. Highest teaching value per edit on the whole shelf.

**A serial binary adder.** Eight untyped flows among SUM, CARRY, and MEMORY, with three environment stand-ins. Klir's Fig. 4.8 is a block diagram of digital logic, and every flow in it is a bit — informational, unambiguously. Typing them makes all three components READY, and MEMORY in particular is a one-bit register whose interior is textbook. Same edit as above, smaller and even less contestable.

**The human social system in the Ecos.** One flow blocks it: the disturbance returning from the system's own waste disposal, the only untyped bond in a model where the other nine carry kinds. Type it and the model is 2 for 2. It matters more than its size suggests, because Work Processes is the component whose interior Mobus develops directly in the same chapter, so the child model is a transcription rather than a design problem.

**A near miss worth naming.** The U.S. Federal Economic Policy model contains a `Federal Reserve` component, and the shelf separately ships a Federal Reserve model. That looks like a free second walkthrough and it is not. The parent component has four crossings, all against a counterparty named "Banks and Dealers"; the child model crosses its boundary against "Primary Dealers", "Banking System", "U.S. Treasury", "Statistical Agencies", and "Financial Markets". The seam would be refused twice over, on crossing cardinality and on counterparty names. Making the pair work is a reconciliation of two independently authored boundaries, not one clause. Worth doing, but it is the fourth item, not the third.

## Regenerating

```bash
cargo build -p bert-cli --bin bert
python3 scripts/seam_audit.py                 # Markdown to stdout
python3 scripts/seam_audit.py --json          # machine-readable
```

Everything below this line is that output, pasted unedited.

---

<!-- seam_audit.py output below -->

| Model | Shelf | Kind | Lens | Comps | READY | ONE-STEP | NONE | Env | Bonds | Typed kind | Named subst. | Mere | Transforms |
|---|---|---|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|:-:|
| LLM Market | example/Social | SYSTEM | Mobus | 11 | 11 | 0 | 0 | 10 | 38 | 38 | 11 | 0 | yes |
| Translation Apparatus | example/Biological | SYSTEM | Mobus | 9 | 9 | 0 | 0 | 3 | 17 | 17 | 0 | 0 | yes |
| Bitcoin | example/Social | SYSTEM | Mobus | 3 | 3 | 0 | 0 | 3 | 10 | 10 | 0 | 0 | yes |
| Federal Reserve | example/Social | SYSTEM | Mobus | 3 | 3 | 0 | 0 | 5 | 15 | 15 | 7 | 0 | yes |
| hal | example/Technical | SYSTEM | Bunge | 5 | 5 | 0 | 0 | 3 | 13 | 13 | 0 | 0 | yes |
| Jungian Cognitive Function Stack | example/Social | SYSTEM | Mobus | 4 | 4 | 0 | 0 | 2 | 7 | 7 | 0 | 0 | yes |
| U.S. Federal Economic Policy | example/Social | SYSTEM | Mobus | 2 | 2 | 0 | 0 | 2 | 7 | 7 | 5 | 0 | yes |
| Predator-Prey Ecosystem | example/Biological | SYSTEM | Mobus | 2 | 2 | 0 | 0 | 3 | 4 | 4 | 0 | 0 | yes |
| Ribosome | example/Biological | SYSTEM | Mobus | 4 | 4 | 0 | 0 | 4 | 10 | 10 | 0 | 0 | yes |
| The Steel-Plant, three levels deep | example/Technical | SYSTEM | Mobus | 1 | 1 | 0 | 0 | 6 | 10 | 10 | 6 | 0 | yes |
| Steel-Plant walk — level 1 (Fig. 4.16 interior) | walkthrough/Technical | SYSTEM | Mobus | 10 | 10 | 0 | 0 | 6 | 22 | 22 | 14 | 0 | yes |
| Steel-Plant walk — level 2 (Iron-Inventory's room) | walkthrough/Technical | SYSTEM | Mobus | 5 | 5 | 0 | 0 | 3 | 9 | 9 | 5 | 0 | yes |
| Students in a course | corpus/klir | FLAT-BY-DESIGN | Klir | 10 | 0 | 10 | 0 | 0 | 12 | 0 | 0 | 0 | — |
| Goal-oriented systems — the Informationless paradigm | corpus/klir | SYSTEM | Klir | 2 | 2 | 0 | 0 | 2 | 3 | 3 | 0 | 0 | — |
| Goal-oriented systems — the Feedback paradigm | corpus/klir | SYSTEM | Klir | 2 | 2 | 0 | 0 | 2 | 4 | 4 | 0 | 0 | — |
| Goal-oriented systems — the Feedforward paradigm | corpus/klir | SYSTEM | Klir | 2 | 2 | 0 | 0 | 2 | 4 | 4 | 0 | 0 | — |
| Goal-oriented systems — the Full-information paradigm | corpus/klir | SYSTEM | Klir | 2 | 2 | 0 | 0 | 2 | 5 | 5 | 0 | 0 | — |
| The two-thing system — a acts on b | corpus/bunge | FLAT-BY-DESIGN | Bunge | 2 | 0 | 2 | 0 | 1 | 2 | 0 | 0 | 0 | — |
| The two-thing system — b acts on a | corpus/bunge | FLAT-BY-DESIGN | Bunge | 2 | 0 | 2 | 0 | 1 | 2 | 0 | 0 | 0 | — |
| The two-thing system — a and b act on each other | corpus/bunge | FLAT-BY-DESIGN | Bunge | 2 | 0 | 2 | 0 | 1 | 3 | 0 | 0 | 0 | — |
| Coupling graph σ₁ — a symmetric chain | corpus/bunge | FLAT-BY-DESIGN | Bunge | 3 | 0 | 3 | 0 | 0 | 4 | 0 | 0 | 0 | — |
| Coupling graph σ₂ — a cycle with inhibition | corpus/bunge | FLAT-BY-DESIGN | Bunge | 4 | 0 | 4 | 0 | 0 | 4 | 0 | 0 | 0 | — |
| Coupling graph σ₃ — self-action and feedback | corpus/bunge | FLAT-BY-DESIGN | Bunge | 3 | 0 | 3 | 0 | 0 | 5 | 0 | 0 | 0 | — |
| A cell in a cellular array | corpus/klir | FLAT-BY-DESIGN | Klir | 1 | 0 | 1 | 0 | 4 | 8 | 0 | 0 | 0 | — |
| A serial binary adder | corpus/klir | FLAT-BY-DESIGN | Klir | 3 | 0 | 3 | 0 | 3 | 8 | 0 | 0 | 0 | — |
| Criminal courts and probation, New York State | corpus/klir | FLAT-BY-DESIGN | Klir | 5 | 0 | 5 | 0 | 1 | 10 | 0 | 0 | 0 | — |
| The Steel-Plant in its environment | corpus/mobus | SYSTEM | Mobus | 1 | 1 | 0 | 0 | 6 | 6 | 6 | 6 | 0 | yes |
| A digital computing system | corpus/mobus | SYSTEM | Mobus | 3 | 3 | 0 | 0 | 4 | 8 | 8 | 0 | 0 | — |
| A "typical" neuron | corpus/mobus | SYSTEM | Mobus | 3 | 3 | 0 | 0 | 3 | 6 | 6 | 0 | 0 | — |
| The mammalian brain — the afferent visual path | corpus/mobus | SYSTEM | Mobus | 3 | 3 | 0 | 0 | 1 | 3 | 3 | 0 | 0 | — |
| The human social system in the Ecos | corpus/mobus | SYSTEM | Mobus | 2 | 1 | 1 | 0 | 6 | 10 | 9 | 0 | 0 | — |

**Totals.** 29 gallery rows + 2 walkthrough interiors = 31 models audited · 10 FLAT-BY-DESIGN · 21 SYSTEM · components: 78 READY · 36 ONE-STEP · 0 NONE

## Per component

### LLM Market

`assets/examples/llm-market.sl` — SYSTEM, Mobus lens

| Component | Primitive | Iface | Decomp | In | Out | Mere | Verdict | What blocks it |
|---|---|:-:|:-:|--:|--:|--:|---|---|
| Developer clearing | Splitting | yes | — | 1 | 9 | 0 | READY | — |
| Enterprise clearing | Splitting | yes | — | 1 | 9 | 0 | READY | — |
| Opus | Amplifying | yes | — | 3 | 1 | 0 | READY | — |
| Fable | Amplifying | yes | — | 3 | 1 | 0 | READY | — |
| GPT | Amplifying | yes | — | 3 | 1 | 0 | READY | — |
| Gemini | Amplifying | yes | — | 3 | 1 | 0 | READY | — |
| Gemma | Amplifying | yes | — | 3 | 1 | 0 | READY | — |
| Llama | Amplifying | yes | — | 3 | 1 | 0 | READY | — |
| Qwen | Amplifying | yes | — | 3 | 1 | 0 | READY | — |
| DeepSeek | Amplifying | yes | — | 3 | 1 | 0 | READY | — |
| Other open | Amplifying | yes | — | 3 | 1 | 0 | READY | — |

- `Developer clearing` in: dev inference compute — kind `Energy`, substance `compute`, counterparty `Developer workload`
- `Developer clearing` out: dev serving share — kind `Energy`, substance `(no substance name)`, counterparty `Opus`
- `Developer clearing` out: dev serving share — kind `Energy`, substance `(no substance name)`, counterparty `Fable`
- `Developer clearing` out: dev serving share — kind `Energy`, substance `(no substance name)`, counterparty `GPT`
- `Developer clearing` out: dev serving share — kind `Energy`, substance `(no substance name)`, counterparty `Gemini`
- `Developer clearing` out: dev serving share — kind `Energy`, substance `(no substance name)`, counterparty `Gemma`
- `Developer clearing` out: dev serving share — kind `Energy`, substance `(no substance name)`, counterparty `Llama`
- `Developer clearing` out: dev serving share — kind `Energy`, substance `(no substance name)`, counterparty `Qwen`
- `Developer clearing` out: dev serving share — kind `Energy`, substance `(no substance name)`, counterparty `DeepSeek`
- `Developer clearing` out: dev serving share — kind `Energy`, substance `(no substance name)`, counterparty `Other open`
- `Enterprise clearing` in: enterprise inference compute — kind `Energy`, substance `compute`, counterparty `Enterprise workload`
- `Enterprise clearing` out: enterprise serving share — kind `Energy`, substance `(no substance name)`, counterparty `Opus`
- `Enterprise clearing` out: enterprise serving share — kind `Energy`, substance `(no substance name)`, counterparty `Fable`
- `Enterprise clearing` out: enterprise serving share — kind `Energy`, substance `(no substance name)`, counterparty `GPT`
- `Enterprise clearing` out: enterprise serving share — kind `Energy`, substance `(no substance name)`, counterparty `Gemini`
- `Enterprise clearing` out: enterprise serving share — kind `Energy`, substance `(no substance name)`, counterparty `Gemma`
- `Enterprise clearing` out: enterprise serving share — kind `Energy`, substance `(no substance name)`, counterparty `Llama`
- `Enterprise clearing` out: enterprise serving share — kind `Energy`, substance `(no substance name)`, counterparty `Qwen`
- `Enterprise clearing` out: enterprise serving share — kind `Energy`, substance `(no substance name)`, counterparty `DeepSeek`
- `Enterprise clearing` out: enterprise serving share — kind `Energy`, substance `(no substance name)`, counterparty `Other open`
- `Opus` in: released weights & API — kind `Informational`, substance `(no substance name)`, counterparty `Anthropic`
- `Opus` in: dev serving share — kind `Energy`, substance `(no substance name)`, counterparty `Developer clearing`
- `Opus` in: enterprise serving share — kind `Energy`, substance `(no substance name)`, counterparty `Enterprise clearing`
- `Opus` out: tokens served — kind `Informational`, substance `tokens`, counterparty `Applications served`
- `Fable` in: released weights & API — kind `Informational`, substance `(no substance name)`, counterparty `Anthropic`
- `Fable` in: dev serving share — kind `Energy`, substance `(no substance name)`, counterparty `Developer clearing`
- `Fable` in: enterprise serving share — kind `Energy`, substance `(no substance name)`, counterparty `Enterprise clearing`
- `Fable` out: tokens served — kind `Informational`, substance `tokens`, counterparty `Applications served`
- `GPT` in: released weights & API — kind `Informational`, substance `(no substance name)`, counterparty `OpenAI`
- `GPT` in: dev serving share — kind `Energy`, substance `(no substance name)`, counterparty `Developer clearing`
- `GPT` in: enterprise serving share — kind `Energy`, substance `(no substance name)`, counterparty `Enterprise clearing`
- `GPT` out: tokens served — kind `Informational`, substance `tokens`, counterparty `Applications served`
- `Gemini` in: released weights & API — kind `Informational`, substance `(no substance name)`, counterparty `Google`
- `Gemini` in: dev serving share — kind `Energy`, substance `(no substance name)`, counterparty `Developer clearing`
- `Gemini` in: enterprise serving share — kind `Energy`, substance `(no substance name)`, counterparty `Enterprise clearing`
- `Gemini` out: tokens served — kind `Informational`, substance `tokens`, counterparty `Applications served`
- `Gemma` in: released weights & API — kind `Informational`, substance `(no substance name)`, counterparty `Google`
- `Gemma` in: dev serving share — kind `Energy`, substance `(no substance name)`, counterparty `Developer clearing`
- `Gemma` in: enterprise serving share — kind `Energy`, substance `(no substance name)`, counterparty `Enterprise clearing`
- `Gemma` out: tokens served — kind `Informational`, substance `tokens`, counterparty `Applications served`
- `Llama` in: released weights & API — kind `Informational`, substance `(no substance name)`, counterparty `Meta`
- `Llama` in: dev serving share — kind `Energy`, substance `(no substance name)`, counterparty `Developer clearing`
- `Llama` in: enterprise serving share — kind `Energy`, substance `(no substance name)`, counterparty `Enterprise clearing`
- `Llama` out: tokens served — kind `Informational`, substance `tokens`, counterparty `Applications served`
- `Qwen` in: released weights & API — kind `Informational`, substance `(no substance name)`, counterparty `Alibaba`
- `Qwen` in: dev serving share — kind `Energy`, substance `(no substance name)`, counterparty `Developer clearing`
- `Qwen` in: enterprise serving share — kind `Energy`, substance `(no substance name)`, counterparty `Enterprise clearing`
- `Qwen` out: tokens served — kind `Informational`, substance `tokens`, counterparty `Applications served`
- `DeepSeek` in: released weights & API — kind `Informational`, substance `(no substance name)`, counterparty `DeepSeek (lab)`
- `DeepSeek` in: dev serving share — kind `Energy`, substance `(no substance name)`, counterparty `Developer clearing`
- `DeepSeek` in: enterprise serving share — kind `Energy`, substance `(no substance name)`, counterparty `Enterprise clearing`
- `DeepSeek` out: tokens served — kind `Informational`, substance `tokens`, counterparty `Applications served`
- `Other open` in: released weights & API — kind `Informational`, substance `(no substance name)`, counterparty `Open-weight field`
- `Other open` in: dev serving share — kind `Energy`, substance `(no substance name)`, counterparty `Developer clearing`
- `Other open` in: enterprise serving share — kind `Energy`, substance `(no substance name)`, counterparty `Enterprise clearing`
- `Other open` out: tokens served — kind `Informational`, substance `tokens`, counterparty `Applications served`

### Translation Apparatus

`assets/examples/translation-apparatus.sl` — SYSTEM, Mobus lens

| Component | Primitive | Iface | Decomp | In | Out | Mere | Verdict | What blocks it |
|---|---|:-:|:-:|--:|--:|--:|---|---|
| mRNA Entry Channel | — | yes | — | 1 | 1 | 0 | READY | — |
| Aminoacylation Site | — | yes | — | 2 | 2 | 0 | READY | — |
| GTPase-Associated Center | — | yes | — | 2 | 2 | 0 | READY | — |
| Exit Tunnel | — | yes | — | 1 | 1 | 0 | READY | — |
| Decoding Site | Sensing | — | — | 2 | 2 | 0 | READY | — |
| Peptidyl Transferase Center | Combining | — | — | 1 | 1 | 0 | READY | — |
| Translocase | Propelling | — | — | 2 | 2 | 0 | READY | — |
| Aminoacyl-tRNA Synthetase | Combining | — | — | 3 | 1 | 0 | READY | — |
| tRNA Pool | Buffering | — | — | 1 | 1 | 0 | READY | — |

- `mRNA Entry Channel` in: mRNA transcript — kind `Matter`, substance `(no substance name)`, counterparty `Nucleus`
- `mRNA Entry Channel` out: mRNA transcript — kind `Matter`, substance `(no substance name)`, counterparty `Decoding Site`
- `Aminoacylation Site` in: free amino acid — kind `Matter`, substance `(no substance name)`, counterparty `Cytosol`
- `Aminoacylation Site` in: ATP — kind `Energy`, substance `(no substance name)`, counterparty `Cytosol`
- `Aminoacylation Site` out: free amino acid — kind `Matter`, substance `(no substance name)`, counterparty `Aminoacyl-tRNA Synthetase`
- `Aminoacylation Site` out: ATP — kind `Energy`, substance `(no substance name)`, counterparty `Aminoacyl-tRNA Synthetase`
- `GTPase-Associated Center` in: GTP — kind `Energy`, substance `(no substance name)`, counterparty `Cytosol`
- `GTPase-Associated Center` out: GTP — kind `Energy`, substance `(no substance name)`, counterparty `Translocase`
- `GTPase-Associated Center` in: GDP and inorganic phosphate — kind `Matter`, substance `(no substance name)`, counterparty `Translocase`
- `GTPase-Associated Center` out: GDP and inorganic phosphate — kind `Matter`, substance `(no substance name)`, counterparty `Cytosol`
- `Exit Tunnel` in: polypeptide chain — kind `Matter`, substance `(no substance name)`, counterparty `Translocase`
- `Exit Tunnel` out: nascent polypeptide — kind `Matter`, substance `(no substance name)`, counterparty `Chaperone`
- `Decoding Site` in: mRNA transcript — kind `Matter`, substance `(no substance name)`, counterparty `mRNA Entry Channel`
- `Decoding Site` in: charged tRNA — kind `Matter`, substance `(no substance name)`, counterparty `tRNA Pool`
- `Decoding Site` out: deacylated tRNA — kind `Matter`, substance `(no substance name)`, counterparty `Aminoacyl-tRNA Synthetase`
- `Decoding Site` out: accommodated amino acid — kind `Matter`, substance `(no substance name)`, counterparty `Peptidyl Transferase Center`
- `Peptidyl Transferase Center` in: accommodated amino acid — kind `Matter`, substance `(no substance name)`, counterparty `Decoding Site`
- `Peptidyl Transferase Center` out: elongated chain — kind `Matter`, substance `(no substance name)`, counterparty `Translocase`
- `Translocase` in: GTP — kind `Energy`, substance `(no substance name)`, counterparty `GTPase-Associated Center`
- `Translocase` in: elongated chain — kind `Matter`, substance `(no substance name)`, counterparty `Peptidyl Transferase Center`
- `Translocase` out: polypeptide chain — kind `Matter`, substance `(no substance name)`, counterparty `Exit Tunnel`
- `Translocase` out: GDP and inorganic phosphate — kind `Matter`, substance `(no substance name)`, counterparty `GTPase-Associated Center`
- `Aminoacyl-tRNA Synthetase` in: deacylated tRNA — kind `Matter`, substance `(no substance name)`, counterparty `Decoding Site`
- `Aminoacyl-tRNA Synthetase` out: recharged tRNA — kind `Matter`, substance `(no substance name)`, counterparty `tRNA Pool`
- `Aminoacyl-tRNA Synthetase` in: free amino acid — kind `Matter`, substance `(no substance name)`, counterparty `Aminoacylation Site`
- `Aminoacyl-tRNA Synthetase` in: ATP — kind `Energy`, substance `(no substance name)`, counterparty `Aminoacylation Site`
- `tRNA Pool` out: charged tRNA — kind `Matter`, substance `(no substance name)`, counterparty `Decoding Site`
- `tRNA Pool` in: recharged tRNA — kind `Matter`, substance `(no substance name)`, counterparty `Aminoacyl-tRNA Synthetase`

### Bitcoin

`assets/examples/bitcoin.sl` — SYSTEM, Mobus lens

| Component | Primitive | Iface | Decomp | In | Out | Mere | Verdict | What blocks it |
|---|---|:-:|:-:|--:|--:|--:|---|---|
| Mempool | Buffering | yes | — | 1 | 2 | 0 | READY | — |
| Mining | Combining | yes | — | 4 | 2 | 0 | READY | — |
| Chain State | Buffering | yes | — | 1 | 3 | 0 | READY | — |

- `Mempool` in: submitted transactions — kind `Informational`, substance `(no substance name)`, counterparty `Transactors`
- `Mempool` out: selected by feerate — kind `Informational`, substance `(no substance name)`, counterparty `Mining`
- `Mempool` out: feerate signal — kind `Informational`, substance `(no substance name)`, counterparty `Transactors`
- `Mining` in: selected by feerate — kind `Informational`, substance `(no substance name)`, counterparty `Mempool`
- `Mining` in: electricity burned — kind `Energy`, substance `(no substance name)`, counterparty `Energy Market`
- `Mining` out: blocks appended — kind `Informational`, substance `(no substance name)`, counterparty `Chain State`
- `Mining` in: difficulty — kind `Informational`, substance `(no substance name)`, counterparty `Chain State`
- `Mining` in: block reward — kind `Matter`, substance `(no substance name)`, counterparty `Chain State`
- `Mining` out: coins sold — kind `Matter`, substance `(no substance name)`, counterparty `Asset Market`
- `Chain State` in: blocks appended — kind `Informational`, substance `(no substance name)`, counterparty `Mining`
- `Chain State` out: confirmations — kind `Informational`, substance `(no substance name)`, counterparty `Transactors`
- `Chain State` out: difficulty — kind `Informational`, substance `(no substance name)`, counterparty `Mining`
- `Chain State` out: block reward — kind `Matter`, substance `(no substance name)`, counterparty `Mining`

### Federal Reserve

`assets/examples/federal-reserve.sl` — SYSTEM, Mobus lens

| Component | Primitive | Iface | Decomp | In | Out | Mere | Verdict | What blocks it |
|---|---|:-:|:-:|--:|--:|--:|---|---|
| FOMC | Modulating | yes | — | 2 | 2 | 0 | READY | — |
| Open Market Desk | Modulating | yes | — | 3 | 3 | 0 | READY | — |
| Balance Sheet | Buffering | yes | — | 3 | 4 | 0 | READY | — |

- `FOMC` in: published measurements — kind `Informational`, substance `(no substance name)`, counterparty `Statistical Agencies`
- `FOMC` out: policy directive — kind `Informational`, substance `(no substance name)`, counterparty `Open Market Desk`
- `FOMC` out: announced decision — kind `Informational`, substance `(no substance name)`, counterparty `Financial Markets`
- `FOMC` in: market expectations — kind `Informational`, substance `(no substance name)`, counterparty `Financial Markets`
- `Open Market Desk` in: policy directive — kind `Informational`, substance `(no substance name)`, counterparty `FOMC`
- `Open Market Desk` in: securities bought — kind `Matter`, substance `securities`, counterparty `Primary Dealers`
- `Open Market Desk` out: securities held — kind `Matter`, substance `(no substance name)`, counterparty `Balance Sheet`
- `Open Market Desk` out: reserves minted — kind `Matter`, substance `reserves`, counterparty `Primary Dealers`
- `Open Market Desk` out: securities sold — kind `Matter`, substance `portfolio`, counterparty `Primary Dealers`
- `Open Market Desk` in: reserves extinguished — kind `Matter`, substance `settlement`, counterparty `Primary Dealers`
- `Balance Sheet` in: securities held — kind `Matter`, substance `(no substance name)`, counterparty `Open Market Desk`
- `Balance Sheet` out: interest on reserves — kind `Matter`, substance `interest`, counterparty `Banking System`
- `Balance Sheet` out: remittances — kind `Matter`, substance `(no substance name)`, counterparty `U.S. Treasury`
- `Balance Sheet` in: collateral pledged — kind `Matter`, substance `(no substance name)`, counterparty `Banking System`
- `Balance Sheet` out: reserves lent — kind `Matter`, substance `credit`, counterparty `Banking System`
- `Balance Sheet` out: currency issued — kind `Matter`, substance `banknotes`, counterparty `Banking System`
- `Balance Sheet` in: TGA deposits — kind `Matter`, substance `(no substance name)`, counterparty `U.S. Treasury`

### hal

`assets/examples/hal-harness.sl` — SYSTEM, Bunge lens

| Component | Primitive | Iface | Decomp | In | Out | Mere | Verdict | What blocks it |
|---|---|:-:|:-:|--:|--:|--:|---|---|
| Proxy | Splitting | yes | — | 4 | 5 | 0 | READY | — |
| Council | Combining | — | — | 1 | 1 | 0 | READY | — |
| Bench | Sensing | — | — | 1 | 1 | 0 | READY | — |
| Fine-tune Pipeline | Combining | yes | — | 2 | 1 | 0 | READY | — |
| Homeostat | Modulating | yes | — | 1 | 2 | 0 | READY | — |

- `Proxy` in: request — kind `Informational`, substance `(no substance name)`, counterparty `Operators`
- `Proxy` out: response — kind `Informational`, substance `(no substance name)`, counterparty `Operators`
- `Proxy` out: model call — kind `Informational`, substance `(no substance name)`, counterparty `Local Models`
- `Proxy` in: generation — kind `Informational`, substance `(no substance name)`, counterparty `Local Models`
- `Proxy` out: proxy calls to convene — kind `Informational`, substance `(no substance name)`, counterparty `Council`
- `Proxy` in: convened verdict — kind `Informational`, substance `(no substance name)`, counterparty `Council`
- `Proxy` out: call telemetry — kind `Informational`, substance `(no substance name)`, counterparty `Bench`
- `Proxy` out: transport telemetry — kind `Informational`, substance `(no substance name)`, counterparty `Homeostat`
- `Proxy` in: guard verdict — kind `Informational`, substance `(no substance name)`, counterparty `Homeostat`
- `Council` in: proxy calls to convene — kind `Informational`, substance `(no substance name)`, counterparty `Proxy`
- `Council` out: convened verdict — kind `Informational`, substance `(no substance name)`, counterparty `Proxy`
- `Bench` in: call telemetry — kind `Informational`, substance `(no substance name)`, counterparty `Proxy`
- `Bench` out: benchmark results — kind `Informational`, substance `(no substance name)`, counterparty `Fine-tune Pipeline`
- `Fine-tune Pipeline` in: benchmark results — kind `Informational`, substance `(no substance name)`, counterparty `Bench`
- `Fine-tune Pipeline` in: base weights — kind `Informational`, substance `(no substance name)`, counterparty `Local Models`
- `Fine-tune Pipeline` out: tuned LoRA adapter — kind `Informational`, substance `(no substance name)`, counterparty `Local Models`
- `Homeostat` in: transport telemetry — kind `Informational`, substance `(no substance name)`, counterparty `Proxy`
- `Homeostat` out: guard verdict — kind `Informational`, substance `(no substance name)`, counterparty `Proxy`
- `Homeostat` out: published snapshot — kind `Informational`, substance `(no substance name)`, counterparty `Published Mirror`

### Jungian Cognitive Function Stack

`assets/examples/jung-functions.sl` — SYSTEM, Mobus lens

| Component | Primitive | Iface | Decomp | In | Out | Mere | Verdict | What blocks it |
|---|---|:-:|:-:|--:|--:|--:|---|---|
| Dominant | Amplifying | yes | — | 2 | 1 | 0 | READY | — |
| Auxiliary | Modulating | yes | — | 1 | 2 | 0 | READY | — |
| Tertiary | Impeding | — | — | 1 | 1 | 0 | READY | — |
| Inferior | Impeding | yes | — | 1 | 1 | 0 | READY | — |

- `Dominant` in: psychic energy investment — kind `Energy`, substance `(no substance name)`, counterparty `Libido Reservoir`
- `Dominant` out: residual energy — kind `Energy`, substance `(no substance name)`, counterparty `Auxiliary`
- `Dominant` in: perception — kind `Informational`, substance `(no substance name)`, counterparty `Outer World`
- `Auxiliary` in: residual energy — kind `Energy`, substance `(no substance name)`, counterparty `Dominant`
- `Auxiliary` out: residual energy — kind `Energy`, substance `(no substance name)`, counterparty `Tertiary`
- `Auxiliary` out: judgment — kind `Informational`, substance `(no substance name)`, counterparty `Outer World`
- `Tertiary` in: residual energy — kind `Energy`, substance `(no substance name)`, counterparty `Auxiliary`
- `Tertiary` out: residual energy — kind `Energy`, substance `(no substance name)`, counterparty `Inferior`
- `Inferior` in: residual energy — kind `Energy`, substance `(no substance name)`, counterparty `Tertiary`
- `Inferior` out: inferior eruption — kind `Informational`, substance `(no substance name)`, counterparty `Outer World`

### U.S. Federal Economic Policy

`assets/examples/policy-channels.sl` — SYSTEM, Mobus lens

| Component | Primitive | Iface | Decomp | In | Out | Mere | Verdict | What blocks it |
|---|---|:-:|:-:|--:|--:|--:|---|---|
| Federal Reserve | Modulating | yes | — | 2 | 2 | 0 | READY | — |
| Congress | Modulating | yes | — | 1 | 1 | 0 | READY | — |

- `Federal Reserve` in: securities sold — kind `Matter`, substance `securities`, counterparty `Banks and Dealers`
- `Federal Reserve` out: reserves created — kind `Matter`, substance `reserves`, counterparty `Banks and Dealers`
- `Federal Reserve` out: credit lent — kind `Matter`, substance `credit`, counterparty `Banks and Dealers`
- `Federal Reserve` in: market conditions — kind `Informational`, substance `(no substance name)`, counterparty `Banks and Dealers`
- `Congress` out: transfers — kind `Matter`, substance `transfers`, counterparty `Households and Firms`
- `Congress` in: political signal — kind `Informational`, substance `(no substance name)`, counterparty `Households and Firms`

### Predator-Prey Ecosystem

`assets/examples/predator-prey.sl` — SYSTEM, Mobus lens

| Component | Primitive | Iface | Decomp | In | Out | Mere | Verdict | What blocks it |
|---|---|:-:|:-:|--:|--:|--:|---|---|
| Rabbits | Buffering | yes | — | 1 | 1 | 0 | READY | — |
| Foxes | Buffering | yes | — | 1 | 1 | 0 | READY | — |

- `Rabbits` in: grazing — kind `Matter`, substance `(no substance name)`, counterparty `Grass`
- `Rabbits` out: predation — kind `Matter`, substance `(no substance name)`, counterparty `Foxes`
- `Foxes` in: predation — kind `Matter`, substance `(no substance name)`, counterparty `Rabbits`
- `Foxes` out: mortality — kind `Matter`, substance `(no substance name)`, counterparty `Decomposition`

### Ribosome

`assets/examples/ribosome-centers.sl` — SYSTEM, Mobus lens

| Component | Primitive | Iface | Decomp | In | Out | Mere | Verdict | What blocks it |
|---|---|:-:|:-:|--:|--:|--:|---|---|
| Decoding Site | Sensing | yes | — | 2 | 2 | 0 | READY | — |
| Peptidyl Transferase Center | Combining | yes | — | 2 | 1 | 0 | READY | — |
| Translocase | Propelling | yes | — | 2 | 2 | 0 | READY | — |
| Exit Tunnel | Buffering | yes | — | 1 | 1 | 0 | READY | — |

- `Decoding Site` in: mRNA transcript — kind `Matter`, substance `(no substance name)`, counterparty `Nucleus`
- `Decoding Site` in: charged tRNA — kind `Matter`, substance `(no substance name)`, counterparty `tRNA Synthetase Pool`
- `Decoding Site` out: accommodated amino acid — kind `Matter`, substance `(no substance name)`, counterparty `Peptidyl Transferase Center`
- `Decoding Site` out: deacylated tRNA — kind `Matter`, substance `(no substance name)`, counterparty `Cytosol`
- `Peptidyl Transferase Center` in: GTP — kind `Energy`, substance `(no substance name)`, counterparty `Cytosol`
- `Peptidyl Transferase Center` in: accommodated amino acid — kind `Matter`, substance `(no substance name)`, counterparty `Decoding Site`
- `Peptidyl Transferase Center` out: elongated chain — kind `Matter`, substance `(no substance name)`, counterparty `Translocase`
- `Translocase` in: GTP — kind `Energy`, substance `(no substance name)`, counterparty `Cytosol`
- `Translocase` in: elongated chain — kind `Matter`, substance `(no substance name)`, counterparty `Peptidyl Transferase Center`
- `Translocase` out: polypeptide chain — kind `Matter`, substance `(no substance name)`, counterparty `Exit Tunnel`
- `Translocase` out: GDP and inorganic phosphate — kind `Matter`, substance `(no substance name)`, counterparty `Cytosol`
- `Exit Tunnel` in: polypeptide chain — kind `Matter`, substance `(no substance name)`, counterparty `Translocase`
- `Exit Tunnel` out: nascent polypeptide — kind `Matter`, substance `(no substance name)`, counterparty `Chaperone`

### The Steel-Plant, three levels deep

`assets/walkthroughs/steel-plant/level-0.sl` — SYSTEM, Mobus lens

| Component | Primitive | Iface | Decomp | In | Out | Mere | Verdict | What blocks it |
|---|---|:-:|:-:|--:|--:|--:|---|---|
| Steel-Plant | Combining | yes | yes | 5 | 5 | 0 | READY | — |

- `Steel-Plant` in: F-1.0 — electric energy — kind `Energy`, substance `electricity`, counterparty `Energy-Source`
- `Steel-Plant` in: F-1.1 — iron-input — kind `Matter`, substance `iron`, counterparty `Iron-Source`
- `Steel-Plant` in: F-1.2 — coke-input — kind `Matter`, substance `coke`, counterparty `Coke-Source`
- `Steel-Plant` out: F-1.3 — steel for sale — kind `Matter`, substance `steel`, counterparty `Steel-Sink`
- `Steel-Plant` out: F-1.4 — scrap and wastage — kind `Matter`, substance `garbage`, counterparty `Garbage-Sink`
- `Steel-Plant` out: F-1.5 — radiated waste heat — kind `Energy`, substance `heat`, counterparty `ATMOSPHERE`
- `Steel-Plant` out: purchase orders — iron — kind `Informational`, substance `(no substance name)`, counterparty `Iron-Source`
- `Steel-Plant` out: purchase orders — coke — kind `Informational`, substance `(no substance name)`, counterparty `Coke-Source`
- `Steel-Plant` in: shipping documents — iron — kind `Informational`, substance `(no substance name)`, counterparty `Iron-Source`
- `Steel-Plant` in: shipping documents — coke — kind `Informational`, substance `(no substance name)`, counterparty `Coke-Source`

### Steel-Plant walk — level 1 (Fig. 4.16 interior)

`assets/walkthroughs/steel-plant/level-1.sl` — SYSTEM, Mobus lens

| Component | Primitive | Iface | Decomp | In | Out | Mere | Verdict | What blocks it |
|---|---|:-:|:-:|--:|--:|--:|---|---|
| FuseBox | — | yes | — | 1 | 1 | 0 | READY | — |
| Iron-LoadingDock | — | yes | — | 2 | 1 | 0 | READY | — |
| Coke-LoadingDock | — | yes | — | 2 | 1 | 0 | READY | — |
| Steel-ShippingDock | — | yes | — | 1 | 1 | 0 | READY | — |
| Waste-ShippingDock | — | yes | — | 1 | 1 | 0 | READY | — |
| Ventilation | — | yes | — | 1 | 1 | 0 | READY | — |
| Iron-Inventory | — | — | yes | 1 | 2 | 0 | READY | — |
| Coke-Inventory | — | — | — | 1 | 2 | 0 | READY | — |
| Material-Purchasing | — | yes | — | 4 | 4 | 0 | READY | — |
| Production | Combining | — | — | 3 | 3 | 0 | READY | — |

- `FuseBox` in: F-1.0 — electric energy — kind `Energy`, substance `electricity`, counterparty `Energy-Source`
- `FuseBox` out: distributed power — kind `Energy`, substance `electricity`, counterparty `Production`
- `Iron-LoadingDock` in: F-1.1 — iron-input — kind `Matter`, substance `iron`, counterparty `Iron-Source`
- `Iron-LoadingDock` out: shipment into inventory — kind `Matter`, substance `iron`, counterparty `Iron-Inventory`
- `Iron-LoadingDock` in: shipping documents to receiving — kind `Informational`, substance `(no substance name)`, counterparty `Material-Purchasing`
- `Coke-LoadingDock` in: F-1.2 — coke-input — kind `Matter`, substance `coke`, counterparty `Coke-Source`
- `Coke-LoadingDock` out: shipment into inventory — kind `Matter`, substance `coke`, counterparty `Coke-Inventory`
- `Coke-LoadingDock` in: shipping documents to receiving — kind `Informational`, substance `(no substance name)`, counterparty `Material-Purchasing`
- `Steel-ShippingDock` in: finished steel — kind `Matter`, substance `steel`, counterparty `Production`
- `Steel-ShippingDock` out: F-1.3 — steel for sale — kind `Matter`, substance `steel`, counterparty `Steel-Sink`
- `Waste-ShippingDock` in: scrap and wastage — kind `Matter`, substance `garbage`, counterparty `Production`
- `Waste-ShippingDock` out: F-1.4 — scrap and wastage — kind `Matter`, substance `garbage`, counterparty `Garbage-Sink`
- `Ventilation` in: process heat — kind `Energy`, substance `heat`, counterparty `Production`
- `Ventilation` out: F-1.5 — radiated waste heat — kind `Energy`, substance `heat`, counterparty `ATMOSPHERE`
- `Iron-Inventory` in: shipment into inventory — kind `Matter`, substance `iron`, counterparty `Iron-LoadingDock`
- `Iron-Inventory` out: F0.1 — iron in batches — kind `Matter`, substance `iron`, counterparty `Production`
- `Iron-Inventory` out: purchase request — iron — kind `Informational`, substance `(no substance name)`, counterparty `Material-Purchasing`
- `Coke-Inventory` in: shipment into inventory — kind `Matter`, substance `coke`, counterparty `Coke-LoadingDock`
- `Coke-Inventory` out: coke in batches — kind `Matter`, substance `coke`, counterparty `Production`
- `Coke-Inventory` out: purchase request — coke — kind `Informational`, substance `(no substance name)`, counterparty `Material-Purchasing`
- `Material-Purchasing` out: purchase orders — iron — kind `Informational`, substance `(no substance name)`, counterparty `Iron-Source`
- `Material-Purchasing` out: purchase orders — coke — kind `Informational`, substance `(no substance name)`, counterparty `Coke-Source`
- `Material-Purchasing` in: shipping documents — iron — kind `Informational`, substance `(no substance name)`, counterparty `Iron-Source`
- `Material-Purchasing` in: shipping documents — coke — kind `Informational`, substance `(no substance name)`, counterparty `Coke-Source`
- `Material-Purchasing` out: shipping documents to receiving — kind `Informational`, substance `(no substance name)`, counterparty `Iron-LoadingDock`
- `Material-Purchasing` out: shipping documents to receiving — kind `Informational`, substance `(no substance name)`, counterparty `Coke-LoadingDock`
- `Material-Purchasing` in: purchase request — iron — kind `Informational`, substance `(no substance name)`, counterparty `Iron-Inventory`
- `Material-Purchasing` in: purchase request — coke — kind `Informational`, substance `(no substance name)`, counterparty `Coke-Inventory`
- `Production` in: distributed power — kind `Energy`, substance `electricity`, counterparty `FuseBox`
- `Production` in: F0.1 — iron in batches — kind `Matter`, substance `iron`, counterparty `Iron-Inventory`
- `Production` in: coke in batches — kind `Matter`, substance `coke`, counterparty `Coke-Inventory`
- `Production` out: finished steel — kind `Matter`, substance `steel`, counterparty `Steel-ShippingDock`
- `Production` out: scrap and wastage — kind `Matter`, substance `garbage`, counterparty `Waste-ShippingDock`
- `Production` out: process heat — kind `Energy`, substance `heat`, counterparty `Ventilation`

### Steel-Plant walk — level 2 (Iron-Inventory's room)

`assets/walkthroughs/steel-plant/level-2.sl` — SYSTEM, Mobus lens

| Component | Primitive | Iface | Decomp | In | Out | Mere | Verdict | What blocks it |
|---|---|:-:|:-:|--:|--:|--:|---|---|
| Move-In | Propelling | yes | — | 2 | 1 | 0 | READY | — |
| Move-Out | Propelling | yes | — | 2 | 1 | 0 | READY | — |
| Iron-Stock | Buffering | — | — | 1 | 2 | 0 | READY | — |
| Level-Sensor | Sensing | — | — | 1 | 1 | 0 | READY | — |
| Inventory-Decider | — | yes | — | 1 | 3 | 0 | READY | — |

- `Move-In` in: shipment arriving — kind `Matter`, substance `iron`, counterparty `Iron-LoadingDock`
- `Move-In` out: moved into stock — kind `Matter`, substance `iron`, counterparty `Iron-Stock`
- `Move-In` in: receiving instructions — kind `Informational`, substance `(no substance name)`, counterparty `Inventory-Decider`
- `Move-Out` in: withdrawn in batches — kind `Matter`, substance `iron`, counterparty `Iron-Stock`
- `Move-Out` out: F0.1 — iron in batches — kind `Matter`, substance `iron`, counterparty `Production`
- `Move-Out` in: batching instructions — kind `Informational`, substance `(no substance name)`, counterparty `Inventory-Decider`
- `Iron-Stock` in: moved into stock — kind `Matter`, substance `iron`, counterparty `Move-In`
- `Iron-Stock` out: withdrawn in batches — kind `Matter`, substance `iron`, counterparty `Move-Out`
- `Iron-Stock` out: stock level reading — kind `Matter`, substance `iron`, counterparty `Level-Sensor`
- `Level-Sensor` in: stock level reading — kind `Matter`, substance `iron`, counterparty `Iron-Stock`
- `Level-Sensor` out: measured inventory level — kind `Informational`, substance `(no substance name)`, counterparty `Inventory-Decider`
- `Inventory-Decider` in: measured inventory level — kind `Informational`, substance `(no substance name)`, counterparty `Level-Sensor`
- `Inventory-Decider` out: receiving instructions — kind `Informational`, substance `(no substance name)`, counterparty `Move-In`
- `Inventory-Decider` out: batching instructions — kind `Informational`, substance `(no substance name)`, counterparty `Move-Out`
- `Inventory-Decider` out: purchase request — kind `Informational`, substance `(no substance name)`, counterparty `Material-Purchasing`

### Students in a course

`assets/corpus/klir/students-in-a-course.sl` — FLAT-BY-DESIGN, Klir lens

Citation: George Klir, Facets of Systems Science, 2nd ed. (2001), Ch. 2, Table 2.1 and Table 2.2, Fig. 2.2a

| Component | Primitive | Iface | Decomp | In | Out | Mere | Verdict | What blocks it |
|---|---|:-:|:-:|--:|--:|--:|---|---|
| Alan | — | — | — | 0 | 3 | 0 | ONE-STEP | untyped: same grade, same grade, same grade |
| Bob | — | — | — | 0 | 2 | 0 | ONE-STEP | untyped: same grade, same grade |
| Cliff | — | — | — | 1 | 1 | 0 | ONE-STEP | untyped: same grade, same grade |
| Debby | — | — | — | 0 | 2 | 0 | ONE-STEP | untyped: same grade, same grade |
| George | — | — | — | 1 | 1 | 0 | ONE-STEP | untyped: same grade, same grade |
| Jane | — | — | — | 2 | 0 | 0 | ONE-STEP | untyped: same grade, same grade |
| Lisa | — | — | — | 1 | 2 | 0 | ONE-STEP | untyped: same grade, same grade, same grade |
| Mary | — | — | — | 2 | 0 | 0 | ONE-STEP | untyped: same grade, same grade |
| Nancy | — | — | — | 2 | 1 | 0 | ONE-STEP | untyped: same grade, same grade, same grade |
| Paul | — | — | — | 3 | 0 | 0 | ONE-STEP | untyped: same grade, same grade, same grade |

- `Alan` out: same grade — kind `Unspecified`, substance `(no substance name)`, counterparty `Lisa`
- `Alan` out: same grade — kind `Unspecified`, substance `(no substance name)`, counterparty `Nancy`
- `Alan` out: same grade — kind `Unspecified`, substance `(no substance name)`, counterparty `Paul`
- `Bob` out: same grade — kind `Unspecified`, substance `(no substance name)`, counterparty `Cliff`
- `Bob` out: same grade — kind `Unspecified`, substance `(no substance name)`, counterparty `Mary`
- `Cliff` in: same grade — kind `Unspecified`, substance `(no substance name)`, counterparty `Bob`
- `Cliff` out: same grade — kind `Unspecified`, substance `(no substance name)`, counterparty `Mary`
- `Debby` out: same grade — kind `Unspecified`, substance `(no substance name)`, counterparty `George`
- `Debby` out: same grade — kind `Unspecified`, substance `(no substance name)`, counterparty `Jane`
- `George` in: same grade — kind `Unspecified`, substance `(no substance name)`, counterparty `Debby`
- `George` out: same grade — kind `Unspecified`, substance `(no substance name)`, counterparty `Jane`
- `Jane` in: same grade — kind `Unspecified`, substance `(no substance name)`, counterparty `Debby`
- `Jane` in: same grade — kind `Unspecified`, substance `(no substance name)`, counterparty `George`
- `Lisa` in: same grade — kind `Unspecified`, substance `(no substance name)`, counterparty `Alan`
- `Lisa` out: same grade — kind `Unspecified`, substance `(no substance name)`, counterparty `Nancy`
- `Lisa` out: same grade — kind `Unspecified`, substance `(no substance name)`, counterparty `Paul`
- `Mary` in: same grade — kind `Unspecified`, substance `(no substance name)`, counterparty `Bob`
- `Mary` in: same grade — kind `Unspecified`, substance `(no substance name)`, counterparty `Cliff`
- `Nancy` in: same grade — kind `Unspecified`, substance `(no substance name)`, counterparty `Alan`
- `Nancy` in: same grade — kind `Unspecified`, substance `(no substance name)`, counterparty `Lisa`
- `Nancy` out: same grade — kind `Unspecified`, substance `(no substance name)`, counterparty `Paul`
- `Paul` in: same grade — kind `Unspecified`, substance `(no substance name)`, counterparty `Alan`
- `Paul` in: same grade — kind `Unspecified`, substance `(no substance name)`, counterparty `Lisa`
- `Paul` in: same grade — kind `Unspecified`, substance `(no substance name)`, counterparty `Nancy`

### Goal-oriented systems — the Informationless paradigm

`assets/corpus/klir/goal-oriented-informationless.sl` — SYSTEM, Klir lens

Citation: George Klir, Facets of Systems Science, 2nd ed. (2001), Ch. 10 §10.2, Fig. 10.1

| Component | Primitive | Iface | Decomp | In | Out | Mere | Verdict | What blocks it |
|---|---|:-:|:-:|--:|--:|--:|---|---|
| Goal-Implementing Element | — | — | — | 2 | 1 | 0 | READY | — |
| Goal-Seeking Element | — | — | — | 0 | 1 | 0 | READY | — |

- `Goal-Implementing Element` in: x — kind `Informational`, substance `(no substance name)`, counterparty `x`
- `Goal-Implementing Element` out: y — kind `Informational`, substance `(no substance name)`, counterparty `y`
- `Goal-Implementing Element` in: z — kind `Informational`, substance `(no substance name)`, counterparty `Goal-Seeking Element`
- `Goal-Seeking Element` out: z — kind `Informational`, substance `(no substance name)`, counterparty `Goal-Implementing Element`

### Goal-oriented systems — the Feedback paradigm

`assets/corpus/klir/goal-oriented-feedback.sl` — SYSTEM, Klir lens

Citation: George Klir, Facets of Systems Science, 2nd ed. (2001), Ch. 10 §10.2, Fig. 10.1

| Component | Primitive | Iface | Decomp | In | Out | Mere | Verdict | What blocks it |
|---|---|:-:|:-:|--:|--:|--:|---|---|
| Goal-Implementing Element | — | — | — | 2 | 1 | 0 | READY | — |
| Goal-Seeking Element | — | — | — | 1 | 1 | 0 | READY | — |

- `Goal-Implementing Element` in: x — kind `Informational`, substance `(no substance name)`, counterparty `x`
- `Goal-Implementing Element` out: y — kind `Informational`, substance `(no substance name)`, counterparty `y`
- `Goal-Implementing Element` in: z — kind `Informational`, substance `(no substance name)`, counterparty `Goal-Seeking Element`
- `Goal-Seeking Element` out: z — kind `Informational`, substance `(no substance name)`, counterparty `Goal-Implementing Element`
- `Goal-Seeking Element` in: y — kind `Informational`, substance `(no substance name)`, counterparty `y`

### Goal-oriented systems — the Feedforward paradigm

`assets/corpus/klir/goal-oriented-feedforward.sl` — SYSTEM, Klir lens

Citation: George Klir, Facets of Systems Science, 2nd ed. (2001), Ch. 10 §10.2, Fig. 10.1

| Component | Primitive | Iface | Decomp | In | Out | Mere | Verdict | What blocks it |
|---|---|:-:|:-:|--:|--:|--:|---|---|
| Goal-Implementing Element | — | — | — | 2 | 1 | 0 | READY | — |
| Goal-Seeking Element | — | — | — | 1 | 1 | 0 | READY | — |

- `Goal-Implementing Element` in: x — kind `Informational`, substance `(no substance name)`, counterparty `x`
- `Goal-Implementing Element` out: y — kind `Informational`, substance `(no substance name)`, counterparty `y`
- `Goal-Implementing Element` in: z — kind `Informational`, substance `(no substance name)`, counterparty `Goal-Seeking Element`
- `Goal-Seeking Element` out: z — kind `Informational`, substance `(no substance name)`, counterparty `Goal-Implementing Element`
- `Goal-Seeking Element` in: x — kind `Informational`, substance `(no substance name)`, counterparty `x`

### Goal-oriented systems — the Full-information paradigm

`assets/corpus/klir/goal-oriented-full-information.sl` — SYSTEM, Klir lens

Citation: George Klir, Facets of Systems Science, 2nd ed. (2001), Ch. 10 §10.2, Fig. 10.1

| Component | Primitive | Iface | Decomp | In | Out | Mere | Verdict | What blocks it |
|---|---|:-:|:-:|--:|--:|--:|---|---|
| Goal-Implementing Element | — | — | — | 2 | 1 | 0 | READY | — |
| Goal-Seeking Element | — | — | — | 2 | 1 | 0 | READY | — |

- `Goal-Implementing Element` in: x — kind `Informational`, substance `(no substance name)`, counterparty `x`
- `Goal-Implementing Element` out: y — kind `Informational`, substance `(no substance name)`, counterparty `y`
- `Goal-Implementing Element` in: z — kind `Informational`, substance `(no substance name)`, counterparty `Goal-Seeking Element`
- `Goal-Seeking Element` out: z — kind `Informational`, substance `(no substance name)`, counterparty `Goal-Implementing Element`
- `Goal-Seeking Element` in: x — kind `Informational`, substance `(no substance name)`, counterparty `x`
- `Goal-Seeking Element` in: y — kind `Informational`, substance `(no substance name)`, counterparty `y`

### The two-thing system — a acts on b

`assets/corpus/bunge/two-thing-ab.sl` — FLAT-BY-DESIGN, Bunge lens

Citation: Mario Bunge, Treatise on Basic Philosophy, Vol. 4: A World of Systems (1979), Ch. 1 §1.2, Definition 1.2, Example, Fig. 1.2

| Component | Primitive | Iface | Decomp | In | Out | Mere | Verdict | What blocks it |
|---|---|:-:|:-:|--:|--:|--:|---|---|
| a | — | — | — | 0 | 2 | 0 | ONE-STEP | untyped: a acts on b, a acts on c |
| b | — | — | — | 1 | 0 | 0 | ONE-STEP | untyped: a acts on b |

- `a` out: a acts on b — kind `Unspecified`, substance `(no substance name)`, counterparty `b`
- `a` out: a acts on c — kind `Unspecified`, substance `(no substance name)`, counterparty `c`
- `b` in: a acts on b — kind `Unspecified`, substance `(no substance name)`, counterparty `a`

### The two-thing system — b acts on a

`assets/corpus/bunge/two-thing-ba.sl` — FLAT-BY-DESIGN, Bunge lens

Citation: Mario Bunge, Treatise on Basic Philosophy, Vol. 4: A World of Systems (1979), Ch. 1 §1.2, Definition 1.2, Example, Fig. 1.2

| Component | Primitive | Iface | Decomp | In | Out | Mere | Verdict | What blocks it |
|---|---|:-:|:-:|--:|--:|--:|---|---|
| a | — | — | — | 1 | 1 | 0 | ONE-STEP | untyped: b acts on a, a acts on c |
| b | — | — | — | 0 | 1 | 0 | ONE-STEP | untyped: b acts on a |

- `a` in: b acts on a — kind `Unspecified`, substance `(no substance name)`, counterparty `b`
- `a` out: a acts on c — kind `Unspecified`, substance `(no substance name)`, counterparty `c`
- `b` out: b acts on a — kind `Unspecified`, substance `(no substance name)`, counterparty `a`

### The two-thing system — a and b act on each other

`assets/corpus/bunge/two-thing-bidirectional.sl` — FLAT-BY-DESIGN, Bunge lens

Citation: Mario Bunge, Treatise on Basic Philosophy, Vol. 4: A World of Systems (1979), Ch. 1 §1.2, Definition 1.2, Example, Fig. 1.2

| Component | Primitive | Iface | Decomp | In | Out | Mere | Verdict | What blocks it |
|---|---|:-:|:-:|--:|--:|--:|---|---|
| a | — | — | — | 1 | 2 | 0 | ONE-STEP | untyped: a acts on b, b acts on a, a acts on c |
| b | — | — | — | 1 | 1 | 0 | ONE-STEP | untyped: a acts on b, b acts on a |

- `a` out: a acts on b — kind `Unspecified`, substance `(no substance name)`, counterparty `b`
- `a` in: b acts on a — kind `Unspecified`, substance `(no substance name)`, counterparty `b`
- `a` out: a acts on c — kind `Unspecified`, substance `(no substance name)`, counterparty `c`
- `b` in: a acts on b — kind `Unspecified`, substance `(no substance name)`, counterparty `a`
- `b` out: b acts on a — kind `Unspecified`, substance `(no substance name)`, counterparty `a`

### Coupling graph σ₁ — a symmetric chain

`assets/corpus/bunge/coupling-sigma1.sl` — FLAT-BY-DESIGN, Bunge lens

Citation: Mario Bunge, Treatise on Basic Philosophy, Vol. 4: A World of Systems (1979), Ch. 1 §2.1, Coupling Graphs and Matrices

| Component | Primitive | Iface | Decomp | In | Out | Mere | Verdict | What blocks it |
|---|---|:-:|:-:|--:|--:|--:|---|---|
| 1 | — | — | — | 1 | 1 | 0 | ONE-STEP | untyped: excitation, excitation |
| 2 | — | — | — | 2 | 2 | 0 | ONE-STEP | untyped: excitation, excitation, excitation, excitation |
| 3 | — | — | — | 1 | 1 | 0 | ONE-STEP | untyped: excitation, excitation |

- `1` out: excitation — kind `Unspecified`, substance `(no substance name)`, counterparty `2`
- `1` in: excitation — kind `Unspecified`, substance `(no substance name)`, counterparty `2`
- `2` in: excitation — kind `Unspecified`, substance `(no substance name)`, counterparty `1`
- `2` out: excitation — kind `Unspecified`, substance `(no substance name)`, counterparty `1`
- `2` out: excitation — kind `Unspecified`, substance `(no substance name)`, counterparty `3`
- `2` in: excitation — kind `Unspecified`, substance `(no substance name)`, counterparty `3`
- `3` in: excitation — kind `Unspecified`, substance `(no substance name)`, counterparty `2`
- `3` out: excitation — kind `Unspecified`, substance `(no substance name)`, counterparty `2`

### Coupling graph σ₂ — a cycle with inhibition

`assets/corpus/bunge/coupling-sigma2.sl` — FLAT-BY-DESIGN, Bunge lens

Citation: Mario Bunge, Treatise on Basic Philosophy, Vol. 4: A World of Systems (1979), Ch. 1 §2.1, Coupling Graphs and Matrices

| Component | Primitive | Iface | Decomp | In | Out | Mere | Verdict | What blocks it |
|---|---|:-:|:-:|--:|--:|--:|---|---|
| 1 | — | — | — | 1 | 1 | 0 | ONE-STEP | untyped: excitation (+1), inhibition (−1) |
| 2 | — | — | — | 1 | 1 | 0 | ONE-STEP | untyped: excitation (+1), inhibition (−1) |
| 3 | — | — | — | 1 | 1 | 0 | ONE-STEP | untyped: inhibition (−1), excitation (+1) |
| 4 | — | — | — | 1 | 1 | 0 | ONE-STEP | untyped: excitation (+1), inhibition (−1) |

- `1` out: excitation (+1) — kind `Unspecified`, substance `(no substance name)`, counterparty `2`
- `1` in: inhibition (−1) — kind `Unspecified`, substance `(no substance name)`, counterparty `4`
- `2` in: excitation (+1) — kind `Unspecified`, substance `(no substance name)`, counterparty `1`
- `2` out: inhibition (−1) — kind `Unspecified`, substance `(no substance name)`, counterparty `3`
- `3` in: inhibition (−1) — kind `Unspecified`, substance `(no substance name)`, counterparty `2`
- `3` out: excitation (+1) — kind `Unspecified`, substance `(no substance name)`, counterparty `4`
- `4` in: excitation (+1) — kind `Unspecified`, substance `(no substance name)`, counterparty `3`
- `4` out: inhibition (−1) — kind `Unspecified`, substance `(no substance name)`, counterparty `1`

### Coupling graph σ₃ — self-action and feedback

`assets/corpus/bunge/coupling-sigma3.sl` — FLAT-BY-DESIGN, Bunge lens

Citation: Mario Bunge, Treatise on Basic Philosophy, Vol. 4: A World of Systems (1979), Ch. 1 §2.1, Coupling Graphs and Matrices

| Component | Primitive | Iface | Decomp | In | Out | Mere | Verdict | What blocks it |
|---|---|:-:|:-:|--:|--:|--:|---|---|
| 1 | — | — | — | 0 | 1 | 0 | ONE-STEP | untyped: excitation |
| 2 | — | — | — | 2 | 2 | 0 | ONE-STEP | untyped: excitation, self action, excitation, excitation |
| 3 | — | — | — | 1 | 2 | 0 | ONE-STEP | untyped: excitation, excitation, self action |

- `1` out: excitation — kind `Unspecified`, substance `(no substance name)`, counterparty `2`
- `2` in: excitation — kind `Unspecified`, substance `(no substance name)`, counterparty `1`
- `2` out: self action — kind `Unspecified`, substance `(no substance name)`, counterparty `2`
- `2` out: excitation — kind `Unspecified`, substance `(no substance name)`, counterparty `3`
- `2` in: excitation — kind `Unspecified`, substance `(no substance name)`, counterparty `3`
- `3` in: excitation — kind `Unspecified`, substance `(no substance name)`, counterparty `2`
- `3` out: excitation — kind `Unspecified`, substance `(no substance name)`, counterparty `2`
- `3` out: self action — kind `Unspecified`, substance `(no substance name)`, counterparty `3`

### A cell in a cellular array

`assets/corpus/klir/cellular-array-cell.sl` — FLAT-BY-DESIGN, Klir lens

Citation: George Klir, Facets of Systems Science, 2nd ed. (2001), Ch. 4, book pp. 83–84, Fig. 4.11

| Component | Primitive | Iface | Decomp | In | Out | Mere | Verdict | What blocks it |
|---|---|:-:|:-:|--:|--:|--:|---|---|
| c | — | — | — | 4 | 4 | 0 | ONE-STEP | untyped: v(c-n) — input from the cell above, v(c-1) — input from the cell to the left, v(c+1) — input from the cell to the right, v(c+n) — input from the cell below, v(c) — the one output, coupled to every adjacent cell, v(c) — the one output, coupled to every adjacent cell, v(c) — the one output, coupled to every adjacent cell, v(c) — the one output, coupled to every adjacent cell |

- `c` in: v(c-n) — input from the cell above — kind `Unspecified`, substance `(no substance name)`, counterparty `c-n`
- `c` in: v(c-1) — input from the cell to the left — kind `Unspecified`, substance `(no substance name)`, counterparty `c-1`
- `c` in: v(c+1) — input from the cell to the right — kind `Unspecified`, substance `(no substance name)`, counterparty `c+1`
- `c` in: v(c+n) — input from the cell below — kind `Unspecified`, substance `(no substance name)`, counterparty `c+n`
- `c` out: v(c) — the one output, coupled to every adjacent cell — kind `Unspecified`, substance `(no substance name)`, counterparty `c-n`
- `c` out: v(c) — the one output, coupled to every adjacent cell — kind `Unspecified`, substance `(no substance name)`, counterparty `c-1`
- `c` out: v(c) — the one output, coupled to every adjacent cell — kind `Unspecified`, substance `(no substance name)`, counterparty `c+1`
- `c` out: v(c) — the one output, coupled to every adjacent cell — kind `Unspecified`, substance `(no substance name)`, counterparty `c+n`

### A serial binary adder

`assets/corpus/klir/serial-binary-adder.sl` — FLAT-BY-DESIGN, Klir lens

Citation: George Klir, Facets of Systems Science, 2nd ed. (2001), Ch. 4, book pp. 78–79, Fig. 4.8

| Component | Primitive | Iface | Decomp | In | Out | Mere | Verdict | What blocks it |
|---|---|:-:|:-:|--:|--:|--:|---|---|
| SUM | — | — | — | 3 | 1 | 0 | ONE-STEP | untyped: x1 — a digit of the first number, x2 — a digit of the second number, c' — the previous carry, y — a digit of the sum |
| CARRY | — | — | — | 3 | 1 | 0 | ONE-STEP | untyped: x1 — a digit of the first number, x2 — a digit of the second number, c' — the previous carry, c — the carry, held one discrete time |
| MEMORY | — | — | — | 1 | 2 | 0 | ONE-STEP | untyped: c' — the previous carry, c' — the previous carry, c — the carry, held one discrete time |

- `SUM` in: x1 — a digit of the first number — kind `Unspecified`, substance `(no substance name)`, counterparty `x1`
- `SUM` in: x2 — a digit of the second number — kind `Unspecified`, substance `(no substance name)`, counterparty `x2`
- `SUM` in: c' — the previous carry — kind `Unspecified`, substance `(no substance name)`, counterparty `MEMORY`
- `SUM` out: y — a digit of the sum — kind `Unspecified`, substance `(no substance name)`, counterparty `y`
- `CARRY` in: x1 — a digit of the first number — kind `Unspecified`, substance `(no substance name)`, counterparty `x1`
- `CARRY` in: x2 — a digit of the second number — kind `Unspecified`, substance `(no substance name)`, counterparty `x2`
- `CARRY` in: c' — the previous carry — kind `Unspecified`, substance `(no substance name)`, counterparty `MEMORY`
- `CARRY` out: c — the carry, held one discrete time — kind `Unspecified`, substance `(no substance name)`, counterparty `MEMORY`
- `MEMORY` out: c' — the previous carry — kind `Unspecified`, substance `(no substance name)`, counterparty `SUM`
- `MEMORY` out: c' — the previous carry — kind `Unspecified`, substance `(no substance name)`, counterparty `CARRY`
- `MEMORY` in: c — the carry, held one discrete time — kind `Unspecified`, substance `(no substance name)`, counterparty `CARRY`

### Criminal courts and probation, New York State

`assets/corpus/klir/criminal-court.sl` — FLAT-BY-DESIGN, Klir lens

Citation: George Klir, Facets of Systems Science, 2nd ed. (2001), Ch. 4, book pp. 77–78, Fig. 4.7

| Component | Primitive | Iface | Decomp | In | Out | Mere | Verdict | What blocks it |
|---|---|:-:|:-:|--:|--:|--:|---|---|
| COMPLAINT | — | — | — | 1 | 2 | 0 | ONE-STEP | untyped: v1 — complaints received by the criminal court, v2 — complaints carried toward the arraignment, v3 — complaints dismissed |
| TRIAL PHASE | — | — | — | 1 | 2 | 0 | ONE-STEP | untyped: v2 — complaints carried toward the arraignment, v4 — cases held over for sentencing, v5 — cases acquitted or discharged |
| SENTENCING | — | — | — | 2 | 2 | 0 | ONE-STEP | untyped: v4 — cases held over for sentencing, v6 — cases assigned for probation, v7 — cases not assigned to probation, v8 — cases that violate the conditions of probation |
| PROBATION | — | — | — | 1 | 2 | 0 | ONE-STEP | untyped: v6 — cases assigned for probation, v8 — cases that violate the conditions of probation, v9 — cases discharged from probation |
| EXIT | — | — | — | 4 | 1 | 0 | ONE-STEP | untyped: v3 — complaints dismissed, v5 — cases acquitted or discharged, v7 — cases not assigned to probation, v9 — cases discharged from probation, v10 — cases discharged from the criminal court institutions |

- `COMPLAINT` in: v1 — complaints received by the criminal court — kind `Unspecified`, substance `(no substance name)`, counterparty `ENVIRONMENT OF S`
- `COMPLAINT` out: v2 — complaints carried toward the arraignment — kind `Unspecified`, substance `(no substance name)`, counterparty `TRIAL PHASE`
- `COMPLAINT` out: v3 — complaints dismissed — kind `Unspecified`, substance `(no substance name)`, counterparty `EXIT`
- `TRIAL PHASE` in: v2 — complaints carried toward the arraignment — kind `Unspecified`, substance `(no substance name)`, counterparty `COMPLAINT`
- `TRIAL PHASE` out: v4 — cases held over for sentencing — kind `Unspecified`, substance `(no substance name)`, counterparty `SENTENCING`
- `TRIAL PHASE` out: v5 — cases acquitted or discharged — kind `Unspecified`, substance `(no substance name)`, counterparty `EXIT`
- `SENTENCING` in: v4 — cases held over for sentencing — kind `Unspecified`, substance `(no substance name)`, counterparty `TRIAL PHASE`
- `SENTENCING` out: v6 — cases assigned for probation — kind `Unspecified`, substance `(no substance name)`, counterparty `PROBATION`
- `SENTENCING` out: v7 — cases not assigned to probation — kind `Unspecified`, substance `(no substance name)`, counterparty `EXIT`
- `SENTENCING` in: v8 — cases that violate the conditions of probation — kind `Unspecified`, substance `(no substance name)`, counterparty `PROBATION`
- `PROBATION` in: v6 — cases assigned for probation — kind `Unspecified`, substance `(no substance name)`, counterparty `SENTENCING`
- `PROBATION` out: v8 — cases that violate the conditions of probation — kind `Unspecified`, substance `(no substance name)`, counterparty `SENTENCING`
- `PROBATION` out: v9 — cases discharged from probation — kind `Unspecified`, substance `(no substance name)`, counterparty `EXIT`
- `EXIT` in: v3 — complaints dismissed — kind `Unspecified`, substance `(no substance name)`, counterparty `COMPLAINT`
- `EXIT` in: v5 — cases acquitted or discharged — kind `Unspecified`, substance `(no substance name)`, counterparty `TRIAL PHASE`
- `EXIT` in: v7 — cases not assigned to probation — kind `Unspecified`, substance `(no substance name)`, counterparty `SENTENCING`
- `EXIT` in: v9 — cases discharged from probation — kind `Unspecified`, substance `(no substance name)`, counterparty `PROBATION`
- `EXIT` out: v10 — cases discharged from the criminal court institutions — kind `Unspecified`, substance `(no substance name)`, counterparty `ENVIRONMENT OF S`

### The Steel-Plant in its environment

`assets/corpus/mobus/steel-plant.sl` — SYSTEM, Mobus lens

Citation: George Mobus, Systems Science: Theory, Analysis, Modeling, and Design (2022), Ch. 4 §4.5, Fig. 4.14 and Listing 4.1

| Component | Primitive | Iface | Decomp | In | Out | Mere | Verdict | What blocks it |
|---|---|:-:|:-:|--:|--:|--:|---|---|
| Steel-Plant | Combining | yes | — | 3 | 3 | 0 | READY | — |

- `Steel-Plant` in: F-1.0 — electric energy — kind `Energy`, substance `electricity`, counterparty `Energy-Source`
- `Steel-Plant` in: F-1.1 — iron-input — kind `Matter`, substance `iron`, counterparty `Iron-Source`
- `Steel-Plant` in: F-1.2 — coke-input — kind `Matter`, substance `coke`, counterparty `Coke-Source`
- `Steel-Plant` out: F-1.3 — steel for sale — kind `Matter`, substance `steel`, counterparty `Steel-Sink`
- `Steel-Plant` out: F-1.4 — scrap and wastage — kind `Matter`, substance `garbage`, counterparty `Garbage-Sink`
- `Steel-Plant` out: F-1.5 — radiated waste heat — kind `Energy`, substance `heat`, counterparty `ATMOSPHERE`

### A digital computing system

`assets/corpus/mobus/digital-computing-system.sl` — SYSTEM, Mobus lens

Citation: George Mobus, Systems Science: Theory, Analysis, Modeling, and Design (2022), Ch. 7 §7.2.3–§7.2.3.1, Figs. 7.2 and 7.3

| Component | Primitive | Iface | Decomp | In | Out | Mere | Verdict | What blocks it |
|---|---|:-:|:-:|--:|--:|--:|---|---|
| Hardware | — | yes | — | 4 | 3 | 0 | READY | — |
| Firmware | — | — | — | 1 | 1 | 0 | READY | — |
| Software | — | — | — | 0 | 1 | 0 | READY | — |

- `Hardware` in: line current from the A/C wall socket — kind `Energy`, substance `(no substance name)`, counterparty `Power Source`
- `Hardware` out: heat of computation, radiated or convected away — kind `Energy`, substance `(no substance name)`, counterparty `Ambient Air`
- `Hardware` in: programs and data read from files — kind `Informational`, substance `(no substance name)`, counterparty `External File Device`
- `Hardware` out: programs and data written back to files — kind `Informational`, substance `(no substance name)`, counterparty `External File Device`
- `Hardware` in: work of programmers and of end users — kind `Informational`, substance `(no substance name)`, counterparty `Users`
- `Hardware` out: results returned to the user — kind `Informational`, substance `(no substance name)`, counterparty `Users`
- `Hardware` in: hardware control — kind `Informational`, substance `(no substance name)`, counterparty `Firmware`
- `Firmware` in: operating-system calls on the hardware control programs — kind `Informational`, substance `(no substance name)`, counterparty `Software`
- `Firmware` out: hardware control — kind `Informational`, substance `(no substance name)`, counterparty `Hardware`
- `Software` out: operating-system calls on the hardware control programs — kind `Informational`, substance `(no substance name)`, counterparty `Firmware`

### A "typical" neuron

`assets/corpus/mobus/typical-neuron.sl` — SYSTEM, Mobus lens

Citation: George Mobus, Systems Science: Theory, Analysis, Modeling, and Design (2022), Ch. 7 §7.3.2–§7.3.3.1, Figs. 7.7 and 7.8

| Component | Primitive | Iface | Decomp | In | Out | Mere | Verdict | What blocks it |
|---|---|:-:|:-:|--:|--:|--:|---|---|
| Synaptic Compartments | — | yes | — | 3 | 1 | 0 | READY | — |
| Cell Membrane | — | — | — | 1 | 2 | 0 | READY | — |
| Axonal Hillock | — | yes | — | 1 | 1 | 0 | READY | — |

- `Synaptic Compartments` in: action potentials on afferent axonal terminals — kind `Informational`, substance `(no substance name)`, counterparty `Source Neurons`
- `Synaptic Compartments` in: the secondary signal — that this burst is meaningful — kind `Informational`, substance `(no substance name)`, counterparty `Neuromodulatory Sources`
- `Synaptic Compartments` out: depolarization state — kind `Informational`, substance `(no substance name)`, counterparty `Cell Membrane`
- `Synaptic Compartments` in: internal feedback on the temporal correlation of inputs — kind `Informational`, substance `(no substance name)`, counterparty `Cell Membrane`
- `Cell Membrane` in: depolarization state — kind `Informational`, substance `(no substance name)`, counterparty `Synaptic Compartments`
- `Cell Membrane` out: internal feedback on the temporal correlation of inputs — kind `Informational`, substance `(no substance name)`, counterparty `Synaptic Compartments`
- `Cell Membrane` out: the summed depolarization state, Σ — kind `Informational`, substance `(no substance name)`, counterparty `Axonal Hillock`
- `Axonal Hillock` in: the summed depolarization state, Σ — kind `Informational`, substance `(no substance name)`, counterparty `Cell Membrane`
- `Axonal Hillock` out: the outgoing action potential, if threshold is reached — kind `Informational`, substance `(no substance name)`, counterparty `Target Neurons`

### The mammalian brain — the afferent visual path

`assets/corpus/mobus/mammalian-brain.sl` — SYSTEM, Mobus lens

Citation: George Mobus, Systems Science: Theory, Analysis, Modeling, and Design (2022), Ch. 7 §7.4.4–§7.4.5, Figs. 7.12 and 7.13

| Component | Primitive | Iface | Decomp | In | Out | Mere | Verdict | What blocks it |
|---|---|:-:|:-:|--:|--:|--:|---|---|
| Thalamic Relay Nucleus | — | yes | — | 1 | 1 | 0 | READY | — |
| Primary Visual Cortex | — | — | — | 1 | 1 | 0 | READY | — |
| Association Cortex | — | — | — | 1 | 0 | 0 | READY | — |

- `Thalamic Relay Nucleus` in: signals from a sensor in the retina — kind `Informational`, substance `(no substance name)`, counterparty `Retinal Sensor`
- `Thalamic Relay Nucleus` out: relayed visual signals — kind `Informational`, substance `(no substance name)`, counterparty `Primary Visual Cortex`
- `Primary Visual Cortex` in: relayed visual signals — kind `Informational`, substance `(no substance name)`, counterparty `Thalamic Relay Nucleus`
- `Primary Visual Cortex` out: features encoded by the sensory columns — roundness, redness — kind `Informational`, substance `(no substance name)`, counterparty `Association Cortex`
- `Association Cortex` in: features encoded by the sensory columns — roundness, redness — kind `Informational`, substance `(no substance name)`, counterparty `Primary Visual Cortex`

### The human social system in the Ecos

`assets/corpus/mobus/human-social-system.sl` — SYSTEM, Mobus lens

Citation: George Mobus, Systems Science: Theory, Analysis, Modeling, and Design (2022), Ch. 7 §7.6.3, Fig. 7.17

| Component | Primitive | Iface | Decomp | In | Out | Mere | Verdict | What blocks it |
|---|---|:-:|:-:|--:|--:|--:|---|---|
| Governance | — | yes | — | 3 | 1 | 0 | READY | — |
| Work Processes | — | yes | — | 5 | 2 | 0 | ONE-STEP | untyped: the disturbance — global climate change, returning from the HSS's own waste disposal |

- `Governance` in: messages on the quality and capacity of the biological resource and its flow — kind `Informational`, substance `(no substance name)`, counterparty `Flow-Limited Biological Resources`
- `Governance` in: messages on the quality and capacity of the energy stock — kind `Informational`, substance `(no substance name)`, counterparty `Stock-Limited Energy Resources`
- `Governance` in: messages on the quality and capacity of the material stock — kind `Informational`, substance `(no substance name)`, counterparty `Stock-Limited Material Resources`
- `Governance` out: decisions on what the internal work processes should be doing — kind `Informational`, substance `(no substance name)`, counterparty `Work Processes`
- `Work Processes` in: food, wood, fiber — renewed by solar energy, and only at its rate — kind `Matter`, substance `(no substance name)`, counterparty `Flow-Limited Biological Resources`
- `Work Processes` in: hydrocarbon and carbonaceous fuels, drawn from a fixed stock — kind `Energy`, substance `(no substance name)`, counterparty `Stock-Limited Energy Resources`
- `Work Processes` in: ores and minerals, concentrated on geological time scales — kind `Matter`, substance `(no substance name)`, counterparty `Stock-Limited Material Resources`
- `Work Processes` out: wastes, many of them completely foreign — including the CO₂ put into the atmosphere — kind `Matter`, substance `(no substance name)`, counterparty `Waste Dumps`
- `Work Processes` out: heat, radiated back into space — kind `Energy`, substance `(no substance name)`, counterparty `Heat Dump`
- `Work Processes` in: decisions on what the internal work processes should be doing — kind `Informational`, substance `(no substance name)`, counterparty `Governance`
- `Work Processes` in: the disturbance — global climate change, returning from the HSS's own waste disposal — kind `Unspecified`, substance `(no substance name)`, counterparty `Global Climate Change`

