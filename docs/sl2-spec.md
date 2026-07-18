# SL — The bert-lenses System Language, v1.0

**Status**: Specified from the working implementation (2026-07-18). Parser and serializer: `crates/bert-canvas/src/sl.rs`. Boundary: `compile_sl` / `emit_sl` (`crates/bert-lenses-kernel/API.md`, "SL surface"). Round-trip goldens: `crates/bert-canvas/tests/sl_roundtrip.rs` over `fixtures/sl/`. Design rationale and precedent research: `docs/design/sl2-authoring-language.md`. Issue: #82.

SL is a human-writable textual notation that compiles deterministically into a bert-lenses model. It is the third concrete syntax over the one neutral abstract spec the repo already holds — the canvas authors it by gesture, JSON serializes it, SL writes it as text. This document specifies the v1.0 language: its lexicon, grammar, semantics, the annotation layer, the round-trip contract, and the structure/dynamics boundary. Three worked examples (the golden corpus) and a lineage section close it.

---

## 1. Design commitments

Five commitments govern every rule below. Each is enforced by the implementation, not merely stated.

**C1 — The compile step is a compiler, never an LLM.** `parse_sl` is a deterministic function of the text: same input, same model, every run. An LLM may help a human *write* SL (`docs/design/llm-integration-research.md`), but nothing between the text and the model interprets, guesses, or smooths. The negative control is gpt-jargon, where the LLM *is* the interpreter on every run; SL is precisely not that.

**C2 — The parser judges nothing about systemhood.** SL's parser enforces only lexical and referential rules (tokens, declare-before-use, unique names). Legality — whether the described structure is a *system* under a lens — is the kernel's verdict, reached the same way canvas gestures reach it: the compiled `CanvasModel` flows through `analyze_canvas`, which projects and runs `validate_mode`. This is Mobus's own syntax doctrine operationalized: "The structure of a system being described is governed by the mathematical definition… Everything is determined a priori by the ontological commitments" (Ch. 4 §4.4.1.3). SL has no free grammar to enforce; structural legality *is* the syntax, and the kernel owns it.

**C3 — The lexicon is the kernel's vocabulary, nothing more.** A word earns a place in SL only if it names a distinction the neutral spec already carries (§3). Nothing in the language is programming-language furniture: no expressions, no variables, no control flow, no macros. Mobus classifies SL correctly: "SL is a 'description' language… different from a typical programming language, which is designed to describe algorithms" (§4.4.1); it "has more in common with… XML" (§4.5). Every SL statement is a declaration, not an instruction.

**C4 — Presentation never contaminates meaning.** Structure lines (§4) carry model content; `@`-prefixed annotation lines (§6) carry view state — positions, the active lens, an observer's direction toggle. The parser applies annotations but no systemhood-bearing fact depends on them; a diff of the structure lines shows systems changing, never node drags. One file holds both, annotations last (the Modelica precedent: layout is syntactically present, semantically null).

**C5 — Structure only; dynamics are declared elsewhere, and never as scripts.** SL v1 describes C, N, E, G, B — the structural face. It contains no dynamical syntax and, by design, never an embedded simulator. §8 states this boundary precisely and argues it against Mobus's own embedded-scripts proposal.

## 2. The neutral spec (compile target)

SL compiles to `CanvasModel` (`crates/bert-canvas/src/canvas.rs:165`), the editing model all three surfaces share. Its content divides into model content and view state:

| Field | Layer | SL realization |
|---|---|---|
| `things` — id, name, `role` (Component/Environment), optional `primitive`, `interface` flag | model | `component` / `source` / `sink` / `environment` lines (§4.3) |
| `relations` — a, b, name, `is_bond`, `kind` | model | `flow` lines (§4.4) |
| `boundary` — porosity, perceptive_fuzziness | model | `boundary` line (§4.5) |
| `system_type` — kingdom, genus, domain | model | `system` / `domain` lines (§4.1–4.2) |
| `things[].x, y` (pixel positions) | view | `@pos` annotations, else auto-layout (§6.1) |
| `lens` (active reading) | view | `@lens` annotation, else caller-preserved (§6.2) |
| `relations[].klir_directed` (observer toggle) | view | `@directed` annotations (§6.3) |

