# LLM-market prediction ledger

**Status: LIVE**

One entry on the record (P-0001, owned 2026-10-11 at 80%). Entries are
append-only; a resolution is added at the horizon and never before.
This file defines the format so that when the model makes on-the-record
claims, they land somewhere auditable. The bar for an entry is a calibrated
model plus a claim someone would actually check later.

## Why a ledger

The llm-market model exists to (1) reflect market state realistically,
(2) update from real data (the demo bundle's forcing CSV is the seam), and
(3) eventually make predictions on the record. A prediction that can be
quietly revised is not on the record. So: entries here are append-only,
dated, and keyed to the exact model that made them — the
`OperationalSpec::content_hash()` of the minted model, the same key that
makes stale traces refuse to pose as current. A structural edit changes the
hash, so a prediction cannot silently inherit credit from a later model.

## Entry format

```markdown
## P-0001 — <one-line claim>
- **Date:** YYYY-MM-DD
- **Model:** llm-market @ <spec content hash>
- **Data window:** <what the forcing series covered, with sources>
- **Claim:** <quantity, direction, magnitude — falsifiable as stated>
- **Horizon:** <date by which it resolves>
- **Confidence:** <percent>
- **Resolution (added at horizon, never edited before):** <what happened,
  with the measurement source>
```

## Calibration state (2026-10-10)

The model is the level-0 identification of the serving market (Mobus ch. 6):
one system that serves tokens, with its output leaving through two interfaces
that differ in what a sensor can see. Every number in the source
(`assets/examples/llm-market.sl`) carries a `grounding` line, and a finding
quotes it.

The model is two levels, and a run is per level:

- **The shipped parent** (`assets/examples/llm-market.sl`) is drawn at pool
  grain: the Router splits routed workload between frontier serving and
  open-weight serving (254 : 746, the classified frontier and open tokens of
  vintage 2026-10-10's latest full month, 2026-09, as parts per thousand),
  Self-hosting carries the placeholder to open-weight serving only, and
  each serving subsystem is one process. The routed level is the same
  month's tokens per observed day, 19,197 Gtok/day; a vintage refresh
  re-mints both in the same PR (`assets/data/README.md`, rule 6; #534). Its
  trace reads frontier serving at 4876.04 Gtok/day (19197 × 254/1000) and
  open-weight serving at 17320.96 (19197 × 746/1000 + 3000), with every
  Gtok of compute dissipated and the ledger balanced.
- **The two children** (`assets/walkthroughs/llm-market/frontier-serving.sl`
  and `open-weight-serving.sl`), referenced from the parent's `decomposes`
  lines, carry the per-model roster behind a pool each, with the per-model
  shares and groundings of the digest. Each child's workload source declares
  the parent's realized flow (4876.04 and 14320.96, two decimals, with a
  grounding that says so), so each child run on its own gives every model
  its share of the single-level model's roster split at the parent's level
  (Qwen 4169.9, Opus 1253.8, DeepSeek 5132.1 Gtok/day).
  `crates/facets-canvas/tests/llm_market.rs` holds the shares within 0.1%
  against `assets/archive/llm-market-flat.sl`, the single-run witness, which
  stays at the digest's level as a record; the residue is the two-decimal
  rounding of the realized flows.
- **How the levels agree, and how they can drift.** The engine runs one
  model's own flows and never descends into a child, so a knob turned at the
  parent (the Router's split, a workload) moves the parent's trace and
  nothing below it until the realized flows are carried down by hand. The
  same gate fails when they are not. Single-run substitution, where the
  parent's realized flows would drive the children in one run, does not
  exist yet. A prediction keyed to a per-model quantity therefore names the
  child model's hash; one keyed to the frontier-against-open share names the
  parent's.

- **Routed interface — third-party.** The routed workload (19,197 Gtok/day)
  and the Router's frontier-against-open split come from OpenRouter
  rankings-daily, vintage 2026-10-10, month 2026-09 (as of
  2026-10-11T00:27Z); the per-model shares inside each child still come
  from the Dirac labs-market-share digest of OpenRouter rankings, June–July
  2026, where sources disagree on Anthropic's share (12–24%) and the
  midpoint is taken. The demo bundle's forcing CSV
  (`assets/demos/llm-market.json`) drives this interface and no other; since
  vintage 2026-10-10 that bundle is the observed OpenRouter series itself
  (routed level and the Router's split, monthly), regenerated from the
  vintage by the sensor (`assets/data/README.md`).
- **Self-hosted interface — unknown.** No public sensor counts self-hosted
  serving. The amount is a labelled placeholder (a round half of the routed
  figure) and the split across the open models is asserted to mirror the
  routed open split. No prediction may quote either number until a measured
  series replaces them; the flow is in the model so that the boundary is not
  cut to what the router sees, which would bias the open-weight share low on
  exactly the flow the commoditization question is about.
- **Self-hosted interface — evidence attached (2026-10-11, facets#523).** The
  value stays `unknown`. Two proxies were scoped from sources; one is built,
  one refused. The open-weight download proxy (HF, 30-day), vintage
  2026-10-11, reads `qwen3` 196.9M, `gemma-4` 36.8M and `llama-3` 17.0M
  downloads in the window, per family across the classified labs, grade
  `third-party`; the local-runtime pull proxy (Ollama, cumulative) is refused
  because ollama.com's terms forbid "automated means to access our services
  without permission" (the hand-read figures in the #523 comment, llama3.1
  120M, deepseek-r1 94M, qwen3 40M pulls, are not a vintage). Neither counts
  tokens, machines or share; both are a ranking and, from the second monthly
  pull, a direction. The bracket on the self-hosted share of all serving comes
  from the two denominators the comment names, and both are weak: Tunguz's
  1–3% is "from thin air" by his own words, and OpenRouter's study puts about
  a third of inference through routers while saying it "excludes locally
  hosted deployments", so the self-hosted flow is unmeasured at both ends.
  Files, counting rules and what each proxy is not: `assets/data/README.md`,
  "Open-weight download proxy (HF, 30-day)" and "Local-runtime pull proxy
  (Ollama): refused".
- **Price — absent.** The model draws no money counter-flow, so price cannot
  be a readout of the run. It enters through the observatory's data until the
  money plane is a word of the language (see `assets/examples/federal-reserve.sl`).

The two-channel model this replaced (developer and enterprise channels,
enterprise from spend surveys) is archived as
`assets/archive/llm-market-channels.sl`; its calibration note is retired with it.

## Watch items

External evidence worth tracking for model dynamics. Not predictions — no
hash key, no horizon. When a watch item hardens into a claim the model can
state, it graduates to the ledger.

The routed interface now has a sensor (facets#529): OpenRouter rankings-daily
as a pinned vintage, aggregated to a daily open-weight share range and a
monthly forcing bundle for the Router's outwires. Files, rules and what the
sensor is not: `assets/data/README.md`, "OpenRouter routed-share vintages".

### W-0001 — Reward-channel mix as a market dynamic (Kun Chen thread)

- **Date:** 2026-08-04 (thread posted 2026-08-02, ~265K views)
- **Source:** @kunchenguid on X — "newer models have become worse to talk to"
- **The claim:** RLVR (machine-verifiable rewards) is displacing RLHF (human
  preference) in frontier training because it scales, and conversational
  quality is degrading as a side effect ("alignment tax" in reverse).
- **Caveat on the evidence:** his cited symptoms (verbosity, unrequested
  extras) are classic RLHF/length-bias artifacts, not RLVR ones, and
  human-preference optimization produced the sycophancy failures — both
  reward channels are Goodharted proxies. Treat the mechanism as plausible,
  the symptom attribution as weak.
- **Why the observatory cares:** if real, this is a training-pipeline input
  the model doesn't represent — reward-channel mix upstream of product
  quality, differentially hitting the chat/consumer channel vs the agentic
  channel. It is also harness-layer value migration seen from inside the
  pipeline: RLVR eats every domain where outcomes can be prestated as
  checks, so value moves to whoever writes the checks.
- **What would harden it:** measured divergence between conversational and
  agentic quality metrics across model generations, or a lab disclosing its
  RLHF/RLVR compute mix.
- **Adjacent field evidence (2026-08-04):** Dell'Acqua et al., "The
  Cybernetic Teammate," *Organization Science* 37(4):1217–1242 (P&G field
  experiment, in Zotero) — decomposed the innovation funnel and found AI
  boosts idea-generation quality strongly while *degrading* the user's
  selection accuracy (~50% → ~37% picking their own best idea), with
  aggregate outcomes still improving, so the erosion is invisible without
  a staged design. Causal support for the judgment-stays-human seam on the
  evaluation axis; proposed mechanism (sycophantic validation) is the
  RLHF-side Goodhart, complementing this item's RLVR-side mechanism.
  Caveat: GPT-4-in-2024 capability level; structure durable, magnitudes
  stale.

### W-0002 — Open-weight price collapse on rubric-legible tasks (OpenDesign arena)

- **Date:** 2026-09-10 (thread posted 2026-09-09)
- **Source:** @OpenDesignHQ on X + open-design.ai/llm-arena-for-design
  (operator: Powerformer, Inc.)
- **The numbers:** human-judged design prototypes (30 pts brief
  fulfillment, 70 pts design quality; 80+ = "deliverable"). GPT-6 Astra
  82.7 at $1.61/task; DeepSeek V4.1 Flash 81.2 at $0.023/task, 5.3 min;
  Claude Fable 5.1 80.3 at $3.66/task. Every model except Astra scored
  lower than Flash AND cost more.
- **The claim:** on tasks with a legible rubric, open-weight quality has
  converged with frontier at ~1/70 the price, so the frontier premium is
  now paid only for the last ~1.5 points.
- **Caveats on the evidence:** (1) the operator sells a workspace that
  routes to these models, so a "cheap is nearly as good" result is also
  its margin story; (2) task class is prototype generation of web apps,
  dashboards, landing pages — style-visible, reasoning-light; says
  nothing about long-horizon agentic work; (3) dispersion is large —
  Flash is #10 on dashboards/admin panels (76.1), ahead of Astra on
  landing pages; (4) "open" means cheap to rent here, not weights you can
  run at daily-driver size.
- **Why the observatory cares:** direct evidence for the model's
  developer-channel price dynamics — the open-weight share is driven by
  price-per-quality on tasks where quality is checkable, which is the
  same mechanism as W-0001 (RLVR eats what can be prestated as a check).
  The enterprise-channel spend proxy will under-read this shift by
  construction (spend at one-tenth prices).
- **What would harden it:** a second independent human-judged benchmark
  on a different rubric-legible task class showing the same gap; or
  OpenRouter share data for V4.1 Flash moving in the weeks after release.
- **Cross-refs:** vault `strategy/modeling-tools-landscape.md` (fidelity
  over fluency — the rubric here IS the check; selection moves to the
  buyer) and `strategy/post-astra` positioning (generation commoditizes
  where the statement is mature).
- **Note (2026-10-11):** written against the retired two-channel model
  (developer and enterprise channels; see "The two-channel model this
  replaced" above). Against the current model the item reads on the routed
  interface: the mechanism is price-per-quality moving the open-weight share
  of routed tokens, which the sensor (facets#529, `assets/data/`) now
  measures monthly. The "OpenRouter share data for V4.1 Flash moving"
  hardener is therefore readable from the vintage (by permaslug in the daily
  file, by lab in the by-lab file) rather than awaited; the enterprise-spend
  sentence names a channel the model no longer carries.

**Note 2026-10-21 (#523): the shipped model gained the routed buyers.** One
aggregate agent watches the routed workload as it arrives (spec v1.14) and
writes the Router's split. Under its bound it holds the vintage's frontier
share, 0.254, so the run of the shipped model is the run P-0001 was made on,
flow for flow and tick for tick. The spec is new all the same, and its
content hash is `3827070971861594749`; P-0001 stays keyed to
`2992006368205948209`, the model it was made on, which the ledger's rule
exists to keep (the projection minted before this change still hashes to it,
recomputed 2026-10-21). The buyers' bound (30,000 Gtok/day) and the split
above it (0.2) are a placeholder graded `unknown` in the file; no entry here
may rest on them until a vintage observes buyers answering volume or price.

## Ledger

### P-0001 — Open-weight share of routed tokens stays at or above 0.60 through 2027-03

- **Date:** 2026-10-11
- **Model:** llm-market @ 2992006368205948209 (`OperationalSpec::content_hash()`
  of `assets/models/demos/llm-market.json`, the minted projection of
  `assets/examples/llm-market.sl` as re-minted from vintage 2026-10-10)
- **Data window:** OpenRouter rankings-daily vintage 2026-10-10,
  2025-01-01 → 2026-10-09, classified 85% of routed tokens
  (`assets/data/openrouter-routed-share-monthly-vintage-2026-10-10.csv`;
  Rankings data by OpenRouter, as of 2026-10-11T00:27Z)
- **Claim:** The open-weight share of routed tokens on OpenRouter (high end
  of the classified range, monthly) stays at or above 0.60 for every full
  month from 2026-10 through 2027-03
- **Horizon:** 2027-04-15
- **Confidence:** 80% (set by the owner, 2026-10-11)
- **Resolution (added at horizon, never edited before):**
