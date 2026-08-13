# Visual language

**Status: ADOPTED**, substantially revised 2026-08-12; subordinate to [`../../web/DESIGN.md`](../../web/DESIGN.md).

The register is a **considered scientific instrument** — a ledger, a spec sheet,
a plate in a monograph. Not a dashboard template, and not a blank page.

Adopted 2026-07-24 from a three-way treatment bake-off on the shelf page. This
file is the spec; `web/scripts/check-tokens.mjs` is the gate that keeps it.

## The 2026-08-12 pass

A walk through all four doors, logged impression by impression, then acted on.
Two things changed at the level of this document.

### 1. Colour stopped being a surface treatment

The finding, on the landing page: the accent hue was doing three structural jobs
at three lightnesses — identity (a filled band), ground (a tinted page),
structure (tinted header strips) — so nothing on screen was neutral and the hue
signalled nothing. The verdict was *"does not look professional."*

The same finding then repeated on the workspace, where the per-lens **world
tint** put a wash on the canvas and a tint on the chrome: *"I land on Mobus and,
like, swimming in green, it's overwhelming."* It was retuned once (22%/11% →
12%/2.5%) and that was still too much. It is now **withdrawn for every lens**:
chrome and wash resolve to the plain surface, and node strokes are ink.

What replaced it, everywhere:

- A white sheet on a neutral ground, one step apart, so content has an edge
  without a border, a shadow, or a tint doing the work.
- Surface tokens with **no hue cast**. The old faintly-indigo Frost surfaces read
  as blue-green next to the sheet, and made the canvas look coloured before any
  lens touched it.
- Colour only where it names something. If a colour cannot say what it means, it
  is a bug.

### 2. A withdrawn doctrine, recorded so it is not re-derived

A second bake-off ran on the landing page, and the winning arm was built on a
**printed-page brief** — paper ground, display serif carrying the title, roman
folios, a narrow measure, a rubric rule opening every title block. That brief was
written by Claude for the blind pick. The owner picked the **artifact**; he never
saw or endorsed the thesis behind it.

It was then written up here as adopted doctrine and used as a constraint on
further work. Asked directly, the owner did not recognise any of its devices as
something he wanted: *"I'm not aware that I necessarily cared about any of
those."* All of them were removed the same day.

**The lesson, which is the reason this section exists:** a blind pick licenses
the artifact, not the brief behind it. Do not promote a winning arm's rationale
into a rule the owner never stated. What a pick supports is exactly what the
judge said about it, and no more.

The withdrawn devices: the rubric rule above every title block, the display serif
on mastheads, the italic serif lede, roman folios on contents rows, and the
narrow reading column. What survived is what was independently confirmed: the
white sheet, the neutral ground, and meaningful colour.

## Where colour is allowed

Colour is a **signal channel**, never a surface treatment:

- `--seal` — the underline on a **selected filter facet**, and the `runs` tag
  that marks the models which actually execute. Both name something.
- `--world-klir` / `--world-bunge` / `--world-mobus` — the **tradition** a corpus
  model belongs to, in the library. Contractual across the instrument, so a
  reader learns it once. An example is ours and belongs to no tradition, so it
  carries **no** hue; the absence is the fact.
- `--lens-accent` — the **active lens**, on interactive chrome only: the lens
  toggle, armed tools, rims, handles. Never a surface.
- `--verdict-*` and `--kind-*` — unchanged, and still reserved. `--kind-*` in
  particular is constant across lenses AND themes, because substance identity
  must not shift with a theme.

Everything else is ink, paper, and two weights of rule.

## Reserved channels

A **reserved channel** is a visual dimension the instrument has spent on one
meaning and may not spend again. Two are reserved.

| Channel | Carried by | Says |
|---|---|---|
| KIND | `--kind-*` hue, on the stroke and its arrowhead | which substance |
| BONDHOOD | the **arrowhead**: present or absent | whether the relation bonds |

### Why bondhood earned one (#320)

On 2026-08-12 the kernel refused a drafted ribosome model — `interface 'Large
Subunit' carries no boundary-crossing flow` — while the canvas plainly showed two
lines touching that component. A domain expert and the assistant both concluded
the kernel was wrong. It was right: both lines were authored `mere`, and a mere
relation does not bond.

The canvas drew relations, the kernel reasoned about bonds, and nothing on
screen told them apart. Colour had a whole contractual channel for *substance
kind*, which is descriptive, and bondhood — which in Bunge is what separates a
system from an aggregate — had none. That inversion was the defect.

### The rule, per lens

**An arrowhead asserts a bond.** A `mere` relation stays fully visible (it was
authored deliberately) and terminates instead in an open `coupling` cap at both
ends — adjacency, with no end that is the receiving one. What that rule means
differs by tradition, and it is left differing on purpose: the traditions
disagree about bondhood, so a uniform chrome would be the flattening this
instrument exists to avoid.

- **Mobus — arrowhead ≡ bond, no exception.** N *is* the flow set, a bond is a
  flow, a flow is transport. A mere relation additionally loses its substance
  colour, because `mere` is Bunge's construct and *never projects* under Mobus
  (`docs/language/spec.md` §4.4): it lands in neither N nor G, so naming a
  substance on it would name something this lens cannot see. Its label reads
  `∉ N ∪ G` rather than the flow-set tag a bond carries.
- **Bunge — arrowhead ≡ bond, but the arrow means less.** A bond is a *coupling*;
  it says which thing acts on which, and it need carry nothing. A bond that
  transports nothing is coherent here and incoherent under Mobus. Mere relations
  keep their muted hairline and lose the head.
