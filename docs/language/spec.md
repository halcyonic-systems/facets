# SL — The bert-lenses System Language, v1.0

**Status: LIVE.** Normative, and specified from the working implementation (2026-07-18). Parser and serializer: `crates/bert-canvas/src/sl.rs`. Boundary: `compile_sl` / `emit_sl` (`crates/bert-lenses-kernel/API.md`, "SL surface"). Round-trip goldens: `crates/bert-canvas/tests/sl_roundtrip.rs` over `fixtures/sl/`. Design rationale and precedent research: `docs/design/sl2-authoring-language.md`. Issue: #82.

SL is a human-writable textual notation that compiles deterministically into a bert-lenses model. It is the third concrete syntax over the one neutral abstract spec the repo already holds — the canvas authors it by gesture, JSON serializes it, SL writes it as text. This document specifies the v1.0 language: its lexicon, grammar, semantics, the annotation layer, the round-trip contract, and the structure/dynamics boundary. Three worked examples (the golden corpus) and a lineage section close it.

---

## 1. Design commitments

*Status: normative.* Each commitment is enforced by the implementation, and binds any second implementer of this core (germen already implements it).

Five commitments govern every rule below. Each is enforced by the implementation, not merely stated.

**C1 — The compile step is a compiler, never an LLM.** `parse_sl` is a deterministic function of the text: same input, same model, every run. An LLM may help a human *write* SL (`docs/design/llm-integration-research.md`), but nothing between the text and the model interprets, guesses, or smooths. The negative control is gpt-jargon, where the LLM *is* the interpreter on every run; SL is precisely not that.

**C2 — The parser judges nothing about systemhood.** SL's parser enforces only lexical and referential rules (tokens, declare-before-use, unique names). Legality — whether the described structure is a *system* under a lens — is the kernel's verdict, reached the same way canvas gestures reach it: the compiled `CanvasModel` flows through `analyze_canvas`, which projects and runs `validate_mode`. This is Mobus's own syntax doctrine operationalized: "The structure of a system being described is governed by the mathematical definition… Everything is determined a priori by the ontological commitments" (Ch. 4 §4.4.1.3). SL has no free grammar to enforce; structural legality *is* the syntax, and the kernel owns it.

**C3 — The lexicon is the kernel's vocabulary, nothing more.** A word earns a place in SL only if it names a distinction the neutral spec already carries (§3). Nothing in the language is programming-language furniture: no expressions, no variables, no control flow, no macros. Mobus classifies SL correctly: "SL is a 'description' language… different from a typical programming language, which is designed to describe algorithms" (§4.4.1); it "has more in common with… XML" (§4.5). Every SL statement is a declaration, not an instruction.

**C4 — Presentation never contaminates meaning.** Structure lines (§4) carry model content; `@`-prefixed annotation lines (§6) carry view state — positions, the active lens, an observer's direction toggle. The parser applies annotations but no systemhood-bearing fact depends on them; a diff of the structure lines shows systems changing, never node drags. One file holds both, annotations last (the Modelica precedent: layout is syntactically present, semantically null).

**C5 — Structure only; dynamics are declared elsewhere, and never as scripts.** SL v1 describes C, N, E, G, B — the structural face. It contains no dynamical syntax and, by design, never an embedded simulator. §8 states this boundary precisely and argues it against Mobus's own embedded-scripts proposal.

## 2. The neutral spec (compile target)

*Status: normative.*

SL compiles to `CanvasModel` (`crates/bert-canvas/src/canvas.rs:165`), the editing model all three surfaces share. Its content divides into model content and view state:

