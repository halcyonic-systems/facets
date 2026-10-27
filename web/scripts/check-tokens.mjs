#!/usr/bin/env node
/**
 * Token drift-gate (borrowed in shape from pullback's check-design-tokens.mjs).
 * index.css (:root) is the source of truth for design tokens; tokens.ts is the
 * JS/SVG mirror for values that can't read var(--x). This asserts the two agree:
 *
 *   1. every var(--x) referenced in tokens.ts is declared in index.css
 *   2. the reserved KIND channel (--kind-*) is declared in index.css AND its hex
 *      in tokens.ts matches index.css
 *
 *   3. the PROCESS PRIMITIVE hues (--prim-*) are ten light-dark() pairs, hue
 *      held across themes, each at least 3:1 as a filled mark on its sheet,
 *      and tokens.ts `prim` references them
 *
 * Plus the design-invariant fitness functions (#131, the block/buzz `check`
 * steal) over src/**: no raw color literals outside the token homes, px type
 * only from the frozen vocabulary, lens registers share their chrome via
 * canvas/registerChrome.ts, <foreignObject> overlays carry data-export-ignore,
 * and the instrument register itself — corner radius capped, no gradients
 * (docs/design/visual-language.md).
 *
 * The makeover charter (docs/design/makeover-2026-10.md) made three more rules
 * mechanical here (2026-10-26, slice A):
 *   (a) no shadow anywhere in src/ CSS or inline styles: a box-shadow is `none`,
 *       a token that resolves to none, or an inset 1px edge with no blur; the
 *       --shadow-* tokens themselves must resolve to none / transparent  FAIL
 *   (b) radius only via var(--radius-*) or the Tailwind classes that read those
 *       variables (rounded-sm / -md / -lg); `rounded-full` only on an element
 *       carrying data-pill (the verdict chip)                          WARN*
 *   (c) no `outline-none` class and no `outline: none` without a :focus-visible
 *       replacement on the same selector                               WARN*
 *   (d) index.css carries the global :focus-visible ring and the global
 *       prefers-reduced-motion gate                                     FAIL
 *   * warning until slice B (the primitives) lands, then RADIUS_OUTLINE_FAIL
 *     flips to true and both become failures.
 *
 * Run: npm run check:tokens (also part of just check and CI).
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, relative, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const INDEX_CSS = resolve(here, "../src/index.css");
const TOKENS = resolve(here, "../src/tokens.ts");

const norm = (h) => h.trim().toLowerCase();
// Strip /* */ and // comments so prose like "can't read var(--x)" isn't scanned.
// Block comments are blanked, not deleted, so reported line numbers stay true.
const stripComments = (src) =>
  src.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " ")).replace(/\/\/.*$/gm, "");

