# Makeover audit, 2026-10-26: home-library

**Status: RESEARCH.** One of seven read-only audits behind [`../makeover-2026-10.md`](../makeover-2026-10.md), written by an agent against the dev build of `design/makeover` at aa4b3d1. Rule numbers refer to the charter. Screenshots are not in the repo.

# Audit: Home, Library, Start surface, About (design/makeover, 2026-10-26)

Scope: `web/src/HomeScreen.tsx` (HomeMenu, LibraryBrowser, LedgerView, glyphs), `web/src/StartSurface.tsx`, `web/src/home.ts`, `web/src/ui.tsx`, `web/src/index.css`. Rules cited by number from `docs/design/makeover-2026-10.md`. Read-only: no file in the repo was changed.

## Verdict

The surface is already flat, neutral and hairlined, so rules 1, 2 (on this page) and 9 mostly hold; what fails is everything a hand or a keyboard touches. There is no designed focus ring anywhere (three inputs remove it outright), half the controls are 15 to 23px tall, muted ink is 3.98:1 in light, the type is a second system (Inter 60 masthead, Cormorant 400 at 18/24, JetBrains Mono labels at 10px with ten tracking values), and nothing on the page reflows below about 700px.

## Method notes

- Measurements are computed styles in CSS px. The shared Chrome window ignored `resize_window` (every request came back 1856x984 CSS at 90% zoom, a second window at 1137x663), so the 1024 shots are real at 1137 and the 390 and 1024 states were produced by constraining `#root` to 390 and 1024px. These files use no viewport media queries, so the layout is exact; only the `position: fixed` start surface could not be narrowed this way.
- Contrast ratios are computed from the hex tokens in `index.css` (WCAG 2.x relative luminance).
- Screenshot files carry `.png` names as requested; the Chrome capture writes JPEG bytes for full-frame shots and PNG for zoomed regions.

## Findings

