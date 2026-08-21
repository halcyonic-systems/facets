# SL — the bert-lenses system language

**Status: LIVE.** SL v1.0 is specified and shipped (2026-07-18). Write SL in the app's text pane, compile, and the model renders and is judged like any other. Round-trip goldens pass. The language is under active development; §"Known gaps" in the spec lists what v1.1 owes.

The text IS the model. Not a config format that happens to describe one, not a serialization of something else: the words on the page are the source, and everything else (the canvas, the JSON, the run) is a view onto them.

## Read a paragraph become a system

Here is a sentence from George Mobus's *Systems Science* (Ch. 4 §4.3.1):

> "Process M takes in materials A and B from sources 1 and 2 along with energy E from source 3 to make product Z with waste product X going to sinks 5 and 6."

One sentence, one system, in the author's own words. SL turns it into eleven lines, each one earning its place from a clause in the paragraph.

The system gets a name and a kind:

```
system "Process M" : Concrete
```

The process itself is a component, and Mobus's verb ("takes in... to make...") names the kind of work it does:

```
component Work primitive Combining interface
```

The sources and sinks the sentence lists, in order:

```
source "Source 1"
source "Source 2"
source "Source 3"
sink "Sink 5"
sink "Sink 6"
```

And the flows, each one a clause of the sentence turned into an arrow with what moves and what it is:

```
flow "Source 1" -> Work : matter "material A"
flow "Source 2" -> Work : matter "material B"
flow "Source 3" -> Work : energy "energy E"
flow Work -> "Sink 5" : matter "product Z"
flow Work -> "Sink 6" : matter "waste X"

@lens mobus
```

Put the pieces back together and you have the whole file:

```
system "Process M" : Concrete
component Work primitive Combining interface
source "Source 1"
source "Source 2"
source "Source 3"
sink "Sink 5"
sink "Sink 6"
flow "Source 1" -> Work : matter "material A"
flow "Source 2" -> Work : matter "material B"
flow "Source 3" -> Work : energy "energy E"
flow Work -> "Sink 5" : matter "product Z"
flow Work -> "Sink 6" : matter "waste X"

@lens mobus
```

That is not a transcription for the README. It is [`fixtures/sl/process-m.sl`](../../fixtures/sl/process-m.sl). Compile it, and the diagram Mobus describes in prose is what renders, with the same verdict a canvas gesture would earn.

## Semantics: what a file means

