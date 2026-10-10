# The shipped examples — and the rule that keeps this directory small

**A model ships here iff it is the smallest witness of a distinction the
kernel can make.** Everything else is archive material, retired with its
finding recorded in `../archive/README.md`.

That is the whole admission test. Not "is it interesting", not "did someone
put work into it", not "does it demonstrate the app" — those were the
questions that grew the library to 21 models before the August 2026 curation
(#318) cut it to this set. A model earns its slot by showing something the
kernel distinguishes that no smaller shipped model already shows; when a
second model witnesses the same distinction, the smaller one stays and the
other retires with its finding written down. The archive has always been
curated as if this rule existed; this file states it so the next pass does
not have to rediscover it.

One admission under the rule since the dynamics bench (facets#463, 2026-10-09):
`rain-barrel-garden.sl` is the smallest model in which a stock, a release, a
capacity, a matched throughput and an energy drive all show in one readout
with declared amounts — two inflows, one stock, one work process, one harvest.
It is the model the bench is tested by feel on: every knob moves the harvest,
and the ledger reads by eye. It is not a claim about horticulture. It is
written in the split form: the gutter, the canopy and the garden gate are
pass-ways (`interface` lines), and the barrel and the bed are plain
residents, so the shelf carries one model where the boundary is not the
same thing as the processors behind it.

`llm-market.sl` ships as the one data-fed observatory model, rewritten
2026-10-10 as a level-0 identification (Mobus ch. 6) and gated by
`crates/bert-canvas/tests/llm_market.rs`. Its admission is the boundary it
carries: served tokens leave through two interfaces that differ in what a
sensor can see, a routed one with third-party counts and a self-hosted one
with none, and every number in the file carries a `grounding` line saying
which. No smaller shipped model has an output interface the sensors cannot
see; the two-channel version it replaced is in the archive with its finding.

A third shelf with its own test since 2026-10-10: `../bench/` — models that exist to test the instrument, each after a named model in the literature, admitted for what they exercise rather than what they are.

Two consequences worth naming:

- **Retirement is not deletion.** An archived model keeps compiling, keeps
  running from the CLI, and — when it carries a fact no shipped model does —
  keeps being read by a gate, marked HELD in the archive README. The gallery
  is what ships; the archive is how the language was learned.
- **The corpus is a different category.** `../corpus/` entries are cited
  transcriptions of published figures (Klir, Bunge, Mobus), evidence for the
  K≅2 program — not learning artifacts of ours. The rule above does not apply
  to them, and trimming one deletes a data point.

The keep set is asserted by name in `web/src/examples.test.ts` — adding or
retiring a model here means updating that assertion, which is the gate doing
its job.