| Field | Layer | SL realization |
|---|---|---|
| `things` — id, name, `role` (Component/Environment), optional `primitive`, `interface` flag, optional `child_model` decomposition reference, optional `stock_unit` declared unit, optional Klir source-system metadata (`scale`, `states`, `variable_kind`) | model | `component` / `source` / `sink` / `environment` lines (§4.3) |
| `time_unit` — the model's time-unit symbol | model | `time unit` line (§4.8) |
| `klir_level` — the declared Klir epistemological level | model | `level` line (§4.9) |
| `relations` — a, b, name, `is_bond`, `kind` | model | `flow` lines (§4.4) |
| `params` / `metrics` — declared domain names over input knobs and computed readouts (walkthrough #18, #203) | model | `param` lines (§4.5), `metric` lines (§4.6) |
| `boundary` — porosity, perceptive_fuzziness | model | `boundary` line (§4.7) |
| `system_type` — kingdom, genus, domain | model | `system` / `domain` lines (§4.1–4.2) |
| `things[].x, y` (pixel positions) | view | `@pos` annotations, else auto-layout (§6.1) |
| `lens` (active reading) | view | `@lens` annotation, else caller-preserved (§6.2) |
| `relations[].klir_directed` (observer toggle) | view | `@directed` annotations (§6.3) |

The model-content rows are the neutral spec proper; the view rows are the annotation layer. The compiled model is then *compiled again* by the existing deterministic `project()` into a `WorldModel` for validation and the lens palettes — SL adds a surface above an unchanged pipeline.

A concept-by-concept table setting each SL line beside its canvas gesture, JSON fragment, and kernel referent — "three concrete syntaxes, one neutral spec" made visible rather than asserted — lives in the [reader's tour](../tour.md#the-notation-table) (#95), its single didactic home. The lexicon table (§3) already carries the kernel-referent column that table extends.

## 3. Lexicon

*Status: normative.*

Every SL word, with the kernel distinction that licenses it and the tradition(s) that contributed it. There are no other words.

SL is one unified language: the traditions *contributed* the words, and the language owns them now, with derivation acknowledged. Attribution is therefore a ledger, not a partition — and it is deliberately **multi-tradition where the traditions converge**. That `component` is both Bunge's word (composition C) and Mobus's (C in the tuple) is not an ambiguity to resolve; it is convergence evidence of exactly the kind the K≅2 program runs on. Rows crediting a single tradition mark a distinction that tradition alone contributed (`mere` is Bunge's; the work-process taxonomy is Mobus's; the observer's direction toggle is Klir's). Per-cell primary citations live in the terminology concordance ([`terminology-concordance.md`](terminology-concordance.md)), the SSOT this column summarizes.

| Word | Kernel distinction | Contributed by | Kernel referent |
|---|---|---|---|
| `system` | the bounded whole being modeled; optionally names the SOI (v1.1, #84) | Klir, Bunge, Mobus — the convergence word; the name is Mobus's SOI · Bunge's σ · Klir's S, bound to a proper name | `SystemType` + `CanvasModel.name` |
| `Conceptual`, `Concrete` | the two kingdoms of systems | Bunge (Treatise Vol. 4, Post. 6.4) | `Kingdom` |
| `Physical`, `Chemical`, `Biological`, `Social`, `Technical` | the five genera of concrete systems | Bunge (Post. 6.4); Klir's §2.4 type-(a) axis lands on nearly the same list | `Genus` |
| `domain` | the analyst's subject-area framing | Mobus (the generic lexicon translated into domain-specific terms, §4.4) | `SystemType.domain` |
| `component` | a thing inside the boundary | **Bunge (composition C) and Mobus (C in the tuple)** — shared; Klir diverges (things/elements) | `Role::Component` |
| `source`, `sink`, `environment` | a thing outside the boundary | Mobus (Src/Snk environment objects); `environment` shared with Bunge (E) | `Role::Environment` (§5.2 on the three words) |
| `interface` | membership in the root membrane's I (flat I ⊆ C is the Lean's convention, Tuple.lean; the book makes interfaces components of the *boundary subsystem* — concordance row 9). The word is a **claim, not a label**: since #213/#225 an interface must carry a boundary-crossing flow or the kernel refuses the model at Operational — see §5.4. **CONTINGENT([#226](https://github.com/halcyonic-systems/bert-lenses/issues/226))**: whether the interface is stamped onto a component, as here, or placed on the boundary, is open | **Mobus (I in B) and Bunge ("interface points" = i/o terminals ∈ boundary, 1992)** — shared | `Thing.interface` |
| `primitive` + one of `Combining`, `Splitting`, `Buffering`, `Impeding`, `Propelling`, `Copying`, `Sensing`, `Modulating`, `Amplifying`, `Inverting` | the work-process taxonomy | Mobus | `ProcessPrimitive` |
| `decomposes` | a component carries a child model that realizes it, gated by the boundary contract (β) | **Mobus (Eq. 4.3, the word's primary source) and Bunge (every system a component of its next supersystem)** — shared; Klir least (his hierarchy is epistemological levels, not part-whole) | `System.child_model` (`ModelRef`), checked by `decomposition::check_decomposition` |
| `flow` | a drawn connection (edge in N or G) | word: Mobus; the underlying relation is three-tradition (Klir dependency, Bunge connection/bond, Mobus flow) | `Relation` |
| `->` | direction (from, to) | Mobus (flows carry direction); contrast the observer's `@directed` | `Relation.a` / `.b` |
| `energy`, `matter`, `field`, `informational` | the connection-kind taxonomy | Bunge, **verbatim** ("flows — of energy, matter, or fields … informational", CES 1979), mapping 1:1 onto Mobus substances (Material/Energy/Message; `canvas.rs:64`) | `Kind` (the fifth value, `Unspecified`, is the *absence* of the clause) |
| `mere` | bond vs mere-relation (B vs B̄) | Bunge | `Relation.is_bond = false` |
| `ample` | availability assertion on an informational flow — present, never binding; no magnitude (#9) | Mobus (Amplifying's min-selection, §Fig 3.19 signal+power semantics); the word is the model's, discovered by llm-market | `Interaction::ample` |
| `substance` | what flows, named apart from what the flow is *called* — "F-1.1 — iron-input" is a label, `iron` is a substance (#216, C4) | Mobus (substances are what work processes transform); Bunge's flows are "of" something by construction | `Relation.substance` → `Substance.sub_type` |
| `amount` | the flow's magnitude per Δt — a structural attribute of the edge (it does not vary during a run), whose absence capped every SL model at rate 1.0 (#216, C1). A non-positive value is a parse fault; on a `mere` relation it is a contradiction and refused. Omitted ≠ 1: unauthored survives as its own state, and only projection supplies the kernel default | Mobus (flows carry magnitude — §8.2's rate field, structural half) | `Relation.amount` → `Interaction.amount` |
| `unit` (flow clause) | the magnitude's unit (#216, C1); same word as the `time unit` header line, disambiguated by position | Mobus (dimensional bookkeeping on flows) | `Relation.unit` → `Interaction.unit` |
| `weight` | per-transition count for the DTMC read (#67) — a non-negative integer; absent reads as the uniform 1 | Klir (the directed-system observer's transition structure); SSF's `kindCodomain .markov` | `Relation.weight` |
| `boundary`, `porosity`, `fuzziness` | B's properties P = ⟨porosity, perceptive_fuzziness⟩ | **Mobus (B = ⟨P, I⟩) and Bunge (topological boundary, 1992)** — shared concept; the property words are Mobus's | `CanvasBoundaryProps` |
| `stock` | a Buffering stock's declared unit — the stock accumulates its inflow over Δt, so its dimension differs from the flow's and carries its own unit (#76/#94) | Mobus (stocks/buffers, the Buffering work process); the Stella/Vensim stock-flow convention | `Thing.stock_unit` → `AgentModel.stock_unit` |
| `scale` + one of `Nominal`, `Ordinal`, `Interval`, `Ratio` | the measurement scale of a variable's state set — the level at which its values are comparable (v1.2, #154) | Klir (the source-system characterization of a variable — §4, Table 4.1, the ground floor of his epistemological hierarchy) | `Thing.scale` (`ScaleType`) — authored canvas-side metadata, read in the Klir register only; never projects |
| `states` | the variable's state set, in Klir's set notation — `{Green, Red}`; `{}` is the explicit empty set (v1.2, #154) | Klir (a source-system variable *is* characterized by its state set — §4, Table 4.1) | `Thing.states` — same register-only standing as `scale` |
| `kind` (thing clause) + one of `Basic`, `Support` | the basic-vs-supporting partition of the source variables — a semantic role the modeler declares, never readable off R; omitted reads as `Basic`, so the clause declares the rare support variable (v1.2, #154) | Klir (basic variables are the observed quantities; supporting variables encode the support set — time, space, population — §4, Table 4.1) | `Thing.variable_kind` (`KlirVarKind`) — same register-only standing as `scale` |
| `time unit` | the model's time-unit symbol — what one Δt is called, so an intrinsic rate integrates in the author's vocabulary (`kW` → `kW·h`, #94) | Mobus (Δt in the 8-tuple's time base); the symbol is display vocabulary, never a rescaling | `CanvasModel.time_unit` → `WorldModel.time_unit` |
| `level` + one of `Source`, `Data`, `Generative`, `Structure`, `Metasystem` | the model's declared epistemological level — where on Klir's hierarchy the author claims this model stands (v1.3, #288). The modeling relation is defined only within a level (§5.4 of *Facets*), so the declaration is what the cross-level refusal reads; undeclared gates nothing | Klir (the epistemological hierarchy of systems — §4.5, and §5.4's "true categories in the sense of category theory") | `CanvasModel.klir_level` (`KlirLevel`) — authored canvas-side metadata, read in the Klir register only; never projects |
| `param` (+ `shares`, `range`) | a declared name over an input knob — one flow's declared amount, or a process's out-fanout presented as % shares, in the model's own vocabulary (walkthrough #18). Stores no value: the anchored amount IS the value | house words (the distinction is the instrument's: domain names over declared inputs); the amounts themselves are Mobus's edge attributes (§4.4) | `ParamDecl` / `ParamAnchor` — canvas-side; never projects |
| `metric` + `share of flow` / `sum into` | a declared readout over the run — the output twin of `param` (#203): `share` reads composition (one flow as a fraction of its source's outflow), `sum` reads throughput (everything arriving at a thing); both evaluate over the recorder's executed per-flow series, never a free-floating number. The verb set is closed and grows one checkable verb at a time (ADR 0006) | house words (the distinction is the instrument's: declared observables over the trace); Mobus's H supplies the record they read | `MetricDecl` / `MetricExpr` — canvas-side; never projects |
| `@pos`, `@lens`, `@directed` | view state (§6) | `@directed` is Klir's observer commitment (Facets Ch. 4); `@pos`/`@lens` are house words | `x`/`y`, `lens`, `klir_directed` |

Three absences resolved:

- **The system name landed (v1.1, #84 — closed 2026-07-18).** Mobus's paragraph names its subject ("Process M", "Steel-Plant"); the kernel gained `CanvasModel.name` and SL gained `system "Name" [: Kingdom[/Genus]]` the same day, exactly on the C3 schedule the v1 spec committed to: the word entered the lexicon only once the kernel carried the distinction. The name is a quoted string, projects into the root system's `info.name`, and round-trips both ways (concordance row 1, "the named referent").
- **Klir source-system metadata landed (v1.2, #154 — 2026-07-24).** The Klir lens could name a thing and its relations but not *characterize its variables*: Table 4.1 fixes a variable by its state set, its measurement scale, and its basic-vs-supporting standing, and none of the three had a word. `scale`, `states`, and `kind` entered the lexicon the day the neutral spec gained the three fields (`ScaleType`, `Thing.states`, `KlirVarKind` — the C3 schedule again). Unlike every other thing attribute they ride environment lines too (a revision within #154: Table 4.1 most wants the *input* variables characterized, and those are frequently the environmental drivers). All three are authored metadata read in the Klir register only — none projects to the kernel, so no systemhood verdict reads them (C2 untouched).
- **Decomposition by reference landed (#89 step 4 — merged 2026-07-20).** Mobus's sub-paragraphs (§4.3.1) needed the kernel to carry the part-whole distinction first; it did once `System.child_model` (a `ModelRef`) and the Lean decomposition contract merged (steps 2–3, same day), so `decomposes` entered the lexicon on exactly the C3 schedule the name waited on — the word earns its place only once the kernel names the distinction. SL takes the *reference* form (the child is its own flat model, keyed by a stamped id — §4.3, §6 of `decomposition-foundations.md`), never nested block text: each SL file stays one flat paragraph, the recursion living in the reference index and not the page layout. The block form is the road not taken.

## 4. Grammar

*Status: normative.*

SL is line-oriented. A file is a sequence of lines, each independently one of: blank, comment, structure line, or annotation line. In EBNF (terminals case-insensitive for keywords; names case-sensitive):

```ebnf
model       = { line } ;
line        = blank | comment | structure | annotation ;

structure   = system | domain | timeunit | level | thing | flow | param | metric | boundary ;
system      = "system" [ string ] [ ":" kingdom [ "/" genus ] ] ;
domain      = "domain" string ;
timeunit    = "time" "unit" name ;                     (* the Δt symbol, #94 *)
level       = "level" levelword ;                      (* the declared Klir level, #288 *)
thing       = thingword name { attr } ;
thingword   = "component" | "source" | "sink" | "environment" ;
attr        = "interface" | "primitive" primword
            | "stock" name                             (* declared stock unit *)
            | "scale" scaleword                        (* Klir source-system metadata, #154; *)
            | "states" "{" [ name { "," name } ] "}"   (*   these three ride environment    *)
            | "kind" varkindword                       (*   lines too — §4.3                *)
            | "decomposes" string modelid ;            (* component lines only *)
flow        = "flow" name "->" name [ ":" kindword ] [ string ]
              [ "substance" name ] [ "amount" decimal | "ample" ] [ "unit" name ]
              [ "mere" ] [ "weight" integer ] ;   (* ample: informational only, no unit *)
decimal     = positive decimal number ;                (* "1.5"; 0 and below refused *)
param       = "param" string ":" "flow" name "->" name [ string ]
              [ "range" number ".." number ]           (* walkthrough #18 *)
            | "param" "shares" string ":" "from" name ;
metric      = "metric" string ":" "share" "of" "flow" name "->" name [ string ]
            | "metric" string ":" "sum" "into" name ;  (* #203; verb set closed, ADR 0006 *)
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
scaleword   = "Nominal" | "Ordinal" | "Interval" | "Ratio" ;
varkindword = "Basic" | "Support" ;
levelword   = "Source" | "Data" | "Generative" | "Structure" | "Metasystem" ;
modelid     = "@" base58                              (* a stamped model id, model_id.rs *) ;

name        = word | string ;
string      = '"' { any character except '"' and newline } '"' ;
word        = run of non-whitespace characters excluding '"', ':', '#' ;
comment     = "#" to end of line (outside strings; also trailing) ;
```

Tokenization: whitespace separates tokens; `"…"` groups (no escape sequences — a name containing `"` or a newline is not expressible, §7.3); `:` is a standalone token; `{`, `}`, and `,` are standalone tokens (the set-literal punctuation, #154); `->` is recognized as an arrow; `#` begins a comment outside strings.

### 4.1 `system`

At most one per file. Optionally names the SOI and asserts the modeler's ontological type: `system "Steel-Plant" : Concrete/Technical`. The name is a quoted string (never a bare word — the bare token after `system` is reserved against ambiguity with the type clause) and lands in `CanvasModel.name`; either part may appear alone (`system "Bathtub"`, `system : Concrete`). Kingdom alone is legal; genus alone is not (genus is meaningful only within a kingdom — matching the kernel, where no validator gates `system_type` at all: it is semantic metadata, not a systemhood verdict). An empty name (`system ""`) is a parse fault.

### 4.2 `domain`

At most one per file. The free-text subject area that frames narration: `domain "steel manufacturing"`.

### 4.3 Thing lines

`component Furnace primitive Combining interface` declares a component, optionally designating it a work process of a named primitive kind and/or a member of the boundary interface set. `source` / `sink` / `environment` declare environment things; the attribute words are rejected there (environment internals are opaque — Mobus §4.3.3.2.2, mirrored at `canvas.rs:84`). Names are unique per file; things must be declared before any flow references them.

`component Furnace primitive Combining decomposes "furnace-interior" @Hrs6K91KnZZsiPcWzftv8U` designates the component as decomposed: it carries a child model that realizes it (`System.child_model`, the reference form of §6 in `decomposition-foundations.md` — Option B, the child is its own model). Both halves are mandatory. The quoted string is a human label (it may drift under renames — the toolchain re-stamps, the compiler never resolves it); the `@`-prefixed token is the child's stamped model id, base58 per `model_id.rs`, and is the key. A name with no `@id` is a fault (`unstamped reference — resolve via the library`; stamping is later tooling, not the compiler's job); an id that fails the base58 decoder is a fault; a second `decomposes` on one line is a fault; `decomposes` on an environment thing is a fault (its internals are opaque). `decomposes` and `interface` on the same component is a fault in v1: the Lean contract covers a component's internal network only, not flows crossing the parent membrane through an interface component (the gate-open narrowing, #89) — parent-side knowledge the store-free compiler rejects early rather than deferring. `decomposes` emits last, after `primitive` and `interface` (§7.1).

`component Battery primitive Buffering stock "kW·h"` declares the stock's unit (#76/#94): a Buffering component's stock accumulates its inflow over Δt, so its dimension differs from the flow's, and the modeler declares the stock's own unit rather than the run copying the flow's. The unit is a name token — bare when identifier-shaped (`stock ML`), quoted otherwise (`stock "kW·h"`). A second `stock` on one line is a fault; `stock` on an environment thing is a fault (its internals are opaque). Undeclared, the run *derives* a display unit from the inflow and flags its provenance; the run panel's accept affordance writes the derived unit back as this clause.

`component Light scale Nominal states {Green, Yellow, Red}` characterizes the thing as a Klir source-system variable (#154). Three clauses, each at most once per line, in any order among the attributes: `scale <Nominal|Ordinal|Interval|Ratio>` declares the measurement scale; `states {A, B, C}` declares the state set in Klir's set notation — a brace-enclosed, comma-separated list of value labels (bare or quoted; `{}` is a legal, explicit empty set; a trailing comma or a missing brace is a fault); `kind <Basic|Support>` declares the basic-vs-supporting standing (`Basic` is the default, so the clause exists to declare the rare support variable). The value words are keyword-case-insensitive like everything else and emit in the canonical capitalization shown. Unlike every other attribute, all three ride **environment lines too** — `source Battery kind Support scale Ratio` is legal — because Table 4.1 most wants the *input* variables characterized, and those are frequently the environmental drivers. A duplicate clause and an unknown scale or kind value are faults. The three are authored Klir metadata, read in the Klir register only: none projects to the kernel, so no systemhood verdict reads them (C2).

### 4.4 `flow`

`flow "Iron Vendor" -> Furnace : matter "iron"` declares a directed connection. The kind clause is optional (absent = `Unspecified`); the quoted label is optional (the flow's name); trailing `mere` declares a mere relation — Bunge's B̄, a relation that is not a bond, which exists only in the editing model and never projects.

The quantity clauses (#216, C1/C4) follow the label, in canonical order: `substance water amount 1.5 unit "ML/mo"`. Each is independently omittable; each is a structural attribute of the edge, not dynamics — the test is that none varies during a run. **Where `amount` acts, stated once so nobody decorates:** on a flow originating at a `source` it is the absolute emission rate (per `time unit`); on a flow out of a component it is a *relative weight* for that node's fanout split — the absolute outflow of a stock is set by its release behavior, not by the edge. An amount on a single-outwire process edge is therefore inert, and authoring one is claiming something the run will not honor. Three rules the parser enforces rather than defaulting around: a non-positive or unreadable `amount` is a parse fault (the language refuses what it cannot mean — the same rule that will govern the #112 `param` clause); a quantity clause on a `mere` relation is a contradiction and refused (a non-bond never projects, so a magnitude on it could never mean anything); and *omitted is not 1* — an unauthored amount stays unauthored in the model, and only projection conflates it with the kernel's default. `weight <n>` (#67) trails: a non-negative integer transition count for the Klir DTMC read, uniform 1 when absent.

**`ample` (#9)** takes the amount slot and asserts *availability* instead of a magnitude: the signal is present and never the binding constraint. It was discovered by llm-market, where the only way to say "released weights never limit serving" was `amount 100000 unit avail/day` — a magic number leaked into the diagram by the grammar's lack of the word. Ample is not a quantity, so everything quantity-shaped beside it is refused: `ample` with `amount` is a contradiction; `unit` on an ample flow measures nothing; a `mere` relation cannot carry it (nothing that never projects can assert availability); and only an `: informational` flow can be ample — information copies freely, so "never binding" is a coherent claim there and nowhere else (matter and energy are metered). A `param` (§4.5) cannot anchor an ample flow — there is no magnitude to adjust. Engine semantics (held by the bert-compose equivalence test): an ample wire delivers **zero quantity** and instead holds availability gates open — Amplifying's `min(signal·gain, power)` selects power exactly as it would under an absurdly large metered signal, and Modulating/Buffering control gates read fully open. Run surfaces render the word, never a number.

### 4.5 `param`

A declared parameter (walkthrough #18): a domain name over an already-declared amount, so run surfaces can speak the model's own vocabulary ("Developer demand") instead of the kernel's mechanism taxonomy ("drivers · absolute rates"). Two forms:

`param "Developer demand" : flow "Developer workload" -> "Developer clearing" range 0..12000` names one flow's declared amount. The optional quoted label after the endpoint pair disambiguates when several flows run between the same pair (naming an ambiguous pair without it is a fault, with the candidate labels listed). The optional `range <min>..<max>` declares inclusive slider bounds in the flow's own unit — the author's statement of the sensible span, never engine-enforced; `min` must satisfy `0 <= min < max`, and a declared amount lying outside the range is a parse-time contradiction and refused.

`param shares "Developer market share" : from "Developer clearing"` names a component's whole out-fanout of declared amounts, to be presented as % shares. `from` must name a component (environment internals are opaque) with at least two outgoing declared amounts — a "split" of one thing is not a split. Normalization is presentation only: the model keeps raw weights (§4.4's fanout semantics are scale-free), and a share edit edits exactly one raw weight.

**A param stores no value** — the value IS the anchored declared amount, which is why every anchor that resolves to nothing adjustable is a fault rather than a bag: an undeclared endpoint, a flow with no `amount` (the repair is named: add one), a `mere` relation (already excluded by §4.4 — a non-bond cannot carry an amount). Param names are unique per file — they are the stable references scenario overrides (#202) will hold. **Params never project**: `project()` ignores them entirely, so a model with and without its `param` lines projects byte-identically. They are presentation semantics carried by the canvas model, serialized skip-if-empty so pre-existing files are byte-identical. Params must appear after the flows they anchor (the single-pass discipline of §4.3 — declare before reference — applied to flows).

This clause is **not** the #112 typed-parameter territory (§8.2): those are the transition functor's own parameters (initial state, process constants), whose *types* await the functor decision. A `param` names a structural amount the grammar already carries; it adds vocabulary, never dynamics.

### 4.6 `metric`

A declared metric (#203): a domain name over a computed **output** of the run — the output twin of §4.5. A param names an input knob in the model's vocabulary; a metric names what the author wants to watch come out, so a run answers the author's questions first ("DeepSeek dev share") and the kernel-fidelity readouts second. Two verbs:

`metric "DeepSeek dev share" : share of flow "Developer clearing" -> DeepSeek` reads the anchored flow's executed per-tick delivery as a fraction of everything leaving its source that tick. The optional quoted label after the endpoint pair disambiguates same-pair flows, exactly as in §4.5. The source must have **at least two outgoing flows** — a share over a single outflow is identically 1, and a metric that cannot vary watches nothing (the separating-instance rule: a declaration nothing could falsify is refused, not rendered). Share is deliberately named as a *produced* observable: when an allocation becomes endogenous (#269), the same declaration reads the produced result with no rewrite.

`metric "Opus tokens served" : sum into Opus` reads everything arriving at the named thing, per tick, plus the run-end cumulative. The thing must have **at least one inflow** — a sum over none names a value the run never produces. Inflows carrying mixed units refuse at evaluation (their sum names no quantity).

**A metric is a derived reading, never a new source of truth.** Evaluation is arithmetic over the recorder's executed per-flow series (`RunResultRich.flows` — the circuit's own per-tick `wire_history`); a metric can state nothing the trace does not carry, and it carries the trace's provenance. Metric names are unique per file — they are the stable references scenario comparisons (#202) will hold. **Metrics never project**: like params they are presentation semantics on the canvas model, serialized skip-if-empty, appearing after the params block in canonical form. Declare after the things and flows they reference.

**The verb set is closed, and grows one verb at a time** (ADR 0006). When a model asks a question these verbs cannot state, the answer is a new verb with its own separating instance and its own row here — never an open expression grammar. A ranking is deliberately not a verb: the run deck orders any same-verb family by endpoint, which delivers the leaderboard as a *view* of declared metrics rather than a third thing to specify.

### 4.7 `boundary`

At most one per file: `boundary porosity 0.7 fuzziness 0.1`. Key-value pairs in any order, either omittable; values are the root membrane's P. Absent line = unauthored (0.0, the kernel default).

### 4.8 `time unit`

At most one per file: `time unit h`. The model's time-unit symbol (#94) — what one unit of model time is called, landing in `CanvasModel.time_unit` and projecting to `WorldModel.time_unit`. The symbol is a name token (bare or quoted). It is display vocabulary, never a rescaling: Δt stays the pure number the run surface supplies; the symbol names what that number counts, so an undeclared kW-fed stock displays `kW·h` instead of the abstract `kW·Δt`. Absent = undeclared (the kernel never invents a symbol). An empty symbol is a parse fault.

### 4.9 `level`

At most one per file: `level Structure`. The model's declared Klir epistemological level (#288) — the author's claim about where on the epistemological hierarchy (*Facets* §4.5: source → data → generative → structure → metasystem) this model stands, landing in `CanvasModel.klir_level`. The five values are Klir's own words, keyword-case-insensitive like everything else, emitted in the canonical capitalization shown. A second `level` line and an unknown value are faults.

The declaration matters because of what Klir says about the hierarchy: "the modeling relation can be defined only within each particular epistemological category of systems" (§5.4). Comparing two models across declared levels is therefore *undefined in his framework*, and the kernel refuses it with that sentence as the printed reason (`lenses::check_cross_level`) — faithfulness, not strictness. The refusal reads only declared claims: a model with no `level` line compares exactly as it did before the word existed, so the declaration gates a claim, never an absence. Like the §4.3 Klir metadata, the level is authored canvas-side and read in the Klir register only — it never projects, so no systemhood verdict depends on it (C2). It is the *declared* counterpart of the Klir register's derived GSPS position (the letter-string diagnostic): the diagnostic reads what the model honestly contains, the level reports what the author asserts it to be, and daylight between the two is a finding rather than an error.

### 4.10 Errors

Parsing collects **all** faults in one pass and reports each with its 1-indexed line — never a first-error-only bail, and never a guess. Fault classes: lexical (unterminated quote), unknown keyword, malformed clause, duplicate name, undeclared flow endpoint, redeclared singleton (`system`/`domain`/`time unit`/`level`/`boundary`), an unknown level value, attribute on an environment thing, unstamped or malformed decomposition reference, `decomposes` on an interface component, duplicate `decomposes`, duplicate `stock`, duplicate or malformed Klir metadata clause (`scale`/`states`/`kind` — an unknown scale or kind value, a malformed state set), out-of-range `@directed`, malformed known annotation, the §4.5 param faults (unresolvable or ambiguous anchor, amountless anchor, degenerate or contradicted range, shares without a >=2 component fanout, duplicate param name), the §4.6 metric faults (unresolvable or ambiguous anchor, share over a single-outflow source, sum into a thing with no inflows, duplicate metric name), and the §4.4 ample faults (beside `amount`, with a `unit`, on a `mere` relation, on a non-informational kind). The ACE/Gherkin discipline — deterministic parse, fail loud on anything ambiguous — is inherited deliberately.

**These are *parse* faults, and they are not the only way a model is refused.** A file can parse cleanly, compile to a model (§5.3), and still be refused by the kernel when a lens is entered — that refusal is the kernel's job, not SL's (§5.1), so it is deliberately absent from the list above. The list is complete for what the parser rejects and is not a map of every way a model can fail. §5.4 names the one class where a *word in this language* now carries an obligation the parser cannot check.

## 5. Semantics

*Status: normative.*

### 5.1 What a compiled model means

A parsed file denotes exactly one `CanvasModel`: things and relations in declaration order with sequentially assigned ids, the boundary and type assertion as written, view state per §6. What that model *means as a system* is not SL's to say: meaning is delivered by the kernel — `project()` compiles it to a `WorldModel`, `validate_mode` gates it at the active lens (Klir→Core, Bunge→Structural, Mobus→Operational), and the lens palettes render its formal object. SL is a notation for the model, not an authority over it (C2).

### 5.2 `source`, `sink`, `environment` — author intent, edge-derived identity

All three words compile to `Role::Environment`. The distinction they express — where flows originate and terminate — is *derived from the drawn bonds*, not stored: `project()` makes an environment thing a Source if it originates a bond, a Sink if a bond merely touches it, and omits it (an orphan) if no bond does. This is the Lean-proven canon from SL v0.1's own migration note (edge-derived role supersedes the stored `ExternalEntityType`). Consequently the three words are author-intent sugar: `source X` followed by flows *into* X is not a parse error — the kernel's reading simply differs from the label, and the canonical serializer (§7.1) rewrites the word to the kernel's reading. The text you get back tells you what you actually drew.

### 5.3 Compilation is total on parse success

A file that parses always yields a model — including a structurally *illegal* one (e.g. a self-loop, which the Operational gate rejects). This is deliberate and matches the canvas: authoring states are routinely mid-thought, and the verdict pill / audit panel carry the kernel's issues live. SL does not gate compilation on validity; it gates nothing (C2).

### 5.4 `interface` is a claim the kernel checks, not a label the parser accepts

Most words in the lexicon (§3) name a distinction the parser can settle on its
own. `interface` no longer does. Since the 7/25 interfaces sweep
([#213](https://github.com/halcyonic-systems/bert-lenses/issues/213),
[#223](https://github.com/halcyonic-systems/bert-lenses/pull/223),
[#225](https://github.com/halcyonic-systems/bert-lenses/issues/225),
[#228](https://github.com/halcyonic-systems/bert-lenses/pull/228)) a **flowless
interface is ill-formed**, and two kernel checks enforce it — both **Error, at
Operational and Full only**:

- `check_interfaces_carry_flow` asks a **graph** question: does any
  boundary-crossing flow touch this interface? Mobus's I is functional, not
  positional — an interface is a component that *transports a flow across the
  boundary* — so one that transports nothing is a mislabelled component. It
  mirrors the Lean structure field `MobusSystem.interfaces_carry_flow` (SSF #31),
  the converse of `bipartite`, which only ever quantified over edges.
- `check_interface_declarations_match_flows` asks a **consistency** question:
  does an interface's own declared `receives_from`/`exports_to` agree with the
  interactions the model records? Neither check subsumes the other — a model
  satisfies the first and violates the second whenever an interface with a real
  crossing flow declares an `exports_to` naming a different sink than the flow
  goes to.

Core and Structural stay silent: Klir and Bunge carry no interface concept, so a
stamp without its flow is not yet a claim either lens can read.

**This changes nothing in the grammar.** `component X interface` parses exactly as
before, compilation stays total on parse success (§5.3), and a half-drawn model
that has stamped the interface before drawing its flow is a normal authoring
state, not a parse error. What changed is that the word now *asserts* something
checkable, and the assertion is checked where every other systemhood verdict is —
in the kernel, on lens entry.

## 6. The annotation layer

*Status: normative; the "why a section, not a second file" defense is rationale (argued, adopted).*

Annotations are `@`-prefixed lines, conventionally last in the file. Three are defined; unknown annotations are *skipped, not errors* — the ignorable contract that lets future view-state vocabulary degrade softly in old parsers. Malformed instances of a *known* annotation fail loud (§4.10).

**Why a section, not a second file.** The semantic requirement is only that presentation not contaminate meaning (C4), and a marked section satisfies it as fully as a separate file: the structure-lines diff is clean either way. Given that, one artifact wins — a model is one pasteable, reviewable, portable thing. Modelica made the same call (layout inline as `annotation(…)`, semantically null, preserved on save); SVG/HTML keep style separable but co-located. Decided for v1; recorded in the 2026-07-18 session log.

### 6.1 `@pos name x y`

Pins a thing's pixel position. Things without `@pos` are placed by the deterministic auto-layout: components on an inner N-gon (a single component at the center), environment things on an outer ring, both in declaration order — same text, same picture. Positions are view state; no verdict reads them.

### 6.2 `@lens klir|bunge|mobus`

Pins the active lens. The lens is a *reading* of the model, not a property of it — every model is a valid Core model regardless. Accordingly `compile_sl` reports whether the text pinned a lens (`lens_explicit`), and the reference UI preserves the author's current lens when it did not; the parser's own default (Mobus) applies only when there is no current lens to preserve.

### 6.3 `@directed n`

Marks the *n*-th declared flow (1-based) with Klir's observer orientation toggle — "directed systems" add an orientation the observer commits to (Facets Ch. 4); the kernel's dependency relation is ordered regardless, so this changes what the Klir lens *shows*, not the model. Exists so a serialized model loses no view state.

## 7. Serialization and the round-trip contract

*Status: normative (golden-tested, `tests/sl_roundtrip.rs`).*

### 7.1 Canonical form

`emit_sl` writes a model as: `system` / `domain` / `time unit` / `level` lines; thing lines in `things` order (environment words edge-derived per §5.2 — the emitted word is the kernel's reading); `flow` lines in `relations` order; `param` lines then `metric` lines in declaration order (the input/output twins read together, §4.5–4.6); `boundary` if authored; blank line; `@lens`; `@pos` per thing; `@directed` per directed flow. On a thing line the attributes emit in a fixed order: `primitive`, then `interface`, then `stock` (component lines only), then the Klir metadata — `kind`, then `scale`, then `states` (#154; the one attribute group environment lines also carry), then `decomposes` last (component lines only; the reference, quoted label plus `@`-id). Names emit bare when they read as identifiers and shadow no *reserved* word, quoted otherwise. The reserved set (`RESERVED_WORDS`, `sl.rs`) is §4's position-free keywords; the position-bound words — `param`, `metric`, `ample`, `range`, `shares`, `from`, and the metric verb words `share`/`of`/`sum`/`into` — and the `@lens` values never occupy a slot a name can reach, so a name matching one of them stays bare and still re-parses as itself. That the two lists together are exactly §4's terminals is held by `tests/keyword_parity.rs`. Floats emit via shortest-round-trip decimal representation, so re-parsing recovers them bit-exactly.

### 7.2 The contract (golden-tested)

Two guarantees, distinguished honestly (`tests/sl_roundtrip.rs`):

- **SL-born models: identity, digit for digit.** For any model produced by parsing (things-first declaration order, hence sequential ids), `parse(emit(m)) = m` as JSON — every field, including positions. Text-level: `emit(parse(t))` is a fixpoint after one pass.
- **Arbitrary models: canonicalization.** A canvas-born model may carry gap ids and interleaved authoring history; ids are machine mechanics, and names are the text surface's identifiers. The guarantee is `emit(parse(emit(m))) = emit(m)` — one pass lands in canonical form, and the canonical text is stable. Structure, names, kinds, bonds, positions, and view state all survive; only internal id numbering is normalized.

### 7.3 Unrepresentable shapes

`emit_sl` refuses loudly rather than lose information silently: a name or label containing `"` or a newline, and a `system_type` with genus but no kingdom, are errors. A third refusal since #216: a thing carrying the opaque engine-parameter maps (`cognitive_params` / `initial_state`, which the canvas carries so a loaded model's dynamical content survives, but which SL has no production for until [#112](https://github.com/halcyonic-systems/bert-lenses/issues/112) chooses the transition functor) cannot be written down without narrowing, so emit refuses and names the JSON export as the lossless path. Nothing else in `CanvasModel` is outside the language. One asymmetry is accepted knowingly: `primitive`/`interface` on an *environment* thing (expressible in JSON, semantically inert — the kernel ignores both) is dropped on emit rather than round-tripped.

## 8. The structure/dynamics boundary

*Status: rationale (argued, adopted). §8.1 argues the departure from Mobus; §8.2 adopts the forward position from `dynamics-principled-position.md`. The C5 boundary it defends is normative.*

*This section adopts `docs/design/dynamics-principled-position.md` (ADOPTED); that document is the single source of truth for the dynamics-record definition, and §8.2 references it normatively rather than restating it.*

### 8.1 The departure from Mobus, argued

Mobus's answer to "how does a model carry dynamics" was embedded scripts: "Behaviors or dynamics are implemented using embedded scripts… transformations (T in Eq. 4.1) are expressed in transfer functions or simulation programs" (§4.4.1.2.3), inside a sysXML sketch he himself frames as "playful exploration" with "research… continu[ing]" (§4.5). SL rejects the mechanism while keeping the theory, and the rejection is not taste:

1. **It is not the theory's mandate.** T's formal definition — "any suitable form, such as… formula, equation, or algorithm" (§4.3.3.4) — is implementation-neutral. The narrowing to scripts happens in prose about one candidate description language, not in the tuple's mathematics. Rejecting embedded JavaScript rejects an engineering guess Mobus hedged, not a theorem.
2. **Embedded scripts destroy checkability.** A script is opaque to every validator: the semigroup contract, conservation ledgers, mode-transition witnesses, and the Lean structural theorems can say nothing about arbitrary code. The premise of this tool — a deterministic kernel owning truth — dies at the first `eval`.
3. **Declaration subsumes the need.** Everything a per-element script legitimately expresses is expressible as declared data: a rate constant, a transfer-function family name plus parameters, a transition table, a distribution plus seed.

SL v0.1's §4 made the complementary error at the spec level: it named its runtime (System→Mesa agent classes, Bevy ECS targets, tick-modulo stepping). That coupling was the old headache, and it is the second thing this boundary is built to prevent: **SL never names a simulator, and no simulator's shape leaks into SL.**

### 8.2 What SL declares if it ever gains dynamical syntax

§8.2 adopts the declaration model of `docs/design/dynamics-principled-position.md` (ADOPTED); the position doc is the single source of truth for the dynamics-record definition. In brief: an SL model never contains a simulator — it **declares** a dynamics record per system whose fields are the support, the carrier (state space), the kind (transition functor), the invariants (conserved quantities and bounds — where conservation lives), and the rates/parameters of a named transfer-function family; engines interpret those declarations and are separately verified against the semigroup contract.

Four consequences the position doc establishes, recorded here so future SL versions do not regress:

- **Conservation is an invariant the model declares, not one the engine assumes** (axis D of the dynamics taxonomy). The compose conservation engine is the *first interpreter of one declarable kind* — Id-functor, ℝⁿ carrier, additive conserved invariant — not the meaning of Run. An SL dynamics record must therefore treat conservation as one optional declaration among several, or it bakes in exactly the special-case-as-category error the research dismantled.
- **H is a record, never an input to T** (three-tradition convergence: Willems, Bertalanffy, Mesarovic–Takahara). Any history-dependence belongs in the carrier; SL will never grow syntax that feeds H back into a transformation.
- **Δt is honored: `amount` is a rate per unit time, and the engine delivers the rate reading (#258/#259, closed 2026-07-27).** Generated fluxes scale by Δt, forced series index by model time (a channel's own Δt is `dt_stride ×` the model's time unit), and wires transmit within the step — **wires transmit, stocks remember** — so the same file over the same horizon produces the same totals at any step size. The invariant is held by `crates/bert-canvas/tests/dt_invariance.rs` (green, with its refutability re-proven by `scripts/mutation_check.py`). Two riders: under Mobus §4.3.3.6 Δt remains a level-indexed *declaration*, not a free refinement knob — the gate checks dimensional coherence, not numerical convergence — and a wiring loop containing no stock or level read is **refused** at the run seams (a loop of pure relays has no deterministic step), never silently granted a per-step delay.
- **A run advances over a positive, finite slice, or it is not a run** (position doc §4 rule 3). A slice of zero is not a small step, it is not a step: it defines no transition, so there is nothing to record and the run is refused. If SL ever gains syntax for the support, a declared step of zero or a non-finite horizon is a refusal at the language level too, not a value an engine is expected to cope with.
- In v1, the sanctioned path for dynamics is the tether/run-manifest (data + forcing, separately authored); the run is the machine's job. What is lost, stated honestly: the expressiveness of arbitrary protocol logic per element. That loss is the price of a checkable language, and it is paid knowingly.
  - **Scope of that path, narrower than it reads.** The tether carries *forcing and comparison*, not parameterization. Only `Role::Flow` columns with `force: true` inject values into a run; `Role::Stock` and `Role::Param` columns are read for empirical-versus-simulated comparison and inject nothing. The manifest therefore cannot set an initial stock or a release rate, and was never able to. This is the right division of labour and should stay: a **parameter** is a property of the model's design and belongs inside it, while **forcing and empirical data** are facts about the world and belong outside it.
  - **A bypass exists, and it is a defect rather than a second path (#216).** `bert-compose`'s exporter writes `AgentModel.initial_state` and `cognitive_params` directly as JSON, around SL, around the canvas, and around the manifest. Every quantity in the three original demos (reservoir, homeostat, allocation) arrives this way — the two SL-authored demos (watershed, supply-chain) do not cross it: their models are machine projections of their `.sl` files, held to that by `crates/bert-canvas/tests/sl_demos.rs` — and the canvas discards both maps on load — which is why a demo round-trips into a *different system* while still reporting `conserved=true`. It is named here because a spec describing a boundary the shipped artifacts cross is the silent failure: nothing breaks, the document just stops being true. It is **not** hereby sanctioned; closing it is a defect fix, not a spec revision.
  - **What closes it.** Those two maps are untyped `HashMap`s because nothing has yet decided what the transition functor is, and a functor's parameters cannot be typed before the functor is chosen — that decision is [#112](https://github.com/halcyonic-systems/bert-lenses/issues/112)'s subject. Note the corollary, which cuts the other way: flow **amount**, **unit**, and **substance name** are already typed fields on `Interaction` and are *not* blocked by #112. They are structural attributes of an edge — they do not vary during a run — and their absence from §4's grammar was the reason no SL-authored model could emit at any rate but 1.0. **Paid 2026-07-27 (#216 Wave 4):** §4's flow production now carries all three, the canvas relation keeps them, and the demo round-trip test (`canvas_round_trip.rs`) holds the seam closed — leaving `initial_state` / `cognitive_params` as exactly #112's remaining scope.

## 9. Worked examples (the golden corpus)

*Status: normative — the three examples are the round-trip goldens, so their behavior binds.*

The three corpus files are committed at `fixtures/sl/` and are the round-trip goldens; all three parse, emit, re-parse identically, and project clean at Core mode.

### 9.1 Process M (`process-m.sl`) — Mobus's own paragraph

Mobus's verbal exemplar: "Process M takes in materials A and B from sources 1 and 2 along with energy E from source 3 to make product Z with waste product X going to sinks 5 and 6 respectively" (§4.3.1). In SL, each clause becomes one line:

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
```

With v1.1 (#84), "Process M" is finally the *system's* name, as in Mobus's own sentence; the lone component is its combining work process. What the paragraph carries that SL still does not: the efficiency figure — a process parameter in the §8.2 sense, waiting on #112's `param` clause. The rate refinement ("one mass of delivery each 24 hours") stopped being an example on 2026-07-27: `amount 1 unit mass/day` is now a flow clause (#216, C1), because a rate that does not vary during a run is a structural attribute, not dynamics.

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

*Status: informative.*

**Mobus, Ch. 4 (2015/2022).** SL inherits the load-bearing insight — one definition, three coequal views (verbal, graphical, mathematical; §4.3) — the ontology-drawn lexicon, the system-paragraph as the verbal form, and the syntax-as-structural-legality doctrine (§4.4.1.3). It sheds his sysXML/XML serialization (the neutral spec's JSON already fills that role), his embedded-JavaScript behaviors (§8), and the 7-tuple's folding of E into G — the machine-checked authority is the 8-tuple with E first-class (`Tuple.lean`; E-as-first-class is the Lean formalization's improvement on the printed tuple, credited as such).

**BERT SL v0.1 (`bert/docs/system-language-spec.md`).** The prior spec in this lineage: a publication-grade lexicon and grammar *for the data model* — 40 concepts, ID encoding, the four Lean coherence constraints (its §2.6), edge-derived source/sink roles (its §1.2 migration note, adopted here as §5.2). What it lacked is exactly what this spec adds: a human-writable concrete syntax; v0.1's "speakable" mode was natural-language-to-model via chat, not a notation a person writes and diffs. Its §4 execution mapping (Mesa/Bevy) is shed per §8.1.

**SL v2.0 addendum (`system-language-spec-v2-addendum.md`).** Contributed the kernel re-founding (the 8-tuple as a generated view over a proven kernel) and the mode lattice; its mode-declaration *surface syntax* stayed cut — in bert-lenses, modes are the three lenses, view state on the neutral spec, which is why `@lens` is an annotation and not a structure line.

**SysML v2 (formal/2026-03-02) — the architecture precedent, and the ontological foil.** SysML v2 Part 1, the language specification, was formally adopted in March 2026 (*OMG Systems Modeling Language, Part 1: Language Specification*, formal/2026-03-02, 691 pp). It is the standards-body validation of the architecture SL inherits: one abstract syntax, concrete syntaxes as projections of it, the textual notation privileged because it maps losslessly while a diagram is a partial projection, semantics anchored in a kernel artifact (their KerML plus a semantic library; here the kernel plus `Tuple.lean`). It is also the exact inverse of C3. §7.1 states outright that the language carries no construct named system, subsystem, or component — "An entity with structure and behavior in SysML is represented simply as a part" — with domain terminology supplied through user-defined metadata (§7.27). SL's lexicon is the opposite commitment: every word names a kernel-licensed ontological distinction and nothing else (§3, C3). SysML v2 is ontologically agnostic by design, and correct for its job of building engineered systems; SL is the ontologically committed counterpart, for studying systemness. Primary cites: §7.1 and Figure 1 (§6.1). The audience and interoperability consequences are drawn out for readers in the language README's "Why SL, and when SysML" section (#99).

**Precedents** (research and verification marks in `docs/design/sl2-authoring-language.md` §4): SysML v2 (formal/2026-03-02) for the architecture — text and diagrams as projections of one abstract syntax, text privileged because it maps losslessly (the ontological contrast is drawn out above); Modelica for one-artifact/two-concerns (§6); Stella for the bar the tool clears — two coequal views of one model with a live validity signal; Quint for approachable-surface-over-fixed-semantics via a deterministic transpiler; ACE/Gherkin for the fail-loud parse discipline; gpt-jargon as the negative control (C1). For the dynamics boundary: Petri-net P-invariants and CRN conservation laws as the prior art for invariant-on-structure independent of the transition rule — the position §8 applies is their pattern, cited as lineage, not a rediscovery.

## 11. Known gaps and v1.1 candidates

*Status: informative (roadmap; the honesty mechanism in place of a conformance clause).*

| Gap | Tracked | Direction |
|---|---|---|
| ~~No root-system name~~ shipped as v1.1 | #84 (closed 2026-07-18) | `CanvasModel.name` → `system "Name" [: type]` — see §3, §4.1 |
| ~~No decomposition / sub-paragraphs~~ decompose-by-reference shipped (step 4) | #89 (step 4 merged 2026-07-20) | `decomposes "label" @id` → `System.child_model` — see §3, §4.3, §7.1; the reference form keeps each file one flat paragraph, the recursion in the id index |
| ~~No Klir source-system variable characterization~~ shipped as v1.2 | #154 (landed 2026-07-24; spec caught up 2026-07-31 — the words shipped ahead of this document, the drift the keyword-parity gate now makes impossible) | `scale` / `states` / `kind` → `Thing.scale` / `.states` / `.variable_kind` — see §3, §4.3, §7.1 |
| ~~No declared epistemological level~~ shipped as v1.3 | #288 (landed 2026-08-08, spec and parser together — the discipline #154's drift taught) | `level` → `CanvasModel.klir_level` — see §3, §4.9, §7.1; the cross-level refusal is `lenses::check_cross_level`, printing Klir §5.4 |
| `interface` + `decomposes` refused together (v1) | #89 | The Lean contract covers a component's internal network only; when it grows the membrane-crossing case (flows through an interface component) the co-occurrence becomes legal and the `interface`/`decomposes` emission order (§7.1) gets revisited |
| No controlled systems-English tier (the verbal surface proper) | design doc §5 Rung 2 | Fixed-grammar system-paragraph parsing to the same neutral spec |
| Compiled diagram can land partly off-viewport | #83 | Zoom-to-fit after compile (UI, not language) |
| Empty text compiles to an empty model silently | session log 7/18 | Possibly a nonempty gate or confirm in the pane (UI, not language) |
| `Kind` (5 values) collapses to 3 substances under `project()` | `canvas.rs:64` | Not an SL defect — Kind survives the text round trip; noted for any WorldModel-mediated path |
| No dynamics declarations | §8 | If ever: the §8.2 record, never scripts, never a named simulator |
