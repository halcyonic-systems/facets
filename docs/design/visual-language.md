# Visual language

**Status: ADOPTED**, revised 2026-08-12; subordinate to [`../../web/DESIGN.md`](../../web/DESIGN.md).

The register is a **considered scientific instrument** — a ledger, a spec sheet,
a plate in a monograph. Not a dashboard template, and not a blank page.

Adopted 2026-07-24 from a three-way treatment bake-off on the shelf page. This
file is the spec; `web/scripts/check-tokens.mjs` is the gate that keeps it.

## The 2026-08-12 revision — the reading pages are set, not painted

A second three-way bake-off, this time on the landing page, changed how the
**reading pages** (home, library, shelf, about) carry identity. The finding that
forced it: the accent hue was doing three structural jobs at three lightnesses —
identity (the filled band), ground (the tinted page), structure (the tinted
header strips) — so nothing on screen was neutral and the hue signalled nothing.
The verdict was *"does not look professional."*

The winning treatment is a **printed record**: paper ground, ink text, the serif
carrying the title at a size nothing else approaches, hairline rules for
structure, a narrowed measure, and roman folios on the contents. Identity comes
from **type** — family, scale, rhythm — not from a painted field.

This does **not** reinstate the "flat and white" treatment rejected below. That
rejection was of the UNDECORATED; this is the COMPOSED. The two were conflated
in the original write-up and the bake-off separated them: a page can be quiet and
still be authored, and the difference is typographic structure, not colour.

Scope: the reading pages only. The **workspace** (canvas, docks, toolbar) keeps
the Frost tokens and the per-lens seam unchanged — it is an instrument panel, not
a page, and it has not been re-judged.

### Where colour is allowed now

Colour is a **signal channel**, never a surface treatment:

- `--seal` — one rubric rule opening a title block, and the mark under an
  interactive folio. This is the only decorative-adjacent stroke on the page,
  and it is a single 2px rule.
- `--world-klir` / `--world-bunge` / `--world-mobus` — the tradition a corpus
  shelf belongs to, on the shelf index and on that shelf's rubric rule. Already
  contractual across the instrument, so a reader learns it once. An examples
  shelf is ours and carries **no** hue; the absence is the fact.
- `--verdict-*` and `--kind-*` — unchanged, and still reserved.

Everything else is ink, paper, and two weights of rule. If a colour on a reading
page cannot name what it means, it is a bug.

## Rules

1. **Straight edges.** Corner radius is capped at 8px (`--radius-md`). The
   blocks themselves are square; only chips (`--radius-sm`, 4px), inputs, and
   popovers round at all. Pill geometry (`--radius-pill`) is a different thing
   and stays allowed.
2. **Modular regions.** A page is blocks with edges, not text floating on one
   ground. Every region opens on a header strip and closes on a rule. A block
   that ends nowhere is not a block. *(Reading pages, from 2026-08-12: the
   header strip is a label over a rule rather than a tinted fill. The block
   still has to end somewhere.)*
3. **Discrete rows.** Rows are separated by real rules, never by whitespace
   alone. The runner-up treatment failed on exactly this: "the model list blends
   into each other a bit too much." *(Reading pages, from 2026-08-12: the gutter
   numeral stays, but untinted — a folio in the margin. The rule does the
   separating; the tint was never what did it.)*
4. **Colour with surface area.** *Workspace only, from 2026-08-12.* On the
   instrument panel, accent still arrives as a filled region rather than a 1px
   rim, and there are no gradients: colour has an edge, not a fade. On the
   **reading pages** this rule is superseded — see the revision above; colour
   there is a signal channel and carries no surface.
5. **Flat.** Panels sit on a rule. The only permitted lift is the near-flat
   `--shadow-card` / `--shadow-card-hover`.
6. **The identity device.** *Workspace only, from 2026-08-12 — on the reading
   pages the identity device is the TITLE BLOCK (rubric rule, serif title, italic
   lede, closing head rule), not a band.* Any page with a name opens on a filled
   full-bleed masthead carrying back-link, title, and — where a count is the
   reason to be on the page — the page's one number. Home, the library browser,
   and every shelf share it. The eyebrow and the number are OPTIONAL, and home
   carries neither (2026-08-12): an org eyebrow above the product's own name is
   branding a first-run reader did not ask for, and "40 models on the shelves"
   advertises an inventory on the one page whose job is to offer three doors.
   Counts still earn their place where the page IS the inventory — the library
   browser and the shelves keep theirs.
7. **Authored case survives.** Names are data. The ledger sets them in
   `font-variant-caps: small-caps` for an even column; `text-transform:
   uppercase` is forbidden on any name, because it prints `hal` as `HAL` and the
   model is named `hal`. Uppercase is for fixed UI copy (eyebrows, section
   labels) only.

## Rejected, and why

- **Rounded elevated cards** (treatment 2) — "just looks like an LLM made it."
  Big radii plus drop shadows is the generic web-app default; it reads as
  unconsidered regardless of what is on the card.
- **Flat and white** (the baseline) — "too boring." Restraint is not the same as
  flatness. Hairlines and unfilled text on one ground gives the page nothing to
  hold, and reads as unfinished rather than austere.

## The gate

`npm run check:tokens` fails the build on: radius above 8px (Tailwind class,
arbitrary value, or `borderRadius` string), any `boxShadow` outside the two
`--shadow-card*` tokens, any Tailwind `shadow-*` utility, and any
`linear/radial/conic-gradient` in `web/src/**`. The page-ground wash in
`index.css` `body` is the one sanctioned gradient and lives outside the scanned
tree. Authored case is held by a test in `web/src/HomeScreen.test.tsx` rather
than a grep — it is a claim about data, not about a token.

Tokens themselves live in `web/src/index.css` and are mirrored in
`web/src/tokens.ts`; this language adds no colours.

## Known gap

The masthead band fills with `--accent-strong` and inks with `--text-on-accent`
(constant white). In the dark theme `--accent-strong` inverts to a light tint,
so white-on-band loses contrast. A theme-stable inverse-surface token would fix
it; none exists yet. **Scope after 2026-08-12:** no reading page fills a band any
more, so this gap survives only wherever the workspace still inks on a filled
accent.

## Open, after the 2026-08-12 revision

- The **workspace has not been re-judged.** The reading pages are a printed
  record; the canvas and docks are still Frost. Whether that reads as two
  instruments or as page-versus-panel is an open question, and the answer is a
  look at the canvas, not an argument.
- The reading pages' **dark theme is unverified by eye** — the tokens are
  declared for both schemes, but the bake-off was judged in light only.