The model-content rows are the neutral spec proper; the view rows are the annotation layer. The compiled model is then *compiled again* by the existing deterministic `project()` into a `WorldModel` for validation and the lens palettes — SL adds a surface above an unchanged pipeline.

## 3. Lexicon

Every SL word, with the kernel distinction that licenses it. There are no other words.

| Word | Licenses it | Kernel referent |
|---|---|---|
| `system` | the model's asserted ontological type | `SystemType` |
| `Conceptual`, `Concrete` | Bunge's two kingdoms (Treatise Vol. 4, Post. 6.4) | `Kingdom` |
| `Physical`, `Chemical`, `Biological`, `Social`, `Technical` | Bunge's five genera of concrete systems | `Genus` |
| `domain` | the analyst's subject-area framing | `SystemType.domain` |
| `component` | a thing inside the boundary (Bunge C) | `Role::Component` |
| `source`, `sink`, `environment` | a thing outside the boundary (Bunge E; Mobus environment object) | `Role::Environment` (§5.2 on the three words) |
| `interface` | membership in the root membrane's I (I ⊆ C, Tuple.lean) | `Thing.interface` |
| `primitive` + one of `Combining`, `Splitting`, `Buffering`, `Impeding`, `Propelling`, `Copying`, `Sensing`, `Modulating`, `Amplifying`, `Inverting` | Mobus's work-process taxonomy | `ProcessPrimitive` |
| `flow` | a drawn connection (edge in N or G) | `Relation` |
| `->` | direction (from, to) | `Relation.a` / `.b` |
| `energy`, `matter`, `field`, `informational` | the connection-kind taxonomy | `Kind` (the fifth value, `Unspecified`, is the *absence* of the clause) |
| `mere` | Bunge's bond vs mere-relation predicate, negated | `Relation.is_bond = false` |
| `boundary`, `porosity`, `fuzziness` | B's properties P = ⟨porosity, perceptive_fuzziness⟩ | `CanvasBoundaryProps` |
| `@pos`, `@lens`, `@directed` | view state (§6) | `x`/`y`, `lens`, `klir_directed` |

Two deliberate absences:

- **No system name.** Mobus's paragraph names its subject ("Process M", "Steel-Plant"), but `CanvasModel` has no root-name field, so by C3 the word does not exist yet. Tracked as #84; when the kernel gains the field, SL gains `system "Name" …` in v1.1.
- **No decomposition syntax.** Sub-paragraphs (Mobus §4.3.1) require a nested neutral spec; nesting is gated on the 8-tuple decomposition mathematics and is out of scope for v1 (design doc Q3).

## 4. Grammar

SL is line-oriented. A file is a sequence of lines, each independently one of: blank, comment, structure line, or annotation line. In EBNF (terminals case-insensitive for keywords; names case-sensitive):

```ebnf
model       = { line } ;
line        = blank | comment | structure | annotation ;

structure   = system | domain | thing | flow | boundary ;
system      = "system" [ ":" kingdom [ "/" genus ] ] ;
domain      = "domain" string ;
thing       = thingword name { attr } ;
thingword   = "component" | "source" | "sink" | "environment" ;
attr        = "interface" | "primitive" primword ;      (* component lines only *)
flow        = "flow" name "->" name [ ":" kindword ] [ string ] [ "mere" ] ;
boundary    = "boundary" { propword number } ;
propword    = "porosity" | "fuzziness" ;

annotation  = "@pos" name number number
            | "@lens" ( "klir" | "bunge" | "mobus" )
            | "@directed" integer                        (* 1-based flow index *)
            | "@" word { token } ;                       (* unknown: skipped *)

kingdom     = "Conceptual" | "Concrete" ;
genus       = "Physical" | "Chemical" | "Biological" | "Social" | "Technical" ;
kindword    = "energy" | "matter" | "field" | "informational" ;
primword    = "Combining" | "Splitting" | "Buffering" | "Impeding" | "Propelling"
            | "Copying" | "Sensing" | "Modulating" | "Amplifying" | "Inverting" ;

name        = word | string ;
string      = '"' { any character except '"' and newline } '"' ;
word        = run of non-whitespace characters excluding '"', ':', '#' ;
comment     = "#" to end of line (outside strings; also trailing) ;
```

