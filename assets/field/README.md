# From the field — models drawn with someone, for them

*Since the #472 fold (2026-10-09) these models have no shelf of their own: each sits on its domain shelf in the library wearing a `with <name>` marker, and search finds it by name. Provenance is a fact about the card, not a section.*

A model ships here because it was **drawn with a person, on a call or across a
table, and that person should be able to open it afterwards and keep going.**
That is the whole admission test. It is not the examples' test (the smallest
witness of a kernel distinction, `../examples/README.md`) and not the corpus's
(a cited transcription of a published figure, `../corpus/README.md`). A field
model is a domain exemplar with a provenance line, nothing more is claimed for
it, and nothing less is accepted.

## What a file must carry

- A first comment line in the form `# field · with <who> · <YYYY-MM-DD>`. The
  shelf reads it; a file without it does not ship (`web/src/field.test.ts`).
- A `system "<Name>" : <Kingdom>/<Genus>` line and a `domain "…"` line, which
  the card takes its title and blurb from — the same parser as the examples.
- A clean compile. The CI sweep (`scripts/wasm_exec.mjs`) drives every file
  here through the wasm boundary the app uses, as it does the examples.

Warnings from a lens verdict are allowed and are part of what the person will
explore; refusals are not.

## How one gets here

Export the model from the app (File → Export walk (.sl)), put the provenance
line at the top, drop the file in this folder, and the shelf picks it up with
no code change. A model that later earns a place on the examples shelf moves
there under that shelf's rule and leaves this folder.

## Entries

| File | With | Date | Lens | What it is |
|---|---|---|---|---|
| `hal-harness.sl` | Shingai | 2026-07-24 | Bunge | hal, the sovereign-AI harness, one level down: proxy, council, bench, fine-tune pipeline, homeostat; the endo/exo split and the one-way mirror. Drawn for its author; moved here from the examples shelf 2026-10-10 (#472: "mostly for me"). |
| `organic-universal-health-cover.sl` | Luke | 2026-10-01 | Mobus | A decentralised universal-coverage prototype: enrolment from civil records, income-proportional contributions split between member-owned risk pools and personal health accounts, catastrophic reinsurance across pools, posted prices and audited outcomes. Two Mobus warnings on message flows into non-consuming primitives, left for the exploration. |
