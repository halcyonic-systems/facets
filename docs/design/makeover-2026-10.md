# The makeover charter — 2026-10

**Status: RESEARCH.** The brief for a beauty pass over every face of Facets, run on branch `design/makeover` after the 2026-10-26 cut. No functional change: no handler, kernel call, state or test of behaviour moves. Subordinate to [`../../web/DESIGN.md`](../../web/DESIGN.md) and [`visual-language.md`](visual-language.md); where this file and the owner's stated preferences disagree with an exemplar, the owner wins and this file says so.

## What the owner has said, on record

- Light mode is the working mode. Dark stays, because it exists and a test holds its palette, but light is designed first and dark is checked, not designed.
- Frost colours: Nord Snow Storm and Polar Night for paper and ink, Frost blues for anything you can act on. Never beige, cream or sand. No warm tints as surface colour.
- R8 corners: three radii only, 8px for a window or card, 4px for a box nested inside one, 4px for chips, buttons and inputs; 0 for grid cells, rows and bars; 50% only for a true circle.
- No shadows. Hierarchy comes from flat surface steps and 1px hairlines.
- One drawn icon grammar: 24px grid, 2px stroke, square caps, mitre joins, sizes 20 in a square, 16 standalone, 1em inline. No unicode glyphs doing an icon's job.
- Colour only where it names something. If a colour cannot say what it means, it is a bug (visual-language.md, 2026-08-12).
- Withdrawn and not to return: the per-lens world tint on chrome or canvas, the rubric rule over title blocks, the italic serif lede, roman folios, the narrow reading column (visual-language.md §2). A blind pick licenses the artifact, not the brief behind it: do not promote a treatment's rationale into a rule the owner never stated.
- The register: a considered scientific instrument that is also fun to use (AGENTS.md invariant 6). Bold, clear, accessible, professional.

## The rules, each with its source

Every rule below is one an agent can check on the page. "Arcadia" means `~/halcyonic-projects/arcadia/docs/DESIGN.md` (iteration 1, 2026-10-23), the fleet's most recent pass and the register this one follows.

### Surfaces and structure
1. White sheet on a neutral ground one step away; a third step for header bands and neutral chips. Three surface tokens, no hue cast. (visual-language.md; Arcadia paper, paper-2, paper-3.)
2. Every edge is a 1px hairline or a surface step, never a shadow. (Arcadia; IBM Carbon.) `--shadow-card` and `--shadow-card-hover` resolve to none; the tokens stay so call sites need no edit.
3. Radii from three tokens only: `--radius-md` 8, `--radius-sm` 4, chips and buttons 4. `--radius-lg` and `--radius-card` collapse onto these. Pills stay for the one true pill, the verdict chip. (Arcadia rounded.)
4. Spacing on the 4px scale: 2, 4, 8, 12, 16, 24, 32, 48. No other gap. (Arcadia spacing.)

### Type
5. Two families, eight sizes. Cormorant Garamond 700 for names of things (the app, a model, a section, a shelf) at 30, 24, 20. Inter for everything scanned: 16 body, 14 rows and controls, 13/600 numerals, 12 meta, 11/600 uppercase +0.06em labels. JetBrains Mono only for the kernel's numbers and SL. (Arcadia typography; DESIGN.md type.)
6. Line length never past 72 characters of prose. Labels never wrap to a second line inside a chip or a tab.

### Colour
7. Paper and ink from Nord: paper `#ffffff`, paper-2 `#f3f6f9`, paper-3 `#e5edf4`, rule `#d8dee9`, rule-strong `#aebdcf`, ink `#2e3440`, ink-2 `#3b4252`, mute `#5b6577`. Facets keeps its own semantic tokens (`--accent` teal, `--kind-*`, `--verdict-*`, `--chart-*`, `--world-*`), re-tuned so every text pair meets 4.5:1 and every control pair 3:1 in light and in dark. The tuning is recorded as a table in the audit, pair by pair. (WCAG 2.2 AA; Radix Colors for the method of documented steps.)
8. Action is Frost blue or the accent; the deep step carries text, the lighter steps fill areas. Status is solid when urgent and tinted when calm. Never a raw hex in a component; never white ink on a fill without `--text-on-accent`. (Arcadia; DESIGN.md.)
9. Substance colour (`--kind-*`) is constant across lenses and themes and is the only colour a flow may carry. Verdicts use ok, warning, error tokens. (DESIGN.md.)

### Controls and accessibility
10. Every control has a visible focus ring, 2px, the accent, offset 2px, on keyboard focus; never removed. (WCAG 2.4.7, 2.4.11; Radix, GOV.UK.)
11. Hit targets at least 24×24 CSS px, 44×44 on touch, including canvas handles and tool rail items. (WCAG 2.5.8; Apple HIG.)
12. Colour is never the only carrier of meaning: a verdict has a word, a bound column has a label, a lens has a name. (WCAG 1.4.1; GOV.UK.)
13. Motion is 120 to 200ms, ease-out, and absent under `prefers-reduced-motion`. Nothing loops. (Material 3 motion; the existing walk choreography stays, under its reduced-motion gate.)
14. Every icon is a drawn SVG from one grammar with an accessible name or `aria-hidden` when decorative. (Arcadia icons.)
15. Tab order follows reading order; menus and popovers open with the right role, close on Escape, and return focus. (Radix primitives as the reference behaviour; no library is added, the existing components are brought to the same semantics.)
16. The three widths named in AGENTS.md invariant 5 are the test: desktop at 1440, a phone at 390, and Claude in Chrome at 1024. No horizontal scroll at any of them.

### The canvas
17. Shapes carry systems meaning first. Circle is a component, square is an environment object, an open square is Mobus's unknowable source or sink, an interface is a notch on the membrane, the membrane is the one ring. These are not restyled; they are made bolder: 2px strokes, clear fills, labels that stay legible from fit-to-view to full zoom. (shape-vocabulary-research.md; Mobus Ch. 4 Figs. 4.5, 4.9, 4.13.)
18. The ten process-primitive badges become one drawn glyph set on the icon grammar, each glyph a distinct silhouette at 16px. (Mobus Fig. 4.5; the Arcadia icon rules.)
19. Flows: stroke by substance, 2px, arrowhead one size, label on a paper tab so it reads over any crossing. Selected and hovered flows thicken, never change hue.
20. Selection, hover, armed tool and drag states are each one visible change, consistent across lenses: a ring for selection, a surface step for hover, the accent on an armed tool. Read tldraw and Excalidraw for the state model; take their sizes, not their looks.
21. The tool rail and the palette read as one instrument: 20px icons in 32px squares, 4px radius, labels in the 11px label style, grouped by kind with a hairline between groups.

## What the search phase produces

One audit per surface, as a table: finding, principle it breaks (a rule number above), where (file and line), fix size (token, primitive, surface), and before-screenshots at the three widths in light and dark. Plus three sweeps: the contrast table over every token pair, an accessibility run on each main screen, and a keyboard walk.

## What the build phase produces

Tokens first, then primitives (button, input, select, chip, tab, panel, card, menu, popover), then surfaces in dependency order. Each slice carries before and after screenshots and leaves the full test suite green. `web/scripts/check-tokens.mjs` grows the rules that can be made mechanical: radius from the three tokens only, no shadow, icons from the drawn set, px type from the frozen vocabulary.
