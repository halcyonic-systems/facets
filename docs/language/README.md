# SL — the bert-lenses system language

**Status: v1.0 specified and shipped (2026-07-18).** Implementation is live in the app: write SL in the text pane, compile, and the model renders and is judged like any other. Round-trip goldens pass. The language is under active development; §"Known gaps" in the spec lists what v1.1 owes.

SL is a human-writable textual notation that compiles **deterministically** into a bert-lenses model. It is the third concrete syntax over the one neutral abstract spec this repo already holds: the canvas authors that spec by gesture, JSON serializes it, and SL writes it as text. All three are views of the same model, and none of them is the source of truth — the neutral spec is. A concept-by-concept table setting the SL line beside its canvas gesture, JSON fragment, and kernel referent lives in the [reader's tour](../tour.md#the-notation-table) (#95), its single didactic home.

## What it looks like

Mobus's own system paragraph (*Systems Science*, Ch. 4 §4.3.1) — "Process M takes in materials A and B from sources 1 and 2 along with energy E from source 3 to make product Z with waste product X going to sinks 5 and 6" — written in SL:

```
system : Concrete
component "Process M" primitive Combining interface
source "Source 1"
source "Source 2"
source "Source 3"
sink "Sink 5"
sink "Sink 6"
flow "Source 1" -> "Process M" : matter "material A"
flow "Source 2" -> "Process M" : matter "material B"
flow "Source 3" -> "Process M" : energy "energy E"
flow "Process M" -> "Sink 5" : matter "product Z"
flow "Process M" -> "Sink 6" : matter "waste X"

@lens mobus
```

That file is [`fixtures/sl/process-m.sl`](../../fixtures/sl/process-m.sl) — not a transcription of it. The spec's worked examples *are* the test corpus, so the documentation cannot drift from what the implementation proves.

## Why SL, and when SysML

SysML v2 (Part 1, formally adopted March 2026) is the obvious question: why write SL when a 691-page standards-body language for systems already exists? The two are built for different people and make opposite bets, and each bet is right for its own job.

**Audience.** SysML v2 is for engineers building engineered systems; its construct list *is* the engineering-document universe — requirements, verification cases, allocations, trade-off analyses. SL is for scientists, researchers, and systems theorists studying *systemness*, and for people with no modeling background who want to describe a system they already live inside. SL has no requirements construct and never will; SysML has no bond/mere distinction, no kingdom or genus, no lens.

**Ontological commitment is the difference.** SysML v2 is agnostic on purpose: an entity with structure and behavior "is represented simply as a part," and meaning arrives through user-defined metadata (§7.1, §7.27). That is correct for a language that must span aerospace, defense, automotive, and enterprise IT. SL takes the opposite bet — every word is licensed by a single kernel distinction with a primary citation ([the concordance](terminology-concordance.md)), legality is the kernel's own systemhood verdict rather than a type-match, and the semantics are machine-checked (`Tuple.lean`) instead of supplied by a model library. General by being precise, not general by being vague.

**Scale is a feature, not immaturity.** SysML v2 is 691 pages over KerML; SL is a lexicon of about twenty words and a spec you read in one sitting and write in minutes. The smallness is guaranteed, not provisional: C3 lets the lexicon grow only when the kernel earns a new distinction, so it cannot sprawl. For the non-modeler audience, that property is the whole product.

**What SL takes from SysML v2, credited.** The architecture — one abstract syntax, concrete surfaces as projections of it, the text privileged because it maps losslessly — is SysML v2's shape, scoped to the K≅2 kernel and vastly smaller. The debt is real, and the [design survey](../design/sl2-authoring-language.md) (§4) documents it. Spec [§10](spec.md#10-lineage) records the same foil from the specification side.

**Interoperability: a hint, not a promise.** The posture is export-not-import, already practiced in `bert/sysml-interop/`, where the K≅2 kernel was rendered as a real SysML diagram to make our foundations legible in that notation — never to ingest theirs. A plausible bridge is emit-only: `component` / `interface` / `flow` project onto part / port / connection as a lossy partial view, where nothing carries porosity, the bond/mere distinction, or the lens, and nothing of theirs comes back. Worth building only when a real MBSE audience asks; the long-horizon marker is a BERT-JSON-to-KerML translator.

## Read in this order

| | Document | What it gives you |
|---|---|---|
| 1 | **[`spec.md`](spec.md)** — the SL v1.0 specification | The normative document: five design commitments, lexicon, EBNF grammar, semantics, the annotation layer, the round-trip contract, the structure/dynamics boundary, three worked examples, lineage, known gaps. Start here to *learn or evaluate* the language. |
| 2 | [`../design/sl2-authoring-language.md`](../design/sl2-authoring-language.md) | The research foundation behind the spec: why three syntaxes over one neutral spec, the precedent survey (SysML v2, Modelica, Stella, Quint, gpt-jargon as negative control), the keep/shed analysis against Mobus and BERT SL v0.1, and the staged rung plan. Start here to understand *why the language is shaped this way*. |
| 3 | [`../design/dynamics-principled-position.md`](../design/dynamics-principled-position.md) | Why SL v1 stops at structure. Dynamics as a state-transition family; conservation as an invariant the model *declares* rather than one the engine assumes. The spec's §8 boundary is lifted from its §5. |
| 4 | [`terminology-concordance.md`](terminology-concordance.md) | The homage ledger behind the lexicon: 12 kernel distinctions × {Klir, Bunge, Mobus}, every cell primary-cited. Where the traditions share a word (`component`, `environment`, `interface`, the kind taxonomy) the row is convergence evidence; where one stands alone (`mere`, `@directed`, the process primitives) the row explains that lens's distinctive vocabulary. |

## The corpus

Three `.sl` files in [`fixtures/sl/`](../../fixtures/sl/) serve simultaneously as the spec's worked examples, the round-trip goldens, and the teaching set:

- `process-m.sl` — Mobus's system paragraph (above); the canonical multi-input work process
- `bathtub.sl` — the minimal stock-and-flow system
- `hal-projection.sl` — a real structural model: hal published as a projection, with a retained-SSOT boundary

The round-trip contract (model → text → model, exact) is tested over these in [`crates/bert-canvas/tests/sl_roundtrip.rs`](../../crates/bert-canvas/tests/sl_roundtrip.rs).

**Corpus precedence.** Because the three `.sl` files carry all three roles at once — round-trip golden, spec example, teaching set — the roles are ranked when they conflict: round-trip correctness comes first. Do not modify SL syntax for pedagogical reasons; a teaching improvement that would perturb a golden's round-trip is out of scope for these files and belongs in a dedicated teaching fixture instead.

**Where pedagogy edits go.** That dedicated home is [`fixtures/sl/teaching/`](../../fixtures/sl/teaching/) — a graded set (a two-thing first model, a copy-adaptation of the bathtub, and two files that fail on purpose so a learner can read the error). Those fixtures carry no round-trip or spec obligation, so teaching-motivated edits are free there and should land there rather than on the goldens.

## Where the language lives in the code

| Concern | Location |
|---|---|
| Parser and serializer | [`crates/bert-canvas/src/sl.rs`](../../crates/bert-canvas/src/sl.rs) |
| Compile target (the neutral spec) | `CanvasModel` — `crates/bert-canvas/src/canvas.rs` |
| JS↔wasm boundary | `compile_sl` / `emit_sl` — see [`crates/bert-lenses-kernel/API.md`](../../crates/bert-lenses-kernel/API.md), "SL surface" |
| Editor surface | `web/src/SlPane.tsx` |
| Round-trip goldens | `crates/bert-canvas/tests/sl_roundtrip.rs` |

The parser judges **no** systemhood — it enforces lexical and referential rules only. Whether a described structure *is* a system under a given lens stays the kernel's verdict, reached by the same path canvas gestures take.

## Lineage

SL stands in a line: Mobus's SL proposal (Ch. 4) → BERT SL v0.1 (`bert/docs/system-language-spec.md`, a lexicon and grammar for the data model, with no human-writable syntax) → SL v1.0 here, which adds exactly the missing piece: a notation a person writes, reads, and diffs. What was inherited, what was shed, and why is spec §10.

## Open work

Tracked on the [roadmap board](https://github.com/orgs/halcyonic-systems/projects/12); the spec's §11 table maps each gap to its issue. The near ones: a root-system name (the kernel lacks the field — [#84](https://github.com/halcyonic-systems/bert-lenses/issues/84)), decomposition syntax (gated on the 8-tuple decomposition math, not on the parser), and the controlled systems-English tier that would make the *verbal* surface real.
