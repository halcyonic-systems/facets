# Docs staleness pass, 2026-10-11

**Status: HISTORICAL.** The record of one docs-accuracy pass. An audit was run against main `13ab6dd` and listed every sentence in the reference layer, the entry points, the shelf READMEs and the kernel docs that no longer matched the tree; three PRs landed before the fixes did (#536 the llm-market re-mint, #537 the self-hosted proxies, #538 the command form and spec v1.13), so every row was re-verified against main `99b9205` before it was touched. Accuracy only: no row changed voice, and no sentence was rewritten beyond the one that was wrong. The fixes are the PR this file ships in; the commit column names the grouped commit.

## The question

Which sentences in the live docs say something the tree no longer does, and which of those are false (never true as written, or true of a tree that is gone), merely stale (true once, now behind), in flight (true of a PR that was open when the audit ran), or unverifiable from this clone?

## Method

Every row below was checked against the current tree by hand before a fix: counts by `ls` and `grep` (`assets/examples/*.sl`, `assets/bench/*.sl`, `fixtures/sl/*.sl`, `fixtures/contract/sl_keywords.json`), symbols by `grep -n "pub fn"` in the crate named, exports against `crates/bert-lenses-kernel/src/api.rs` and `src/bench.rs`, branches by `git branch -a`, issue states by `gh issue view`, and the gates-oracle corpus by reading `corpus()` in `crates/bert-core/tests/gates_oracle.rs`. A row marked *disputed* is one where the audit's suggested number was itself wrong; what the tree says is recorded beside it.

Marks: **fixed** (in the commit named), **deferred** (with the reason), **disputed** (with what the tree says), **landed** (an in-flight row a merged PR made true or moot).

Commit groups in this PR: C1 entry points (`5862ff8`) · C2 language docs (`f0708bf`) · C3 shelves and data (`cda0efa`) · C4 design and decisions (`c28f1da`) · C5 provenance and kernel docs (`15f89b1`) · C6 API and editors (`af1ae9b`) · C7 lint and this record (the commit this file lands in).

## Wrong — false as written

| File:line (at `13ab6dd`) | Said | Tree says | Mark |
|---|---|---|---|
| `AGENTS.md:128` | `examples/` holds six entries | eight `.sl` files | fixed (C1) |
| `AGENTS.md:135` | `sl_demos.rs` has one resident, llm-market | `DEMOS = ["llm-market", "translation-apparatus"]` | fixed (C1) |
| `README.md:84` | the first `just dev` compiles six crates to wasm | five; `bert-cli` is excluded (`cargo build --workspace --exclude bert-cli`) | fixed (C1) |
| `README.md:206` | memory lives only in declared stocks | and in an agent's trace window since v1.12 (spec §8.3, ADR 0008 D6) | fixed (C1) |
| `README.md:509` | the 5-crate layout | six crates | fixed (C1) |
| `README.md:531` | the egui app lives on the `pre-web-rebuild` tag / `archive/egui-app` branch | the tag is on origin; the branch is not | fixed (C1) |
| `docs/README.md:25` | the SL specification (v1.5) | v1.13 | fixed (C1) |
| `docs/README.md:41` | staged files live in `assets/candidates/` | no such directory on main; it exists on branch `shelf/candidates`; admitted files are on `assets/bench/` | fixed (C1) |
| `docs/language/README.md:13` | SL turns the paragraph into eleven lines | twelve (1 system, 1 component, 5 sources/sinks, 5 flows) | fixed (C2) |
| `docs/language/README.md:76-90` | the band table claims `emit_sl` writes bands in this order, with no `agent` band and no continuation lines | `agent` lines emit after the things they name; `description`/`grounding` are indented continuation lines (spec §4.3, §7) | fixed (C2) |
| `docs/language/README.md:94` | 53 words (39 reserved + 14 position-bound) | `sl_keywords.json`: 47 reserved + 31 positional = 78 | fixed (C2) |
| `docs/language/README.md:119`, `docs/glossary.md:51` | three goldens | `sl_roundtrip.rs` pins four (`process-m`, `bathtub`, `hal-projection`, `decomposition`) | fixed (C2) |
| `docs/language/README.md:137`, `docs/tour.md:5` | a lexicon of about twenty words | 78 words | fixed (C2) |
| `docs/language/README.md:112` | the CLI list omits `bench` | `bert bench` exists (#463) | fixed (C2) |
| `docs/tour.md:27`, `:127` | eleven structure lines | `hal-projection.sl` has twelve structure lines and one annotation | fixed (C2) |
| `docs/quickstart.md:49`, `:54` | three doors: Create a model, Open a model, Documentation | `HomeScreen.tsx`: Draw your system, Build from data, Open a model, Sandbox | fixed (C2) |
| `docs/quickstart.md:167` | the strip says "Run needs data: a demo bundle, or a CSV…" | `Readouts.tsx`: "Nothing has run yet… No data is needed: the declared amounts govern until a column is bound." | fixed (C2) |
| `docs/quickstart.md:174-181`, `:195` | the Reservoir / Allocation / Homeostat demos on a Physical shelf, tagged RUNS | the three pre-SL demos retired to `assets/archive/demos/` (August 2026); the library is one tag-filtered list; the two bundled demos are LLM Serving Market and Translation Apparatus | fixed (C2) |
| `docs/authoring-models.md:212-215` | an initial stock is gated on #112 | `stock <unit> initial <n>` shipped 2026-08-15 (the doc's own update at ~245 says so) | fixed (C2) |
| `assets/bench/README.md:17-19` | ten models, staged not shipped, nothing here appears in the app, admission is Shingai's call under the examples rule | twenty `.sl` files, globbed by `web/src/bench.ts`, rendered under the Bench tag; the shelf has its own admission test at lines 3-9 | fixed (C3); the audit said nineteen, which predates #538's `logistic-harvest-quota.sl` |
| `assets/bench/README.md:13` vs `assets/examples/README.md:50` | a fourth shelf / a third shelf | three: examples, corpus, bench (the field models folded onto their domain shelves 2026-10-09, `assets/field/README.md`) | fixed (C3), "third" in both |
| `assets/examples-data/README.md:27-37` | shape only, no observed series exists yet | `assets/data/openrouter-routed-share-bundle-vintage-2026-10-10.json` exists and the demo is generated from it | fixed (C3) |
| `assets/data/README.md` (OpenRouter section, first paragraph) | the demo bundle is untouched; the vintage bundle is a separate file the gallery does not load | `bundle --demo` writes `assets/demos/llm-market.json` as a copy of the vintage bundle (the same README, two paragraphs down) | fixed (C3) |
| `assets/archive/README.md:76`, `crates/bert-tether/src/forcing.rs:977` | llm-market's bundle is minted from SL | the model projection is minted from SL; the bundle is generated from the vintage | fixed (C3) |
| `tools/pipeline/README.md:9` | seven scripts, seven CSVs | eleven `.py` files: `common.py`, the seven `run_all.sh` schedules, and three it does not (`rung2_allocation.py`, `rung3_enterprise.py`, `rung3_staircase.py`) | fixed (C3) |
| `docs/design/README.md` | hierarchical-decomposition-investigation under PROPOSED; visual-language under LIVE; coauthor-deep-analysis under plans as RESEARCH | the headers say HISTORICAL, ADOPTED, PROPOSED (M1/M2 built 2026-09-08) | fixed (C4) |
| `docs/design/lens-palettes.md:6` | the primitives are surfaced via `bert-lenses-kernel/src/lenses.rs` | `crates/bert-canvas/src/lenses.rs` (`lens_facts`, `describe`); the kernel crate only marshals | fixed (C4) |
| `docs/design/sl2-authoring-language.md:126` | parses 1:1 to `hal-projection.canvas.json` | the golden is `fixtures/sl/hal-projection.sl` | fixed (C4) |
| `docs/design/dynamics-halfb-open-composition.md:333` | joining `check_transition` | no such symbol in the tree | fixed (C4), "planned" |
| `docs/decisions/0002:60` | the egui app is on branch `archive/egui-app` | not on origin; the tag `pre-web-rebuild` is | fixed (C4), dated note |
| `docs/decisions/0004:109` | `toCanvas` is gone from `web/src/kernel/index.ts` | `index.ts:657` exports it | fixed (C4), dated note |
| `docs/decisions/0005:82` | `palette_macros()` and `by_name()` have no callers | both called from `crates/bert-compose/src/session.rs` | fixed (C4), dated note |
| `docs/lean-provenance.md:134` | `Systems/Category/` did not exist at the pin | contradicts `:20`: `SharedPrimitive.lean` is at the pin since the 2026-10-10 move, and no manifest row cites it | fixed (C5) |
| `docs/lean-provenance.md:152` | `git checkout 71a7883…` | the pin is `6ab7aba7443f82a1556d53b8b9e87a382e9cc019` | fixed (C5) |
| `docs/kernel-architecture.md:22` | five crates | six; `bert-cli` row added | fixed (C5) |
| `docs/kernel-architecture.md:34`, `:36` | "the three things" / "all four sections" | four reads, three of which the LLM story rests on | fixed (C5) |
| `docs/language/terminology-concordance.md:166` | `canvas/NodePopover.tsx:56` | the node inspector is `web/src/InspectorDock.tsx` | fixed (C5) |
| `editors/vscode/README.md:32` | the ladder's LSP tier (bert-lenses#353) | the LSP tier (facets#353) | fixed (C6) |
| `crates/bert-lenses-kernel/Cargo.toml:5` | wrappers over bert-core + bert-compose + the CSV tether | + bert-canvas + bert-tether | fixed (C6) |
| `docs/parked.md:39` | #125 "done in this change" | done 2026-07-26, `e839da7` (#246) | fixed (C5) |

## Stale — true once, now behind

| File:line (at `13ab6dd`) | Said | Tree says | Mark |
|---|---|---|---|
| `README.md:254`, `:531` | "analysis rung" | the analysis seam | fixed (C1) |
| `README.md:282-297` | the asset tree lacks bench, archive, walkthroughs, data, field; llm-market data is "the LLM-market CSV some demos are shaped around" | all five directories exist; the demo is generated from `assets/data/` by `scripts/openrouter_rankings_vintage.py` | fixed (C1) |
| `README.md:525-531` | status as of 2026-09-07; Phase 4 still in progress | re-dated 2026-10-11; Phase 4 is built (`API.md` "Phase 4 surface (built…)"); the agent layer in both forms, the bench shelf, the pooled llm-market and the routed-share sensor added | fixed (C1) |
| `docs/README.md:57`, `:59` | rung plan / Rungs 1-3 / analysis rung | stages; the analysis seam | fixed (C1) |
| `docs/README.md:103`, `:104` | "the corpus pipeline"; examples-data has only the invented CSV | the LLM-market data pipeline (off the product path); the observed vintage bundle lives in `assets/data/` beside it | fixed (C1) |
| `docs/language/spec.md:5` | as it stands at v1.10 | v1.13 (the header) | fixed (C2) |
| `docs/language/spec.md:497` (§8.3) | a trace over past readings, when it lands | the trace rule's window, v1.12; no other "when it lands" in §8.3 | fixed (C2) |
| `docs/language/spec.md:594` (§11) | design doc §5 Rung 2 | stage 2 | fixed (C2) |
| `docs/language/README.md:3` | v1.0 shipped; what v1.1 owes | v1.13; what the next revision owes | fixed (C2) |
| `docs/language/README.md:147` | the spec (v1.8) | v1.13 | fixed (C2) |
| `docs/language/README.md:166` | decomposition syntax gated on the 8-tuple math | shipped: `decomposes "label" @id`, spec §4.3 and §5.4 | fixed (C2) |
| `docs/quickstart.md:189-191`, `docs/glossary.md:19`, `:55` | one dynamics kind | qualified: the agent layer sits inside the same step (ADR 0008 D6); the Markov chain (`run_markov`, `markov.rs`) is the second run mode | fixed (C2) |
| `assets/examples/README.md:28-35` | the llm-market paragraph does not say the gallery bundle is vintage-driven | one sentence added, pointing at `../data/README.md` | fixed (C3) |
| `scripts/openrouter_rankings_vintage.py` docstring | "Four commands" without `--demo` | `--demo` named under `bundle` | fixed (C3) |
| `tools/pipeline/README.md:86`, `:161`, `:172`, `:201-205` | developer / enterprise channels; ~1/3 open-weights | the data channels the pipeline still produces; the model reads routed and self-hosted interfaces; the one-third figure is dated (vintage 2026-10-10 reads 0.74 on the routed interface for 2026-09) | fixed (C3) |
| `docs/predictions/llm-market.md:163-199` (W-0002) | developer-channel price dynamics; OpenRouter share data awaited | a dated note: written against the retired two-channel model; restated on the routed interface; the V4.1 Flash item is readable from the vintage | fixed (C3) |
| `docs/design/README.md:35` | Rungs 1-3 shipped | stages 1-3; stage 2 (controlled systems-English) open per spec §11 | fixed (C4) |
| `docs/design/lens-palettes.md:12-15`, `:634-714` (§ Agents) | agent designation gated on a source pass; agents enter as a DESIGNATE verb; "built from primitives" (`:685`) against "agency ≠ work process" (`:640`) | superseded by ADR 0008 (built `a69f1a6`): a distinct thing kind; dated note at the top of the section and at `:685`; history kept | fixed (C4) |
| `docs/design/lens-palettes.md:394`, `:499`, `:601` | `canvas.rs:425`, `canvas.rs:241`, `FormalPanel.tsx:38` | `validate_connection`, `project`, `BOUNDARY_PROPS_AUTHORING` | fixed (C4) |
| `docs/design/sl2-authoring-language.md:3`, `:5` | Rungs 1-3 shipped; a first rung | stages | fixed (C4) |
| `docs/design/sl2-authoring-language.md:13`, `:80` | `canvas.rs:165` | `pub struct CanvasModel` | fixed (C4) |
| `docs/design/sl2-authoring-language.md:211`, `:219` | decomposition is Rung 4, post-MVP | landed (#89, 2026-07-20); dated notes | fixed (C4) |
| `docs/design/dynamics-coalgebra-halfa.md:84-90` | build order unmarked | `kindCodomain` is in SSF at the pin; both readouts built (2026-07-21, 2026-07-23); `check_transition` not built | fixed (C4) |
| `docs/design/dynamics-halfb-open-composition.md:164-170` | no pointer to the agent layer | pointer to ADR 0008 and the principled position's 2026-10-10 addendum | fixed (C4) |
| `docs/design/dynamics-principled-position.md:425-437` | an unchecked W30 checklist under ADOPTED | ticked with dates: adopt (2026-07-18), Q1 (markov.rs 2026-07-24), Q2 (#54, 2026-07-18), semigroup rule (spec §8.3, `dt_invariance.rs`); RBN left open; ROADMAP Arc 4 struck (retired 2026-07-26) | fixed (C4) |
| `docs/decisions/0001:24`, `:79`, `:82` | the spike branches exist | neither `spike/svg-canvas` nor `spike/xyflow-canvas` is on origin | fixed (C4), dated notes |
| `docs/decisions/0002:104` | no as-built arch doc | `web/DESIGN.md` owns the face | fixed (C4), dated note |
| `docs/decisions/0003:31`, `:55` | the DTMC is scoped in #67 | built 2026-07-24, `crates/bert-compose/src/markov.rs` | fixed (C4), dated notes |
| `docs/decisions/0005:73` | needs-agent-layer is a gap | the agent layer exists (ADR 0008); the sweep has not been re-run | fixed (C4), dated note |
| `docs/decisions/0007:49` | the LLM market is 21 things, 38 flows | as measured then; the pooled rewrite has 12 and 12 at the parent level | fixed (C4), annotated |
| `docs/decisions/0008:108`, `:120` | "Mobus's ladder", "this rung" | one dated vocabulary note at the top; the decision text is not rewritten | fixed (C4) |
| `docs/lean-provenance.md:173-176`, `:190` | `../bert-lenses/…` paths | `../facets/…` | fixed (C5) |
| `docs/lean-provenance.md:130` | "forty-odd places" | 86 places across 43 files (counted 2026-10-11); the symbol count the audit asked for, 74, is already in the generated pin block | fixed (C5) |
| `docs/kernel-architecture.md` (`lenses.rs:NNN`, `validate.rs:NNN`, `:89`, `:5`) | line pointers; "analysis rung"; no mention of the agent layer | symbol names; the analysis seam; a dated note on the agent layer and the trace window as typed run state against the "T/H/Δt are notes" rows | fixed (C5) |
| `docs/language/terminology-concordance.md:75`, `:83`, `:84` | `theory-fidelity.md:20`, `canvas.rs:64-70` | the section name; `fn kind_to_substance` | fixed (C5) |
| `docs/language/terminology-concordance.md` (grid) | no agent/rule row | a dated note before §13: Mobus's alone, a row owed at the next revision | fixed (C5) |
| `crates/bert-lenses-kernel/API.md` | `run_rich`, `run_markov`, `check_resolution_canvas`, `mint_model_id`, `BenchHandle` (`open_forced`, `open_unforced`, `readout`, `tick_log_since`, `step_over`, `set_component_param`, `set_flow_amount`), `__install_panic_hook` undocumented; SL notes stop at v1.5; `Thing`/`CanvasModel` listings abbreviated without saying so | three sections appended; nothing above rewritten | fixed (C6) |
| `docs/parked.md:40` | #105 "already fired — needs restating" | restated: fired, no unpark trigger here, the epic is the board's | fixed (C5) |
| `docs/shelf-candidates.md:9` | "the agent rung"; "the right first rung" | the agent layer; the right first stage (caught by the widened lint) | fixed (C7) |
| `AGENTS.md:102-104`, `docs/language/README.md:151` | "edge ladder" wrapped across lines; "staged rung plan" | rewrapped; "staged build plan" (both caught by the widened lint; the fixes ride with their files in C1 and C2) | fixed (C1, C2) |

## In flight — open PRs when the audit ran

| Row | PR | Mark |
|---|---|---|
| llm-market numbers (declared amounts, the children's sources, the goldens, `docs/predictions/llm-market.md` ledger) | #536 re-minted them from vintage 2026-10-10 | landed; not touched here |
| `assets/data/README.md` proxy sections (HF downloads, the Ollama refusal) | #537 | landed; not touched here beyond the one stale sentence in the OpenRouter section |
| `docs/language/spec.md` header v1.13, §4.7 and §11 command-form text; `KnobEdit.by`, the tick log's `decisions` | #538 | landed; `:5` now matches the header, and the API.md appendix cites it |

## Unverified or disputed

| Row | What was found | Mark |
|---|---|---|
| `docs/lean-provenance.md:99` "bert-lenses#89" | inside `<!-- BEGIN GENERATED: table-decomposition -->`; the string is `tables[].title` in `docs/lean-manifest.json`, not prose | deferred: generated blocks are not hand-edited; rename the title in the manifest when the pin next moves and `just provenance` re-renders it |
| `docs/parked.md:880` "365-model corpus" | `corpus()` in `gates_oracle.rs` is 5 pinned n=3 cases + 3 × 120 random subsets = 365 | disputed: the number is correct; unchanged |
| `docs/decisions/0001` "only `calibration/spike-xyflow-canvas` remains" (the audit's note) | no branch of that name on origin or in the local checkout; `spike/sheet-figure` and `spike/view-3d` are the only `spike/*` branches | recorded as gone; the ADR's dated note says so |
| banned words in `docs/design/llm-sl-authoring-plan.md`, `llm-integration-research.md`, `epistemic-ordering.md`, `decomposition-foundations.md`, `issue-154-plan.md` | every one carries **Status: RESEARCH** | left by rule: design docs keep their register; not in the lint's scope |
| `docs/quickstart.md:183` "Ran clean · 12 ticks" | a Reservoir reading; not re-measured for LLM Serving Market | the number was dropped from the sentence rather than replaced with one not seen |
| `docs/decisions/0008:108`, `:120` | the lines had moved (now `:109`, `:111`, `:128`, `:140`) | one dated note covers them |
| `docs/language/README.md:166` decomposition "spec §4.6" (the audit's pointer) | §4.6 is `metric`; `decomposes` is a thing-line attribute in §4.3, with §5.4 the cross-level refusal | fixed with the right sections |
| `crates/bert-lenses-kernel/API.md` `Thing` listing | the audit named `rule, env_kind, interface, passway, protocol, child_model` and `CanvasModel.model_id`; the struct also carries `manages_param`, `grounding`, `scale`, `states`, `variable_kind`, `cognitive_params`, `initial_state`, `agency_capacity` | the appendix lists all of them and says the listing is abbreviated |

## What the lint now catches

`scripts/doc_lint.py`'s vocabulary gate read the LIVE set only (`README.md`, `docs/*.md`, `docs/language/*.md`) and exempted the lowercase project-phase phrases ("analysis rung", "rung plan", "staged rung", "first rung"). It now also reads `AGENTS.md` and `editors/vscode/README.md`, and those four phrases are no longer exempt; a backticked identifier carrying the word (`ladder.rs`, `ladder_stamps`, `KlirLadder`) and the bare module path `examples/ladder/lens` are. On the tree before this pass the widened gate flagged `docs/shelf-candidates.md:9` (twice), `docs/language/README.md:151` and `AGENTS.md:104`; all four are fixed in this PR. `Rung N` labels in records (`docs/parked.md`'s #150 entry, the spec's §11 pointer) stay exempt by the capitalised-label rule.
