# Makeover audit, 2026-10-26: sweeps

**Status: RESEARCH.** One of seven read-only audits behind [`../makeover-2026-10.md`](../makeover-2026-10.md), written by an agent against the dev build of `design/makeover` at aa4b3d1. Rule numbers refer to the charter. Screenshots are not in the repo.

# Facets makeover: accessibility and colour sweeps (2026-10-26)

Worktree `facets-wt-design` at commit `aa4b3d1`, read-only. App at http://localhost:5198/, Chrome 1440x729 viewport, light theme unless stated. Tools: `tools/contrast.py` (WCAG 2.x relative luminance written by hand, no package), axe-core 4.10.2 from cdnjs injected per screen, a `focusin` logger plus 40 Tab presses per screen. Data: `contrast.json`.

Charter rules checked: 7 (every text pair 4.5:1, control pair 3:1, both themes), 8 (no white ink without `--text-on-accent`), 10 (2px accent focus ring, offset 2px, never removed), 11 (hit targets 24x24), 12 (colour never the only carrier), 15 (tab order, menus close on Escape and return focus), 16 (no horizontal scroll at 1440/390/1024; only 1440 was exercised here).

## 1. Contrast table

47 colour tokens parsed from `web/src/index.css` (`light-dark()` pairs; `--lens-*` aliases resolved to their defaults). 91 pairs checked: 20 found in `.tsx` / `canvas/style.ts` style objects (a `color: "var(--x)"` and a `background[Color]: "var(--y)"` in the same object), 71 from the known-pair list. Every pair here is text, so the bar is 4.5. No control pair (border on surface) appears in a style object as colour-plus-background; `--border` is measured separately below.

Result: 24 of 91 pairs fail in at least one theme (23 light, 7 dark). Every failure is a text-coloured token that is too light for its ground; no `--text-on-accent` pair fails (6.5 to 9.4 in both themes, so the 2026-08 fix holds).