- **Klir — exempt, deliberately.** `(T, R)` draws no bond/non-bond line; every
  authored relation is in R and `describe` counts them all. Encoding bondhood
  here would import a Bunge construct into Klir's chrome. So under Klir a mere
  relation renders *exactly* like a bond, and the arrowhead means something else
  entirely — that the observer toggled the relation directed. **The rule is
  lens-relative, not global.**

Counts are stated before any refusal exists: the compile chain's step 2 reads
`14 relations (12 bond · 2 mere)`, and the model's About block names the split in
the active lens's own vocabulary (flows / bonds / relations).

### The meta-rule this produced

**A channel is specified by its PURPOSE and bound by a CHECK — never by a
mechanism standing in for the purpose.**

The KIND channel's contract reads "identical hex across themes" when what it
means is *"a substance is recognisable as the same substance anywhere."* In dark
the stated mechanism defeats the stated purpose (#321): a hue held constant
against an inverted ground is not the same colour to a reader. A contract
written as a mechanism cannot notice that, because the mechanism is satisfied.

So a channel spec owes three things:

1. **The purpose**, in a sentence about what a reader can tell.
2. **The mechanism**, marked as an implementation of that purpose and revisable
   whenever it stops serving it.
3. **A check with a separating instance** — a model where the distinction is
   genuinely present, made to fail on purpose once. Bondhood's is
   `web/src/canvas/bondhood.test.tsx` over the 2026-08-12 ribosome shape, with
   the fixture's own bond/mere split asserted in
   `crates/bert-canvas/tests/issue_codes.rs` so the check cannot be defanged by
   repairing the model out from under it.

## Rules

1. **Straight edges.** Corner radius is capped at 8px (`--radius-md`). The
   blocks themselves are square; only chips (`--radius-sm`, 4px), inputs, and
   popovers round at all. Pill geometry (`--radius-pill`) is a different thing
   and stays allowed.
2. **Modular regions.** A page is blocks with edges, not text floating on one
   ground. Every region opens on a header and closes on a rule. A block that ends
   nowhere is not a block. The header is a label over a rule, not a tinted fill.
3. **Discrete rows.** Rows are separated by real rules, never by whitespace
   alone. The runner-up treatment failed on exactly this: "the model list blends
   into each other a bit too much." The gutter numeral stays, untinted; the rule
   does the separating, and the tint never was what did it.
4. **Colour names something or it is absent.** Supersedes the former "colour with
   surface area." Accent no longer arrives as a filled region on any surface, and
   there are still no gradients.
5. **Flat.** Panels sit on a rule. The only permitted lift is the near-flat
   `--shadow-card` / `--shadow-card-hover`.
6. **The identity device is the title block.** A page with a name opens on its
   title, in the body face, with a lede beneath and a head rule closing the
   block — no filled band, no eyebrow above the product's own name, and a number
   only where a count is the reason to be on the page. Home carries no count;
   the library does, because there the page IS the inventory.
7. **Authored case survives.** Names are data. The ledger sets them in
   `font-variant-caps: small-caps` for an even column; `text-transform:
   uppercase` is forbidden on any name, because it prints `hal` as `HAL` and the
   model is named `hal`. Uppercase is for fixed UI copy (section labels) only.
8. **Navigation is not a hierarchy when a list will do.** The library was two
   sections of shelves, drilled into by genus and by author. It is now one flat
   list partitioned by **provenance** (ships with the app / yours), with genus and
   tradition as tags plus a filter. The reason is durable: on release a bundle
   ships a handful of models and everything else is the user's own, so provenance
   is the split that will still matter.

## Rejected, and why

- **Rounded elevated cards** (treatment 2) — "just looks like an LLM made it."
  Big radii plus drop shadows is the generic web-app default; it reads as
  unconsidered regardless of what is on the card.
- **Flat and white** (the baseline) — "too boring." **Read this one carefully:**
  it was cited in 2026-08-12's briefs as evidence that restraint would lose, and
  it did not. The rejection was of the UNDECORATED, not of the RESTRAINED, and
  conflating those two cost a design pass. A quiet page can still be authored.
- **The per-lens world tint** — "swimming in green." Tinting a work surface by
  lens was tried at two strengths and withdrawn at both. The tokens survive in
  `index.css`, so restoring it is a value change in one block, but the finding is
  that a modeller looks at the canvas all day and it should not argue a position.

## The gate

`npm run check:tokens` fails the build on: radius above 8px (Tailwind class,
arbitrary value, or `borderRadius` string), any `boxShadow` outside the two
`--shadow-card*` tokens, any Tailwind `shadow-*` utility, and any
`linear/radial/conic-gradient` in `web/src/**`. Authored case is held by a test in
`web/src/HomeScreen.test.tsx` rather than a grep — it is a claim about data, not
about a token.

**Bondhood is held the same way**, by `web/src/canvas/bondhood.test.tsx`, and
deliberately not by `check:tokens`. The gate reads tokens and utility classes; a
grep for "no arrowhead on a mere relation" would have to guess at a render
decision spread over three files and would pass on markup that violates the rule.
The test reads the rendered SVG and counts arrow-terminated paths, so it fails on
the thing the reader actually sees. Same precedent, same reason.

Tokens themselves live in `web/src/index.css` and are mirrored in
`web/src/tokens.ts`; this language adds no colours.

## Open

- **Dark theme is unverified by eye.** Every token is declared for both schemes,
  but every judgment this pass was made in light.
- **The reading pages and the workspace still differ in typography.** Mastheads
  are set in the body face; model names and door labels are still serif. That
  mix is undecided, not intended.
- **The inspector dock's contents clip** at the right edge on a narrow window.
  Separate from the tab-strip overflow already fixed.
- **No test binds the inspector dock's collapse behaviour**, which is now the
  most conditional layout logic in the app — and it regressed once already, on
  the same day it was written.
