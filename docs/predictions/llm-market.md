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

## Ledger

*(empty)*