Syntax (next section) fixes what you may write; semantics is what a written file denotes, and SL keeps the two separable on purpose. A parsed file denotes one model: things and flows in the order you wrote them, nothing more. What that model *means as a system* is not SL's call to make. Compiling hands the model to the kernel, which projects it to the active lens (Klir, Bunge, or Mobus) and renders the verdict: legal, illegal, and why. SL's parser checks only that the words are spelled right and the names exist; whether what you described is a system is the kernel's judgment, reached the same way a canvas drag reaches it. One concrete taste of the split: `source`, `sink`, and `environment` are author intent, not stored identity — the kernel reads a thing's role off the flows actually drawn, so a mislabeled `source` re-emits under the reading the graph supports (spec §5.2). Full statement: spec [§5](spec.md#5-semantics).

## Syntax at a glance

A file is a flat sequence of lines. Structure lines carry meaning; a blank line, then annotation lines, carry only how it looks. `emit_sl` always writes them in this order:

| Band | Carries |
|---|---|
| `system` / `domain` / `time unit` / `level` | the header: what kind of thing this is, in what vocabulary, over what time base |
| things (`component`, `source`, `sink`, `environment`, `interface`, `milieu`) | what's inside the boundary and what's outside it |
| `flow` | the connections between them, directed |
| `param` / `metric` | declared names over input knobs and output readouts |
| `boundary` | the membrane's porosity and fuzziness |
| *(blank line)* | the seam between meaning and view |
| `@pos` / `@lens` / `@directed` | positions, active lens, observer orientation (never read by a verdict) |

Every emitted structure line starts with a keyword: `system`, `component`, `flow`, `param`, and so on. There is no bare expression, no punctuation-led syntax to parse around: you can read the shape of a file by scanning its left margin. The full lexicon is spec [§3](spec.md#3-lexicon); the grammar that assembles it is spec [§4](spec.md#4-grammar).

## The round-trip contract, and why the docs can't drift

Write a model in SL and compile it: `parse(emit(m)) = m`, digit for digit, positions included. Load an arbitrary model built by other means (the canvas, JSON, a decade of authoring history) and canonicalize it: one pass through `emit`/`parse` lands in stable canonical form and stays there. Neither claim is "proven." Both are **golden-tested**, over the same corpus this README quotes from, in [`crates/bert-canvas/tests/sl_roundtrip.rs`](../../crates/bert-canvas/tests/sl_roundtrip.rs). Full statement: spec [§7.2](spec.md#72-the-contract-golden-tested).

The vocabulary itself is under the same discipline. SL's 53 words (39 reserved keywords plus 14 position-bound words like `param` and `range`) are held equal, in both directions, against the EBNF terminals in spec §4 by [`tests/keyword_parity.rs`](../../crates/bert-canvas/tests/keyword_parity.rs): a word can't enter the language without entering the spec, and vice versa. That vocabulary is published machine-readably at [`fixtures/contract/sl_keywords.json`](../../fixtures/contract/sl_keywords.json), so tooling (the VS Code extension, below) reads the same list the compiler enforces rather than a hand-copied guess.

This is why the example above is a real fixture and not a hand-typed illustration: the spec's worked examples *are* the test corpus. A documentation change that broke the language would break a test, not just a reader's expectations.

## Try it

In the app: open the SL pane, type the file above (or start from scratch), and compile with `⌘⏎`. The model renders and is judged exactly as if you had drawn it.

From the command line:

```
cargo run -p bert-cli -- compile fixtures/sl/process-m.sl
cargo run -p bert-cli -- verdict fixtures/sl/process-m.sl --lens mobus
```

`compile` parses the file and prints the model; `verdict` compiles, projects to a lens, and prints the systemhood judgment. Also available: `describe` (the formal 8-tuple), `run` (step the trajectory), and `layout` (node positions). `just bert <args>` is the repo's shorthand for all of them.

## Editor support

The VS Code extension at [`editors/vscode/`](../../editors/vscode/) ships a TextMate grammar for syntax highlighting. Its keyword list is contract-gated: [`scripts/check_tm_grammar.mjs`](../../scripts/check_tm_grammar.mjs) holds the grammar's word alternations equal to `fixtures/contract/sl_keywords.json`, so the highlighting can't quietly diverge from what the compiler actually accepts.

Two more worked examples, the minimal stock-and-flow bathtub and a real infrastructure model with an authored membrane, are in spec [§9](spec.md#9-worked-examples-the-golden-corpus), alongside Process M.

## The corpus

Three `.sl` files in [`fixtures/sl/`](../../fixtures/sl/) serve simultaneously as the spec's worked examples, the round-trip goldens, and the teaching set:

- `process-m.sl` — Mobus's system paragraph (above); the canonical multi-input work process
- `bathtub.sl` — the minimal stock-and-flow system
- `hal-projection.sl` — a real structural model: hal published as a projection, with a retained-SSOT boundary

**Corpus precedence.** Because the three `.sl` files carry all three roles at once — round-trip golden, spec example, teaching set — the roles are ranked when they conflict: round-trip correctness comes first. Do not modify SL syntax for pedagogical reasons; a teaching improvement that would perturb a golden's round-trip is out of scope for these files.

**Where pedagogy edits go.** That dedicated home is [`fixtures/sl/teaching/`](../../fixtures/sl/teaching/) — a graded set (a two-thing first model, a copy-adaptation of the bathtub, and two files that fail on purpose so a learner can read the error). Those fixtures carry no round-trip or spec obligation, so teaching-motivated edits land there rather than on the goldens.

## Why SL, and when SysML

SysML v2 (Part 1, formally adopted March 2026) is the obvious question: why write SL when a 691-page standards-body language for systems already exists? The two are built for different people and make opposite bets, and each bet is right for its own job.

**Audience.** SysML v2 is for engineers building engineered systems; its construct list *is* the engineering-document universe — requirements, verification cases, allocations, trade-off analyses. SL is for scientists, researchers, and systems theorists studying *systemness*, and for people with no modeling background who want to describe a system they already live inside. SL has no requirements construct and never will; SysML has no bond/mere distinction, no kingdom or genus, no lens.

**Ontological commitment is the difference.** SysML v2 is agnostic on purpose: an entity with structure and behavior "is represented simply as a part," and meaning arrives through user-defined metadata (§7.1, §7.27). That is correct for a language that must span aerospace, defense, automotive, and enterprise IT. SL takes the opposite bet — every word is licensed by a single kernel distinction with a primary citation ([the concordance](terminology-concordance.md)), legality is the kernel's own systemhood verdict rather than a type-match, and the semantics are machine-checked (`Tuple.lean`) instead of supplied by a model library. General by being precise, not general by being vague.

**Scale is a feature, not immaturity.** SysML v2 is 691 pages over KerML; SL is a lexicon of about twenty words and a spec you read in one sitting and write in minutes. The smallness is guaranteed, not provisional: C3 lets the lexicon grow only when the kernel earns a new distinction, so it cannot sprawl. For the non-modeler audience, that property is the whole product.

**What SL takes from SysML v2, credited.** The architecture — one abstract syntax, concrete surfaces as projections of it, the text privileged because it maps losslessly — is SysML v2's shape, scoped to the K≅2 kernel and vastly smaller. The debt is real, and the [design survey](../design/sl2-authoring-language.md) (§4) documents it. Spec [§10](spec.md#10-lineage) records the same foil from the specification side.

**Interoperability: a hint, not a promise.** The posture is export-not-import, already practiced in `bert/sysml-interop/`, where the K≅2 kernel was rendered as a real SysML diagram to make our foundations legible in that notation — never to ingest theirs. A plausible bridge is emit-only: `component` / `interface` / `flow` project onto part / port / connection as a lossy partial view, where nothing carries porosity, the bond/mere distinction, or the lens, and nothing of theirs comes back. Worth building only when a real MBSE audience asks; the long-horizon marker is a BERT-JSON-to-KerML translator.

## Read next

| | Document | What it gives you |
|---|---|---|
| 1 | **[`spec.md`](spec.md)**, the SL v1.0 specification | The normative document: five design commitments, lexicon, EBNF grammar, semantics, the annotation layer, the round-trip contract, the structure/dynamics boundary, three worked examples, lineage, known gaps. |
| 2 | [`../design/sl2-authoring-language.md`](../design/sl2-authoring-language.md) | The research foundation behind the spec: why three syntaxes over one neutral spec, the precedent survey (SysML v2, Modelica, Stella, Quint, gpt-jargon as negative control), the keep/shed analysis against Mobus and BERT SL v0.1, and the staged rung plan. |
| 3 | [`../design/dynamics-principled-position.md`](../design/dynamics-principled-position.md) | Why SL v1 stops at structure. Dynamics as a state-transition family; conservation as an invariant the model *declares* rather than one the engine assumes. |
| 4 | [`terminology-concordance.md`](terminology-concordance.md) | The homage ledger behind the lexicon: 12 kernel distinctions × {Klir, Bunge, Mobus}, every cell primary-cited. |

## Where the language lives in the code

| Concern | Location |
|---|---|
| Parser and serializer | [`crates/bert-canvas/src/sl.rs`](../../crates/bert-canvas/src/sl.rs) |
| Compile target (the neutral spec) | `CanvasModel`, `crates/bert-canvas/src/canvas.rs` |
| JS↔wasm boundary | `compile_sl` / `emit_sl`, see [`crates/bert-lenses-kernel/API.md`](../../crates/bert-lenses-kernel/API.md), "SL surface" |
| Editor surface | `web/src/SlPane.tsx` |
| Round-trip goldens | `crates/bert-canvas/tests/sl_roundtrip.rs` |

## Lineage and open work

SL stands in a line: Mobus's SL proposal (Ch. 4) → BERT SL v0.1 (`bert/docs/system-language-spec.md`, a lexicon and grammar for the data model, with no human-writable syntax) → SL v1.0 here, which adds exactly the missing piece: a notation a person writes, reads, and diffs. What was inherited, what was shed, and why is spec §10.

Tracked on the [roadmap board](https://github.com/orgs/halcyonic-systems/projects/12); the spec's §11 table maps each gap to its issue. The near ones: decomposition syntax (gated on the 8-tuple decomposition math, not on the parser) and the controlled systems-English tier that would make the *verbal* surface real.