// index.css: the set of declared var names (any block) + the :root/light hex map.
function parseCss(src) {
  const declared = new Set();
  const hex = {};
  const lightDark = {};
  const raw = {};
  for (const m of src.matchAll(/(--[a-z0-9-]+)\s*:/g)) declared.add(m[1]);
  for (const m of src.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/g)) {
    if (!(m[1] in raw)) raw[m[1]] = m[2].trim(); // first hit = the :root value
  }
  for (const m of src.matchAll(/(--[a-z0-9-]+)\s*:\s*(#[0-9a-fA-F]{3,8})\s*;/g)) {
    if (!(m[1] in hex)) hex[m[1]] = norm(m[2]); // first match = the :root/light value
  }
  // light-dark(<light>, <dark>) — one declaration per themed token, so the two
  // values cannot drift apart in separate blocks (#321).
  for (const m of src.matchAll(
    /(--[a-z0-9-]+)\s*:\s*light-dark\(\s*(#[0-9a-fA-F]{3,8})\s*,\s*(#[0-9a-fA-F]{3,8})\s*\)/g,
  )) {
    if (!(m[1] in lightDark)) lightDark[m[1]] = [norm(m[2]), norm(m[3])];
  }
  return { declared, hex, lightDark, raw };
}

// tokens.ts: every var(--x) reference + every "key: #hex" literal.
function parseTokens(src) {
  const refs = new Set();
  const hex = {};
  for (const m of src.matchAll(/var\((--[a-z0-9-]+)\)/g)) refs.add(m[1]);
  for (const m of src.matchAll(/([A-Za-z]+)\s*:\s*"(#[0-9a-fA-F]{3,8})"/g)) hex[m[1]] = norm(m[2]);
  return { refs, hex };
}

// tokens.ts `kind` key → index.css var name (the reserved substance channel).
const KIND_MAP = {
  Matter: "--kind-matter",
  Energy: "--kind-energy",
  Informational: "--kind-informational",
  Field: "--kind-field",
};

const INDEX_CSS_SRC = stripComments(readFileSync(INDEX_CSS, "utf8"));
const css = parseCss(INDEX_CSS_SRC);
const tok = parseTokens(stripComments(readFileSync(TOKENS, "utf8")));

const problems = [];
const warnings = [];
// Slice B (the primitives) flips this to true; until then rules (b) and (c)
// list their offenders without failing the gate.
const RADIUS_OUTLINE_FAIL = false;
const soft = (msg) => (RADIUS_OUTLINE_FAIL ? problems : warnings).push(msg);

for (const ref of tok.refs) {
  if (!css.declared.has(ref)) problems.push(`tokens.ts references ${ref}, not declared in index.css`);
}

// The KIND channel's contract, enforced as its PURPOSE rather than as a proxy
// for it (#321). It used to be "the hex in tokens.ts equals the hex in
// index.css", which held the numbers still and let the channel go invisible in
// dark — Informational and Field sat at 2.88 and 2.92 against the dark node
// fill. What the channel means is that a substance reads as the same substance
// anywhere, so what is checked is: the hue is held, and both variants are
// legible on their own ground.
const HUE_TOLERANCE_DEG = 3;
// 4.5, the TEXT threshold, since 2026-10-26: the substance colour was a stroke
// and a swatch (3:1, WCAG 1.4.11) until the SL editor started setting kind
// WORDS in it, on the ground (--bg-primary), where Energy measured 3.55 and
// Matter 4.03 in light (makeover audit sl.md finding 5). The check used to read
// the node fill only, which is the gap visual-language.md warns about: a check
// that does not read the surface the text is on. Both surfaces now, both
// themes, read from index.css rather than typed here so a surface retune moves
// the floor with it.
const CONTRAST_FLOOR = 4.5;
const MARK_FLOOR = 3.0; // WCAG 1.4.11, for a filled mark that carries no text
const pairOf = (name) => {
  const p = css.lightDark[name];
  if (!p) problems.push(`${name} must be a light-dark() pair in index.css (the surface steps are themed)`);
  return p ?? ["#ffffff", "#000000"];
};
const SHEET = pairOf("--bg-secondary");
const GROUND = pairOf("--bg-primary");
const SURFACES = { light: { sheet: SHEET[0], ground: GROUND[0] }, dark: { sheet: SHEET[1], ground: GROUND[1] } };

const srgb = (h) => {
  const v = h.replace("#", "");
  const n = v.length === 3 ? [...v].map((c) => c + c) : [v.slice(0, 2), v.slice(2, 4), v.slice(4, 6)];
  return n.map((p) => parseInt(p, 16) / 255);
};
const hue = (hex) => {
  const [r, g, b] = srgb(hex);
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  if (d === 0) return 0;
  const h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return ((h * 60) % 360 + 360) % 360;
};
const relLum = (hex) =>
  srgb(hex).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
    .reduce((a, c, i) => a + c * [0.2126, 0.7152, 0.0722][i], 0);
const contrast = (a, b) => {
  const [hi, lo] = [relLum(a), relLum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
const hueGap = (a, b) => { const d = Math.abs(hue(a) - hue(b)); return Math.min(d, 360 - d); };

for (const [key, cssVar] of Object.entries(KIND_MAP)) {
  const pair = css.lightDark[cssVar];
  if (!pair) {
    problems.push(`${cssVar} must be a light-dark() pair — the KIND channel adapts lightness, not hue (#321)`);
    continue;
  }
  const [light, dark] = pair;
  const gap = hueGap(light, dark);
  if (gap > HUE_TOLERANCE_DEG)
    problems.push(`kind.${key}: hue moves ${gap.toFixed(1)}° between themes (max ${HUE_TOLERANCE_DEG}°) — the hue is the contract, not the value`);
  for (const [theme, value] of [["light", light], ["dark", dark]]) {
    for (const [surface, ground] of Object.entries(SURFACES[theme])) {
      const c = contrast(value, ground);
      if (c < CONTRAST_FLOOR)
        problems.push(`kind.${key}: ${value} is ${c.toFixed(2)} on the ${theme} ${surface} ${ground} (floor ${CONTRAST_FLOOR}) — kind words are text in the SL editor; an invisible channel is not a channel`);
    }
  }
  if (tok.hex[key])
    problems.push(`tokens.ts kind.${key} is a literal; it must reference ${cssVar} so the theme pair stays in one place`);
  if (!tok.refs.has(cssVar)) problems.push(`tokens.ts kind.${key} does not reference ${cssVar}`);
}

// The PROCESS PRIMITIVE hues (makeover rule 9b): the same contract as KIND —
// hue held across themes, legible on its own sheet — at the mark floor, since
// a primitive's colour rides a badge and a rail icon, never body text. Ten
// names, the kernel's (canvas/types.ts PRIMITIVE_BADGE); a primitive without a
// hue is a primitive the eye cannot tell apart before reading its glyph.
const PRIMITIVES = [
  "Buffering", "Modulating", "Splitting", "Combining", "Impeding",
  "Propelling", "Copying", "Sensing", "Amplifying", "Inverting",
];
for (const name of PRIMITIVES) {
  const cssVar = `--prim-${name.toLowerCase()}`;
  const pair = css.lightDark[cssVar];
  if (!pair) {
    problems.push(`${cssVar} must be a light-dark() pair in index.css — every primitive carries one hue (rule 9b)`);
    continue;
  }
  const [light, dark] = pair;
  const gap = hueGap(light, dark);
  if (gap > HUE_TOLERANCE_DEG)
    problems.push(`prim.${name}: hue moves ${gap.toFixed(1)}° between themes (max ${HUE_TOLERANCE_DEG}°) — the hue is the identity`);
  for (const [theme, value] of [["light", light], ["dark", dark]]) {
    const c = contrast(value, SURFACES[theme].sheet);
    if (c < MARK_FLOOR)
      problems.push(`prim.${name}: ${value} is ${c.toFixed(2)} on the ${theme} sheet (floor ${MARK_FLOOR} for a filled mark)`);
  }
  if (!tok.refs.has(cssVar)) problems.push(`tokens.ts prim.${name} must reference ${cssVar}`);
}

// (a) and (d): the tokens and global rules the charter pins in index.css.
for (const name of ["--shadow-card", "--shadow-card-hover"]) {
  if (css.raw[name] !== "none") problems.push(`${name} is "${css.raw[name]}" — every edge is a hairline or a surface step, never a shadow (rule 2); it must be none`);
}
for (const name of ["--shadow-ink", "--shadow-ink-hover"]) {
  if (css.raw[name] !== "transparent") problems.push(`${name} is "${css.raw[name]}" — must be transparent (rule 2)`);
}
for (const name of ["--radius-sm", "--radius-md", "--radius-lg", "--radius-card", "--radius-pill", "--focus-ring", "--motion", "--motion-fast", "--rule-strong", "--hairline"]) {
  if (!css.declared.has(name)) problems.push(`${name} is not declared in index.css`);
}
for (const [name, want] of [["--radius-sm", "4px"], ["--radius-md", "8px"], ["--radius-lg", "8px"], ["--radius-card", "8px"]]) {
  if (css.raw[name] !== want) problems.push(`${name} is "${css.raw[name]}" — rule 3 fixes it at ${want}`);
}
if (!/(^|[\s,}])(:focus-visible)\s*\{[^}]*outline:\s*var\(--focus-ring\)/m.test(INDEX_CSS_SRC))
  problems.push("index.css has no global `:focus-visible { outline: var(--focus-ring) }` rule (rule 10)");
if (!/@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{\s*\*,/m.test(INDEX_CSS_SRC))
  problems.push("index.css has no global prefers-reduced-motion gate over `*, *::before, *::after` (rule 13)");

// ---------------------------------------------------------------------------
// Design-invariant fitness functions (#131) — the block/buzz `check` steal.
// Invariants that used to live only in review memory, made un-driftable as
// cheap greps over src/. Same gate, same exit path as the token drift checks.
// ---------------------------------------------------------------------------

const SRC = resolve(here, "../src");

// Files where raw values are SANCTIONED: the token homes themselves.
const TOKEN_HOMES = new Set(["tokens.ts", "canvas/style.ts"]);

function srcFiles(dir = SRC) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...srcFiles(p));
    else if (/\.(ts|tsx)$/.test(name) && !/\.test\./.test(name)) out.push(p);
  }
  return out;
}

const lineOf = (src, idx) => src.slice(0, idx).split("\n").length;

// The house micro-type vocabulary. Standard Tailwind text-* classes are always
// fine; arbitrary `text-[Npx]` and numeric SVG/recharts fontSize must come from
// these frozen sets — a new size is a design decision, made here on purpose.
const TEXT_ARBITRARY_OK = new Set(["9px", "10px", "11px"]);
const FONTSIZE_NUMERIC_OK = new Set([8, 9, 10, 11, 12]);

// The instrument register's hard caps. 8px = --radius-md, the largest corner
// the adopted language uses on anything (the shelf/menu chips are 4px and the
// blocks themselves are square).
const MAX_RADIUS_PX = 8;
// Tailwind v4: rounded-sm / -md / -lg emit `var(--radius-sm|md|lg)`, which our
// unlayered :root declarations override, so those three ARE the tokens. The
// bare `rounded` (0.25rem, inlined), rounded-xs and the larger steps are
// literals and not token-bound.
const TW_RADIUS_PX = { none: 0, xs: 2, "": 4, sm: 4, md: 8, lg: 8, xl: 12, "2xl": 16, "3xl": 24, "4xl": 32 };
const TW_RADIUS_TOKEN_BOUND = new Set(["none", "sm", "md", "lg", "full"]);
const RADIUS_VAR_PX = { "var(--radius-sm)": 4, "var(--radius-md)": 8, "var(--radius-lg)": 8, "var(--radius-card)": 8 };
const ALLOWED_RADIUS_VALUES = new Set(["var(--radius-pill)", "0", "50%", "inherit"]);
const ALLOWED_SHADOWS = new Set(["var(--shadow-card)", "var(--shadow-card-hover)", "none"]);
// An inset edge with no blur draws a 1px line where a border would shift layout
// (the SL editor's fault bar and band dividers). Anything with a blur or an
// offset shadow is elevation and fails.
const splitTop = (v) => { const out = []; let d = 0, cur = ""; for (const ch of v) { if (ch === "(") d++; if (ch === ")") d--; if (ch === "," && d === 0) { out.push(cur); cur = ""; } else cur += ch; } out.push(cur); return out.map((x) => x.trim()).filter(Boolean); };
const isEdgeInset = (part) => {
  const m = /^inset\s+(-?\d+(?:\.\d+)?px|0)\s+(-?\d+(?:\.\d+)?px|0)\s+(var\(--[a-z0-9-]+\)|color-mix\(.*\))$/.exec(part);
  if (!m) return false;
  const px = (x) => Math.abs(Number(x.replace("px", "")));
  return px(m[1]) <= 2 && px(m[2]) <= 2;
};
const shadowOk = (v) => { const t = v.trim(); return ALLOWED_SHADOWS.has(t) || splitTop(t).every(isEdgeInset); };
// `rounded-full` is licensed only on the one true pill, the verdict chip, which
// says so with data-pill on the same opening tag.
const tagAround = (src, idx) => { const open = src.lastIndexOf("<", idx); const close = src.indexOf(">", idx); return open === -1 || close === -1 ? "" : src.slice(open, close + 1); };

for (const file of srcFiles()) {
  const rel = relative(SRC, file);
  if (TOKEN_HOMES.has(rel)) continue;
  const src = stripComments(readFileSync(file, "utf8"));

  // (1) No raw color literals outside the token homes — var(--x) / token
  // imports only. Quoted hex (the quote excludes issue refs like `#131` in
  // prose and JSX entities like &#8202;) plus rgb()/hsl() calls.
  for (const m of src.matchAll(/["'`](#[0-9a-fA-F]{3,8})\b/g)) {
    problems.push(`${rel}:${lineOf(src, m.index)} raw color ${m[1]} — use var(--x) or a tokens.ts export`);
  }
  for (const m of src.matchAll(/\b(rgba?|hsla?)\(/g)) {
    problems.push(`${rel}:${lineOf(src, m.index)} raw ${m[1]}() color — use var(--x) or a tokens.ts export`);
  }

  // (2) No raw px font sizes outside the vocabulary. CSS-string px values are
  // banned outright; arbitrary Tailwind sizes and numeric fontSize (SVG /
  // recharts) must be in the frozen sets above.
  for (const m of src.matchAll(/font-?[Ss]ize\s*:\s*["'`]([^"'`]+)["'`]/g)) {
    problems.push(`${rel}:${lineOf(src, m.index)} fontSize: "${m[1]}" — use a text-* class or the frozen numeric scale`);
  }
  for (const m of src.matchAll(/text-\[([^\]]+)\]/g)) {
    if (!TEXT_ARBITRARY_OK.has(m[1]))
      problems.push(`${rel}:${lineOf(src, m.index)} text-[${m[1]}] outside the type vocabulary {${[...TEXT_ARBITRARY_OK].join(", ")}} — extend the set in check-tokens.mjs only as a deliberate design decision`);
  }
  for (const m of src.matchAll(/fontSize\s*[:=]\s*\{?\s*(\d+(?:\.\d+)?)\s*[,}\s]/g)) {
    if (!FONTSIZE_NUMERIC_OK.has(Number(m[1])))
      problems.push(`${rel}:${lineOf(src, m.index)} fontSize ${m[1]} outside the frozen numeric scale {${[...FONTSIZE_NUMERIC_OK].join(", ")}}`);
  }

  // (3) Register siblinghood — the lens registers share their matrix/confirm
  // chrome via canvas/registerChrome.ts; a register re-deriving it forks the
  // sibling face silently.
  if (/canvas\/[A-Za-z]+Register\.tsx$/.test(rel.replace(/\\/g, "/"))) {
    if (!src.includes('from "./registerChrome"'))
      problems.push(`${rel} does not import ./registerChrome — registers must share CELL / header / confirm-strip chrome`);
    for (const name of ["const CELL", "const headerCellStyle", "mt-2 flex w-fit items-center gap-2"]) {
      const idx = src.indexOf(name);
      if (idx !== -1)
        problems.push(`${rel}:${lineOf(src, idx)} re-derives register chrome (${name.trim()}) — import it from ./registerChrome`);
    }
  }

  // (4) Screen-space overlays near the canvas must be export-ignored (the
  // phase-0 export lesson). Greppable core: every <foreignObject carries
  // data-export-ignore in its opening tag. (exportDiagram also strips all
  // foreignObject as a belt — this keeps the intent explicit if that belt is
  // ever loosened. Non-foreignObject overlays stay a review item; they are
  // not greppably distinguishable from ordinary SVG.)
  for (const m of src.matchAll(/<foreignObject\b[^>]*/g)) {
    if (!m[0].includes("data-export-ignore"))
      problems.push(`${rel}:${lineOf(src, m.index)} <foreignObject> without data-export-ignore — screen-space overlays must not leak into exports`);
  }

  // (5) The instrument register (docs/design/visual-language.md). The rejected
  // treatment was rounded elevated cards on a gradient — "just looks like an
  // LLM made it". These three make that unbuildable.
  //
  //   radius   capped at MAX_RADIUS_PX. The adopted language uses square edges
  //            and one 4px chip (--radius-sm); --radius-md (8px) is the ceiling
  //            for input/popover corners. Pill geometry is a different thing —
  //            a fully-round chip is not a rounded card — so rounded-full /
  //            --radius-pill stay allowed.
  //   shadow   only the near-flat --shadow-card / --shadow-card-hover lift.
  //            Tailwind's shadow scale and raw offsets are elevation, not lift.
  //   gradient no gradient fills anywhere in src/**. Colour arrives as a filled
  //            region with an edge, not as a fade. (The page-ground wash in
  //            index.css body is the one sanctioned exception and lives there.)
  for (const m of src.matchAll(/(?<![-\w])rounded(?:-(\[[^\]]+\]|[a-z0-9]+))?(?![-\w])/g)) {
    const key = m[1] ?? "";
    const arb = /^\[(\d+(?:\.\d+)?)px\]$/.exec(key);
    const px = arb ? Number(arb[1]) : (TW_RADIUS_PX[key] ?? null);
    if (px !== null && px > MAX_RADIUS_PX)
      problems.push(`${rel}:${lineOf(src, m.index)} rounded-${key} is ${px}px — the register caps corner radius at ${MAX_RADIUS_PX}px; large radii read as web cards, not instrument`);
    else if (key === "full") {
      if (!tagAround(src, m.index).includes("data-pill"))
        soft(`${rel}:${lineOf(src, m.index)} rounded-full without data-pill — the pill is the verdict chip only (rule 3); chips, buttons and inputs are rounded-sm`);
    } else if (!TW_RADIUS_TOKEN_BOUND.has(key))
      soft(`${rel}:${lineOf(src, m.index)} ${m[0]} is a literal radius — use rounded-sm (4) / rounded-md (8), which read var(--radius-*) (rule 3)`);
  }
  for (const m of src.matchAll(/borderRadius\s*:\s*(["'`]([^"'`]+)["'`]|\d+(?:\.\d+)?)/g)) {
    const v = (m[2] ?? m[1]).trim();
    const raw = /^(\d+(?:\.\d+)?)(?:px)?$/.exec(v);
    const px = raw ? Number(raw[1]) : (RADIUS_VAR_PX[v] ?? null);
    if (px !== null && px > MAX_RADIUS_PX)
      problems.push(`${rel}:${lineOf(src, m.index)} borderRadius "${v}" is ${px}px — the register caps corner radius at ${MAX_RADIUS_PX}px; use var(--radius-sm) or var(--radius-md)`);
    else if (raw && px !== 0)
      soft(`${rel}:${lineOf(src, m.index)} borderRadius ${v} is a literal — use var(--radius-sm) / var(--radius-md) (rule 3)`);
    if (px === null && !ALLOWED_RADIUS_VALUES.has(v))
      problems.push(`${rel}:${lineOf(src, m.index)} borderRadius "${v}" is not a known radius token — use var(--radius-sm) / var(--radius-md) / var(--radius-pill)`);
    else if (v === "var(--radius-pill)" && !tagAround(src, m.index).includes("data-pill"))
      soft(`${rel}:${lineOf(src, m.index)} var(--radius-pill) without data-pill — the pill is the verdict chip only (rule 3)`);
  }
  for (const m of src.matchAll(/boxShadow\s*:\s*["'`]([^"'`]+)["'`]/g)) {
    if (!shadowOk(m[1]))
      problems.push(`${rel}:${lineOf(src, m.index)} boxShadow "${m[1]}" — every edge is a hairline or a surface step, never a shadow (rule 2); only ${[...ALLOWED_SHADOWS].join(" / ")} or an inset 1px edge`);
  }
  // (c) focus is never removed: no outline-none class, no outline: none inline.
  for (const m of src.matchAll(/(?<![-\w])outline-none(?![-\w])/g)) {
    soft(`${rel}:${lineOf(src, m.index)} outline-none removes the focus ring (rule 10) — delete it; the global :focus-visible ring applies`);
  }
  for (const m of src.matchAll(/outline\s*:\s*["'`]?none["'`]?/g)) {
    soft(`${rel}:${lineOf(src, m.index)} outline: none removes the focus ring (rule 10)`);
  }
  for (const m of src.matchAll(/(?<![-\w])(drop-)?shadow-(?!none\b)[a-z0-9[]/g)) {
    problems.push(`${rel}:${lineOf(src, m.index)} Tailwind shadow utility — elevation is not in the register; use boxShadow: "var(--shadow-card)"`);
  }
  for (const m of src.matchAll(/\b(linear|radial|conic)-gradient\s*\(/g)) {
    problems.push(`${rel}:${lineOf(src, m.index)} ${m[1]}-gradient — colour arrives as a filled region with an edge, not a fade`);
  }
}

// The same three rules over index.css itself. A rule block is selector + body;
// comments were blanked above so prose does not count.
for (const m of INDEX_CSS_SRC.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
  const selector = m[1].trim().split("\n").pop().trim();
  const body = m[2];
  const at = lineOf(INDEX_CSS_SRC, m.index + m[1].length);
  if (selector.startsWith("@") || selector === ":root") continue;
  for (const d of body.matchAll(/box-shadow\s*:\s*([^;]+);/g)) {
    if (!shadowOk(d[1]))
      problems.push(`index.css:${at} ${selector} box-shadow: ${d[1].trim()} — never a shadow (rule 2); none, a none-token, or an inset 1px edge`);
  }
  for (const d of body.matchAll(/border-radius\s*:\s*([^;]+);/g)) {
    const v = d[1].trim();
    if (!(/^var\(--radius-(sm|md|lg|card)\)$/.test(v) || ALLOWED_RADIUS_VALUES.has(v)))
      problems.push(`index.css:${at} ${selector} border-radius: ${v} — only var(--radius-*) or 0 / 50% (rule 3)`);
    if (v === "var(--radius-pill)" && !/data-pill/.test(selector))
      soft(`index.css:${at} ${selector} uses the pill radius — the pill is the verdict chip only (rule 3)`);
  }
  if (/outline\s*:\s*none/.test(body) && !/:focus-visible/.test(selector)) {
    const base = selector.replace(/:focus[^\s,]*/g, "").trim();
    const replaced = new RegExp(`${base.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[^{,]*:focus-visible[^{]*\{[^}]*outline\s*:\s*(?!none)`).test(INDEX_CSS_SRC);
    if (!replaced) soft(`index.css:${at} ${selector} sets outline: none with no :focus-visible replacement on the same selector (rule 10)`);
  }
}

if (warnings.length) {
  console.warn(`⚠ ${warnings.length} warning(s) — rules 3 and 10 are listed, not yet failed; slice B flips RADIUS_OUTLINE_FAIL:`);
  for (const w of warnings) console.warn("  - " + w);
  console.warn("");
}
if (problems.length) {
  console.error("✗ Token drift — index.css is the source of truth, fix the mirrors:\n");
  for (const p of problems) console.error("  - " + p);
  console.error(`\n${problems.length} issue(s). See web/scripts/check-tokens.mjs.`);
  process.exit(1);
}
console.log(
  `✓ Tokens in sync — ${tok.refs.size} var refs resolve, ${Object.keys(KIND_MAP).length} KIND and ${PRIMITIVES.length} PRIMITIVE hues held across index.css and tokens.ts.`,
);
console.log(
  "✓ Design invariants hold — no raw colors, px type in vocabulary, register chrome shared, overlays export-ignored.",
);
console.log(
  `✓ Instrument register holds — corner radius ≤ ${MAX_RADIUS_PX}px from the three tokens, no shadow anywhere, no gradients, the focus ring and the reduced-motion gate are global.`,
);