| # | Finding | Rule | Where (file:line) | Fix size | Severity |
|---|---|---|---|---|---|
| 1 | No focus ring is designed anywhere on this surface. Keyboard focus shows the browser default: `outline auto 1px rgb(0,95,204)`, offset 0 (dark: `rgb(153,200,255)`). Measured on all 8 Home stops and all 8 library stops. The only `:focus-visible` rule in the sheet is for `input[type=range]`. | 10 | index.css:463-467 (only focus rule); HomeScreen.tsx:569, 1047, 1973 (buttons with no focus style) | token + primitive | blocks |
| 2 | Search field removes focus entirely: `outline-none` on the input and nothing on the wrapping label. Tab lands in it with zero visible change (measured: outlineStyle `none`). | 10 | HomeScreen.tsx:1581 | primitive | blocks |
| 3 | Start surface textarea `outline-none`; it is the autofocused control of the dialog, so the dialog opens with no focus indication. | 10 | StartSurface.tsx:80 | primitive | blocks |
| 4 | Rename inputs (card and list) `outline-none`. | 10 | HomeScreen.tsx:1695; ui.tsx (none) | primitive | hurts |
| 5 | `.record-row:focus-visible` reuses the hover tint (paper-edge, 1.05:1 against paper) as the only focus cue on list rows and facet buttons. | 10 | index.css:257-260 | token | hurts |
| 6 | Hit targets under 24px: "This build" 88x17, "Documentation" 114x17, "‹ Home" 54x17, "‹ Doors" ~17 tall, "Browse all N as a list" 193x17, "all 5 →" 49x15, "manage →" / "done" ~15, "and N more →" ~15, theme word 26x17, "export library (.sl) →" ~15, "‹ back to the model on the canvas" ~17. | 11 | HomeScreen.tsx:147-153, 273-279, 703-720, 1130-1132, 1447-1449, 1466-1468, 1491-1497, 1547-1553, 1794-1800, 1823-1829, 1886-1892 | primitive (one link style with min-height 24 / padding 4 8) | hurts |
| 7 | Start surface secondary controls: "skip" 23x16, "Draw it by hand" 89x16, "Open an example" 99x16. | 11 | StartSurface.tsx:61, 111, 115 | primitive | hurts |
| 8 | ArrangeToggle cells 88x23 and 73x23, 10px uppercase mono, no radius; a two-state control below the 24px floor and below the 11px type floor. | 11, 5, 3 | HomeScreen.tsx:1592-1604 | primitive | hurts |
| 9 | Rename / delete controls are unicode glyphs `✎` and `×` as `text-sm` buttons with `px-1.5` (roughly 20x20); same again in LibraryRow. | 14, 11 | HomeScreen.tsx:1713-1731, 2136-2155 | primitive (drawn 16px icons in 24px targets) | hurts |
| 10 | Unicode doing icon work: `‹` on three back links, `→` on five "more" links, `·` as the file door's thumbnail placeholder, `└` as the tree connector. | 14 | HomeScreen.tsx:152, 278, 1131, 1448, 1467, 1496, 1533, 1799, 2098 | primitive | polish |
| 11 | Shadows still resolve to real shadows: `--shadow-card` = `0 1px 2px rgba(22,35,43,.05)`, `--shadow-card-hover` = `0 2px 8px rgba(22,35,43,.09)` (dark `.25/.34`). Start surface card measured `rgba(22,35,43,0.09) 0 2px 8px`. | 2 | index.css:138-141; StartSurface.tsx:52; ui.tsx:26, 363, 417 | token (resolve both to `none`) | hurts |
| 12 | Pill radius on buttons: Draft is `rounded-full` (measured 3.7e7px); ui.tsx `Pill`, `ToolButton`, both ConfirmDialog buttons, the tab badge. Rule 3 keeps the pill for the verdict chip only. | 3 | StartSurface.tsx:88; ui.tsx:64, 130, 428, 435, 443, 520 | primitive | hurts |
| 13 | 8px radius on inputs (`rounded-md`): start textarea, DescriptionField textarea, grounding select and input, Banner. Inputs are 4px. | 3 | StartSurface.tsx:80; ui.tsx:191, 226, 242, 272 | primitive | polish |
| 14 | `--radius-lg: 12px` and `--radius-card: 10px` still declared; rule 3 collapses them onto 8/4. | 3 | index.css:128-129 | token | polish |
| 15 | Two card geometries on one surface: Home door panels are square (no radius, 0px measured) while library cards and the file door are 4px; rule 3 puts a card at 8. | 3 | HomeScreen.tsx:569 vs 1041, 1527, 1679 | primitive | hurts |
| 16 | Off-scale spacing (4px scale is 2/4/8/12/16/24/32/48): `gap-5` 20, `px-6 py-5` 20, `mt-9` 36, `mt-14` 56 (x5), `pb-3.5` 14, `gap-2.5` 10, `px-3.5 py-2.5` 14/10, `py-2.5` 10, `pb-16` 64, `pt-10` 40, `gap-10` 40, `mb-10` 40, `mt-16` 64, `pb-14` 56, `pb-20` 80, tree indent 14. | 4 | HomeScreen.tsx:569, 599, 652, 660, 674, 698, 742, 1047, 1064, 1343, 1362, 1438, 1522, 1569, 1860, 1910, 2094; StartSurface.tsx:107 (`mt-5`) | primitive | polish |
| 17 | Masthead is Inter 600 at 60px (home, about) and 48px (library) with `tracking-tight` and `-0.02em` both applied; the name of the app is the one place rule 5 wants Cormorant 700 at 30, and 60/48 are outside the eight sizes. | 5 | HomeScreen.tsx:290-293, 302-304 | primitive | hurts |
| 18 | Cormorant is set at weight 400 everywhere (door names 24, card names 18, section heads 24, shelf heads 18, list names 24, facet names 16, start dialog h2 18/600); rule 5 says 700 at 30/24/20. 18 and 16 are not in the display set. | 5 | HomeScreen.tsx:218-231, 415, 575, 851, 1007, 1082, 1120, 1536, 1979, 2125; StartSurface.tsx:58 | token (nameStyle, doorStyle) | hurts |
| 19 | 10px type in fifteen places (`text-[10px]`): stat label, facet counts, "runs" marker, card marker, shelf note, "all N →", Recent gloss, Yours count, storage line, "and N more", toggle cells, list tags, set name, citation, saved-ago line. Floor is 11. | 5 | HomeScreen.tsx:307, 856, 1012, 1024, 1124, 1130, 1296, 1442, 1460, 1493, 1595, 2009, 2020, 2029, 2128 | token (one meta style at 12, one label style at 11/600) | hurts |
| 20 | JetBrains Mono carries UI labels, back links, counts, tags, citations and the colophon (folioStyle); rule 5 reserves mono for the kernel's numbers and SL. | 5 | HomeScreen.tsx:204, 209-212, and every `style={folioStyle}` use (275, 286, 307, 338, 601, 705, 717, 752, 876, 1124, 1130, 1447, 1466, 1493, 1549, 1797, 1825, 1889) | token | hurts |
| 21 | Ten different letter-spacings on labels: 0.04, 0.1, 0.12, 0.14, 0.16, 0.18, 0.2, 0.22, 0.24, 0.28, 0.3em (plus 0.045em small-caps). Rule 5 has one label style at +0.06em. | 5 | HomeScreen.tsx:149, 275, 286, 307, 338, 601, 705, 752, 876, 1013, 1124, 1130, 1296, 1442, 1549, 1595, 2009, 2029 | token | polish |
| 22 | `--ink-muted` light `#7c8084` on paper is 3.98:1 (3.65:1 on the hover tint); it carries every folio, count, tag, citation, back link, colophon link, "yours, and ours you have touched", the licence line, and the start note. Dark `#7d8286` on `#17191c` is 4.54:1 and passes, so the light token is the one to retune (target `#5b6577` per rule 7's mute, 5.9:1). | 7 | index.css:162; consumers at HomeScreen.tsx:211, 343, 363, 856, 1025, 1296, 1442, 1461, 1531, 1621, 1876, 1954, 2010, 2021, 2030, 2097, 2128, 2143, 2152; 773 | token | blocks |
| 23 | Home-surface tokens are a second palette beside the workspace's: `--paper/--paper-ground/--paper-edge/--ink/--ink-secondary/--ink-muted/--rule/--rule-soft/--seal` duplicate `--bg-*/--text-*/--border` with different values (paper `#fff` vs bg-secondary `#fafafb`; the start surface sits on `--bg-secondary` over the Home page's `--paper`). Rule 1 wants three surface tokens; rule 7 names them. | 1, 7 | index.css:43-50 vs 157-165; StartSurface.tsx:50 | token | hurts |
| 24 | Body wears a radial gradient under the ground (`radial-gradient(... var(--stage-from) ...)`), so the "neutral ground one step away" is a wash, not a step. | 1 | index.css:236-238 | token | polish |
| 25 | `--rule` is full ink (`#17181a`) and the section head rule is 2px of it; rule 2 says every edge is a 1px hairline or a surface step. Measured `borderBottomWidth 2px` on Recent / Start here / Yours / From a file. | 2 | HomeScreen.tsx:1077-1080; index.css:163 | token + primitive | polish |
| 26 | `--seal` `#8a3324` (a rust red outside the Frost set) is the "runs" tag, the "disk"/"drafted" chip and the selected-facet underline. Rust beside `--verdict-error #c2352c` reads as a warning, and "runs" is a capability, not an alarm. Rule 8: action is Frost blue or the accent. | 8, 12 | index.css:165; HomeScreen.tsx:376, 845, 1013, 1985 | token | hurts |
| 27 | Accent used for emphasis rather than naming: the "model" word in the masthead, the Start group label, the Recent section head. Rule 8 reserves the accent for action; the owner's note says colour must say what it means. | 8 | HomeScreen.tsx:646, 602, 1083 (lead), 1293 | primitive | polish |
| 28 | Hover on doors and cards is a tinted fill plus a coloured border (`color-mix(accent 6%)` + `border-color: accent !important`; cards use the shelf hue). Rule 20 wants hover as one surface step. Hover also carries no reduced-motion gate (only the walk animation has one). | 20, 13 | index.css:268-299, 301-306 | token | polish |
| 29 | Door glyphs are four bespoke drawings on 96x64 and 48x48 boxes at 0.8 / 1 / 1.1 / 1.2px strokes with dashes; the gem is 72px at 0.2 / 0.35px; the search icon is 14px at 1.4. None is on the 24-grid 2px grammar (sizes 20 / 16 / 1em). | 14 | HomeScreen.tsx:468-490, 502-551, 1572-1575 | primitive (redraw on the grid) | hurts |
| 30 | At 390 the Home grid stays `grid-cols-2`: panels become 152x568 and 152x440, words break mid-word ("boundary." splits), the 60px masthead wraps under the gem, and the 32px column gutter leaves 326px of measure. No reflow rule exists in this file. | 16 | HomeScreen.tsx:660, 674, 198 (px-8), 291 | surface | blocks |
| 31 | At 390 the library is unreadable: `SearchField` `min-w-[18rem]` (288px) sits over the title (h1 measured 0px wide, right edge at 33px), Recent `grid-cols-4` yields 73px cards whose names are hidden, `grid-cols-3` yields 101px cards clipped to "Fe / Re / c...". | 16 | HomeScreen.tsx:1569, 1064, 281-298 | surface | blocks |
| 32 | At 390 the list view's right column (`max-w-[16rem]`, `shrink-0`) collapses to 6px, so tags and citations vanish; About's `grid-cols-[10rem_1fr]` leaves a 144px value column. | 16 | HomeScreen.tsx:2004, 748 | surface | hurts |
| 33 | At 1024 (and 1137 real) nothing overflows (`scrollWidth` equals width) and the 896px sheet fits; this width passes. | 16 | HomeScreen.tsx:118 | none | ok |
| 34 | Start surface is not a dialog: no `role="dialog"`, no `aria-modal`, no focus trap (Tab walks textarea → "Draw it by hand" → "Open an example" and onward into the page beneath), and the disabled Draft is skipped. Escape works. | 15 | StartSurface.tsx:41-58 | primitive | hurts |
| 35 | Disabled state by `opacity: 0.5` on a filled accent button; the pill reads as a live control at half strength. Use a flat disabled fill with the ink step. | 8, 12 | StartSurface.tsx:92 | primitive | polish |
| 36 | Tab order: the page's own controls come first and the menu bar (File, theme) comes last, after a stop on `body`; "Home" in the menu bar is never reached on the home route. Reading order is menu bar first. | 15 | App menu bar (outside this surface's files); observed from HomeScreen | surface | hurts |
| 37 | Facet filter is set in the display face (Cormorant small caps 16px) with a 10px mono count; a filter chip is a control and belongs in Inter 14. Selected state is a 2px underline in `--seal` (or the world hue), unselected a 1px `--rule-soft` underline. | 5, 8 | HomeScreen.tsx:838-859 | primitive | polish |
| 38 | The italic-serif register survives in two places: `Chip` ("disk", "drafted · model") and `EmptyLine`. The charter's withdrawn list names the italic serif lede. | preamble (withdrawn), 5 | HomeScreen.tsx:372-381, 1615-1629 | primitive | polish |
| 39 | Card sub-line is 11px, one line, `truncate`: on a 270px card "Central banking — the balance sh…" loses the model's one line of meaning. Rule 5 puts meta at 12; rule 6 governs measure. | 5, 6 | HomeScreen.tsx:1033-1035 | primitive | hurts |
| 40 | List-row description is a single `truncate` line at 14px across 633px (about 90 characters) and the citation is 10px mono at 3.98:1. | 6, 5, 7 | HomeScreen.tsx:2000-2002, 2027-2034 | primitive | polish |
| 41 | GENUS_HUE has no entry for Physical, so the Physical shelf has no bar and its cards no well tint while Biological / Social / Technical do; one genus is uncoloured by omission, not by meaning. | 12, 9 | HomeScreen.tsx:802-806; observed on `?library=all` | token | hurts |
| 42 | Three well treatments on one card primitive: shelf hue at `color-mix 22%` with hue edge, Recent `--accent-soft` fill with accent edge, Yours `--paper-edge` with `--accent-slate` edge. Dark mix lands at oklab L 0.305 (murky). Rule 7 asks for the pairs to be tuned and recorded; none are. | 7, 8 | HomeScreen.tsx:899, 904, 952-960 | token | polish |
| 43 | Sheet-on-ground step is 1.18:1 light and 1.09:1 dark; in dark the sheet (`#17191c` on `#0e0f11`) is carried by the 1px `--rule-soft` side borders alone. | 1 | index.css:157-158; HomeScreen.tsx:118-119 | token | polish |
| 44 | Group labels ("Start", "Continue", "Try") and block labels are 11px uppercase mono at 0.28em in `--ink-muted` (3.98:1); rule 5's label is Inter 11/600 +0.06em. | 5, 7 | HomeScreen.tsx:335-349, 597-609 | token | hurts |
| 45 | Masthead lede at 20px / 18px and the Panel description at 14px with `leading-relaxed` (22.75px) are off the 16/14 body pair with their 24/20 line heights; 18 is not one of the eight sizes. | 5 | HomeScreen.tsx:315, 578 | primitive | polish |
| 46 | Card thumbnails (`Thumbnail`, 34px in a 44px well; 40px in the list gutter) carry no accessible name and are not `aria-hidden`; the card button has `title={name}` only. | 14 | HomeScreen.tsx:961, 1054, 1956 | primitive | polish |
| 47 | The file door's thumbnail cell is a 44px box holding a `·` in 11px mono; it is a placeholder for an icon that does not exist. | 14 | HomeScreen.tsx:1529-1534 | primitive | polish |
| 48 | Two surfaces draw the same "Yours" and "From a file" blocks with different heads: doors view uses `SectionHead` (24px Cormorant, 2px ink rule), list view uses `BlockHeader` (11px mono, hairline). One section-head primitive. | 5, 2 | HomeScreen.tsx:335, 1072, 1837, 1861, 1911 | primitive | polish |
| 49 | `--transition-base` is 200ms ease-out and inside rule 13; the lens-question animation in the same sheet is 450ms (workspace, noted for the token sweep). | 13 | index.css:171, 408 | token | polish |
| 50 | Dark theme check: every pair measured passes (ink-muted 4.54, ink-secondary 8.44, seal 5.0, accent 6.5, text-on-accent 6.57); dark is not the failing theme on this surface. | 7 | index.css:157-165 | none | ok |

