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

## Ledger

*(empty)*
