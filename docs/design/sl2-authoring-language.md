# SL 2.0 — A Language for Authoring System Models in bert-lenses

**Status: RESEARCH** (2026-07-18). The research foundation behind [`language/spec.md`](../language/spec.md) (LIVE); Rungs 1–3 shipped 2026-07-18 via [#82](https://github.com/halcyonic-systems/facets/issues/82), and this doc's 8 open questions remain closeable work. No supersession.

*Research & first-principles foundation. Research + design only — NO implementation. Written 2026-07-18 as the foundation for a deliberate first rung, companion to `llm-integration-research.md` (which owns the LLM-assist story this doc leans on) and `lens-palettes.md` (which owns the graphical surface). The question, in Shingai's framing: "from first principles, what is the minimal and most elegant way to have model specs that can be authored in words, or graphics, or formal syntax — that compile into live bert-lenses models? What do we keep, what do we shed, what is the fastest path to an MVP that has all the qualities of a systems modeling language like Stella?"*

*Mobus SL claims are cited to `operations/systems-science/mobus/4-a-model-of-system.md` by line. Web precedent claims are marked **VERIFIED** (primary source fetched) or **UNVERIFIED**.*

---

## TL;DR (the one page)

1. **The elegant answer is SysML v2's answer, and the substrate already holds it.** Words, graphics, and formal syntax are **three concrete syntaxes over one neutral abstract spec** — not three formats to keep in sync. That neutral spec already exists in the repo: `CanvasModel` (`bert-canvas/src/canvas.rs:165`), which is kernel-shaped (things + typed relations + boundary + type assertion). "Author in three surfaces" = "parse three surfaces into one `CanvasModel`; render it three ways." The compile step is the *existing* deterministic `project()` / `toCanvas` path. SL 2.0 is mostly a **new surface** (text + words) over an abstract syntax and a compiler that both already ship.

2. **The compile step is a compiler, never an LLM — and this is the settled non-negotiable.** An LLM may help a human *write* a spec (§4, `llm-integration-research.md`), but spec→model is deterministic and traceable. This is the same discipline as "never hand-author JSON; meaning once, mechanics by machine" — the spec is the "meaning once" surface; the compiler is the "mechanics by machine." gpt-jargon (LLM *is* the interpreter, every run) is the **negative control**, quoted directly in §4.

3. **Mobus's SL spirit, distilled: three coequal views of one definition, a lexicon drawn from the ontology, syntax enforced by structure not grammar.** He states it at `4-a-model-of-system.md:154` ("three complimentary forms: verbal, graphical, and mathematical … views of the system definition"). SL 2.0 inherits the *spirit*; it sheds his proposed *execution* (sysXML/XML serialization, embedded-JavaScript behaviors, knowledgebase-first pipeline) for the kernel-native path the repo already has.

4. **The minimal neutral spec sheds two things `CanvasModel` currently carries: pixel positions and the active lens.** Per intermediate-spec-neutrality (neutral = kernel-shaped; rich/view detail = lens-format layer), positions (`x`,`y`) and `lens` are *view state*, not model content — Modelica's exact trick (one artifact, semantics + layout, layout as non-semantic annotation) and SysML v2's exact split (abstract syntax = truth, diagram = projected view). The neutral SL-spec is `{things, relations, boundary, system_type}`; layout + lens live in a view/annotation layer the compiler ignores for systemhood.

5. **The MVP that clears Stella's bar is a *text surface over the same model the canvas already edits*, giving the map/equation duality.** Stella's power (VERIFIED) is two toggleable views of one model — draw structure, then complete semantics, with live validity flags. bert-lenses already has the graphical view and the live validator; the smallest thing that makes it feel like a modeling *language* is a second surface (formal text) that round-trips bidirectionally with the canvas through the neutral spec. First rung = **SL-text ⇄ CanvasModel serializer + a text pane beside the canvas.** Everything compiles through the existing `project()`.

6. **Then words, via the propose-tap posture, not a new interpreter.** The verbal surface (Mobus's system-paragraph, `:158`) has two honest tiers: a *controlled* systems-English that parses deterministically (ACE/Gherkin precedent — fail loud on ambiguity), and *free* NL that routes through GSR `/extract` to produce a spec the author reviews and accepts (germen's draft→verify→accept; already the LLM-integration plan). Free NL never writes the model — it drafts the *spec*, which is still deterministically compiled.

7. **What to reuse, not build:** the abstract syntax (`CanvasModel`), the compiler (`project`/`toCanvas`), the validators (`validate_mode`, #66 graph checks), the LLM-assist seam (GSR `/analyze`, `/extract`), germen's five-part-response + coverage-dial instrumentation, and the deterministic `bert-generator-core` repair pipeline (the "author specifies intent, generator computes IDs/positions/wiring" contract — `bert/docs/generator.md`). SL 2.0 is a thin new front-end on a stack that is ~80% built.

---

## 1. What Mobus's SL was meant to be (spirit, distilled) — and the fidelity criteria SL 2.0 inherits

Mobus devotes Chapter 4 to arguing that a *language of systems* is possible because humans already think in one ("systemese," `:101-140`): the lexical atoms of thought are system primitives (source, sink, flow, boundary, interface, stock, process), and syntax is their innate composition rules. SL is the project of making that implicit language explicit and machine-usable (`:120`, `:142`). Three claims matter for us; the rest is cognitive-science scaffolding.

**Claim 1 — three coequal forms of ONE definition.** "The definition is given in three complimentary forms: verbal, graphical, and mathematical. All three forms provide views of the system definition that provide access to stakeholders from different backgrounds" (`:154`). This is the load-bearing sentence. He does **not** propose three languages; he proposes three *views* of one underlying formal object (the tuple at `:196`). That is precisely the "three surfaces over one spec" architecture, stated in 2015.

- **Verbal** (`:156-160`): "The lexicon of SL is taken from the primitive and derived elements in Chap. 3." The worked form is the *system-paragraph*: "Process M takes in materials A and B from sources 1 and 2 along with energy E from source 3 to make product Z with waste product X going to sinks 5 and 6 respectively, at an efficiency of 68%" (`:158`). A description is "a paragraph of such statements"; decomposition adds sub-paragraphs (`:158`, `:160`). This is a *controlled* language — lexical elements act as typed placeholders (`:160`).
- **Graphical** (`:169-175`): "SL provides a graphical way to express systems. This has actually been done in most modeling languages such as Stella … and SysML" (`:171`). His vision for the tool: "a drag-and-drop graphic user interface that would allow them to do the analysis and capture the data in a user-friendly manner" (`:175`), with an icon palette (`:513-515`, Fig 4.13 at `:356`).
- **Mathematical** (`:177-196`): the tuple `S = ⟨C, N, G, B, T, H, Δt⟩` (`:196-198`) — the book's 7-tuple, environment folded into G. "We will not be doing math as much as using math" (`:194`): the structure is a container for holding a system description, not an object to prove theorems about.

**Claim 2 — the lexicon comes from the ontology, and syntax is enforced by structure.** "The syntax of SL is two-dimensional. The structure of a system being described is governed by the mathematical definition given above. The syntax determines that, for example, a flow must come from a source and go to a sink … There are no other options … Everything is determined a priori by the ontological commitments" (`:554-556`). SL has **no free grammar**; legality is a property of the typed structure, checked against the definition. This is exactly bert-lenses' invariant — the kernel decides legality, the surface never does (`README.md`, `theory-fidelity.md`).

**Claim 3 — SL is a *description* language, closer to markup than to a programming language.** "SL is a 'description' language … used to describe structures, relations, functions … different from a typical programming language, which is designed to describe algorithms" (`:507-509`); "has more in common with … HTML, or more correctly with … XML" (`:558-560`). Behaviors are handled by *embedded scripts* (JavaScript) attached to elements (`:533-535`), and the serialization he sketches is "sysXML" (`:560`, listings at `:583+`).

**The fidelity criteria SL 2.0 inherits** (from Claims 1-2; Claim 3's *execution* is shed in §3):

| # | Criterion | Source |
|---|---|---|
| F1 | Verbal, graphical, and formal are **coequal views of one definition**, not three artifacts to reconcile. | `:154` |
| F2 | The lexicon is **the ontology's primitives**, not invented syntax — source/sink/flow/boundary/interface/component/stock/process, typed by substance (Material/Energy/Message). | `:156-158`, `:503-505` |
| F3 | **Syntax is structural legality**, checked against the formal definition — "a flow must come from a source and go to a sink … no other options." | `:554-556` |
| F4 | The verbal form is a **controlled system-paragraph** with typed placeholders, refined by decomposition into sub-paragraphs. | `:158-160` |
| F5 | The graphical form is a **drag-and-drop palette** that captures data as you place icons, enforcing syntax. | `:175`, `:513-515` |
| F6 | Decomposition has a **stopping rule** (the "simplest process rule": a leaf is a component doing one atomic work process with no internal decision beyond its transform). | `:250-251` |
| F7 | Descriptions **start rough and refine** — a placeholder transform is legal; specification deepens with decomposition (top-down deconstruct, bottom-up refine). | `:158-160`, `:409-416` |

bert-lenses already satisfies F2, F3, F5 in the graphical surface (`lens-palettes.md`). SL 2.0's job is to add F1, F4, F7 by giving the *same* neutral model a verbal and formal surface, and to honor F6 in decomposition. Everything below serves that.

**One scope note the Lean forces (F2 correction).** Mobus's `:196` tuple is the book's 7-tuple with E folded into G. The repo's machine-checked authority is the **8-tuple** `⟨C, N, E, G, B, T, H, Δt⟩` with **E first-class** (`Systems/Mobus/Tuple.lean`; `lens-palettes.md:36-44`). SL 2.0's lexicon uses the 8-tuple: environment objects are first-class nouns, not a sub-part of external flow. Do not "correct" the tuple back down.

## 2. Three surfaces over one neutral spec — the elegant answer, tested

### 2.1 The architecture (and why it's the elegant one)

The question asks whether the three authoring surfaces are "three syntaxes over ONE neutral spec." **Yes — and that is both the elegant answer and the one the repo is already built for.** Three layers, borrowed from the two strongest precedents (SysML v2, Modelica — §4):

```
  SURFACES (concrete syntax)      words          formal text        graphics
  parse / render                    │                │                 │
                                    ▼                ▼                 ▼
  NEUTRAL SPEC (abstract syntax)   ┌──────────────────────────────────────┐
  the single source of truth       │  SL-spec  =  {things, relations,      │
  = CanvasModel minus view state   │   boundary, system_type}              │
                                    └───────────────────┬──────────────────┘
                                                        │  project() / toCanvas
  COMPILER (deterministic)                              ▼   (no intelligence:
  IDs · positions · wiring                       live bert-lenses model
                                                 (WorldModel; validated,
                                                  lens-described, runnable)
```

- **The abstract syntax is `CanvasModel` (`canvas.rs:165`) minus view state.** It already carries exactly the neutral content: `things` (with `role` = Bunge C/E, optional `primitive`, `interface` flag), `relations` (`a→b`, `is_bond`, `kind`, `klir_directed`), `boundary` (porosity/fuzziness), `system_type` (kingdom/genus/domain). This is kernel-shaped by construction — it is what the canvas already serializes and the kernel already validates.
- **The compiler already exists and is already deterministic.** `project(CanvasModel) → WorldModel` (in `bert-canvas`) computes IDs, endpoints, source/sink identity, endo/exo locus, boundary-component set — the same "author specifies intent, generator computes the mechanical rest" contract `bert-generator-core` documents (`bert/docs/generator.md:94-119`). No surface ever writes a `WorldModel` directly; it writes the neutral spec and lets `project` compile.
- **The surfaces are parsers/renderers, not authorities.** A words parser, a text parser, and the canvas all produce/consume the *same* `CanvasModel`. Adding a surface adds a `parse: Surface → SLSpec` and `render: SLSpec → Surface`; it touches no systems logic (that stays in `crates/`, per the repo invariant).

**Why this is elegant and not just convenient:** it makes the three surfaces *provably* consistent — they are the same object serialized differently, so they cannot drift, exactly as SysML v2 guarantees text/diagram equivalence by making both project from one abstract syntax (§4, VERIFIED). It reuses the compiler and validators wholesale. And it inherits the K≅2 property for free: the *lens* is a rendering choice on the neutral spec (Klir/Bunge/Mobus are three `describe()` views of one model), so "author in Mobus words, read as a Bunge diagram" is just two renderings of one `CanvasModel`.

### 2.2 What the minimal neutral spec is (and what it sheds from `CanvasModel`)

Per the standing intermediate-spec-neutrality decision (neutral = kernel-shaped; rich/lens-specific detail = lens-format layer), the neutral SL-spec is `CanvasModel` **minus two fields that are view state, not model content**:

| `CanvasModel` field | Neutral spec? | Rationale |
|---|---|---|
| `things` (id, name, role, primitive, interface) | **Keep** | Kernel content — the C/E membership, work-process primitive, interface designation are all systemhood-bearing. |
| `relations` (a, b, name, is_bond, kind) | **Keep** | Kernel content — bond-vs-mere, connection-kind, direction. |
| `boundary` (porosity, perceptive_fuzziness) | **Keep** | Mobus B.P — real structure (though dynamically inert today, `lens-palettes.md` status note). |
| `system_type` (kingdom, genus, domain) | **Keep** | Author's ontological assertion; travels with the model. |
| `things[].x, y` | **Shed → layout layer** | Pixel position is a diagram concern. Modelica's precedent (VERIFIED): layout lives in `annotation(Placement(...))`, syntactically present but semantically null. The compiler auto-lays-out from structure (`generator.md:114`); an explicit layout annotation is an *optional* override. |
| `lens` | **Shed → view layer** | Which lens you're reading is not a property of the model — every model is a valid Core model regardless (`theory-fidelity.md:38`). Lens is the active *view*, like SysML v2 choosing which diagram to render. |

So: **neutral SL-spec = `{things (sans position), relations, boundary, system_type}`**; a thin **view/annotation layer** carries `{positions?, lens?, --lens-accent, …}`. This is the minimal shape that (a) round-trips losslessly to `CanvasModel`, (b) is what the kernel validates, (c) matches Modelica's one-artifact-two-concerns split and SysML v2's abstract-syntax/view split. The text and words surfaces serialize the neutral part; they may *also* carry layout annotations (like Modelica's `.mo`), but never need to — the compiler lays out deterministically when they don't.

**Honest caveat (confidence: medium).** `CanvasModel` is single-root and flat (no nested `children`); the richer `bert-generator-core::IntermediateSpec` (`generator.md:126`) carries `subsystems[].children` for level-2 decomposition and a `routing_table`/processor model that `CanvasModel` does not. For an MVP over the *current* lenses canvas, the flat `CanvasModel` is the right neutral spec. Honoring F6/F7 (recursive decomposition with a stopping rule) will require the neutral spec to gain nesting — this is called out as an open question (§6, Q3), not solved here.

### 2.3 The three surfaces, concretely

**Graphics — already shipped.** The authoring palette (`lens-palettes.md` § "The authoring palette", #50/#51 closed) is F5, done: per-lens verb rail (Place / Designate / Connect / Derived), birth modes = arity of the mathematical act, the kernel decides legality via `validate_connection` deltas. Nothing to build; SL 2.0 *includes* it as the graphical surface.

**Formal text — the MVP surface (§5).** A Quint-like textual notation (§4) that is a **direct, complete, round-trippable serialization of the neutral spec**. Not a mode-declaration DSL (that was correctly cut, §3) — a full authoring notation. Sketch (illustrative, not a committed grammar):

```
system "hal stack" : Concrete/Technical {
  component  Proxy            interface
  component  DailyLoop        interface
  component  Council
  environment Operator
  environment UpstreamAPIs

  Council      --informational--> Proxy      "convene models"     bond
  Proxy        --informational--> DailyLoop  "tool calls"          bond
  Operator     --informational--> DailyLoop  "requests / prompts"  bond
  Proxy        --informational--> UpstreamAPIs "model requests"    bond

  boundary { porosity 0.15  fuzziness 0.05 }
}
```

This parses 1:1 to the `hal-projection.canvas.json` neutral content. It gives F1 (a formal view coequal with the diagram) and, beside the canvas, the **map/equation duality** that is Stella's core virtue (§4). Direction, `is_bond`, `kind`, and `interface`/`primitive` designations are all expressible; positions are omitted and auto-computed.

**Words — the verbal surface (§5, later rung).** Two tiers, both landing on the neutral spec:
- *Controlled systems-English* — a fixed-grammar rendering of Mobus's system-paragraph (F4). "Process **Kitchen** takes in **flour** from source **Supplier** and produces **bread** to sink **Customer**." Parsed deterministically (ACE/Gherkin precedent, §4: structured NL, mechanical resolution, **fail loud on ambiguity** rather than guess). This is a genuine third surface, no LLM.
- *Free NL → spec, LLM-assisted* — the author types prose; it routes through GSR `/extract` (the existing extraction path, `generator.md:74`) to produce a **draft neutral spec the author reviews and accepts** (germen's draft→machine-verify→human-accept, `germen/README.md:81`). The LLM drafts the *spec*, never the model; the spec still compiles deterministically. This is already the plan in `llm-integration-research.md` §12 (Authoring Rung A) — SL 2.0 just names the artifact it produces (a neutral SL-spec) and the surface it renders into (the text notation, editable before compile).

The elegant unification: **all four inputs (canvas gestures, formal text, controlled English, free NL) converge on one neutral spec, and only the deterministic compiler writes the model.** The LLM's presence or absence is a property of *one surface's parser*, not of the pipeline — swappable, and never on the trust line.

## 3. Keep / shed

### From Mobus's SL proposal (Ch. 4)

| Element | Keep / Shed | Why |
|---|---|---|
| Three coequal forms (verbal/graphical/mathematical) | **KEEP** (F1) | The core insight; §2 is its realization. |
| Lexicon from ontology primitives | **KEEP** (F2) | Already the palette's vocabulary; the 8-tuple, not the 7-tuple. |
| Syntax = structural legality, not free grammar | **KEEP** (F3) | Already the kernel invariant. |
| System-paragraph verbal form | **KEEP** (F4) | The words surface (§2.3, §5). |
| Drag-and-drop icon palette | **KEEP** (F5) | Shipped (#50/#51). |
| Simplest-process stopping rule | **KEEP** (F6) | Governs decomposition; ties to `AgentModel.primitive` (one component, one primitive — `theory-fidelity.md:53`). |
| Rough-first, refine-by-decomposition | **KEEP** (F7) | Matches Save-vs-Export and placeholder transforms. |
| **sysXML / XML serialization** (`:558-566`) | **SHED** | The neutral spec is kernel-native JSON (`CanvasModel`) + a textual notation; XML adds nothing the kernel consumes. |
| **Embedded JavaScript behaviors** (`:533-535`) | **SHED** | Dynamics = `bert-compose` (conservation-faithful, typed), not per-element scripts. Behavior is compiled/validated, not scripted freehand. |
| **Knowledgebase-first pipeline** (analyze → KB → generate sim) | **SHED as the SL path** | SL 2.0 authors a model directly; the KB (TypeDB) is downstream consumption, not the authoring substrate. |
| **7-tuple with E folded into G** (`:196`) | **SHED** | Use the machine-checked 8-tuple, E first-class (`Tuple.lean`). |
| **"System → Agent class" execution mapping** | **SHED** | Was SL 1.0's weakest section (7.5/10 review, `bert-system-language-spec.md:38`); execution is `bert-compose`, not a class-generation story. |

### From SL 1.0 / SL v2.0 mode work

| Element | Keep / Shed | Why |
|---|---|---|
| Spec v0.1 lexicon + grammar (§3 of `system-language-spec.md`) | **KEEP as reference** | "Lexicon and Grammar near publication-ready" (review, `bert-system-language-spec.md:36`); reuse as the formal-text vocabulary. |
| Mode ladder (Core/Structural/Operational/Full) | **KEEP — as lens selection** | Already resolved: modes = the three lenses = view state on the neutral spec (`sl-v2-mode-architecture.md:41`). |
| Lean-cited coherence constraints | **KEEP** | These *are* F3 for the formal surface — the parser's legality checks route to `validate_mode`. |
| **Mode-declaration surface syntax** (`sl-v2-mode-architecture.md:41`) | **STAY SHED** (cut 6/21, correctly) | A *text language for declaring a mode* was superseded by a JSON field + UI lens selection. SL 2.0 does **not** reopen this — the lens is view state (§2.2), not something you write in a mode-declaration DSL. The distinction matters: SL 2.0 is an *authoring* language (spec → model), which is consistent with never-hand-author-JSON (the spec is "meaning once"); it is not a mode-annotation language. |
| "Never hand-author JSON; meaning once, mechanics by machine" | **KEEP — it is SL 2.0's charter** | The spec is the human-authored meaning; `project()` is the machine. SL 2.0 operationalizes this discipline rather than contradicting it. |

### From the current `CanvasModel` format

| Element | Keep / Shed | Why |
|---|---|---|
| `things`, `relations`, `boundary`, `system_type` | **KEEP** as the neutral spec | Kernel-shaped already. |
| `things[].x, y` (positions) | **SHED to a layout annotation layer** | View state; auto-computed by the compiler; explicit only as an optional override (Modelica precedent). |
| `lens` field | **SHED to the view layer** | Not model content; the active reading, not a property. |
| Flat, single-root shape | **KEEP for MVP; revisit for decomposition** | Right for the current lenses canvas; F6/F7 nesting is an open question (§6, Q3). |
| `Kind` (5) ↔ `SubstanceType` (3) mapping | **KEEP — already exists** | `kind_to_substance` (`canvas.rs:64`); the earlier "missing translation" claim is stale (`llm-integration-research.md:106`). No new work. |

## 4. Precedent findings (each with "what we take")

All items below were researched via web subagents with primary-source fetches; verification status is per claim.

**Stella / STELLA (isee systems), system dynamics — the bar the MVP must clear. VERIFIED.** Barry Richmond's tool "for the other 98%" — non-programmers building differential-equation models. Four primitives mapped 1:1 onto integral structure: stocks (accumulations/state), flows (rates/verbs), converters (auxiliaries/parameters), connectors (influence). The diagram *is* the model; the tool auto-derives the equations. Critically, it has an explicit **Map/Equations dual view** — two toggleable views of one model: lay out structure first, then complete the math, with **live validity flags on underspecified variables**. *What we take:* (1) a tiny, ontology-grounded primitive vocabulary is what lets non-experts build *correct* models — the vocabulary constrains you into valid structure before any detail; (2) the map/equation duality — **two coequal views of one model, structure-first with live validity signal — is exactly the MVP shape** (§5). bert-lenses already has the "map" (canvas) and the validity signal (`analyze`); SL 2.0 adds the second view.

**Modelica — one artifact, semantics + layout. VERIFIED.** Declarative, acausal, equation-based; components declare equations, the compiler picks causal order. The decisive finding: a single `.mo` file carries **both** the semantic model (equations, declarations) **and** the graphical layout, the latter as `annotation(Icon/Diagram/Placement(...))` — syntactically part of the grammar but explicitly **non-semantic**; compliant tools must preserve annotations on save. *What we take:* the neutral spec can carry graphical layout as a reserved, non-semantic annotation subgrammar the compiler ignores for systemhood — no separate `.layout` file. This is the precedent for §2.2's "positions → annotation layer." Also: model *interfaces*, not fixed input/output causality, so components compose across contexts (relevant to Mobus interfaces as protocol-bearing subsystems).

**SysML v2 (KerML + textual notation) — the closest existing precedent to "three surfaces over one spec." VERIFIED.** Two layers: KerML (a small formal semantic kernel) and SysML v2 (domain libraries on top). The architecture, verbatim from the finding: **"diagrams are defined as views of the underlying abstract syntax rather than serving as the semantic source of truth."** The textual notation is normative and serializes 1:1 to the abstract syntax; diagrams are projected views; a REST **API/Services layer over a central model repository** mediates all surfaces so none owns a privileged file. The directionality lesson: text is privileged over diagrams not because it's textual but because it maps *losslessly and completely* to the abstract syntax, while a diagram is necessarily a partial projection. *What we take:* the whole §2 architecture is validated by a standards-body precedent — formal kernel (have it: the WASM kernel + Lean), abstract syntax (have it: `CanvasModel`), text notation as complete round-trippable serialization (the MVP to build), diagrams as projected views (have them: the three lens renderings), all mediated by one API (have it: `bert-lenses-kernel`). SL 2.0 is SysML v2's shape, scoped to the K≅2 kernel and vastly smaller. *(Citation upgraded 2026-07-20: this survey predated adoption; SysML v2 Part 1 was formally adopted as* OMG Systems Modeling Language, Part 1: Language Specification*, formal/2026-03-02, March 2026, 691 pp. The released standard confirms the architecture cited here and sharpens the ontological contrast — §7.1 records that the language carries no construct named system/subsystem/component, "An entity with structure and behavior in SysML is represented simply as a part," domain terms supplied via user metadata (§7.27). Spec §10 records the foil; #99 draws out the positioning.)*

**Quint — making a formal surface approachable. VERIFIED.** A specification language over TLA (same semantics as TLA+, friendlier surface): C-like operators instead of math symbols, functional idioms (`filter`/`map`/`fold`), separated expression *modes* (stateless/state/action/temporal) to cut cognitive load, optional type annotations, and a **deterministic transpiler to TLA+** (never an interpreter in the loop) plus REPL, type-checker, simulator, LSP. *What we take:* keep the formal semantics fixed (the kernel) and build a *programmer-familiar* surface over it, bridged by a deterministic transpiler; the "distinct syntactic zones" idea ports directly — the SL-text parser can dispatch mechanically on element kind rather than disambiguate. Quint is the proof that "approachable authoring surface + deterministic compile to a rigorous target" ships and that programmers, not mathematicians, can be the audience.

**gpt-jargon (Jake Brukhman) — the negative control. VERIFIED (README fetched).** Self-described: "an imprecise, nondeterministic natural language programming language … that is specified **and interpreted** by LLMs like GPT-4." There is no authoring/compile split — the LLM *is* the interpreter, every run, and the project brands this as a feature. *What we take:* cite it directly as the thing SL 2.0 explicitly is **not**. It is precedent *against* — the exact anti-pattern the deterministic-compilation commitment rejects. The contrast sharpens the pitch: SL 2.0 uses the LLM to help *write* a spec that a compiler then executes identically every time; gpt-jargon dissolves the compiler into the model.

**Cucumber/Gherkin + Attempto Controlled English (ACE) — structured NL, deterministic parse. VERIFIED.** Gherkin's Given/When/Then matches deterministically to step code via Cucumber Expressions, and **throws on ambiguous matches rather than guessing**. ACE is a fixed-grammar English subset whose APE parser deterministically produces first-order-logic structures — decades of pedigree, no LLM. *What we take:* the controlled-systems-English tier (§2.3) has a real, proven design — a fixed grammar over Mobus's system-paragraph that parses deterministically and **fails loud on ambiguity** instead of smoothing it over. This is the honest middle between the formal text and free NL.

**Wolfram free-form input — NL as convenience over a fixed target. VERIFIED.** NL is translated to Wolfram Language; the **generated code is shown and is what executes**. *What we take:* when an LLM/NL surface produces a spec, **always surface the compiled artifact for inspection** before it's trusted — which is exactly the "author reviews the draft neutral spec" step in §2.3. NL is an authoring convenience over a fixed compile target, never the runtime.

*Unverified/flagged:* no second rigorously-documented "English-as-programming-language" example beyond gpt-jargon was found; Karpathy's "English is the hottest new programming language" is a positioning citation only (headline corroborated, full text unverified).

## 5. Fastest MVP path — staged, first rung sized honestly

The bar (from Stella, VERIFIED): a modeling *language* feels like one when you have **two coequal views of one model, structure-first, with a live validity signal**. bert-lenses already has one view (canvas) and the validity signal (`analyze`/`validate_mode`). The MVP is the *second* view over the *same* model — nothing more, and deliberately not the NL surface first.

**Rung 1 — SL-text ⇄ `CanvasModel` serializer + a text pane beside the canvas. (The MVP.)**
The smallest thing with Stella-like qualities. All deterministic, no LLM, no new systems logic.
1. **Define the neutral spec explicitly** = `CanvasModel` minus `{x, y, lens}` (§2.2), with an optional layout-annotation layer (Modelica-style). This is a naming/typing exercise over an existing struct, not a new model.
2. **Formal-text grammar + parser** (`SL-text → SLSpec`): the §2.3 sketch, reusing SL 1.0's lexicon/grammar (`system-language-spec.md`, "near publication-ready"). Legality delegates to the kernel — the parser builds a `CanvasModel` and calls `validate_mode`/`validate_connection`; it never judges systemhood itself (F3).
3. **Serializer** (`SLSpec → SL-text`): the reverse, so the canvas round-trips to text.
4. **A text pane beside the canvas**, bidirectionally synced through the neutral spec: edit text → reparse → update canvas; edit canvas → reserialize → update text. Positions auto-computed on the text→canvas direction (`generator.md` layout), preserved on the canvas→text direction as annotations.
5. **Live validity flags** in the text pane, reusing `analyze`'s `issue_targets` (already keyed to elements) — Stella's underspecified-variable flag, in text.

*Why this is the right first rung:* it is read-only-or-deterministic (no write-path risk beyond the existing canvas), it reuses the compiler and validators wholesale, and it delivers the exact quality that makes Stella a *language* (dual coequal views). It is the "hand-author first, let friction spec the rest" discipline in surface form. Sized honestly: this is a parser + serializer + a synced pane — real work, but bounded, and touching zero systems logic.

**Rung 2 — controlled systems-English surface.** A third view: Mobus's system-paragraph (F4) as a fixed grammar (ACE/Gherkin precedent), parsing deterministically to the same `SLSpec`, failing loud on ambiguity. Still no LLM. Gives the "author in words" surface for the non-programmer audience Stella targets.

**Rung 3 — free-NL → spec, LLM-assisted (the propose tap).** Route free prose through GSR `/extract` to draft an `SLSpec`; render it into the Rung-1 text pane; author reviews/edits/accepts; then compile. This is `llm-integration-research.md`'s Authoring Rung A, now with a named artifact (the neutral spec) and a named review surface (the text pane). Reuses the whole LLM-assist seam; adds only the "draft lands in the text pane for review" wiring. germen's coverage-dial instrumentation (`germen/README.md:83`) is worth adding from Rung 3 day one: measure the fraction of authoring done deterministically (Rungs 1-2) vs needing the LLM, so the assist works itself toward retirement.

**Rung 4 (post-MVP) — decomposition + the dynamical face.** Extend the neutral spec to nested subsystems with the simplest-process stopping rule (F6/F7); wire the formal surface to `bert-compose` for the dynamical face (T/H/Δt), which is thin today (`theory-fidelity.md:65`). This is where SL 2.0 reaches full Mobus-tuple coverage; it is explicitly *after* the MVP.

**Sequencing rationale:** graphics ships → add formal text (Rung 1, the MVP, the map/equation duality) → add controlled words (Rung 2) → add LLM-assisted free words (Rung 3) → deepen (Rung 4). Each rung is a surface over the same neutral spec and compiler; none reopens the trust line.

## 6. Open questions → issues (crisp, closeable for the W30 week)

- **Q1 — Neutral-spec boundary: is `{things, relations, boundary, system_type}` exactly right, or does `system_type` also belong in an annotation layer?** `system_type` is author-asserted metadata that no validator gates (`theory-fidelity.md:70`). Decide: kernel content (travels in the neutral spec) or annotation (like lens/position). *Closeable:* one call, with a stated rule (does it change what the model *is*, or how it's *framed*?).
- **Q2 — Formal-text grammar: adopt SL 1.0's grammar verbatim, or design fresh against `CanvasModel`?** SL 1.0's lexicon/grammar was reviewed "near publication-ready" but targeted the old WorldModel, not the lenses `CanvasModel`. *Closeable:* diff SL 1.0's grammar against the neutral spec; keep or revise per element.
- **Q3 — Decomposition in the neutral spec: does the MVP stay flat (single-root `CanvasModel`), and when does nesting land?** F6/F7 need `subsystems[].children` (which `bert-generator-core::IntermediateSpec` has but `CanvasModel` lacks). *Closeable:* decide MVP = flat (recommended), and file the nesting design as Rung 4.
- **Q4 — Layout annotations: how much layout does the text surface persist?** Modelica persists full placement; the fastest MVP persists none (always auto-layout) and treats explicit positions as an optional override. *Closeable:* pick "auto-layout only for MVP; optional `@pos` annotation later."
- **Q5 — Round-trip fidelity: is canvas→text→canvas guaranteed lossless, and what's the golden-test contract?** The repo already has serde↔TS contract goldens (`fixtures/contract/`). *Closeable:* specify the round-trip invariant and add it to the fixture suite before building Rung 1.
- **Q6 — Controlled-English ambiguity policy: what exactly does "fail loud" surface?** ACE/Gherkin throw on ambiguous parse. Decide the error contract (which ambiguities are hard errors vs. author-prompts). *Closeable:* enumerate the ambiguity classes in the system-paragraph grammar.
- **Q7 — Does the LLM-assist surface (Rung 3) inherit the #10 gating** (agent-constitution #18, theory-front-door #23) **or is spec-drafting-for-review exempt** as read-before-write? Free NL drafts a spec the author must accept before any compile — arguably exempt, like read-only analysis. *Closeable:* one policy call, mirroring the §12 open question in `llm-integration-research.md`.
- **Q8 — Naming: is "SL 2.0" the right public name** given SL 1.0's mode-declaration DSL was cut, or does a fresh name avoid the "isn't that the cut thing?" confusion? *Closeable:* naming decision, low stakes, worth settling before any public artifact.

---

*Cross-refs: `llm-integration-research.md` (the LLM-assist story SL 2.0's words-surface leans on), `lens-palettes.md` (the graphical surface, shipped), `kernel-architecture.md` / `theory-fidelity.md` (what the compiler and validators actually guarantee), `bert/docs/generator.md` (the deterministic spec→model contract to reuse), `germen/README.md` (the draft→verify→accept posture and coverage dial), `operations/systems-science/mobus/4-a-model-of-system.md` (the prior art, cited by line throughout).*
