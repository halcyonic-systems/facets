# Makeover audit, 2026-10-26: faces

**Status: RESEARCH.** One of seven read-only audits behind [`../makeover-2026-10.md`](../makeover-2026-10.md), written by an agent against the dev build of `design/makeover` at aa4b3d1. Rule numbers refer to the charter. Screenshots are not in the repo.

# Faces audit: portal, chat, docs, shared/frost.css

Makeover charter `docs/design/makeover-2026-10.md`, read-only pass on 2026-10-26 against the live site (https://facets.systems, published today from main, which `facets-wt-design` equals). Worktree paths below are relative to `/Users/home/Desktop/halcyonic-projects/active/facets-wt-design`.

How it was measured. The shared Chrome window ignored resize requests (another auditor held it at 1440×729 outer, and this site renders at 110% zoom, so the real viewport was 1309×663 CSS px). The "1440" screenshots are therefore the full 1309-wide viewport; the 1024 and 390 renders are honest: each page was loaded in a same-origin iframe of exactly 1024×768 or 390×844 (verified `innerWidth`), light and dark side by side, then cropped. Dark was emulated with `document.documentElement.style.colorScheme = "dark"`; every face uses `light-dark()` through `shared/frost.css`, so this flips the whole palette, except the portal, whose gem fills are SVG presentation attributes (see finding 1). Numbers are `getComputedStyle` values; contrast ratios are WCAG 2.x computed from the token hexes.

## Verdict

The three faces share a token sheet but not a design: three grounds, three wordmarks, three heading scales, 13 radii and 36 type sizes in chat alone, mono-uppercase chrome in docs, and a portal that cannot go dark. Nothing here is hard to fix; the fixes are tokens first (surfaces, radii, shadow, mute), then one pass per face, with the docs header overflow at 390 and the dimmed-on-load chat rail at 1024 as the two blockers.

## Findings

Severity: blocks = a user cannot do or read something at one of the three widths or in one theme; hurts = visibly breaks a charter rule; polish = off-scale or off-token with no reader cost.

| # | Finding | Rule | Where | Fix | Severity |
|---|---|---|---|---|---|
| 1 | Portal is pinned light (`color-scheme: light`); under a dark OS it is the one light face. Forcing dark flips body and ink but the gem stays `fill="#ffffff"`, so "Chat" and "Model" render ink `#e8eaec` on white at 1.21:1 (unreadable, see `faces-portal-1440-dark.png`). | 7, 12 | `portal/index.html:21`, `:81-96` | page (move the 7 facet fills and the outline to CSS classes, unpin) | blocks (dark) |
| 2 | Gem drawn in raw hex: `#ffffff`, `#17181a`, `#545c93`, `#3d6373`, `#5d6f7b` on 13 elements plus `.model-dark` rules. | 8 | `portal/index.html:60-62`, `:81-103` | page | hurts |
| 3 | Portal door labels are SVG text at 6.6 and 2.6 user units: "ask →" renders 13.8px at the 424px gem (1309 viewport) and 10.4px on the phone (320px gem); the arrow is a unicode glyph doing an icon's job. | 5, 14 | `portal/index.html:47-51`, `:90`, `:95` | page | hurts |
| 4 | `breathe` animation on both lit facets: 3.2s `infinite alternate`, no `prefers-reduced-motion` gate anywhere in the portal. | 13 | `portal/index.html:55-57` | page | hurts |
| 5 | Door focus: `svg a { outline: none }`; `:focus-visible` reuses the hover treatment (facet opacity 0.55 + underline), no 2px accent ring. | 10 | `portal/index.html:45`, `:52-53` | page | hurts |
| 6 | Portal type off the eight-size vocabulary: h1 `clamp(3.4rem, 7vw, 6rem)` = 91.6px at 1309, 60.8px at 390, weight 600; tagline 18.4px (17.3 at 390). | 5 | `portal/index.html:40-42`, `:68-69` | page | polish |
| 7 | Portal spacing off the 4px scale: tagline `margin-top 1.1rem` (17.6), phone `gap 1.6rem` (25.6), phone `padding 1.25rem` (20). | 4 | `portal/index.html:42`, `:64-65` | page | polish |
| 8 | Three heptagons, not one mark: the portal gem (points `40,4 71,19 78,52 …`, 0.35 ink outline, 0.2 ink spokes at 50%) vs the chat header and both favicons (`40,4 68.3,16.6 76,44.9 …`, 2 accent stroke, 1 accent spokes at 40%) vs the chat welcome mark (1.5 stroke, 0.8 spokes). Stroke widths 0.2 to 2 across three drawings; none on the 24px 2px grammar. | 14 | `portal/index.html:81-103`; `chat/index.html:7`, `:1660-1670`, `:2936-2948`; `scripts/build-docs.mjs:155` | shared asset (one SVG, one stroke, fills from tokens) | hurts |
| 9 | Three grounds for three faces: portal `--bg-secondary #fafafb`, chat and docs `--paper-ground #eaecee`, model home `--bg-primary #f1f2f3`. Charter wants three surface tokens total (paper, paper-2, paper-3). | 1, 7 | `portal/index.html:22,27`; `chat/index.html:30`; `scripts/build-docs.mjs:85`; `shared/frost.css:76-78`, `:110-112` | token | hurts |
| 10 | Shared sheet carries two surface registers and five ground greys (`#f1f2f3 #fafafb #e6e7e9 #eaecee #f4f5f6`) and three hairlines (`--border #d5dee4`, `--rule-soft #e0e3e5`, `--hairline #e5ecf0`) against the charter's Nord values (paper-2 `#f3f6f9`, paper-3 `#e5edf4`, rule `#d8dee9`, ink `#2e3440`). | 1, 2, 7 | `shared/frost.css:76-78`, `:97-98`, `:110-117` (source `web/src/index.css`) | token | hurts |
| 11 | `--ink-muted #7c8084` is 3.98:1 on white and 3.36:1 on `#eaecee`; chat aliases it as `--ink-faint` and uses it for 11.5px and smaller text in at least 18 rules (welcome subline, lens tags, export trigger, dim buttons, labels). Dark `#7d8286` on `#17191c` is 4.54:1 (passes by 0.04). | 7 | `shared/frost.css:115`; `chat/index.html:29`, `:127`, `:1245`, `:1273`, `:1052`, `:666` | token (lift mute to the charter `#5b6577`, 6.1:1) | blocks |
| 12 | `--radius-lg 12px` and `--radius-card 10px` still exported; `--shadow-card 0 1px 2px` and `--shadow-card-hover 0 2px 8px` still real shadows. Charter collapses both onto 8/4 and none. | 2, 3 | `shared/frost.css:99-107`; `scripts/gen-frost-shared.mjs:38-39` | token | polish |
| 13 | Chat uses 13 distinct `border-radius` values: 0, 3, 4 (12×), 5, 6 (9×), 8, 10 (7×), 12, 20 (chips), 50%, 999, 9999, `0 6px 6px 0`. Textarea 12, Send 10, example card 10, mono-tag 10, dim buttons 5, dock step 6, export menu 6, tooltip 6. | 3 | `chat/index.html:1174`, `:1193`, `:160`, `:364`, `:1050`, `:467`, `:679`, `:1133`, `:197`, `:477` | page (collapse to `--radius-md` / `--radius-sm`) | hurts |
| 14 | Chat literal shadows: export menu `0 4px 12px`, dim tooltip `0 4px 12px`, clickable tag `0 2px 4px`, thinker card `0 10px 24px -8px`; sheets use the (non-none) shadow tokens. | 2 | `chat/index.html:680`, `:1140`, `:852`, `:1289`, `:781`, `:794` | page | hurts |
| 15 | Chat has 36 distinct `font-size` values (8.8px to 32px); 18 rules at 11.52px, 8 at 9.6px, 3 at 8.8px. Controls below the 11px floor: export trigger 9.6px, lens-bar label 9.6px, lens tag 8.96px, example label 9.3px, evidence score 8.8px, dim code 10.4px. | 5 | `chat/index.html:661`, `:1242`, `:1271`, `:139`, `:1480`, `:1058` | page | blocks (sub-10px controls) |
| 16 | Buttons inherit the UA font: `.lens-btn`, `.dim-bar-btn`, `.rail-icon-btn`, `.conv-rail-you`, `.thinker-dismiss` set no `font-family` on the button, so they compute to Arial 13.33px; `.conv-rail-you` also computes raw `rgb(0,0,0)` ink. | 5, 8 | `chat/index.html:1250`, `:1042`, `:541`, `:566`, `:1331` | page | hurts |
| 17 | Welcome title is Cormorant 32px at weight 300 and the tagline is a Cormorant 16.8px accent-coloured lede with +0.03em: the display-serif lede the owner withdrew, in roman. Charter: names at 30/24/20, 700. | 5, withdrawn list | `chat/index.html:110-123` | page | hurts |
| 18 | Empty state is bottom-anchored (`justify-content: flex-end`): mark lands at y=292 in a messages box that starts at y=96, leaving 196px blank above and nothing to do but the box. The suggestion chips CSS exists but no chips are rendered (`.chat-welcome-chips` absent from the DOM). Perplexity centres a 640×120 box at 41% of viewport height with no chrome above it. | 1, 6 | `chat/index.html:96-104`, `:184-206`, `:2931-2954` | page | hurts |
| 19 | Composer: textarea radius 12 with `outline: none` (focus is a 1px border-colour change only), Send radius 10, label 12.16px/500, min-height 44/48 on desktop. Charter: inputs and buttons at 4px, focus ring 2px accent offset 2. | 3, 10 | `chat/index.html:1168-1203` | page | hurts |
| 20 | Focus ring offsets disagree: global `2px` (good), inputs and buttons `1px`, lens buttons and rail items `-2px` (inset). | 10 | `chat/index.html:1589-1594`, `:1279`, `:553` | page | polish |
| 21 | Motion: 24 transitions, 7 of them `transition: all`, durations 0.15s to 0.6s (`all 0.3s ease` on chips, `0.35s` on badges, `opacity 0.6s`); `thinking` and `pulse` keyframes loop `infinite`. Reduced-motion gate (0.01ms) is present. `--transition-base` is used 0 times in chat. | 13 | `chat/index.html:200`, `:338`, `:655-656`, `:1369`, `:1398`, `:1595` | page | polish |
| 22 | Lens bar: 6 tabs at `min-width 110px` in a 708px bar; `scrollWidth` 715 > 708 so the sixth tab is clipped at "Compositiona" with the scrollbar hidden; 3 of 6 tag lines wrap to two lines ("one consolidated answer", "the process theorist", "the compositionalist") at 8.96px. | 6 | `chat/index.html:1230-1275` | page | hurts |
| 23 | Lens bar semantics: `<nav>` of `<button aria-pressed>`; not `tablist`/`tab`, and `aria-pressed` on the active one says toggle, not selection. | 15 | `chat/index.html:1714`, lens-bar builder in script | page | polish |
| 24 | Conversation rail below 1360px opens as an overlay with a 35% backdrop, and the open state is remembered (`facets_rail_open`), so at 1024 (and at this 1309 viewport) the chat paints dimmed and unusable until the rail is collapsed. See `faces-chat-rail-overlay-1440-light.png`. | 16, 1 | `chat/index.html:486-498`, `:521-529`, `:4333-4339`, `:4378-4379` | page (never persist "open" below the dock breakpoint) | blocks (1024) |
| 25 | At 390 the 52px rail strip stays docked: chat pane 338px, textarea 216px, Send 71px; "New" and "Export" are hidden, so a phone user cannot start a new conversation or export without the rail. | 16, 11 | `chat/index.html:498`, `:1605-1613` | page | hurts |
| 26 | Hit targets: `.export-trigger` 55×20 at desktop (padding 3px 8px, 9.6px text); dim buttons 4px vertical padding (~23px tall) until the coarse-pointer query. | 11 | `chat/index.html:659-669`, `:1042-1055` | page | hurts |
| 27 | Raw colour in chat: `background: white` on the example card; `#2563eb` evidence link (Tailwind blue, 5.17:1); `rgba(58,110,98,…)` old-green mark fills; 17 `rgba()` tints for active dims; the share-card string `#d4ddd8 #eef3f1 #3a4a45 #2f7a68` (the retired warm-green palette); thinker accents as hex in JS. | 8 | `chat/index.html:158`, `:1484`, `:1662`, `:1087-1113`, `:2596-2599`, `:1992-2036` | page | hurts |
| 28 | 34 `--dim-*` hues (8 Mobus + 9 SPT + 7 Klir + 3 Bunge + 5 CT + …) each carried by a 2px left border and a tint: colour naming 34 things cannot be learned. Charter reserves colour for substance and verdict; chat is allowed its own channel but not 34 of them. | 9, 12 | `chat/index.html:39-73`, `:1066-1113` | page | polish |
| 29 | Uppercase label style varies: rail label 9.9px/600/+0.14em, lens label 9.6px/400/+0.08em, dock label 9.9px/600/+0.14em, topnav links 11.5px/400/+0.08em, out-label 11px/400/+0.05em. Charter: one style, 11/600/+0.06em. | 5 | `chat/index.html:550`, `:1240-1249`, `:473`, `:447-455`, `:409-415` | page | polish |
| 30 | Status is colour-only: a 7px dot (`#d5dee4` off, accent on, slate pulsing) with no word; the model tag shows "---" as a pill until the engine answers. | 12 | `chat/index.html:650-656`, `:1686-1689` | page | hurts |
| 31 | Unicode glyphs as icons in chat: `Export ▾`, `✕` (dismiss, clear), `○` avatar, `Consult ▾`, `→` separators. | 14 | `chat/index.html:1701`, `:1724`, `:1733`, `:4476`, `:4085`, `:3663` | page | polish |
| 32 | `theme-color` meta is a fixed `#eaecee`; a dark PWA gets a light status bar. | 7 | `chat/index.html:11` | page | polish |
| 33 | Docs header overflows the phone: at 390 the header is 388px wide but `nav` is 334px at x=102 (four mono links, 1.5rem gaps), so `scrollWidth` is 436 and the page scrolls sideways; the wordmark wraps to "FACETS / · DOCS". See `faces-docs-glossary-390-light.png`. | 16, 6 | `scripts/build-docs.mjs:89-93`, `:124` | page | blocks (390) |
| 34 | Docs chrome is JetBrains Mono 11px uppercase +0.22em everywhere: wordmark, nav, folio, status, footer, and every `th`. Charter: mono only for kernel numbers and SL; labels Inter 11/600 +0.06em. | 5 | `scripts/build-docs.mjs:90`, `:97`, `:117`, `:122` | page | hurts |
| 35 | Docs measure 672px (42rem) at 16px Inter = 78 characters per line (limit 72); the sheet is 896px, so 224px of the sheet is a dead column with no table of contents. Index is 8185px tall with 8 h2s, quickstart 5838px, glossary 4609px with 15 h3 entries and no in-page navigation. Stripe: 240px sidebar plus on-page TOC. | 6, 1 | `scripts/build-docs.mjs:88`, `:100` | page | hurts |
| 36 | Docs heading scale: h1 41.6px/500, h2 30.4px/500 with a 1px full-ink rule above (`--rule` = ink), h3 22.4px/600, h4 15.2px uppercase. Charter: 30/24/20 at 700; the ink rule over every section head is the withdrawn rubric-rule device. | 5, withdrawn list | `scripts/build-docs.mjs:99`, `:101-103` | page | polish |
| 37 | Docs spacing off-scale: h2 margins 44/14.4px, p margin 17.6px, li 5.6px, header padding 20/32px, status padding 1.6/8px, pre padding 16/19.2px. | 4 | `scripts/build-docs.mjs:89`, `:98`, `:101`, `:105`, `:108`, `:111` | page | polish |
| 38 | Docs links are ink with a 1px accent bottom border (no colour until hover), status pill is a square-cornered accent outline, inline code and `pre` have 0 radius and no (or rule-soft) border. Stripe: link `#5469d4` 500, code 6px radius on `#f4f7fa` with 1px `#d4dee9`. Charter: nested boxes 4px. | 8, 3 | `scripts/build-docs.mjs:86-87`, `:98`, `:110-111` | page | polish |
| 39 | No authored `:focus-visible` in the docs shell; keyboard focus is the UA default only. | 10 | `scripts/build-docs.mjs:83-125` | page | hurts |
| 40 | `article table { display: block }` for horizontal scroll strips table semantics for assistive tech; 3 of 7 `pre` blocks on the quickstart are wider than the column (692 to 802px vs 672) at every width. | 15, 6 | `scripts/build-docs.mjs:111`, `:115` | page | polish |
| 41 | "Status: LIVE." is printed twice on every doc page: as the pill and again in bold at the head of the first paragraph. | 12 | `scripts/build-docs.mjs:132-134`, `:167` | page | polish |
| 42 | Three wordmarks: portal Cormorant 600 at 91px, chat header Cormorant 500 at 15.2px beside a 22px mark, docs JetBrains Mono 11px uppercase with "docs" in accent and no mark, model home Inter 600 at 60px (`faces` h1) with Cormorant 24 door names. | 5, 14 | `portal/index.html:38-41`; `chat/index.html:436-441`; `scripts/build-docs.mjs:90-92`, `:162` | shared css (one wordmark rule, one mark) | hurts |

Contrast pairs computed (light / dark):

| Pair | Ratio | Verdict |
|---|---|---|
| ink-secondary `#45484c` on white | 9.19 | ok |
| ink-muted `#7c8084` on white | 3.98 | fails text AA |
| ink-muted `#7c8084` on paper-ground `#eaecee` | 3.36 | fails |
| accent `#3d6373` on white / on `#eaecee` | 6.50 / 5.49 | ok |
| white on accent (Send, light) | 6.50 | ok |
| `#16181a` on accent-dark `#6fa5b8` (Send, dark) | 6.57 | ok |
| ink-muted-dark `#7d8286` on paper-dark `#17191c` | 4.54 | ok by 0.04 |
| ink-secondary-dark `#b0b4b8` on `#17191c` | 8.44 | ok |
| border `#d5dee4` on white (control edge) | 1.36 | fails 3:1 for a control edge |
| border-dark `#33383b` on `#17191c` | 1.48 | fails 3:1 |
| ink-dark `#e8eaec` on the white gem (portal forced dark) | 1.21 | fails |
| indigo door text `#545c93` on white | 6.31 | ok |
| `#2563eb` evidence link on white | 5.17 | ok, but off-token |

## Drift between the faces and the model app

Values are computed on the live pages (1309 viewport, light); the model column is the live `/model/` home plus `web/src/index.css`.

| Property | Portal | Chat | Docs | Model |
|---|---|---|---|---|
| Type scale (display) | Cormorant 600: h1 91.6px (60.8 at 390), door labels 35px SVG | Cormorant 300 32px welcome title; Cormorant 400 16.8px accent tagline; Cormorant 500 15.2px wordmark | Cormorant 500: h1 41.6, h2 30.4; Cormorant 600 h3 22.4 | Inter 600 60px h1; Cormorant 400 24px door names |
| Type scale (body and UI) | Inter 16 body, tagline 18.4, SVG "go" 13.8 | Inter 16 input, 14.7 lens name, 13.1 rail, 12.5 subline, 12.2 Send, 11.5 buttons (18 rules), 9.6 export, 8.96 lens tag, 8.8 min | Inter 16/25.6 prose, 13.8 code, 13 pre; JetBrains Mono 11 uppercase chrome | Inter 14/22.75 rows, 20 door ledes; JetBrains Mono 11 uppercase +0.025 to +0.28em labels |
| Spacing | 32/24 page padding, 64 gap, 17.6 tagline gap; phone 20/24, 25.6 gap | 8/20 topnav, 10/18 header, 12/20 composer, 12/16 textarea, 12/20 Send; gaps 4,5,6,7,8,10,12,14 | 20/32 header, 48/32/64 main, 44/14.4 h2, 17.6 p, 5.6 li; phone 32/20 | 4px scale per check-tokens; measured button heights 25 and 17 |
| Radii | gem only (0) | 0,3,4,5,6,8,10,12,20,50%,999,9999 | 0 everywhere (status, code, pre) | 4px (3 uses) and pill (2 uses) on home |
| Surface tokens | ground `--bg-secondary #fafafb`, sheet none (gem white literal) | ground `--paper-ground #eaecee`, sheet `--paper #fff`, input `#eaecee`, rail `#fff` | ground `#eaecee`, sheet `#fff` with 1px `--rule-soft` sides, code `--paper-edge #f4f5f6` | ground `--bg-primary #f1f2f3`, sheet `--bg-secondary #fafafb`, `--bg-surface #e6e7e9` |
| Accent | teal `#3d6373` on "build →"; indigo `#545c93` on "ask →" and the Chat facet | teal `--flow` on Send, dot, mark, tagline, active lens; 34 `--dim-*` hues; `#2563eb` links | teal on link underline, status pill, "docs" in wordmark, hover | teal `--accent`; lens seam slate/indigo/teal; four chart hues; three world hues |
| Icon style | heptagon mark: 0.35 outline, 0.2 spokes at 50% (ink) | 16px SVGs at 1.5 stroke (New, Lenses); heptagon 2 stroke accent, 1 spokes at 40%; unicode ▾ ✕ ○ → | no icons; favicon heptagon 2 stroke accent on `#fafafb` | 44×44 and 72×72 SVGs at 0.8 to 1.2 stroke; 20 `stroke-width="1.2"` |
| Mark | 80-unit heptagon, points `40,4 71,19 78,52 57,76 23,76 2,52 9,19`, two lit facets, five tinted | 80-unit heptagon, points `40,4 68.3,16.6 76,44.9 59.4,70.1 20.6,70.1 4,44.9 11.7,16.6`, seven accent spokes, 22px in the header, 80px on welcome | same heptagon as chat in the favicon only; no mark in the page | no heptagon on the home page (5 SVGs, none the mark) |
| Theme | pinned light | follows OS, no toggle | follows OS, no toggle | system / light / dark toggle (`data-theme`) |
| Wordmark | "Facets" Cormorant 600 91px | "Facets" Cormorant 500 15.2px + mark | "FACETS · DOCS" JetBrains Mono 11 uppercase | "facets" Inter 600 60px |

## Exemplar numbers (measured, not looked at)

| Exemplar | What was measured | Values |
|---|---|---|
| Stripe docs (docs.stripe.com/payments/accept-a-payment, 1440) | type, measure, code, links | h1 32/40 700; h2 24/32 400; h3 16/24 600; body 16/26 `#3c4257`; article 814px (100 cpl, Stripe is wider than the charter's 72); inline code Menlo 14.4 on `#f4f7fa`, 1px `#d4dee9`, radius 6; pre 13/19; link `#5469d4` 500 no underline; sidebar link 14/20 600, padding 8/12 |
| Linear (linear.app, 1440, dark) | hero, chrome, buttons | h1 Inter 64/64 510 at -0.022em; sub 15/24 `#8a8f98`; header 73px; nav link 16, padding 0 8, radius 6; "Log in" 32h 13px pill; "Get started" 44h 16px pill, padding 0 20; side gutter 78 to 80px; logo 88×22; body `#08090a` on `#f7f8f8` |
| Perplexity (perplexity.ai, 1440, light) | empty-state input | box 640×120 (text row 52 + tool row), radius 20 outer / 26 wrapper, white on `#fbfbfb`, no border, no shadow, 16/24 text, 12px inner padding, 32px round submit; box top at y=300 of 729 (41%); left nav 240px |
| Vercel Geist (vercel.com/geist/typography, 1440) | tokens and text combos | `--geist-space 4px`, `--geist-gap 24px`, `--geist-radius 6px`, page width 1200, page margin 24; h1 40/48 600 -0.06em; h3 24/32 600 -0.04em; lede 20/30; body 14/20 400 (105 nodes) and 13/20; 12/16 500 labels; button 32h 14px radius 4, 1px `#ebebeb`, no shadow; greys hsl 0 0% 95 / 30 / 9 |

What the exemplars agree on, against the faces: body UI at 13 to 14px with 20px line height (Geist, Stripe sidebar) where chat sits at 11.5 and docs chrome at 11 mono; buttons 32px tall with a 4 to 6px radius and a 1px edge, no shadow (Geist), where chat has 20px and 44px buttons at 4, 10 and 12px radii; a centred empty-state box at about 40% of the viewport (Perplexity) where chat bottom-anchors; a 240px navigation column beside docs prose (Stripe, Perplexity) where docs have a 224px empty gutter.

## Screenshots

All under `/private/tmp/claude-501/-Users-home-vault/c399e3e2-1755-476f-baa0-965c9b5ae3fd/scratchpad/makeover/shots/`. "1440" files are the 1309×663 viewport the shared window gave (see method); 1024 files are 1024×768 renders at 0.6 (614×461 px); 390 files are 390×844 renders at 0.75 (293×633 px).

| File | What |
|---|---|
| `faces-portal-1440-light.png` | portal, light |
| `faces-portal-1440-dark.png` | portal, forced dark (gem stays white, labels vanish) |
| `faces-portal-1024-light.png`, `faces-portal-1024-dark.png` | portal at 1024 |
| `faces-portal-390-light.png`, `faces-portal-390-dark.png` | portal at 390 (stacked layout) |
| `faces-chat-rail-overlay-1440-light.png` | chat as it first painted: remembered rail open, page dimmed, previous conversation |
| `faces-chat-1440-light.png`, `faces-chat-1440-dark.png` | chat empty state, rail collapsed |
| `faces-chat-lensbar-1440-light.png` | chat with the lens bar open (sixth tab clipped) |
| `faces-chat-1024-light.png`, `faces-chat-1024-dark.png` | chat empty state at 1024 |
| `faces-chat-390-light.png`, `faces-chat-390-dark.png` | chat empty state at 390 (rail strip docked) |
| `faces-docs-index-1440-light.png`, `faces-docs-index-1440-dark.png` | docs front page |
| `faces-docs-quickstart-1440-light.png` | quickstart page head |
| `faces-docs-quickstart-1024-light.png`, `faces-docs-quickstart-1024-dark.png` | quickstart at 1024 |
| `faces-docs-glossary-390-light.png`, `faces-docs-glossary-390-dark.png` | glossary at 390 (header overflow, nav clipped) |

Not captured: a chat answer (no question was sent), the docs glossary at 1440 and 1024 (measured, same shell as the quickstart), docs at 390 for the index and quickstart (same header overflow; quickstart `pre` blocks additionally scroll inside their column).
