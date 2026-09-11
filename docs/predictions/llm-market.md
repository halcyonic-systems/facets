# LLM-market prediction ledger

**Status: PROPOSED**

Scaffold only — zero predictions recorded. This file defines the format so
that when the model starts making on-the-record claims, they land somewhere
auditable. No rush: the bar for the first entry is a calibrated model plus a
claim someone would actually check later.

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

## Calibration state (2026-07-28)

Current numbers and their provenance live in the model source
(`assets/examples/llm-market.sl`) and demo bundle
(`assets/demos/llm-market.json`): developer channel from OpenRouter-scale
observations (~6 Ttok/day, mid-2026; sources disagree on Anthropic's share,
midpoint taken), enterprise channel from Menlo Ventures spend shares used
as a workload proxy (known bias: spend understates open-weight workload at
one-tenth prices). The enterprise absolute level is the weakest number in
the model and should be replaced by a measured series before any prediction
touching it.

## Watch items

External evidence worth tracking for model dynamics. Not predictions — no
hash key, no horizon. When a watch item hardens into a claim the model can
state, it graduates to the ledger.

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

## Ledger

*(empty)*
