# Makeover audit, 2026-10-26: chrome

**Status: RESEARCH.** One of seven read-only audits behind [`../makeover-2026-10.md`](../makeover-2026-10.md), written by an agent against the dev build of `design/makeover` at aa4b3d1. Rule numbers refer to the charter. Screenshots are not in the repo.

# Chrome audit: menu bar, mode strips, lens band, status bar

Surface: `web/src/App.tsx` (MenuBar 4231-4660, ThemeControl 4204-4229, workbench controls 2959-3034, mode switch 3036-3083, Focus strip 3086-3093, lens question band 3216-3230), `web/src/StatusBar.tsx`, `web/src/Transport.tsx`, `web/src/ui.tsx` (Pill, Tabs, ToolButton), `web/src/index.css`. Measured in Chrome on the LLM Serving Market model at 1440x900, 1024x768 and 390x844, light and dark. Method note: the shared Chrome window would not resize (another auditor's window state), so each width was measured inside a same-origin iframe of exactly that viewport; `useNarrow` (matchMedia) and all layout behave as in a real window, and screenshots show the iframe.

## Verdict

The chrome is quiet and the palette already clears 4.5:1 on every text pair measured, but it is built from pills (9999px radius on 11 controls), browser-default focus rings, menus with no roles, no Escape and no arrow keys, and a bar that wraps to two rows at 1024 and loses its whole right half at 390. Tokens and one Menu primitive fix two thirds of the table; the narrow layout needs a surface pass.

## Findings

| # | Finding | Rule | Where (file:line) | Fix size | Severity |
|---|---|---|---|---|---|
| 1 | Mode switch Write/Build/Read/Focus, Model/Measurements, lens tabs, 3D pill: `borderRadius: var(--radius-pill)` (9999px) on 11 chrome buttons and their 4 group wrappers; charter allows pills only for the verdict chip | 3 | App.tsx:2963, 2969, 2984, 2993, 3010, 3017, 3038, 3049, 3070 | token | blocks |
| 2 | Status bar toggles Grounding/Opaque/Focus and the narrow Margin toggle use `rounded-full` (measured radius 3.7e7px) | 3 | StatusBar.tsx:91, 107, 123, 138 | primitive | hurts |
| 3 | Transport ▶ Run and ⏭ Step are pills (`--radius-pill`); ToolButton is `rounded-full`; ConfirmDialog buttons `rounded-full` | 3 | Transport.tsx:58, 71; ui.tsx:130, 428, 435, 443 | primitive | hurts |
| 4 | `--radius-lg` 12px and `--radius-card` 10px still declared; charter collapses both onto 8/4 | 3 | index.css:128-129 | token | polish |
| 5 | File and Switch menus carry `boxShadow: var(--shadow-card)` (0 1px 2px rgba 0.05); SystemTypeEditor popover inherits Card's shadow; tokens must resolve to none | 2 | App.tsx:4408, 4455; ui.tsx:26, 363, 417; index.css:140-141 | token | hurts |
| 6 | Menu bar bottom rule `--rule-soft` on `--paper-edge` is 1.18:1 light, 1.25:1 dark; the bar reads as floating text, not a band with an edge | 1, 2 | App.tsx:4341 | token | hurts |
| 7 | Menu panel border `--border` on `--paper-edge` is 1.25:1 light, 1.40:1 dark; the popover edge is carried by the (to be removed) shadow, so after rule 2 lands the menu has no edge at all | 2, 7 | App.tsx:4406, 4453; index.css:123 | token | blocks |
| 8 | Pill group fill `--bg-surface` on `--paper-edge` is 1.13:1 light, 1.11:1 dark: the three segmented groups are a surface step a viewer cannot see, so the strips read as loose words | 1 | App.tsx:2964, 2985, 3039; index.css:45 | token | hurts |
| 9 | Status toggle borders `1px solid var(--hairline)`: 1.14:1 light, 1.07:1 dark (hairline is `#2a2f3260`, 38% alpha over bg-secondary); the control boundary fails the 3:1 control floor | 7, 8 | StatusBar.tsx:93, 109, 125, 141; index.css:124 | token | hurts |
| 10 | Menu bar is `paper-edge` (#f4f5f6), lens band and status bar are `bg-secondary` (#fafafb), pill groups `bg-surface` (#e6e7e9): three families of surface token on one chrome, mixing the home page's "printed record" set with the Frost set; charter wants three steps from one set | 1 | App.tsx:4341, 3219; StatusBar.tsx:60 | token | hurts |
| 11 | Every chrome control uses the browser default focus ring: `outline: auto 1px #005fcc` on Home/File/Switch/title/pin/theme and menu items, measured by a focusin log; on the pill buttons the ring is `auto 2px currentColor`, which on a selected pill is white on white (Write, Model, Mobus focused: outline color rgb(255,255,255)) | 10 | App.tsx:4375, 4390, 4434, 4584, 4642, 4211, 4328; index.css (no rule) | token | blocks |
| 12 | The default ring #005fcc is 2.77:1 on dark paper-edge, under the 3:1 floor; the charter ring (`--accent` 2px, offset 2px) is 5.95:1 light and 6.11:1 dark on the same ground, but only 1.44:1 over a selected accent-strong fill, so the selected pill needs the offset to clear the fill | 10, 7 | index.css:63, 123 | token | hurts |
| 13 | File menu: trigger has no `aria-haspopup` or `aria-expanded`; panel has no `role="menu"`; items are plain buttons with no `role="menuitem"`; APG and Radix both require these | 15 | App.tsx:4388-4397, 4402-4425, 4324-4338 | primitive | blocks |
| 14 | File menu ignores Escape: real Escape keypress with the menu open left it open and focus on File (no keydown handler exists); only a backdrop click closes it | 15 | App.tsx:4401 | primitive | blocks |
| 15 | Opening File by keyboard (Enter) leaves focus on the trigger; ArrowDown does nothing (focus stayed on "Open…" after ArrowDown); Tab walks items one by one and then leaves the menu without closing it (backdrop stays, z-10 over the page) | 15 | App.tsx:4388-4425 | primitive | blocks |
| 16 | Switch menu: same missing roles, Escape and arrows; a 16-row list with headings is a `div` of buttons; headings are not `role="group"` with `aria-labelledby` | 15 | App.tsx:4431-4567 | primitive | blocks |
| 17 | SystemType popover on the title: `aria-expanded` is set but no `aria-haspopup`, no Escape (confirmed: Escape dispatched to body and to the focused button left it open), no focus move into the panel | 15 | App.tsx:4576-4620 | primitive | hurts |
| 18 | Menu items have no hover or active state at all (no `:hover` background, no `data-highlighted`); only the cursor changes; APG expects a visible highlighted item | 20, 15 | App.tsx:4324-4338 | primitive | hurts |
| 19 | Menu items are 28px tall, 12px Inter, 160px wide panel; charter row size is 14px with controls on 14; Apple and Radix menus run 28 to 32px rows at 13 to 14px type. Keep 28, raise type to 13/14 | 5 | App.tsx:4328, 4403 | primitive | polish |
| 20 | Shortcut shown inline as "Save ⌘S" inside the label; Apple HIG and Linear right-align the shortcut as a separate slot; no other item shows a shortcut though ⌃⌥F, ⌃⌥O exist in tooltips | 5, 12 | App.tsx:4411; StatusBar.tsx:122, 137 | primitive | polish |
| 21 | Disabled items and the disabled Home/Switch buttons use `opacity: 0.5` over text-muted: 1.93:1 light, 2.11:1 dark; disabled text has no contrast floor in WCAG but the label becomes unreadable rather than greyed; use `--text-muted` alone (4.51:1) and `aria-disabled` | 7 | App.tsx:4333-4335, 4379, 4438 | token | polish |
| 22 | Menu section headings "Workbench / Demos / Saved in this browser" are 10px uppercase; charter label style is 11/600 uppercase +0.06em; `text-[10px]` is outside the eight sizes | 5 | App.tsx:4461, 4488, 4513 | token | polish |
| 23 | Active model in Switch is marked by a "• " text bullet prefix and child rows by a "└ " text glyph; unicode doing an icon's job, and the bullet shifts the label 8px out of column | 14, 12 | App.tsx:4479, 4506, 4544, 4547 | primitive | hurts |
| 24 | Switch trigger carries "▾" and the status bar narrow toggle "▸" / "✕", the verdict chip "✓", the transport "▶ ⏭ ⏮", the palette collapse "◂ ▸", pinned "✓": unicode glyphs where the icon grammar wants drawn 16px SVGs | 14 | App.tsx:4444, 4647, 4717, 4739; StatusBar.tsx:72, 99; Transport.tsx:61, 74, 86 | primitive | hurts |
| 25 | Dirty state is " •" appended to the title text (`{dirty ? " •" : ""}`), colour and glyph only, and the button's accessible name becomes "LLM Serving Market •"; needs a drawn dot plus "unsaved" in the name | 12, 14 | App.tsx:4600 | primitive | hurts |
| 26 | Wordmark "FACETS · MODEL" is 12px JetBrains Mono 600 uppercase +0.6px; charter puts names of things in Cormorant 700 and reserves mono for kernel numbers and SL | 5 | App.tsx:4350-4361 | token | hurts |
| 27 | HOME / FILE / SWITCH are 11px JetBrains Mono uppercase, menu items 12px Inter, pills 12px Inter 600 and 400, pin/auto 11px mono, title 11px mono: five type treatments in one 40px bar | 5 | App.tsx:4375, 4390, 4434, 4584, 4642, 4211, 3049, 2969 | token | hurts |
| 28 | Mode switch buttons are 600 weight, Model/Measurements and lens buttons are 400 at the same 12px: two strips that look like the same control but are not styled the same | 5, 20 | App.tsx:3049 vs 2969, 2991 | primitive | polish |
| 29 | Hit targets: pin 20x17, auto 26x17, title 131x21, every pill 20px tall (padding `py-0.5`), status toggles 23px, kernel chip not a control; the 24x24 floor is missed by every control in the bar except Home/File/Switch (24px tall) | 11 | App.tsx:4642, 4211, 4584, 2969, 3049; StatusBar.tsx:91 | primitive | blocks |
| 30 | Spacing: `gap-0.5` (2px) inside groups, `p-0.5` (2px), `py-1.5` (6px) on the bar, `mx-1` (4px), `mt-1` (4px): 6px is off the 4px scale; the bar is 40px with 6px padding where 8px would give the 44px chrome Apple and Linear use | 4 | App.tsx:4340, 2963, 3038, 4403 | token | polish |
| 31 | Selected mode and selected Model use `--accent-strong` while Focus and the active lens use `--accent` / `--lens-accent`; two accent fills in one strip say two different things that are not different | 8, 20 | App.tsx:3053, 3071, 2971, 2994 | token | polish |
| 32 | Lens strip: `lensTabs(canvasModel.lens)` renders only Bunge and Mobus for this model, so the strip's meaning changes per model with no label; the group has no `role="group"` / `aria-label="Lens"` and buttons carry no `aria-pressed` (mode-switch has both; Model/Measurements has neither) | 12, 15 | App.tsx:2982-3006, 2962-2980 | primitive | hurts |
| 33 | Lens question band: `.lens-question` animates `translateX(-6px) scale(1.04)` over 450ms ease-out on every lens or mode switch, with no `prefers-reduced-motion` gate; charter is 120 to 200ms and none under reduced motion | 13 | index.css:390-409 | token | hurts |
| 34 | Lens question band sits on `--lens-chrome` which resolves to `bg-secondary`, the same as the editor header below it; the only edge is `--hairline` at 1.14:1; the band and "SL — system language" merge into one 60px block in the screenshots | 1, 2 | App.tsx:3218-3220; index.css:119, 124 | token | polish |
| 35 | Focus mode collapses the top bar to a 6px strip of `--accent` at 50% opacity (2.16:1 on paper-edge) that returns on hover only; no keyboard way to peek the bar, and the strip has no accessible name | 10, 12 | App.tsx:3086-3093 | surface | hurts |
| 36 | 1024x768: the bar wraps to 54px; "Switch ▾" breaks onto two lines (57x41), "3D · beta" breaks (41x36), the wordmark breaks "FACETS · / MODEL", and pin (x 958) overlaps the 3D pill (x 957 to 998) | 6, 16 | App.tsx:4340, 4444, 3026, 4625-4640 | surface | blocks |
| 37 | 390x844: the bar is 54px and every control from Write (x 393) rightwards sits outside the 390px viewport; the mode strip, lens strip, pin and auto are unreachable by pointer and invisible; no overflow menu | 16 | App.tsx:4340, 4625-4640 | surface | blocks |
| 38 | 390x844: status bar grows to 75px; the verdict pill wraps to two lines ("✓ / clean", 53x38) and "13 things · 12 relations" wraps to four lines; "Opaque" and "Focus" (x 349 to 398) clip past the right edge | 6, 16 | StatusBar.tsx:59, 78-81, 85 | surface | blocks |
| 39 | At 390 the Focus toggle is dropped from the mode strip (`!narrow`) but kept in the status bar, and the status bar's "Margin ▸" sheet toggle appears only there: two bars disagree on where Focus lives, and the bar that shows it is the one that clips | 16, 20 | App.tsx:3065-3066; StatusBar.tsx:86-101, 134-146 | surface | hurts |
| 40 | No horizontal page scroll at any width (scrollWidth 1440 / 1024 / 390 measured), which passes rule 16 only because the bar clips its overflow rather than scrolling it; the clipped controls still exist in the tab order (Tab reaches Write, Build, Mobus at 390 while off-screen) | 16, 15 | App.tsx:4340 | surface | hurts |
| 41 | Dark: status bar `--text-muted` #82868a on `--bg-secondary` #1d2022 is 4.47:1, 0.03 under AA; the "13 things · 12 relations", "compiled" and "kernel · wasm · SL v1.7" copy runs at this value | 7 | index.css:50, 44; StatusBar.tsx:60 | token | hurts |
| 42 | Light and dark text pairs otherwise clear AA: labels 8.42 / 7.94, pin and auto 4.51 / 4.51, selected mode 9.34 / 9.35, Focus 6.50 / 6.57, Bunge 6.31 / 6.08, Klir 5.22 / 6.66, verdict ok 5.55 / 6.98, warning 5.57 / 7.34, error 5.24 / 6.00; recorded here so the build phase retunes only #41, #7, #8, #9 | 7 | index.css:43-87 | token | polish |
| 43 | Theme control is one cycling word "auto / light / dark" in 11px mono muted; its state is readable only by the word, and the next state only in the tooltip; `aria-label="Theme: auto"` is set but no `aria-pressed` or role; a three-item `menuitemradio` group or a labelled select is the Radix/HIG shape | 12, 15 | App.tsx:4204-4229 | primitive | hurts |
| 44 | Pin control toggles between "pin" and "pinned ✓" with state carried by text and `--accent-strong` colour; no `aria-pressed` | 12 | App.tsx:4642-4649 | primitive | polish |
| 45 | Tooltips carry the only description of 12 controls (mode titles, Opaque's ⌃⌥O, Focus's ⌃⌥F) via `title`, which never shows on touch or to keyboard users | 12 | App.tsx:3057, 2976, 3020, 3076; StatusBar.tsx:122, 137 | surface | polish |
| 46 | Kernel chip in the status bar: a 6x6 `rounded-full` dot in `--accent` is the loaded indicator; colour only (muted when loading), with the text "kernel · wasm" unchanged; the "loading…" word covers it but the dot then has no job | 12, 3 | StatusBar.tsx:152-156 | primitive | polish |
| 47 | `Tabs` (inspector, run dock) draws tab labels `uppercase tracking-wide` 12px 600 with a 2px `--lens-accent` underline and `marginBottom: -1px` overlapping the hairline; badge is `rounded-full` on `--verdict-warning`; same strip should take the 11/600 +0.06em label style and a 4px badge | 5, 3 | ui.tsx:509-523 | primitive | polish |
| 48 | `Pill` has `px-2.5 py-0.5 text-xs` and a 1px border in the tone colour; used for the status verdict (allowed pill) but also for "✓ conserved / ⚠ leak" in the transport, where it is not the verdict chip | 3, 9 | ui.tsx:60-70; Transport.tsx:105 | primitive | polish |
| 49 | Transition token `--transition-base` is 200ms with `cubic-bezier(0.22,1,0.36,1)` and is applied as `transition: var(--transition-base)` with no property, so colour, radius and transform all animate on every pill; charter wants 120 to 200ms ease-out on the one changed property | 13 | index.css:171; App.tsx:2973, 2996, 3056 | token | polish |

## Exemplar numbers and what each implies

| Source | Number measured | Implication for Facets chrome |
|---|---|---|
| WAI-ARIA APG menubar and menu button (fetched) | Trigger: `aria-haspopup="menu"`, `aria-expanded`; panel `role="menu"`; items `role="menuitem"`; Enter/Space/ArrowDown open and focus the first item; ArrowUp opens on the last; Escape closes and returns focus to the trigger; Tab out closes all menus; roving tabindex with one item at 0 | Findings 13 to 17: one Menu primitive with these semantics replaces the three ad hoc popovers (File, Switch, SystemType) |
| Radix Menubar and DropdownMenu docs (fetched) | Same keyboard table; `sideOffset` 5 in examples; `data-highlighted` state on the hovered or focused item; `onCloseAutoFocus` returns focus to the trigger; animations 0.5 to 0.6s in examples, which the charter overrides to 120 to 200ms | Finding 18: items need a highlighted state; the menu's `mt-1` 4px matches Radix's 5px offset closely enough to keep |
| WCAG 2.2 SC 2.5.8 (fetched) | 24x24 CSS px minimum; spacing exception needs a 24px circle that clears neighbours; AAA is 44x44 | Finding 29: 20px pills in a 2px-gap group fail the spacing exception too; make every chrome control 24px tall in a 28 or 32px strip, 44 on touch |
| WCAG 2.2 SC 2.4.13 (fetched) | Indicator area at least a 2px perimeter; 3:1 change between focused and unfocused pixels; inset rings need 3px | Findings 11 and 12: a 2px `--accent` ring with 2px offset is the minimum that passes on both grounds and over a selected fill |
| WCAG contrast (computed here) | 49 pairs, table above; floors 4.5 text, 3.0 controls and edges | Only #41 misses text AA (4.47); the misses are all edges and surface steps (1.07 to 1.40) |
| Apple HIG menus and toolbars | Page body did not fetch (JS-rendered); only the AppKit conventions came back: modifier order ⌃ ⌥ ⇧ ⌘, shortcut right-aligned, ellipsis on items that open a dialog, disabled rather than hidden | Finding 20: "Save ⌘S" becomes a right slot; "Open…", "Save to folder…" already carry the ellipsis correctly |
| Linear (linear.app, /docs) | No CSS numbers in the fetched markdown; nav is 6 primary links plus 4 actions, one row | Confirms the one-row, flat bar; no number to cite for height, so the 44px figure in #30 is from the WCAG touch floor, not Linear |
| Raycast (raycast.com) | No numbers; shortcuts shown as separate key labels joined by "+", modifiers as words on the keyboard illustration, "⇥" glyph used once | Finding 20: a shortcut slot made of small key labels is the shape to copy, rendered at 11/600 |

What was not fetched: Linear's keyboard-shortcuts doc (404) and the HIG pages' bodies. No height or type size is claimed for Linear or Raycast; the numbers in the findings are measured on Facets or taken from WCAG and APG.

## Keyboard walk (1440, light)

Tab from Home: Home, File, Switch, title, Write, Build, Read, Focus, Model, Measurements, Bunge, Mobus, 3D · beta, pin, auto, then the SL editor. Reading order holds. Rings: browser default on 8 controls, `currentColor auto 2px` on 9 pills (white on the selected pill). Enter on File opens the menu with focus left on File; ArrowDown no-op; Escape no-op; Tab enters items (default ring visible on "Open…", screenshot below) and leaves without closing. The CodeMirror editor that follows has `outline: none` (index.css:481), so the walk goes dark after the bar.

## Screenshots

All under `/private/tmp/claude-501/-Users-home-vault/c399e3e2-1755-476f-baa0-965c9b5ae3fd/scratchpad/makeover/shots/`.

- `chrome-workbench-1440-light.jpg`: full workbench at 1440x900, light, Write mode.
- `chrome-menubar-1440-light.png`: the 40px menu bar at 1440, light, nothing open.
- `chrome-menubar-typepopover-1440-light.png`: menu bar with the System type popover open from the title.
- `chrome-filemenu-1440-light.png`: File menu open, pointer state, no item highlighted.
- `chrome-filemenu-keyboardfocus-1440-light.png`: File menu with keyboard focus on "Open…", browser default blue ring.
- `chrome-switchmenu-1440-light.png`: Switch menu open, "• " active marker, 10px headings.
- `chrome-statusbar-1440-light.png`: status bar at 1440, light.
- `chrome-focusstrip-1440-light.png`: Focus mode, the bar collapsed to the 6px accent strip above the lens band.
- `chrome-workbench-1440-dark.jpg`: full workbench at 1440, dark.
- `chrome-menubar-1440-dark.png`: menu bar and lens band, dark.
- `chrome-statusbar-1440-dark.png`: status bar, dark, hairline borders near invisible.
- `chrome-workbench-1024-light.jpg`: 1024x768 light, bar wrapped to 54px.
- `chrome-menubar-1024-light.png`: the wrapped bar, Switch and 3D on two lines, pin over 3D.
- `chrome-workbench-1024-dark.jpg`: 1024x768 dark.
- `chrome-workbench-390-light.jpg`: 390x844 light, right half of the bar clipped, 75px status bar.
- `chrome-menubar-390-light.png`: the 390 bar, only Home/File/Switch/title visible.
- `chrome-statusbar-390-light.png`: the 390 status bar, verdict pill on two lines, Opaque clipped.
- `chrome-workbench-390-dark.jpg`: 390x844 dark.