| # | pair (fg on bg) | source | light fg / bg | light ratio | dark fg / bg | dark ratio | role | light | dark |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `--chart-1` on `--bg-primary` | known | #0d82a6 / #f1f2f3 | 3.94 | #33a0bf / #16181a | 5.87 | text 4.5 | FAIL | pass |
| 2 | `--chart-1` on `--paper` | known | #0d82a6 / #ffffff | 4.41 | #33a0bf / #17191c | 5.81 | text 4.5 | FAIL | pass |
| 3 | `--chart-2` on `--bg-primary` | known | #b0642d / #f1f2f3 | 3.98 | #c77436 / #16181a | 5.07 | text 4.5 | FAIL | pass |
| 4 | `--chart-2` on `--paper` | known | #b0642d / #ffffff | 4.46 | #c77436 / #17191c | 5.02 | text 4.5 | FAIL | pass |
| 5 | `--chart-3` on `--bg-primary` | known | #6b74e0 / #f1f2f3 | 3.6 | #8188e8 / #16181a | 5.61 | text 4.5 | FAIL | pass |
| 6 | `--chart-3` on `--paper` | known | #6b74e0 / #ffffff | 4.04 | #8188e8 / #17191c | 5.55 | text 4.5 | FAIL | pass |
| 7 | `--ink-muted` on `--bg-primary` | known | #7c8084 / #f1f2f3 | 3.55 | #7d8286 / #16181a | 4.59 | text 4.5 | FAIL | pass |
| 8 | `--ink-muted` on `--bg-secondary` | known | #7c8084 / #fafafb | 3.81 | #7d8286 / #1d2022 | 4.22 | text 4.5 | FAIL | FAIL |
| 9 | `--ink-muted` on `--bg-surface` | known | #7c8084 / #e6e7e9 | 3.22 | #7d8286 / #24282a | 3.83 | text 4.5 | FAIL | FAIL |
| 10 | `--ink-muted` on `--paper` | known | #7c8084 / #ffffff | 3.98 | #7d8286 / #17191c | 4.54 | text 4.5 | FAIL | pass |
| 11 | `--ink-muted` on `--paper-edge` | code HomeScreen.tsx:1531 | #7c8084 / #f4f5f6 | 3.65 | #7d8286 / #1c1f22 | 4.26 | text 4.5 | FAIL | FAIL |
| 12 | `--ink-muted` on `--paper-ground` | known | #7c8084 / #eaecee | 3.36 | #7d8286 / #0e0f11 | 4.94 | text 4.5 | FAIL | pass |
| 13 | `--ink-muted` on `--stage-from` | known | #7c8084 / #f5f6f7 | 3.68 | #7d8286 / #191c1e | 4.41 | text 4.5 | FAIL | FAIL |
| 14 | `--ink-muted` on `--stage-to` | known | #7c8084 / #eceded | 3.39 | #7d8286 / #121415 | 4.76 | text 4.5 | FAIL | pass |
| 15 | `--kind-energy` on `--bg-primary` | known | #bb6c1c / #f1f2f3 | 3.55 | #c6721e / #16181a | 4.94 | text 4.5 | FAIL | pass |
| 16 | `--kind-energy` on `--paper` | known | #bb6c1c / #ffffff | 3.98 | #c6721e / #17191c | 4.89 | text 4.5 | FAIL | pass |
| 17 | `--kind-matter` on `--bg-primary` | known | #57814c / #f1f2f3 | 4.03 | #649457 / #16181a | 5.01 | text 4.5 | FAIL | pass |
| 18 | `--text-muted` on `--bg-primary` | code SlChain.tsx:234 | #6d7175 / #f1f2f3 | 4.39 | #82868a / #16181a | 4.85 | text 4.5 | FAIL | pass |
| 19 | `--text-muted` on `--bg-secondary` | code CoAuthorMode.tsx:353 | #6d7175 / #fafafb | 4.72 | #82868a / #1d2022 | 4.47 | text 4.5 | pass | FAIL |
| 20 | `--text-muted` on `--bg-surface` | known | #6d7175 / #e6e7e9 | 3.98 | #82868a / #24282a | 4.06 | text 4.5 | FAIL | FAIL |
| 21 | `--text-muted` on `--paper-ground` | known | #6d7175 / #eaecee | 4.15 | #82868a / #0e0f11 | 5.23 | text 4.5 | FAIL | pass |
| 22 | `--text-muted` on `--stage-to` | known | #6d7175 / #eceded | 4.19 | #82868a / #121415 | 5.04 | text 4.5 | FAIL | pass |
| 23 | `--world-bunge` on `--bg-primary` | known | #8a6a4d / #f1f2f3 | 4.41 | #c2a284 / #16181a | 7.46 | text 4.5 | FAIL | pass |
| 24 | `--world-mobus` on `--bg-primary` | known | #4e7d5b / #f1f2f3 | 4.25 | #83b191 / #16181a | 7.34 | text 4.5 | FAIL | pass |
| 25 | `--accent` on `--bg-primary` | known | #3d6373 / #f1f2f3 | 5.8 | #6fa5b8 / #16181a | 6.57 | text 4.5 | pass | pass |
| 26 | `--accent` on `--paper` | known | #3d6373 / #ffffff | 6.5 | #6fa5b8 / #17191c | 6.5 | text 4.5 | pass | pass |
| 27 | `--accent-strong` on `--bg-surface` | code StartFromData.tsx:226 | #2a4b59 / #e6e7e9 | 7.55 | #95c3d3 / #24282a | 7.81 | text 4.5 | pass | pass |
| 28 | `--chart-4` on `--bg-primary` | known | #4a7a35 / #f1f2f3 | 4.54 | #699a4e / #16181a | 5.37 | text 4.5 | pass | pass |
| 29 | `--chart-4` on `--paper` | known | #4a7a35 / #ffffff | 5.09 | #699a4e / #17191c | 5.31 | text 4.5 | pass | pass |
| 30 | `--ink` on `--bg-primary` | known | #17181a / #f1f2f3 | 15.85 | #e8eaec / #16181a | 14.76 | text 4.5 | pass | pass |
| 31 | `--ink` on `--bg-secondary` | known | #17181a / #fafafb | 17.03 | #e8eaec / #1d2022 | 13.58 | text 4.5 | pass | pass |
| 32 | `--ink` on `--bg-surface` | known | #17181a / #e6e7e9 | 14.36 | #e8eaec / #24282a | 12.33 | text 4.5 | pass | pass |
| 33 | `--ink` on `--paper` | known | #17181a / #ffffff | 17.77 | #e8eaec / #17191c | 14.6 | text 4.5 | pass | pass |
| 34 | `--ink` on `--paper-edge` | code HomeScreen.tsx:1696 | #17181a / #f4f5f6 | 16.28 | #e8eaec / #1c1f22 | 13.73 | text 4.5 | pass | pass |
| 35 | `--ink` on `--paper-ground` | code HomeScreen.tsx:106 | #17181a / #eaecee | 15.0 | #e8eaec / #0e0f11 | 15.9 | text 4.5 | pass | pass |
| 36 | `--ink` on `--stage-from` | known | #17181a / #f5f6f7 | 16.42 | #e8eaec / #191c1e | 14.2 | text 4.5 | pass | pass |
| 37 | `--ink` on `--stage-to` | known | #17181a / #eceded | 15.15 | #e8eaec / #121415 | 15.32 | text 4.5 | pass | pass |
| 38 | `--ink-secondary` on `--bg-primary` | known | #45484c / #f1f2f3 | 8.2 | #b0b4b8 / #16181a | 8.53 | text 4.5 | pass | pass |
| 39 | `--ink-secondary` on `--bg-secondary` | known | #45484c / #fafafb | 8.81 | #b0b4b8 / #1d2022 | 7.85 | text 4.5 | pass | pass |
| 40 | `--ink-secondary` on `--bg-surface` | known | #45484c / #e6e7e9 | 7.43 | #b0b4b8 / #24282a | 7.13 | text 4.5 | pass | pass |
| 41 | `--ink-secondary` on `--paper` | known | #45484c / #ffffff | 9.19 | #b0b4b8 / #17191c | 8.44 | text 4.5 | pass | pass |
| 42 | `--ink-secondary` on `--paper-edge` | known | #45484c / #f4f5f6 | 8.42 | #b0b4b8 / #1c1f22 | 7.94 | text 4.5 | pass | pass |
| 43 | `--ink-secondary` on `--paper-ground` | known | #45484c / #eaecee | 7.76 | #b0b4b8 / #0e0f11 | 9.19 | text 4.5 | pass | pass |
| 44 | `--ink-secondary` on `--stage-from` | known | #45484c / #f5f6f7 | 8.5 | #b0b4b8 / #191c1e | 8.21 | text 4.5 | pass | pass |
| 45 | `--ink-secondary` on `--stage-to` | known | #45484c / #eceded | 7.84 | #b0b4b8 / #121415 | 8.86 | text 4.5 | pass | pass |
| 46 | `--kind-field` on `--bg-primary` | known | #2f6c9c / #f1f2f3 | 5.0 | #428cc6 / #16181a | 4.92 | text 4.5 | pass | pass |
| 47 | `--kind-field` on `--paper` | known | #2f6c9c / #ffffff | 5.61 | #428cc6 / #17191c | 4.86 | text 4.5 | pass | pass |
| 48 | `--kind-informational` on `--bg-primary` | known | #8054a0 / #f1f2f3 | 5.07 | #9e79b8 / #16181a | 4.99 | text 4.5 | pass | pass |
| 49 | `--kind-informational` on `--paper` | known | #8054a0 / #ffffff | 5.69 | #9e79b8 / #17191c | 4.93 | text 4.5 | pass | pass |
| 50 | `--kind-matter` on `--paper` | known | #57814c / #ffffff | 4.52 | #649457 / #17191c | 4.96 | text 4.5 | pass | pass |
| 51 | `--lens-accent` on `--lens-accent-soft` | code AnalystPanel.tsx:291 | #3d6373 / #d5e2e8 | 4.91 | #6fa5b8 / #1b2f39 | 5.12 | text 4.5 | pass | pass |
| 52 | `--text-muted` on `--paper` | known | #6d7175 / #ffffff | 4.92 | #82868a / #17191c | 4.8 | text 4.5 | pass | pass |
| 53 | `--text-muted` on `--paper-edge` | known | #6d7175 / #f4f5f6 | 4.51 | #82868a / #1c1f22 | 4.51 | text 4.5 | pass | pass |
| 54 | `--text-muted` on `--stage-from` | known | #6d7175 / #f5f6f7 | 4.55 | #82868a / #191c1e | 4.67 | text 4.5 | pass | pass |
| 55 | `--text-on-accent` on `--accent` | code App.tsx:3911 | #ffffff / #3d6373 | 6.5 | #16181a / #6fa5b8 | 6.57 | text 4.5 | pass | pass |
| 56 | `--text-on-accent` on `--accent-strong` | code ReviewPanel.tsx:395 | #ffffff / #2a4b59 | 9.34 | #16181a / #95c3d3 | 9.35 | text 4.5 | pass | pass |
| 57 | `--text-on-accent` on `--lens-accent` | code InspectorDock.tsx:244 | #ffffff / #3d6373 | 6.5 | #16181a / #6fa5b8 | 6.57 | text 4.5 | pass | pass |
| 58 | `--text-on-accent` on `--verdict-error` | code ui.tsx:265 | #ffffff / #c2352c | 5.47 | #16181a / #ef7a72 | 6.52 | text 4.5 | pass | pass |
| 59 | `--text-on-accent` on `--verdict-ok` | known | #ffffff / #1f7351 | 5.79 | #16181a / #4fbc93 | 7.58 | text 4.5 | pass | pass |
| 60 | `--text-on-accent` on `--verdict-warning` | code ui.tsx:521 | #ffffff / #8a5c08 | 5.81 | #16181a / #dba448 | 7.98 | text 4.5 | pass | pass |
| 61 | `--text-on-accent` on `--world-bunge` | known | #ffffff / #8a6a4d | 4.94 | #16181a / #c2a284 | 7.46 | text 4.5 | pass | pass |
| 62 | `--text-on-accent` on `--world-klir` | known | #ffffff / #5a6c85 | 5.36 | #16181a / #8fa2c0 | 6.86 | text 4.5 | pass | pass |
| 63 | `--text-on-accent` on `--world-mobus` | known | #ffffff / #4e7d5b | 4.76 | #16181a / #83b191 | 7.34 | text 4.5 | pass | pass |
| 64 | `--text-primary` on `--bg-primary` | code App.tsx:4776 | #17181a / #f1f2f3 | 15.85 | #e8eaec / #16181a | 14.76 | text 4.5 | pass | pass |
| 65 | `--text-primary` on `--bg-secondary` | code App.tsx:3904 | #17181a / #fafafb | 17.03 | #e8eaec / #1d2022 | 13.58 | text 4.5 | pass | pass |
| 66 | `--text-primary` on `--bg-surface` | code StartFromData.tsx:464 | #17181a / #e6e7e9 | 14.36 | #e8eaec / #24282a | 12.33 | text 4.5 | pass | pass |
| 67 | `--text-primary` on `--lens-accent-soft` | code canvas3d/Canvas3D.tsx:203 | #17181a / #d5e2e8 | 13.43 | #e8eaec / #1b2f39 | 11.51 | text 4.5 | pass | pass |
| 68 | `--text-primary` on `--paper` | known | #17181a / #ffffff | 17.77 | #e8eaec / #17191c | 14.6 | text 4.5 | pass | pass |
| 69 | `--text-primary` on `--paper-edge` | known | #17181a / #f4f5f6 | 16.28 | #e8eaec / #1c1f22 | 13.73 | text 4.5 | pass | pass |
| 70 | `--text-primary` on `--paper-ground` | known | #17181a / #eaecee | 15.0 | #e8eaec / #0e0f11 | 15.9 | text 4.5 | pass | pass |
| 71 | `--text-primary` on `--stage-from` | known | #17181a / #f5f6f7 | 16.42 | #e8eaec / #191c1e | 14.2 | text 4.5 | pass | pass |
| 72 | `--text-primary` on `--stage-to` | known | #17181a / #eceded | 15.15 | #e8eaec / #121415 | 15.32 | text 4.5 | pass | pass |
| 73 | `--text-secondary` on `--bg-primary` | code ReasonerGate.tsx:123 | #45484c / #f1f2f3 | 8.2 | #b0b4b8 / #16181a | 8.53 | text 4.5 | pass | pass |
| 74 | `--text-secondary` on `--bg-secondary` | code RunCard.tsx:84 | #45484c / #fafafb | 8.81 | #b0b4b8 / #1d2022 | 7.85 | text 4.5 | pass | pass |
| 75 | `--text-secondary` on `--bg-surface` | code DataMode.tsx:643 | #45484c / #e6e7e9 | 7.43 | #b0b4b8 / #24282a | 7.13 | text 4.5 | pass | pass |
| 76 | `--text-secondary` on `--paper` | known | #45484c / #ffffff | 9.19 | #b0b4b8 / #17191c | 8.44 | text 4.5 | pass | pass |
| 77 | `--text-secondary` on `--paper-edge` | known | #45484c / #f4f5f6 | 8.42 | #b0b4b8 / #1c1f22 | 7.94 | text 4.5 | pass | pass |
| 78 | `--text-secondary` on `--paper-ground` | known | #45484c / #eaecee | 7.76 | #b0b4b8 / #0e0f11 | 9.19 | text 4.5 | pass | pass |
| 79 | `--text-secondary` on `--stage-from` | known | #45484c / #f5f6f7 | 8.5 | #b0b4b8 / #191c1e | 8.21 | text 4.5 | pass | pass |
| 80 | `--text-secondary` on `--stage-to` | known | #45484c / #eceded | 7.84 | #b0b4b8 / #121415 | 8.86 | text 4.5 | pass | pass |
| 81 | `--verdict-error` on `--bg-primary` | known | #c2352c / #f1f2f3 | 4.88 | #ef7a72 / #16181a | 6.52 | text 4.5 | pass | pass |
| 82 | `--verdict-error` on `--bg-secondary` | code CoAuthorMode.tsx:388 | #c2352c / #fafafb | 5.24 | #ef7a72 / #1d2022 | 6.0 | text 4.5 | pass | pass |
| 83 | `--verdict-error` on `--paper` | known | #c2352c / #ffffff | 5.47 | #ef7a72 / #17191c | 6.46 | text 4.5 | pass | pass |
| 84 | `--verdict-ok` on `--bg-primary` | known | #1f7351 / #f1f2f3 | 5.16 | #4fbc93 / #16181a | 7.58 | text 4.5 | pass | pass |
| 85 | `--verdict-ok` on `--paper` | known | #1f7351 / #ffffff | 5.79 | #4fbc93 / #17191c | 7.5 | text 4.5 | pass | pass |
| 86 | `--verdict-warning` on `--bg-primary` | known | #8a5c08 / #f1f2f3 | 5.18 | #dba448 / #16181a | 7.98 | text 4.5 | pass | pass |
| 87 | `--verdict-warning` on `--paper` | known | #8a5c08 / #ffffff | 5.81 | #dba448 / #17191c | 7.9 | text 4.5 | pass | pass |
| 88 | `--world-bunge` on `--paper` | known | #8a6a4d / #ffffff | 4.94 | #c2a284 / #17191c | 7.38 | text 4.5 | pass | pass |
| 89 | `--world-klir` on `--bg-primary` | known | #5a6c85 / #f1f2f3 | 4.78 | #8fa2c0 / #16181a | 6.86 | text 4.5 | pass | pass |
| 90 | `--world-klir` on `--paper` | known | #5a6c85 / #ffffff | 5.36 | #8fa2c0 / #17191c | 6.79 | text 4.5 | pass | pass |
| 91 | `--world-mobus` on `--paper` | known | #4e7d5b / #ffffff | 4.76 | #83b191 / #17191c | 7.27 | text 4.5 | pass | pass |

