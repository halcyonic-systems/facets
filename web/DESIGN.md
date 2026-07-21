# bert-lenses — design

**The invariant is a design principle too:** the page's job is to make the
kernel's verdicts legible, not to compute or embellish them. Every number shown
is the kernel's. Labels name the source (`bert-core · wasm`, `bert-compose · wasm`)
so the brain/face split is visible in the UI itself.

## Halcyonic Frost

Inherited from the fleet (trade-observatory, finance-app, germen) — a cool,
faintly indigo-tinted surface (never flat grey) with one restrained accent.
bert-lenses takes **teal** as its accent to distinguish the instrument within the
Frost family (slate / teal / indigo).

- **Tokens** live in `src/index.css` as CSS custom properties (`:root`, with a
  `prefers-color-scheme: dark` block). Components consume them via `var(--x)` in
  inline styles; `src/tokens.ts` mirrors the few needed as JS strings for SVG /
  numeric props. Change tokens in one place; keep this file in sync.
- **Type:** Cormorant Garamond (display / wordmark) · Inter (body) · JetBrains
  Mono (the kernel's numbers, `.tabular`).
- **Accent:** teal (`--accent`), with indigo + slate support. Verdicts use
  ok/warning/error tokens, never raw green/amber/red.
- **The per-lens seam:** `--lens-accent` / `--lens-accent-soft` /
  `--lens-node-stroke`, redefined by `data-lens` on the workspace root (Klir →
  slate, Bunge → indigo, Mobus → teal — saturation tracks the enrichment
  gradient; pure indirection over existing tokens, no new hex). Chrome only:
  rims, halos, handles, the lens toggle, armed tools. Never a flow — substance
  color is the reserved `--kind-*` channel, constant across lenses and themes.
- **Surfaces:** soft cards (`--radius-card`, `--shadow-card`) on a radial-tinted
  stage. Generous whitespace; legibility over decoration.
- Light + dark are both first-class (the smoke slice renders in either).
- **Ink on filled accents:** `--text-on-accent` (white in both themes) — never a
  raw `#fff` in a component.

## Fitness functions (#131)

`npm run check:tokens` (in `just check` and CI) enforces this file mechanically:
no raw color literals outside `tokens.ts` / `canvas/style.ts` (var(--x) or token
imports only); px type only from the frozen vocabulary (`text-[9px|10px|11px]`,
numeric SVG/recharts sizes 8–12); lens registers import their matrix/confirm
chrome from `canvas/registerChrome.ts` instead of re-deriving it; every
`<foreignObject>` overlay carries `data-export-ignore`. Growing the vocabulary
is fine — do it in `check-tokens.mjs`, deliberately, not ad hoc at a call site.

## Growing this

Phase 1 (CSV wizard + run panel) extends these tokens — it does not invent a new
system. Add primitives (buttons, inputs, cards) as reusable components consuming
the same tokens. Charts: recharts/visx, colored from the accent ramp. The canvas
(Phase 2+) will harvest old BERT's curved-flow polish, but the token system stays.
