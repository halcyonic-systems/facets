# LLM Integration — Research & First-Principles Foundation

*Context · Authoring · Analysis in bert-lenses. Research only — no implementation. Written 2026-07-16 as the foundation for a deliberate first rung, from a five-facet parallel research pass (foundations, existing assets, modular architecture, the analysis capability, external prior art). Companion to `llm-authoring-vision.md` (which this supersedes as the primary reference).*

---

## TL;DR (the one page)

1. **The bet is sound and field-validated.** "LLM proposes a candidate, a deterministic checker owns truth" is convergent with the strongest work across five independent fields (diagramming, BPMN, formal methods, CAD/EDA, enterprise ontology). bert-lenses is an unusually *good* substrate for it because the sound checker (the kernel) already exists, built for human authoring, grounded in machine-checked Lean — most tools have to build the checker and the LLM layer at once with no independent ground truth.

2. **Three capabilities, not one blob.** *Context* (read-only input channel), *Authoring* (the only write surface, must be gated), *Analysis* (read-only critique, downstream of validation). Conflating authoring and analysis is the classic failure — it relocates truth-authority from the kernel to the model.

3. **The shared substrate already exists in embryo: `analyze_canvas`.** One atomic kernel call already bundles `{validation, issue_targets, facts, description}`, keyed to canvas elements. The design job is mostly *not building three separate context-serializers* as the capabilities land. Wrap it once (`buildModelContext`); every module consumes that.