### Controls (3:1) measured outside the style objects

| pair | light | dark | bar | verdict |
|---|---|---|---|---|
| `--border` on `--bg-primary` | #d5dee4 / #f1f2f3 = 1.22 | #33383b / #16181a = 1.50 | 3.0 | FAIL both; the border is a hairline, not a control edge. Inputs that rely on it alone (number fields, the library search) have no 3:1 boundary |
| `--border` on `--bg-secondary` | 1.31 | 1.46 | 3.0 | FAIL both |
| `--accent` as control ink on `--bg-primary` | 5.80 | 6.57 | 3.0 | pass; a 2px accent ring (rule 10) passes everywhere |
| Nord `rule-strong` #aebdcf on Nord paper / paper-2 / paper-3 | 1.91 / 1.76 / 1.62 | n/a | 3.0 | FAIL as a control edge; Nord rule tokens are for hairlines only, so inputs need a darker edge token (`--ink-muted` at 4.5 or the accent) |

### Proposed replacements for every failing pair

Method: hold the token's hue and saturation (HLS), step lightness toward the ground until the pair clears 4.5 on its worst listed surface. Reference family is Arcadia DESIGN.md (`mute` #5b6577, `ink-2` #3b4252, `accent` #3d6593). Ratios below are computed with the same script.

