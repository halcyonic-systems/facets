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