4. **Sequence: Analysis-first.** Read-only, cannot corrupt the kernel, already proven useful today (the `bill.json` review caught four real errors), reuses existing seams, and generates the "what good critique looks like" corpus that later informs Authoring. Then Context/RAG hardening → Authoring (Rung A) → resident co-author (#10, Rung B).

5. **The sharpest near-term move is a kernel change, not an LLM one.** Two of the four errors caught in today's manual review — the **dead-end state** and the **duplicate edge** — are *missing deterministic kernel checks*, not LLM jobs. `validate.rs` has no reachability, dead-end, or duplicate-edge detection. Add those next to `check_bond`/`check_self_loops` **first**. That frees the eventual LLM leg to do only what it uniquely can (domain plausibility, "did you mean," missing-domain-knowledge gaps).

6. **Non-negotiable constraints:** one write door only (`toCanvas`, gated); route every LLM call through GSR (never direct-to-provider); the palette is **DLG/FSM-native** (state-as-node — no `state-value` field exists, so an LLM must never smuggle "current_state" through a free-text field the kernel can't validate); a **`Kind`↔`SubstanceType` translation** (5→3 values) is currently missing and must exist before GSR output can land on the canvas.

7. **The risk to design against:** automation bias scales *with* a user's fluency in the tool, not against it — surface validator verdicts as first-class signal, never silently auto-resolve.

---

## 1. Three capabilities, defined from first principles

They compose in a strict order and must not be blurred.

- **Context** — read-only input. The LLM is *given* a faithful view of the current model (+ RAG over the systems-science corpus and the active lens's vocabulary) to condition what it says next. It has no write surface; it can only mislead a downstream proposal, never corrupt state. Safe by construction.
- **Authoring** — the one capability with a write surface. The LLM *proposes structure* (an intermediate spec, or a stream of the same typed ops a human UI action emits). This is fundamentally hypothesis-generation, never truth-telling — the LLM is guessing at what structure a described system has and is never in a position to certify that guess.
- **Analysis** — read-only critique of an *already-validated* model. It consumes kernel verdicts as ground truth and narrates them; it never produces a verdict. It must sit strictly **downstream** of validation — placed before it, an analysis call silently becomes an authoring call wearing analysis's clothes ("the LLM says this system is open" read as if it were the kernel's `classify_openness`).

The order is load-bearing: context feeds authoring → authoring produces a proposal → the proposal is compiled + kernel-gated → *only then* does analysis have something legitimate to talk about.

## 2. The load-bearing invariant — "LLM proposes, kernel disposes"

The WASM kernel is the **sole, exclusive** authority over systemhood. The LLM's only permitted output is a *candidate artifact* re-entering at the same gate a human author uses (an intermediate spec, or typed ops). It never gets a side door that writes `WorldModel`/`CanvasModel` state without passing `validate` / `validate_mode` / `validate_connection` / `validate_operational`.

Geometrically, three layers: **(1) WASM kernel = truth; (2) `bert-generator-core` = a pure, deterministic spec→WorldModel compiler (no intelligence — IDs, positions, wiring); (3) everything upstream of the spec = NL, chat, RAG, the LLM's guess.** The LLM lives entirely in layer 3. It never touches layer 2 (anything needing exactness, which LLMs are structurally bad at) and has zero causal path into layer 1 except by its layer-3 output passing through layer 2 and being judged by layer 1. This is the *same* bar the kernel already holds human authors to: it trusts resulting typed structure, not intent or source. The LLM is just a new, more fallible author — **no special door** (explicit in #10).

**Why it's the only safe design:** the tool's entire value is that the kernel decides legality deterministically, reproducibly, grounded in proven invariants. Those are exactly the properties an LLM cannot supply. Any write path that bypasses the kernel makes the tool inherit the LLM's non-determinism — systemhood becomes "what the model felt like saying," which destroys the K≅2-grounded premise.

**Failure modes if violated:** *silent unsoundness* (a hallucinated model looks identical in the UI to a proven one); *verdict laundering* (LLM prose trusted as kernel output); *precision drift* (hallucinated IDs/wiring entering as structure, defeating the very checks `validate.rs` exists to run); *mode-ladder corruption* (a model displaying "Operational" without satisfying irreflexivity).

## 3. The epistemics — a fallible proposer over a sound checker

The worry ("an LLM can hallucinate structure") is correct and does not go away with better prompting — hallucination is near-definitional of an LLM. What makes the pipeline trustworthy is that **reliability is no longer the LLM's job.** Every proposal is forced through two indifferent, mechanical filters before becoming "true": the deterministic compiler (accepts a well-formed spec, rejects a malformed one) and the kernel validators (check against Mobus/Bunge/Klir invariants grounded in Lean). The failure mode of a bad proposal is "refused with a legible `ValidationIssue{location, severity, message, suggestion}`," not "accepted as truth."

This is **generate-and-check** — the same pattern that makes AlphaProof-style provers, SAT-guided synthesis, and type-checked codegen trustworthy. Trust in the pipeline derives from trust in the *checker alone*; the proposer's reliability affects only usefulness (a bad proposer means more rejected proposals, not more wrong models on the canvas). Route each task to the component structurally suited to it — LLM for reading NL and guessing plausible structure, kernel for exact invariant-checking — and let the interface between them be the epistemic firewall.

## 4. The shared substrate — `analyze_canvas` is already 90% of it

All three capabilities need the same question answered: *"what, truthfully, is this model right now, in a form an LLM can read?"* If each serializes its own view, they drift — three renderings that can go stale, three places systems-logic can leak into TS (the one thing the codebase forbids). So: **one model-context provider**; every capability consumes it, none re-derives kernel facts.

*(These claims are verified against source, with confidence ratings, in [`docs/kernel-architecture.md`](../kernel-architecture.md) — read that if you're skeptical the kernel really holds this. Short version: the substrate is real and richer than described here for lens vocabulary + structural facts; the dynamical face is thin and three graph checks are missing (#66).)*

The kernel already exposes exactly this shape:

```
analyze_canvas(model) -> CanvasAnalysis {
  validation:    ValidationResult   // issues[], mode verdict
  issue_targets: IssueTarget[]      // index-parallel, kernel-resolved to canvas {thing, relation}
  facts:         LensFacts          // boundary/env/interface ids, edges (locus/bond/self-loop), ports, aggregate
  description:   LensDescription     // Klir | Bunge | Mobus discriminated union — the model AS its lens's formal object
}
```

Its own doc comment frames it as "the atomic replacement for the `validate_mode → lens_facts → describe` waterfall … the kernel projects ONCE." That *is* the substrate; it just hasn't been extended past the canvas UI into an LLM-facing payload. A thin `web/src/kernel/context.ts` (a **formatter, not a second brain** — it only packages kernel output, adds no logic) shapes it into:

```
ModelContext {
  lens, canvas_model, world_model?(=project output when well-formed),
  analysis: CanvasAnalysis (verbatim),
  eight_tuple_summary,           // legible restatement of `description`, lens-appropriate
  provenance                     // generated_at, kernel_version, source
}
```

Two properties make it a real substrate: it is a **pure function of kernel output** (no TS-side facts), and it is **lens-aware by construction** (it passes `LensDescription`'s discriminated union through — Mobus foregrounds flows/interfaces, Klir the relation graph).

## 5. The three modules over the substrate

Each defined by *what it reads*, *what it may write*, *which seam it attaches to*. All sit **above** `web/src/kernel/index.ts`; none re-implements `validate`/`project`.

| Module | Reads | Writes | Seam / notes |
|---|---|---|---|
| **Context** | `ModelContext` + RAG over the systems corpus | nothing | Pure assembly; stateless, cacheable on model-hash+lens. Buildable/testable with **zero LLM calls** — the natural first thing to prove. |
| **Authoring** | Context output | **only** on a clean kernel verdict, via `toCanvas` | NL → GSR `/extract` → `bert-generator-core.generate()` (deterministic) → `validate_mode`/`validate_connection` → `toCanvas`. Four individually-callable steps: a caller can stop at the editable spec (Rung A) or auto-apply (later). Must enforce the DLG/FSM-native spec vocabulary upstream (§6). |
| **Analysis** | Context output **only** | nothing (UI-local chat/critique state only) | Context → prompt → LLM → render. `citedFacts` point back into `LensFacts`/`issue_targets` so the UI highlights *which* element a claim is about (reuse `IssueTarget`'s `{thing, relation}`). The smallest, safest slice. |

**Test of true modularity:** could Analysis ship today, alone, with Authoring's code deleted? If not, the coupling is real and must be cut.

## 6. The analysis rung — and the finding that reframes it

The `~/Desktop/bill.json` review (14-state "how a bill becomes law" FSA) caught four real errors by hand. Reading `crates/bert-core/src/validate.rs` (all 1787 lines) and `crates/bert-canvas/src/lenses.rs`, the errors split cleanly:

- **Mechanical — and currently a MISSING KERNEL CHECK, not an LLM job:** the dead-end "Vetoed" state (a non-terminal node with zero outgoing edges) and the duplicate edge (two interactions with identical source/sink/type). `validate.rs` has **no reachability, dead-end, or duplicate-*edge* check** (`check_duplicate_ids` catches duplicate *ids*, not parallel edges). These are pure graph algorithms over `project(model)`; they belong next to `check_bond`/`check_self_loops` in `validate_mode`. **Adding them is the single clearest near-term engineering takeaway** — a graph traversal never misses what a human/LLM eyeballing an FSA will.
- **Genuinely needs an LLM:** the swapped veto/signature label ("did you mean") and the missing "if identical" path (legislative-process knowledge the kernel cannot have). Domain plausibility, not graph structure.

So the design principle to bank: **good analysis = kernel facts + domain model + LLM narration**, *never* "LLM guesses structure it could have read." Hand the LLM `analyze_canvas` output (or an extended `analyze` with reachability/dead-end/duplicate fields added) and let its job be strictly domain narration and real-world cross-checking. The LLM caught the two structural bugs today only because no kernel check existed yet — a temporary state, not a permanent LLM responsibility.

**Faithful context for analysis:** feed `project(model)` + `lens_facts` + `validate_mode` issues (with `issue_targets`) + `describe`, not a hand-typed redraw. Today's review worked precisely because it read the *actual* JSON, not a summary. The discipline: the LLM is never asked to re-derive `boundary_thing_ids` or the aggregate verdict from scratch — it's handed those as already-true and asked to *use* them.

## 7. What already exists (asset inventory)

| Asset | Path | Status |
|---|---|---|
| GSR `/extract`, `/generate`, `/generate-from-description` | `general-systems-reasoner/serve.py` | **LIVE**, deployed (`reasoner.halcyonic.systems`); routing centralized in `run_extraction_llm` (Anthropic Haiku ↔ local Ollama gemma4) |
| `bert-generator-core` (deterministic compiler) | `general-systems-reasoner/core/` | **LIVE**, mature, documented (`bert/docs/generator.md`); 3-way shared (BERT-Tauri, GSR PyO3, `bert-generate` CLI) |
| BERT desktop chat→generate flow | `bert/src-tauri/src/chat_service.rs`, `bin/bert-generate.rs` | **LIVE** — but targets the OLD Tauri `WorldModel`, not lenses' `CanvasModel`. LLM = *extraction only*; deterministic compiler emits the model. |
| bert-lenses kernel (validate/project/toCanvas/analyze_canvas) | `web/src/kernel/index.ts`, `crates/bert-lenses-kernel/API.md` | **LIVE**, frozen API, **zero LLM awareness** |
| GSR/LLM call *inside* bert-lenses web | — | **MISSING** (grepped clean; the "open_model GSR-sniff" from the earlier vision note does **not** exist in-repo) |
| Resident co-author (#10) | GH issue, no code | **designed-only**; first earmarked capability = "suggest a primitive, author confirms"; gated on agent-constitution (#18) + theory-front-door (#23) — the "consensus by autocomplete" warning |
| `Thing` state-value field | `web/src/kernel/types.ts` | **MISSING by design** — palette is DLG/FSM-native (state-as-node). Not a bug; a constraint any authoring-LLM must respect. |
| `Kind`↔`SubstanceType` translation | — | **MISSING** — canvas `Kind` (5: Unspecified/Energy/Matter/Field/Informational) collapses many-to-one onto kernel/GSR `SubstanceType` (3: Energy/Material/Message). GSR's prompt only knows the 3-value form; output needs a translation step that doesn't exist yet. |

## 8. Field convergence & how to differentiate

Every surveyed category independently converged on bert-lenses' shape — *LLM proposes into a structured intermediate → a deterministic parser/validator/solver is the actual gate → failed validation triggers repair-retry, not silent pass-through*: tldraw (screenshot + structured JSON, edits land in the structured store), Mermaid (generate→parse→auto-repair, dedicated validator MCPs), BPMN (Camunda Copilot + academic assistants, judged by structural-quality gates), CAD/EDA (Text-to-CAD → STEP → the CAD kernel's constraint solver owns validity; ChipNeMo routes through EDA checkers), and formal methods — which states it most cleanly: **"agents propose, solvers verify"** (Agentic Model Checking 2026; VeriPlan pairs an LLM planner with a model checker + a strictness slider).

**So the architecture is not a novel bet — it's the convergent answer.** The defensible, differentiating claims to make:
1. **The checker is a *sound* validator, not a best-effort linter** — closer to the model-checking literature than the diagramming literature. Grounded in Lean, not house style.
2. **Structure is grounded via schema-constrained + provenance-tracked mechanisms** (GraphRAG-style graph-shaped retrieval; JSON-Schema/grammar-constrained decoding so the LLM literally *cannot* emit invalid kernel structure) — not prose-flattened context. (Caveat worth testing: a 2026 "constraint tax" result shows constrained decoding can suppress tool-calling on some open-weight setups.)
3. **The proposer layer is provider-agnostic almost for free** — because the checker lives *outside* any model boundary, the LLM (local vs frontier) swaps without touching the trust line. LiteLLM (which hal already runs at :4000) is the reference pattern; GSR already centralizes routing.
4. **Closest large-scale validation of the thesis is Palantir's Ontology** ("tether the model to an explicit governed world model, not more training data") — proprietary/enterprise/closed, which is exactly the openness contrast `bert-world-models-positioning.md` is set up to make. Note: "world model" in the systems-science/Mobus sense appears closer to our own coinage than an established external category — don't over-claim external validation of the phrase.

## 9. Risks to design against

- **Automation bias scales *with* fluency, not against it.** Once a user sees several correct suggestions, scrutiny drops — and the effect is often *stronger in experts*. The verification problem shifts rather than disappears: a user modeling an unfamiliar domain is exactly the person least able to catch a plausible-but-wrong proposal. **Mitigation:** surface the validator's verdict as first-class UI signal; never silently auto-resolve; constrain generation up front rather than relying on post-hoc review; keep provenance so a rejected/edited proposal is auditable.
- **Research-tool specific:** over-reliance erodes independent problem formulation and weakens the modeler's mental model of the system — distinct from bug-injection risk (Nature Computational Science, 2025).
- **Oracle-vision (internal):** the over-reliance literature redirected inward — the builder can automation-bias *themselves* into shipping the authoring layer before the checker is trustworthy enough to bear it. The discipline is the same as the rest of this doc: analysis-first, read-only, prove the substrate before anything writes through it.

## 10. Routing — local-first through GSR

The goal: route through GSR so it's (1) efficient, (2) local-first by default with cloud optional, (3) architected so local models get the benefits of the knowledge-base constraints. All three hold together because of one triangle: **GSR = the single constraint brain · the kernel = the sole checker · the model = a swappable, weak-tolerant proposer.**

**Local models inherit the KB — because the constraints live in the harness, not the weights.** GSR already applies the ontology/vocabulary constraints at its own layer ("GSR stays the single brain; the canvas never owns the prompt"), so a small local gemma gets the identical grounding a frontier model gets. Split by transfer behavior:
- **Hard constraints (schema / enum / spec shape):** fully enforceable regardless of model strength, via (a) **constrained/grammar decoding** (Ollama `format` + JSON-Schema masks invalid tokens at decode time — the model *cannot* emit an out-of-vocabulary enum) and (b) the deterministic `repair_spec` + kernel validator. A weak model can't violate a decode-masked constraint.
- **Soft constraints (ontology reasoning, lens semantics):** degrade with model size; mitigate by **RAG-narrowing** (retrieve the few relevant passages, don't dump the corpus) and **keeping the LLM's job small** (fill a known schema / narrate facts, don't invent structure). The kernel owns correctness, so the local model only has to be *plausible*.
- **Analysis-first is the most local-friendly rung**: the kernel already did the reasoning (`analyze_canvas` facts); the model just narrates pre-computed truth, needing almost no KB of its own.

**Local-first default** is a policy flip, not surgery: make local Ollama the default even when `ANTHROPIC_API_KEY` is present; cloud becomes explicit per-request opt-in (`tier: "frontier"`); and **escalate-on-failure** (the `extract → validate → retry_extraction_with_feedback` loop already exists — N local validation failures escalate to cloud). Safe because the checker sits *outside* the model boundary: a weak local proposal that's wrong is **rejected with a legible reason, not silently absorbed**. The sound-checker design is what *licenses* local-first — it only costs usefulness (more retries), never soundness.

**Efficient:** context computed once (`analyze_canvas`, not re-serialized per capability) · RAG-narrow the prompt · constrained decoding cuts retries (the biggest local lever) · validation is fast local WASM · cloud tokens spent only on the hard cases. Optional unification: route GSR's *model calls* through hal's **LiteLLM proxy (:4000)** underneath, keeping GSR as the prompt/RAG/constraint brain — one provider-switch + fallback + cost layer instead of GSR growing its own clients; local/cloud policy becomes a LiteLLM routing rule.

**Caveats:** the "constraint tax" (constrained decoding can suppress capability on some open-weight models — test empirically); frontier still wins for hard *authoring* (the #10 "frontier tier only" receipt holds), but *analysis* is genuinely local-viable — another reason it's the right first rung.

## 11. Lens-faithful reasoning — guaranteeing the LLM speaks each lens

Requirement: the LLM must reliably reason in the *active lens's* terminology (Klir relation-primary; Bunge components/bonds/endo-exo/aggregate-verdict; Mobus C·N·E·G·B·T·H·Δt / flows / interfaces / membrane) and never leak another lens's vocabulary.

**The reframe that makes this near-guaranteed: don't rely on the model *knowing* each lens — the kernel already speaks each lens.** `describe(model, lens)` returns a `LensDescription` — a Klir | Bunge | Mobus discriminated union that IS the model expressed in that lens's formal vocabulary, and the K≅2 property "counts hold, words change" is machine-tested (`describe_counts_hold_across_lenses`). So the lens vocabulary is a **kernel-computed fact, injected**, not model knowledge to be trusted. This inverts the reliability problem: you don't hope the LLM learned Bunge; you feed it Bunge-labeled structure.

Layered guarantee (defense in depth):
1. **Inject the translated object.** Feed `describe(model, lens)` as the context, not the raw graph. The LLM reasons *over already-lens-labeled structure*, so in-lens output is the path of least resistance. Injection >> instruction. (The substrate is lens-aware by construction — §4 — so switching the active lens switches the LLM's vocabulary with zero LLM-side logic.)
2. **Constrain the output.** For structured/authoring output, grammar/JSON-Schema-constrained decoding against the *active lens's* spec vocabulary — the model literally cannot emit a wrong-lens primitive (e.g. propose a Mobus "flow" while in the Klir lens whose primitive is a neutral relation).
3. **Per-lens system prompt + term whitelist + in-lens few-shot.** Shapes the reasoning; soft (prompt-following is probabilistic, weaker on small models), which is why it's backed by 1, 2, 4.
4. **Kernel validation rejects cross-lens structure.** `validate_mode(model, lens.mode())` already enforces lens-legality (a self-loop is fine in Klir, rejected at Mobus/Operational; an aggregate fails Bunge's bond requirement). This is the **hard guarantee for structure** — regardless of what the LLM "intended."
5. **Optional lint / cross-lens check.** A post-hoc pass flagging out-of-lens vocabulary in prose; and, via K≅2, verifying an LLM's lens-specific claim survives translation to the model's other-lens descriptions.

**The honest boundary:** *structural* lens-fidelity is **hard-guaranteed** (kernel validation + constrained decoding — the kernel will not accept out-of-lens structure). *Free-prose* terminology is **strongly enforced but not literally guaranteed per sentence** (natural language is unconstrained) — but handing the model the already-translated `describe()` object plus a per-lens whitelist and lint gets you reliably close, because the model is echoing lens-native input rather than translating into a vocabulary it might not know. And all of this **transfers to local models unchanged**, because the lens vocabulary lives in `describe()`, not in the weights.

**Consequence — the lenses become a cross-check on the LLM, not just a constraint on it.** Because K≅2 requires the counts to agree across Klir/Bunge/Mobus ("counts hold, words change"), a claim the LLM asserts in one lens's description that contradicts the same model's other-lens descriptions is a **caught drift** — the three faithful views triangulate the LLM's own reasoning for free. This turns lens-fidelity from a cost (extra vocabulary to enforce) into a diagnostic: disagreement across lenses flags either an LLM error or a genuinely interesting modeling tension worth surfacing to the author.

## 12. Recommended first rung + open questions

**First rung (smallest coherent slice, all read-only or deterministic — no write-path risk):**
1. **Kernel:** add deterministic **dead-end**, **duplicate-edge**, and **reachability** checks to `validate.rs`/`analyze` (next to `check_bond`/`check_self_loops`). This is pure kernel work, needs no LLM, and mechanically catches the class of error today's review caught by hand.
2. **Substrate:** `buildModelContext` — a thin formatter over the already-exposed `analyze_canvas` + `project`. Testable with zero LLM calls.
3. **Analysis surface:** a read-only "review/ask" panel that sends `ModelContext` + a question through **GSR** (a new `/analyze` mode-prompt or reused endpoint — *not* a new provider client in `web/src`), reusing the egui-era `ANALYSIS_PROMPT` ("state facts only, no hedging") nearly verbatim, and citing `issue_targets` so claims highlight canvas elements.

That rung reproduces, as a shippable feature, exactly what this session did by hand — and it's the read-only analogue of the "hand-author first, let friction spec the rest" discipline.

**Open questions for Shingai to decide (deliberately, not by default):**
- **Surface location:** in-page copilot (per #10's web-rebuild reframe — "element-centric suggestible state already laid in Phase 1–3") vs a dedicated panel. Window-on-demand, never ambient (the God-tool guard).
- **GSR endpoint shape:** new `/analyze` vs reuse `/extract`/`/ask` with a mode flag. One routing table, not per-module `fetch`.
- **The `Kind`↔`SubstanceType` translation** — build it now (needed the moment any GSR output lands on the canvas) or defer until Authoring.
- **The palette-envelope prompt contract** — how to instruct the extraction prompt to propose *structure* (state-as-node) and never a value-typed state field the kernel can't validate.
- **#10 gating** — does the analysis rung need the agent-constitution (#18) + theory-front-door (#23) first, or is read-only critique exempt from the "consensus by autocomplete" concern (it proposes no structure, so arguably yes)?
- **Provider tier** — the #10 receipt says "frontier tier only" for authoring; does read-only analysis relax to local models, or hold the same bar?

**Sequence after the first rung:** Context/RAG hardening (corpus grounding via GSR) → Authoring Rung A (co-create an editable spec via `/extract` + `toCanvas`) → Rung B resident co-author (typed ops, gated on #9/#10). The substrate is shared across all of them; the design win is building it *once*. Adopt germen's five-part response grammar and propose-tap posture throughout — see §13.

## 13. Germen as exemplar — a working reference implementation

Germen (`active/germen/`) is not just an analogy; it is a **working system that already implements the exact posture this doc argues for**, over the *same* core — it consumes `bert-generator-core` (GSR's symbolic engine) as a path dependency and machine-checks against the same Lean SSF (K≅2). It is "a sovereign, fully-traceable reasoning REPL … the default build runs with no model at all — every *answer* is a derivation … an opt-in, self-retiring LLM tap may *propose* new knowledge for your review, but never answers." That sentence is the bert-lenses LLM thesis, already shipped. Verified against `germen/README.md` + `germen/CLAUDE.md` (architecture-level; not every crate line).

**The concrete patterns to adopt (each already realized in germen):**

| bert-lenses need | Germen's realized pattern | Lesson |
|---|---|---|
| Analysis output = traceable, not prose | The **five-part Response** (`germen_core::handle` → **Answer · Trace · Evidence · Visual · Next Actions**): Trace = which engine + steps ("X because Y because Z"); Evidence = citations with provenance / constraint results | The analysis capability's output should BE this shape: answer, which kernel check/fact grounds it, the cited `issue_target`/`EdgeFact` provenance, the highlighted canvas elements, next actions. Never opaque prose. |
| LLM proposes, kernel disposes | The **propose tap** (`--features llm`, `germen-core::propose`, `Drafter`/`HalDrafter` via the hal proxy): on a miss, a *local* model **drafts a candidate concept — never an answer**; structurally verified (every relation resolves; a source is required); queued to `proposals/pending/`; merged only on **human accept**. Three gates: model drafts *structure* · machine checks *structure + source* · human checks *meaning*. | This IS #10's "suggest a primitive, author confirms," fully mechanized — draft/verify/queue/accept. Reuse the shape (and possibly the `Drafter` trait) for bert-lenses authoring. |
| Handle uncertainty without hallucinating | The **Conjecture engine**: a graded best-guess for an unknown term, "composed only from graph facts, never asserted," always **labeled a conjecture** ([0,1] fuzzy, Yoneda-spirit) | When the kernel can't decide, the LLM must produce a *labeled conjecture composed from kernel facts*, not an unlabeled assertion. Uncertainty is surfaced and typed, not smoothed over. |
| Local-first, provider-agnostic routing (§10) | The `Drafter` trait, `HalDrafter` via the hal proxy; off by default, off without a key | Validates §10: the proposer is a swappable local-first tap behind a trait, routed through hal/GSR — not a hardcoded client. |
| Automation-bias antidote (§9) + accretion | The **coverage dial**: `self_sufficiency` = fraction of queries resolved *without* the model, shown live, climbing toward 100% as accepted drafts crystallize into permanent deterministic concepts. The model ships with a **retirement condition** — "replaced not by a better model, but by the crystallized output of its own work." | The sharpest idea to steal. Measure the fraction of analysis/authoring resolved deterministically (kernel checks like #66) vs needing the LLM; every *accepted* LLM contribution becomes a permanent deterministic fixture (a fixture model, a named pattern, a new kernel check). The LLM works itself out of a job — automation-bias defense and accretion, made *measurable*. |

**The reframe germen gives the whole plan:** the bert-lenses LLM layer is *germen's posture applied to a visual authoring canvas.* The **analysis** capability is germen's `ask` scoped to one model (deterministic engines produce a five-part traceable derivation; the LLM narrates only what the kernel can't). The **authoring** capability is germen's `propose` tap targeting the canvas (draft structure → machine-verify → human-accept → crystallize). Because they share the symbolic core and the Lean SSF, this is not just inspiration — germen's `Drafter` trait, its five-part `Response` type, and its coverage-dial instrumentation are candidate **code to reuse**, not just patterns to imitate. The two tools are siblings: germen runs reasoning with no model; bert-lenses runs authoring with the model strictly on top. Same seed.

**Caveat / next step:** this mapping is grounded in germen's README + CLAUDE.md (architecture), not a line-level read of `germen-core::propose` / the `Response` type. Before reusing code (not just patterns), read those two directly — but the architectural fit is verified and strong enough to shape tomorrow's first rung: **emit the five-part response, and instrument a coverage dial from day one.**
