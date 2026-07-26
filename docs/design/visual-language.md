# Visual language

**Status: ADOPTED.** Adopted 2026-07-24 from a three-way treatment bake-off; subordinate to [`../../web/DESIGN.md`](../../web/DESIGN.md).

The register is a **considered scientific instrument** — a ledger, a spec sheet,
a plate in a monograph. Not a dashboard template, and not a blank page.

Adopted 2026-07-24 from a three-way treatment bake-off on the shelf page. This
file is the spec; `web/scripts/check-tokens.mjs` is the gate that keeps it.

## Rules

1. **Straight edges.** Corner radius is capped at 8px (`--radius-md`). The
   blocks themselves are square; only chips (`--radius-sm`, 4px), inputs, and
   popovers round at all. Pill geometry (`--radius-pill`) is a different thing
   and stays allowed.
2. **Modular regions.** A page is blocks with edges, not text floating on one
   ground. Every region opens on a header strip and closes on a rule. A block
   that ends nowhere is not a block.
3. **Discrete rows.** Rows are separated by real rules (`--border`, not
   `--hairline`) and carry a continuous tinted gutter with a numeral. The
   runner-up treatment failed on exactly this: "the model list blends into each
   other a bit too much."
4. **Colour with surface area.** Accent arrives as a filled region — the
   masthead band (`--accent-strong` + `--text-on-accent`), the gutter and
   header strips (`--accent-soft`), the chips (`--accent`) — never as a 1px rim
   on an otherwise white card. No gradients: colour has an edge, not a fade.
5. **Flat.** Panels sit on a rule. The only permitted lift is the near-flat
   `--shadow-card` / `--shadow-card-hover`.
6. **The identity device is the band.** Any page with a name opens on a filled
   full-bleed masthead carrying back-link, eyebrow, title, and the page's one
   number. Home, the library browser, and every shelf share it.
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
it; none exists yet.