| token | current (light / dark) | proposed (light / dark) | worst pair and its new ratio | note |
|---|---|---|---|---|
| `--text-muted` | #6d7175 / #82868a | **#5b6577** / **#8e9499** | light on `--bg-surface` #e6e7e9: 3.98 -> 4.75; dark on `--bg-surface` #24282a: 4.06 -> 4.85 | Light value is Nord `mute` itself (rule 7). Light also clears paper 5.88, bg-primary 5.24, stage-to 5.01. Dark clears bg-secondary 5.34, bg-primary 5.80. 341 call sites move at once |
| `--ink-muted` | #7c8084 / #7d8286 | **#5b6577** / **#8e9499** | light on `--bg-surface`: 3.22 -> 4.75; dark on `--bg-surface`: 3.83 -> 4.85 | Same value as `--text-muted`; rule 7 names one `mute`, so the two tokens should alias. 29 call sites. If the home register wants a lighter mute than the workspace, the ceiling on paper #ffffff is #73777b (4.51) and on paper-edge #6d7174 (4.51) |
| `--chart-1` | #0d82a6 / #33a0bf | **#0c7592** / unchanged | on `--bg-primary`: 3.94 -> 4.71; paper 5.28 | same hue 199 deg; dark already 5.87 |
| `--chart-2` | #b0642d / #c77436 | **#9e5a28** / unchanged | on `--bg-primary`: 3.98 -> 4.75; paper 5.32 | copper kept; dark 5.07 |
| `--chart-3` | #6b74e0 / #8188e8 | **#5560d8** / unchanged | on `--bg-primary`: 3.60 -> 4.62; paper 5.18 | periwinkle kept; dark 5.61 |
| `--kind-energy` | #bb6c1c / #c6721e | **#9f5c18** / unchanged | on `--bg-primary`: 3.55 -> 4.66; paper 5.23 | hue 30 deg held; check-tokens.mjs hue bound (0.5 deg) keeps the dark pair in step |
| `--kind-matter` | #57814c / #649457 | **#4f7645** / unchanged | on `--bg-primary`: 4.03 -> 4.67; paper 5.24 | |
| `--world-bunge` | #8a6a4d / #c2a284 | **#86664a** / unchanged | on `--bg-primary`: 4.41 -> 4.67; paper 5.23 | one step; only used as a label in the library |
| `--world-mobus` | #4e7d5b / #83b191 | **#4a7757** / unchanged | on `--bg-primary`: 4.25 -> 4.61; paper 5.16 | |