## Contrast table (computed from tokens)

| Pair | Light | Dark | Needs |
|---|---|---|---|
| ink-muted on paper | 3.98 fails | 4.54 | 4.5 (text) |
| ink-muted on paper-edge (hover) | 3.65 fails | n/a | 4.5 |
| ink-secondary on paper | 9.19 | 8.44 | 4.5 |
| seal on paper | 8.14 | 5.00 | 4.5 |
| accent on paper | 6.50 | 6.50 | 4.5 |
| text-on-accent on accent | 6.50 | 6.57 | 4.5 |
| accent-slate (Yours edge) on paper | 5.22 | n/a | 3 |
| world-klir / bunge / mobus on paper | 5.36 / 4.94 / 4.76 | n/a | 3 (bars), 4.5 (if text) |
| chart-1 / 3 / 4 (genus bars) on paper | 4.41 / 4.04 / 5.09 | n/a | 3 |
| rule-soft on paper (hairline) | 1.29 | 1.32 | decorative |
| paper on paper-ground (sheet edge) | 1.18 | 1.09 | decorative |
| text-muted on bg-primary (menu bar) | 4.39 fails | 4.85 | 4.5 |

## Exemplar numbers

Fetched live; where a page exposes names but not values, that is said.

| Exemplar | Measured | Implies here |
|---|---|---|
| Linear (linear.app CSS) | Control heights in the sheet: 28, 32, 36, 40, 44px. Radii: 5px and 6px. Focus ring: `box-shadow: 0 0 0 2px <bg>, 0 0 0 4px <brand>` (a 2px ring with a 2px gap, drawn as shadow so it survives any radius). Fixed sizes seen: 12, 13, 15, 16px text; 32 and 40px headings. Type tokens are `--text-micro/mini/small/regular` and `--title-1..9`; the values live in JS and were not exposed. | Every link-style control on this page should be at least 28px tall (Linear's smallest); the focus ring is exactly rule 10's 2px + 2px offset, and the shadow form lets it ride on 0 / 4 / 8px corners alike. |
| Radix Themes (radix-ui.com/themes docs) | Type steps 1 to 9: 12/16, 14/20, 16/24, 18/26, 20/28, 24/30, 28/36, 35/40, 60/60 (size/line-height, px). Space 1 to 9: 4, 8, 12, 16, 24, 32, 40, 48, 64. Radius and button heights are named (`--radius-1..6`, sizes 1 to 4) but not valued in the docs text. | Rule 5's 12/14/16 sit on steps 1 to 3 with 16/20/24 line heights (this page uses 22.75 and 27.5). Rule 4's scale is Radix space 1 to 8 minus 40; the page's 10, 14, 20, 36, 56 gaps have no step. |
| Vercel Geist (vercel.com/geist) | Radii: 6, 12, 16px. Families Geist Sans and Geist Mono. Type classes: heading 72/64/56/48/40/32/24/20/16/14, label 20/18/16/14/13/12 (mono variants at 14/13/12), copy 24/20/18/16/14/13, button 16/14/12. Values beyond the class names are not on the page. | Geist's smallest copy and label is 12 and its smallest button text 12; nothing on this surface should sit at 10 or 11 except the one 11/600 label. Geist keeps mono to labels at 12 to 14, never to display. |
| Observable (observablehq.com) | The gallery page returned HTTP 429 on fetch; the explore page exposed only `font-size: .75rem` (12px) for meta and 1.2 / 1.4rem for headings. Card layout numbers were not obtained. | Only this: Observable's meta line is 12px, the same floor as Geist and Radix step 1, against this page's 10 and 11. |

## Screenshots (in `scratchpad/makeover/shots/`)

- `home-library-home-1440-light.png`: Home menu, light, 1856 CSS px viewport.
- `home-library-home-1440-dark.png`: Home menu, dark, same viewport.
- `home-library-home-focus-1440-light.png`: Home after one Tab; the browser-default blue outline on "Draw a system".
- `home-library-home-1024-light.png`: Home with the root held at 1024px; fits, no overflow.
- `home-library-home-390-light.png`: Home at 390px; two-column grid crushes doors to 152x568 and breaks words.
- `home-library-home-390-dark.png`: same at 390 in dark.
- `home-library-library-closed-1440-light.png`: Library with the door closed (three featured cards), light.
- `home-library-library-closed-1440-dark.png`: same, dark.
- `home-library-library-closed-1024-light.png`: library at 1024; fits.
- `home-library-library-closed-390-light.png`: library at 390; search field over the title, 73px Recent cards with no names.
- `home-library-library-focus-1440-light.png`: library after eight Tabs; focus on "Browse all 3 as a list" in default blue.
- `home-library-library-all-top-1440-light.png`: `?library=all`, masthead through the first shelves, By domain / By lens toggle.
- `home-library-library-all-shelves-1440-light.png`: `?library=all` scrolled to the genus shelves (Physical shelf with no hue bar), Yours, From a file.
- `home-library-library-all-shelves-1440-dark.png`: same shelves in dark (22% hue wells).
- `home-library-list-rows-1440-light.png`: the list view (Browse all 52), mid-list rows with tags and Bench rows.
- `home-library-list-rows-1440-dark.png`: list view rows in dark, one row under hover.
- `home-library-list-rows-390-light.png`: list view at 390; right column collapsed, names truncated.
- `home-library-start-surface-1137-light.png`: Start surface over a blank canvas, 1137 CSS px window, light.
- `home-library-start-surface-1137-dark.png`: same, dark; the 0 2px 8px shadow is visible under the card.
- `home-library-about-1137-light.png`: About (This build), light.
- `home-library-about-1137-dark.png`: About, dark.
- `home-library-about-390-light.png`: About at 390; 144px value column, hashes breaking.