Tokenization: whitespace separates tokens; `"…"` groups (no escape sequences — a name containing `"` or a newline is not expressible, §7.3); `:` is a standalone token; `->` is recognized as an arrow; `#` begins a comment outside strings.

### 4.1 `system`

At most one per file. Asserts the modeler's ontological type: `system : Concrete/Technical`. Kingdom alone is legal (`system : Concrete`); genus alone is not (genus is meaningful only within a kingdom — matching the kernel, where no validator gates `system_type` at all: it is semantic metadata, not a systemhood verdict).

### 4.2 `domain`

At most one per file. The free-text subject area that frames narration: `domain "steel manufacturing"`.

### 4.3 Thing lines

`component Furnace primitive Combining interface` declares a component, optionally designating it a work process of a named primitive kind and/or a member of the boundary interface set. `source` / `sink` / `environment` declare environment things; the attribute words are rejected there (environment internals are opaque — Mobus §4.3.3.2.2, mirrored at `canvas.rs:84`). Names are unique per file; things must be declared before any flow references them.

### 4.4 `flow`

`flow "Iron Vendor" -> Furnace : matter "iron"` declares a directed connection. The kind clause is optional (absent = `Unspecified`); the quoted label is optional (the flow's name); trailing `mere` declares a mere relation — Bunge's B̄, a relation that is not a bond, which exists only in the editing model and never projects.

### 4.5 `boundary`

At most one per file: `boundary porosity 0.7 fuzziness 0.1`. Key-value pairs in any order, either omittable; values are the root membrane's P. Absent line = unauthored (0.0, the kernel default).

### 4.6 Errors

Parsing collects **all** faults in one pass and reports each with its 1-indexed line — never a first-error-only bail, and never a guess. Fault classes: lexical (unterminated quote), unknown keyword, malformed clause, duplicate name, undeclared flow endpoint, redeclared singleton (`system`/`domain`/`boundary`), attribute on an environment thing, out-of-range `@directed`, malformed known annotation. The ACE/Gherkin discipline — deterministic parse, fail loud on anything ambiguous — is inherited deliberately.

## 5. Semantics

### 5.1 What a compiled model means

A parsed file denotes exactly one `CanvasModel`: things and relations in declaration order with sequentially assigned ids, the boundary and type assertion as written, view state per §6. What that model *means as a system* is not SL's to say: meaning is delivered by the kernel — `project()` compiles it to a `WorldModel`, `validate_mode` gates it at the active lens's rung (Klir→Core, Bunge→Structural, Mobus→Operational), and the lens palettes render its formal object. SL is a notation for the model, not an authority over it (C2).

### 5.2 `source`, `sink`, `environment` — author intent, edge-derived identity

All three words compile to `Role::Environment`. The distinction they express — where flows originate and terminate — is *derived from the drawn bonds*, not stored: `project()` makes an environment thing a Source if it originates a bond, a Sink if a bond merely touches it, and omits it (an orphan) if no bond does. This is the Lean-proven canon from SL v0.1's own migration note (edge-derived role supersedes the stored `ExternalEntityType`). Consequently the three words are author-intent sugar: `source X` followed by flows *into* X is not a parse error — the kernel's reading simply differs from the label, and the canonical serializer (§7.1) rewrites the word to the kernel's reading. The text you get back tells you what you actually drew.

### 5.3 Compilation is total on parse success

A file that parses always yields a model — including a structurally *illegal* one (e.g. a self-loop, which the Operational gate rejects). This is deliberate and matches the canvas: authoring states are routinely mid-thought, and the verdict pill / audit panel carry the kernel's issues live. SL does not gate compilation on validity; it gates nothing (C2).

## 6. The annotation layer

Annotations are `@`-prefixed lines, conventionally last in the file. Three are defined; unknown annotations are *skipped, not errors* — the ignorable contract that lets future view-state vocabulary degrade softly in old parsers. Malformed instances of a *known* annotation fail loud (§4.6).

**Why a section, not a second file.** The semantic requirement is only that presentation not contaminate meaning (C4), and a marked section satisfies it as fully as a separate file: the structure-lines diff is clean either way. Given that, one artifact wins — a model is one pasteable, reviewable, portable thing. Modelica made the same call (layout inline as `annotation(…)`, semantically null, preserved on save); SVG/HTML keep style separable but co-located. Decided for v1; recorded in the 2026-07-18 session log.

### 6.1 `@pos name x y`

Pins a thing's pixel position. Things without `@pos` are placed by the deterministic auto-layout: components on an inner N-gon (a single component at the center), environment things on an outer ring, both in declaration order — same text, same picture. Positions are view state; no verdict reads them.

### 6.2 `@lens klir|bunge|mobus`

Pins the active lens. The lens is a *reading* of the model, not a property of it — every model is a valid Core model regardless. Accordingly `compile_sl` reports whether the text pinned a lens (`lens_explicit`), and the reference UI preserves the author's current lens when it did not; the parser's own default (Mobus) applies only when there is no current lens to preserve.

### 6.3 `@directed n`

Marks the *n*-th declared flow (1-based) with Klir's observer orientation toggle — "directed systems" add an orientation the observer commits to (Facets Ch. 4); the kernel's dependency relation is ordered regardless, so this changes what the Klir lens *shows*, not the model. Exists so a serialized model loses no view state.

## 7. Serialization and the round-trip contract

### 7.1 Canonical form

`emit_sl` writes a model as: `system` / `domain` lines; thing lines in `things` order (environment words edge-derived per §5.2 — the emitted word is the kernel's reading); `flow` lines in `relations` order; `boundary` if authored; blank line; `@lens`; `@pos` per thing; `@directed` per directed flow. Names emit bare when they read as identifiers and shadow no keyword, quoted otherwise. Floats emit via shortest-round-trip decimal representation, so re-parsing recovers them bit-exactly.

### 7.2 The contract (golden-tested)

Two guarantees, distinguished honestly (`tests/sl_roundtrip.rs`):

- **SL-born models: identity, digit for digit.** For any model produced by parsing (things-first declaration order, hence sequential ids), `parse(emit(m)) = m` as JSON — every field, including positions. Text-level: `emit(parse(t))` is a fixpoint after one pass.
- **Arbitrary models: canonicalization.** A canvas-born model may carry gap ids and interleaved authoring history; ids are machine mechanics, and names are the text surface's identifiers. The guarantee is `emit(parse(emit(m))) = emit(m)` — one pass lands in canonical form, and the canonical text is stable. Structure, names, kinds, bonds, positions, and view state all survive; only internal id numbering is normalized.

### 7.3 Unrepresentable shapes

`emit_sl` refuses loudly rather than lose information silently: a name or label containing `"` or a newline, and a `system_type` with genus but no kingdom, are errors. Nothing else in `CanvasModel` is outside the language. One asymmetry is accepted knowingly: `primitive`/`interface` on an *environment* thing (expressible in JSON, semantically inert — the kernel ignores both) is dropped on emit rather than round-tripped.

## 8. The structure/dynamics boundary

*This section adopts `docs/design/dynamics-principled-position.md` (the post-critique position); §8.2 lifts its liftable paragraph verbatim.*

### 8.1 The departure from Mobus, argued

Mobus's answer to "how does a model carry dynamics" was embedded scripts: "Behaviors or dynamics are implemented using embedded scripts… transformations (T in Eq. 4.1) are expressed in transfer functions or simulation programs" (§4.4.1.2.3), inside a sysXML sketch he himself frames as "playful exploration" with "research… continu[ing]" (§4.5). SL rejects the mechanism while keeping the theory, and the rejection is not taste:

1. **It is not the theory's mandate.** T's formal definition — "any suitable form, such as… formula, equation, or algorithm" (§4.3.3.4) — is implementation-neutral. The narrowing to scripts happens in prose about one candidate description language, not in the tuple's mathematics. Rejecting embedded JavaScript rejects an engineering guess Mobus hedged, not a theorem.
2. **Embedded scripts destroy checkability.** A script is opaque to every validator: the semigroup contract, conservation ledgers, mode-transition witnesses, and the Lean structural theorems can say nothing about arbitrary code. The premise of this tool — a deterministic kernel owning truth — dies at the first `eval`.
3. **Declaration subsumes the need.** Everything a per-element script legitimately expresses is expressible as declared data: a rate constant, a transfer-function family name plus parameters, a transition table, a distribution plus seed.

SL v0.1's §4 made the complementary error at the spec level: it named its runtime (System→Mesa agent classes, Bevy ECS targets, tick-modulo stepping). That coupling was the old headache, and it is the second thing this boundary is built to prevent: **SL never names a simulator, and no simulator's shape leaks into SL.**

### 8.2 What SL declares if it ever gains dynamical syntax

> An SL model never contains a simulator. It **declares** a dynamics record per system: the **support** (discrete Δt, event-indexed, …), the **carrier** (what the state space is), the **kind** (the transition functor: deterministic map, input-driven table, distribution), the **invariants** (conserved quantities, bounds — axis D, where conservation lives), and the **rates/parameters** of a named transfer-function family. Engines *interpret* declarations; they are substitutable and separately verified against the semigroup contract. A declaration is checkable, diffable, lens-translatable, and provable-about; a script is none of these. This is Mobus's own T ("any suitable form") taken at its formal word rather than at its Ch. 4 prose.

Three consequences the position doc establishes, recorded here so future SL versions do not regress:

- **Conservation is an invariant the model declares, not one the engine assumes** (axis D of the dynamics taxonomy). The compose conservation engine is the *first interpreter of one declarable kind* — Id-functor, ℝⁿ carrier, additive conserved invariant — not the meaning of Run. An SL dynamics record must therefore treat conservation as one optional declaration among several, or it bakes in exactly the special-case-as-category error the research dismantled.
- **H is a record, never an input to T** (three-tradition convergence: Willems, Bertalanffy, Mesarovic–Takahara). Any history-dependence belongs in the carrier; SL will never grow syntax that feeds H back into a transformation.
- In v1, dynamics reach a model exclusively through the existing tether/run-manifest path (data + forcing, separately authored); the run is the machine's job. What is lost, stated honestly: the expressiveness of arbitrary protocol logic per element. That loss is the price of a checkable language, and it is paid knowingly.

## 9. Worked examples (the golden corpus)

The three corpus files are committed at `fixtures/sl/` and are the round-trip goldens; all three parse, emit, re-parse identically, and project clean at Core mode.

### 9.1 Process M (`process-m.sl`) — Mobus's own paragraph

Mobus's verbal exemplar: "Process M takes in materials A and B from sources 1 and 2 along with energy E from source 3 to make product Z with waste product X going to sinks 5 and 6 respectively" (§4.3.1). In SL, each clause becomes one line:

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
```

What the paragraph carries that SL v1 does not: the name "Process M" as the *system's* name (here it is a component's name — #84), the efficiency figure, and the rate refinements ("one mass of delivery each 24 hours") — the latter two are dynamics declarations in the §8.2 sense, deferred with the rest of the dynamical face.

### 9.2 Bathtub (`bathtub.sl`) — the stock-and-flow first lesson

```
system : Concrete/Physical
component Tub primitive Buffering interface
source Faucet
sink Drain
flow Faucet -> Tub : matter "inflow"
flow Tub -> Drain : matter "outflow"
```

Six lines, one Buffering work process, the canonical first model of every system-dynamics curriculum — and the demonstration that bare names need no quotes.

### 9.3 The hal stack (`hal-projection.sl`) — a real infrastructure system

```
system : Concrete/Technical
domain "sovereign AI infrastructure"
component Proxy interface
component DailyLoop interface
component Council
source Operator
sink UpstreamAPIs
flow Council -> Proxy : informational "convene models"
flow Proxy -> DailyLoop : informational "tool calls"
flow Operator -> DailyLoop : informational "requests"
flow Proxy -> UpstreamAPIs : informational "model requests"
boundary porosity 0.15 fuzziness 0.05
```

A three-component decomposition with two boundary interfaces, an authored membrane, and a domain framing — the working shape of a real model, ten structure lines.

## 10. Lineage

**Mobus, Ch. 4 (2015/2022).** SL inherits the load-bearing insight — one definition, three coequal views (verbal, graphical, mathematical; §4.3) — the ontology-drawn lexicon, the system-paragraph as the verbal form, and the syntax-as-structural-legality doctrine (§4.4.1.3). It sheds his sysXML/XML serialization (the neutral spec's JSON already fills that role), his embedded-JavaScript behaviors (§8), and the 7-tuple's folding of E into G — the machine-checked authority is the 8-tuple with E first-class (`Tuple.lean`; E-as-first-class is the Lean formalization's improvement on the printed tuple, credited as such).

**BERT SL v0.1 (`bert/docs/system-language-spec.md`).** The prior spec in this lineage: a publication-grade lexicon and grammar *for the data model* — 40 concepts, ID encoding, the four Lean coherence constraints (its §2.6), edge-derived source/sink roles (its §1.2 migration note, adopted here as §5.2). What it lacked is exactly what this spec adds: a human-writable concrete syntax; v0.1's "speakable" mode was natural-language-to-model via chat, not a notation a person writes and diffs. Its §4 execution mapping (Mesa/Bevy) is shed per §8.1.

**SL v2.0 addendum (`system-language-spec-v2-addendum.md`).** Contributed the kernel re-founding (the 8-tuple as a generated view over a proven kernel) and the mode ladder; its mode-declaration *surface syntax* stayed cut — in bert-lenses, modes are the three lenses, view state on the neutral spec, which is why `@lens` is an annotation and not a structure line.

**Precedents** (research and verification marks in `docs/design/sl2-authoring-language.md` §4): SysML v2 for the architecture — text and diagrams as projections of one abstract syntax, text privileged because it maps losslessly; Modelica for one-artifact/two-concerns (§6); Stella for the bar the tool clears — two coequal views of one model with a live validity signal; Quint for approachable-surface-over-fixed-semantics via a deterministic transpiler; ACE/Gherkin for the fail-loud parse discipline; gpt-jargon as the negative control (C1). For the dynamics boundary: Petri-net P-invariants and CRN conservation laws as the prior art for invariant-on-structure independent of the transition rule — the position §8 applies is their pattern, cited as lineage, not a rediscovery.

## 11. Known gaps and v1.1 candidates

| Gap | Tracked | Direction |
|---|---|---|
| No root-system name (kernel lacks the field) | #84 | Add `CanvasModel.name` → `system "Name" [: type]` |
| No decomposition / sub-paragraphs (flat, single-root) | design doc Q3 | Gated on 8-tuple decomposition math; nesting enters the neutral spec first |
| No controlled systems-English tier (the verbal surface proper) | design doc §5 Rung 2 | Fixed-grammar system-paragraph parsing to the same neutral spec |
| Compiled diagram can land partly off-viewport | #83 | Zoom-to-fit after compile (UI, not language) |
| Empty text compiles to an empty model silently | session log 7/18 | Possibly a nonempty gate or confirm in the pane (UI, not language) |
| `Kind` (5 values) collapses to 3 substances under `project()` | `canvas.rs:64` | Not an SL defect — Kind survives the text round trip; noted for any WorldModel-mediated path |
| No dynamics declarations | §8 | If ever: the §8.2 record, never scripts, never a named simulator |