Pairs that stay as they are: `--text-primary`, `--text-secondary`, `--ink`, `--ink-secondary` on every surface (7.1 to 17.8), all four `--verdict-*` (4.9 to 8.0), `--kind-informational`, `--kind-field`, `--chart-4`, `--world-klir`, `--accent`, `--accent-strong`, and every `--text-on-accent` pair.

If rule 7 is applied literally (ink #2e3440, ink-2 #3b4252, mute #5b6577 on paper #ffffff / #f3f6f9 / #e5edf4), the Nord pairs land at ink 12.5 / 11.5 / 10.6, ink-2 10.1 / 9.3 / 8.5, mute 5.9 / 5.4 / 5.0, accent #3d6593 6.0 / 5.6 / 5.1, all passing. The muted-on-`--bg-surface` failures vanish because `paper-3` #e5edf4 with `mute` gives 4.97.

## 2. axe-core run

Eight screens, axe-core 4.10.2, `axe.run()` with defaults. "First node" is the first failing selector axe reported.

| screen | theme | id | impact | count | first node | detail |
|---|---|---|---|---|---|---|
| Home | light | color-contrast | serious | 2 | `.flex-col.flex:nth-child(1) > .pb-3\.5.gap-4.items-baseline > .tracking-\[0\.28em\].uppercase.text-\[11px\]` | `--ink-muted` #7c8084 on #ffffff = 3.97 (section rubrics "START", "THIS BUILD") |
| Home | light | landmark-one-main | moderate | 1 | `html` | no `<main>` |
| Home | light | region | moderate | 8 | `.tracking-wider` | content outside landmarks |
| Library | light | color-contrast | serious | 5 | `.mb-6` | `--ink-muted` on #ffffff = 3.97 (rubrics, "yours, and ours you have touched", "0 · newest first") |
| Library | light | landmark-one-main | moderate | 1 | `html` | |
| Library | light | region | moderate | 8 | `.tracking-wider` | |
| Workbench, LLM Serving Market, Build | light | color-contrast | serious | 1 | parameter chip | `--text-muted` #6d7175 on `--bg-primary` #f1f2f3 = 4.38 |
| Workbench Build | light | page-has-heading-one | moderate | 1 | `html` | no `<h1>` once a model is open |
| Workbench Build | light | region | moderate | 8 | `.tracking-wider` | |
| Workbench Write | light | aria-input-field-name | serious | 1 | `.cm-content` | CodeMirror editor has no accessible name |
| Workbench Write | light | color-contrast | serious | 14 | `.cm-line:nth-child(1) > .sl-tok-comment` | every SL comment line: `--text-muted` on `--bg-primary` = 4.38 |
| Workbench Write | light | landmark-one-main | moderate | 1 | `html` | |
| Workbench Write | light | landmark-unique | moderate | 1 | `.border-r` | two landmarks share a label |
| Workbench Write | light | page-has-heading-one | moderate | 1 | `html` | |
| Workbench Write | light | region | moderate | 6 | `.tracking-wider` | |
| Workbench Write | light | scrollable-region-focusable | serious | 1 | `.cm-scroller` | editor scroller not keyboard reachable as a region |
| Read mode with dock | light | color-contrast | serious | 1 | `.mt-2:nth-child(2)` | `--text-muted` on `--bg-primary` = 4.38 |
| Read mode with dock | light | page-has-heading-one | moderate | 1 | `html` | |
| Read mode with dock | light | region | moderate | 6 | `.tracking-wider` | |
| Read mode with dock | light | select-name | critical | 1 | `select` | the mode/lens `<select>` has no label |
| Readouts after Run | light | color-contrast | serious | 9 | `.whitespace-nowrap` | `--text-muted` on `--bg-primary` = 4.38 (axis and legend labels) |
| Readouts after Run | light | label | critical | 1 | `input[max="659"]` | the run scrubber `range` input has no label |
| Readouts after Run | light | region | moderate | 6 | `.tracking-wider` | |
| Readouts after Run | light | scrollable-region-focusable | serious | 1 | `.p-4.overflow-y-auto.min-h-0` | readouts pane scrolls but has no focusable content |
| Measurements | light | color-contrast | serious | 7 | `.gap-x-3 > .px-2\.5.inline-flex.font-medium` | 2 at `--text-muted` on `--bg-primary` 4.38; 5 at `--text-muted` on `--bg-surface` #e6e7e9 = 3.97 (the chips) |
| Measurements | light | page-has-heading-one | moderate | 1 | `html` | |
| Measurements | light | region | moderate | 6 | `.tracking-wider` | |
| Measurements | light | scrollable-region-focusable | serious | 1 | `.overflow-auto` | |
| Measurements | light | select-name | critical | 5 | `.justify-between.gap-2:nth-child(1) > .max-w-\[9rem\]` | five unit/bound selects unlabelled |
| Workbench Build | dark | color-contrast | serious | 17 | `.w-12.gap-0\.5.py-1\.5:nth-child(5) > .text-\[9px\].leading-none` | tool-rail captions: `--text-muted` #82868a on `--bg-secondary` #1d2022 = 4.46 (every rail item) |
| Workbench Build | dark | label | critical | 1 | `input[max="659"]` | |
| Workbench Build | dark | page-has-heading-one | moderate | 1 | `html` | |
| Workbench Build | dark | region | moderate | 8 | `.tracking-wider` | |

Notes. The first dark run, taken 800 ms after setting `data-theme`, reported 25 contrast nodes with the selected mode tab at 1.61 (`div[role="group"] > .font-semibold.transition-colors.px-3:nth-child(1)`); a second run showed the tab at `--text-on-accent` #16181a on `--accent-strong` #95c3d3 (9.35) and 17 nodes. The 1.61 is the `transition-colors` mid-swap, not a steady state; a theme switch should disable transitions for one frame. Totals by rule across the eight screens: color-contrast 56 nodes, region 56, select-name 6, label 2, scrollable-region-focusable 3, page-has-heading-one 6, landmark-one-main 3, landmark-unique 1, aria-input-field-name 1. Every contrast node traces to one of three tokens: `--ink-muted` (home register), `--text-muted` on `--bg-primary` / `--bg-surface` / dark `--bg-secondary`.

## 3. Keyboard walk

Method: blur, then 40 Tab presses through the computer tool, a `focusin` listener recording tag, text, `aria-label`, `outlineStyle outlineWidth outlineColor`, `boxShadow`, `:focus-visible` and size. Focus never left the document back to the address bar within 40 presses on any screen; the cycle wraps inside the page.

### Focus order

| screen | stops per cycle | order | indicator | not reached |
|---|---|---|---|---|
| Home | 10 | FILE, auto (theme), "Draw a system", "describe it in a few lines", Draw your system panel, Describe your system panel, Open a model panel, Sandbox (link), THIS BUILD, DOCUMENTATION | all 10 stops: UA default ring (`outline: auto`, Chrome blue rgb(0,95,204)); none has the 2px accent ring of rule 10. The `.home-panel:focus-visible` rule only tints the border and background | HOME and SWITCH are `disabled` on Home (expected). Every enabled control reached |
| Library | 10 | auto (theme), "‹ HOME", Find a model (input), LLM Serving Market (Recent), LLM Serving Market, Federal Reserve, Bitcoin, "Open a file…", BROWSE ALL 3 AS A LIST, FILE | 9 stops UA ring. **Find a model has no indicator at all** (`outline: none`, `box-shadow: none`; `HomeScreen.tsx:1581` `outline-none`) | none; 10 of 10 reached |
| Workbench, Build | 45 candidates, 40 reached | HOME, FILE, SWITCH, model name, Write, Build, Read, Focus, Model, Measurements, Bunge, Mobus, 3D beta, pin, auto, then the tool rail: select, component, environ., interface, Bu, Mo, Sp, Cm, Im, Pr, Cp, Se, Am, In, agent, { } SL, then the RUN card: readouts, ▸, amount input (3000), range slider, reset to declared, step size, run length, ▶ Run, ⏭ Step | 39 stops UA ring; the range slider has the custom 2px accent ring from `index.css:463` (the only control that meets rule 10) | after 40 presses: ELEMENT, ✓ clean, Grounding, Opaque, Focus (the status bar) were still ahead. **The canvas stage itself is not a stop**: `.canvas-stage` has no `tabindex`, `role` or `aria-label`, there is no `<canvas>` element, and no node or edge is focusable, so the diagram cannot be selected or edited from the keyboard |

Reading order: on Home the theme toggle (top right) comes before the content, and on the Library it comes before "‹ HOME" (top left of the sheet), because the top bar's DOM puts the toggle after FILE. Minor. In the workbench the order is top bar, mode axis, right-hand lens group, tool rail, run card, status bar, which matches the layout.

### FILE menu

| step | Home | Workbench Build |
|---|---|---|
| Enter on FILE | menu opens (New, Open…, Save, Save to folder…, Save to library as…, Download, Export JSON, Export walk, Export diagram SVG/PNG) | opens |
| roles | no `role="menu"`, no `role="menuitem"`, no `aria-haspopup`, no `aria-expanded` on the trigger | same |
| focus after open | stays on FILE (not moved to the first item) | same |
| Escape | **menu stays open**; focus stays on FILE | **menu stays open** |
| Tab with menu open | goes to New, then Open… (items are plain buttons in DOM order) | same |
| close | only a pointer click outside; a synthetic `mousedown` on `document` did not close it | same |

Rule 15 fails on all four counts: role, Escape, focus move, focus return.

### Hit targets (rule 11, 24x24 CSS px)

Workbench Build, 48 visible controls, 26 under 24 px on at least one side: the whole mode axis and lens group at 20 px tall (Write 55x20, Build 53x20, Read 53x20, Focus 59x20, Model 51x20, Measurements 100x20, Bunge 52x20, Mobus 55x20, 3D beta 67x20), model name 131x21, pin 20x17, auto 26x17, readouts 55x17, ▸ 10x16, ⏮ 20x16, reset to declared 100x17, the two number inputs 64x22, amount input 80x22, range slider 262x16 and 694x16, status bar buttons 59x23 to 73x23. Home: auto 26x16, THIS BUILD 88x16, DOCUMENTATION 114x16. Library: auto 26x17, "‹ HOME" 54x17, BROWSE ALL 193x17, Find a model 235x20. The tool-rail items (48x27 to 48x47) and the top-bar HOME/FILE/SWITCH (43x24, 71x24) pass.

### Rule 8 and rule 12 spot checks

Rule 8: no white ink on a fill was found outside `--text-on-accent`; the selected mode tab, Run button and lens toggle all use the token (9.35 in dark). Rule 12: the verdict pill carries the word ("✓ clean"), the kind rail items carry two-letter labels and a caption, the lens buttons carry names; no colour-only carrier was seen on the swept screens. The 9 px rail captions are the failing contrast nodes in dark, which is the one place the label is both tiny and faint.

## Ten fixes, ranked by failures removed

1. Set `--text-muted` to `light-dark(#5b6577, #8e9499)` and alias `--ink-muted` to it. Removes all 56 axe contrast nodes across the eight screens and 20 of the 24 failing token pairs (text-muted 5, ink-muted 15). One edit, 370 call sites.
2. Give the FILE menu `role="menu"`, `role="menuitem"` on items, `aria-haspopup="menu"` and `aria-expanded` on the trigger; on open move focus to the first item; on Escape close and return focus to FILE; close on outside pointerdown. Clears every rule 15 failure (4 behaviours, 2 screens).
3. Add one global rule `:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px }` and remove the three `outline-none` classes (`HomeScreen.tsx:1581`, `:1695`, `StartSurface.tsx:80`; keep `.cm-editor.cm-focused { outline: none }` only if the editor's own ring is restored). 59 of 60 recorded stops currently show the browser default instead of rule 10; the library search shows nothing.
4. Raise the mode axis, lens group, status bar and RUN card controls to 24 px minimum height (padding, not font size); give pin, ▸, ⏮, auto and the home footer buttons a 24x24 box. Clears 26 of 26 small targets in the workbench and 7 on Home/Library.
5. Wrap each screen's content in `<main>` with `<h1>` (the model name in the workbench; "Open a model" already exists on the Library) and give the side panels `aria-label`s. Removes region 56, landmark-one-main 3, landmark-unique 1, page-has-heading-one 6 (66 moderate nodes).
6. Label the six `<select>`s (mode/lens in Read mode, five units in Measurements) and the run scrubber `range` input with `aria-label` or a wrapped `<label>`. Removes select-name 6 and label 2, all critical.
7. Make the canvas stage a keyboard surface: `tabindex="0"`, `role="application"` or `role="img"` with `aria-label` naming the model, arrow keys to walk nodes, Enter to open the element. Today zero diagram elements are reachable.
8. Darken the light values of `--chart-1/2/3`, `--kind-energy`, `--kind-matter`, `--world-bunge`, `--world-mobus` to the proposed hexes (4.6 to 5.3). Clears the remaining 9 failing token pairs; dark values stay.
9. Give the CodeMirror `.cm-content` an `aria-label` ("SL source") and `tabindex="0"` on the three scrollable panes (`.cm-scroller`, readouts, measurements). Removes aria-input-field-name 1 and scrollable-region-focusable 3.
10. Introduce a control-edge token at 3:1 (light #7a8189: 3.52 on #f1f2f3, 3.18 on #e6e7e9; dark #70777e: 3.92 on #16181a, 3.28 on #24282a; or the accent) for input and select borders; keep `--border` (1.2 to 1.5) for hairlines only. Fixes the one control pair that fails rule 7 and the theme-swap flash: add `[data-theme-switching] * { transition: none }` for one frame so the 1.61 mid-transition reading cannot occur.
