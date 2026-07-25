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
 * Plus the design-invariant fitness functions (#131, the block/buzz `check`
 * steal) over src/**: no raw color literals outside the token homes, px type
 * only from the frozen vocabulary, lens registers share their chrome via
 * canvas/registerChrome.ts, <foreignObject> overlays carry data-export-ignore,
 * and the instrument register itself — corner radius capped, card lift capped,
 * no gradients (docs/design/visual-language.md).
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
  for (const m of src.matchAll(/(--[a-z0-9-]+)\s*:/g)) declared.add(m[1]);
  for (const m of src.matchAll(/(--[a-z0-9-]+)\s*:\s*(#[0-9a-fA-F]{3,8})\s*;/g)) {
    if (!(m[1] in hex)) hex[m[1]] = norm(m[2]); // first match = the :root/light value
  }
  return { declared, hex };
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

const css = parseCss(stripComments(readFileSync(INDEX_CSS, "utf8")));
const tok = parseTokens(stripComments(readFileSync(TOKENS, "utf8")));

const problems = [];

for (const ref of tok.refs) {
  if (!css.declared.has(ref)) problems.push(`tokens.ts references ${ref}, not declared in index.css`);
}

for (const [key, cssVar] of Object.entries(KIND_MAP)) {
  const t = tok.hex[key];
  const c = css.hex[cssVar];
  if (!c) problems.push(`index.css missing reserved ${cssVar}`);
  if (!t) problems.push(`tokens.ts missing reserved kind.${key} hex`);
  if (t && c && t !== c) problems.push(`kind.${key}: tokens.ts ${t} != index.css ${cssVar} ${c}`);
}

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
const TW_RADIUS_PX = { none: 0, sm: 2, "": 4, md: 6, lg: 8, xl: 12, "2xl": 16, "3xl": 24 };
const RADIUS_VAR_PX = { "var(--radius-sm)": 4, "var(--radius-md)": 8 };
const ALLOWED_RADIUS_VALUES = new Set(["var(--radius-pill)", "0", "50%", "inherit"]);
const ALLOWED_SHADOWS = new Set(["var(--shadow-card)", "var(--shadow-card-hover)", "none"]);

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
  for (const m of src.matchAll(/rounded-(\[[^\]]+\]|[a-z0-9]+)/g)) {
    const arb = /^\[(\d+(?:\.\d+)?)px\]$/.exec(m[1]);
    const px = arb ? Number(arb[1]) : (TW_RADIUS_PX[m[1]] ?? null);
    if (px !== null && px > MAX_RADIUS_PX)
      problems.push(`${rel}:${lineOf(src, m.index)} rounded-${m[1]} is ${px}px — the register caps corner radius at ${MAX_RADIUS_PX}px (rounded-full excepted); large radii read as web cards, not instrument`);
  }
  for (const m of src.matchAll(/borderRadius\s*:\s*["'`]([^"'`]+)["'`]/g)) {
    const v = m[1].trim();
    const raw = /^(\d+(?:\.\d+)?)px$/.exec(v);
    const px = raw ? Number(raw[1]) : (RADIUS_VAR_PX[v] ?? null);
    if (px !== null && px > MAX_RADIUS_PX)
      problems.push(`${rel}:${lineOf(src, m.index)} borderRadius "${v}" is ${px}px — the register caps corner radius at ${MAX_RADIUS_PX}px; use var(--radius-sm) or var(--radius-md)`);
    if (px === null && !ALLOWED_RADIUS_VALUES.has(v))
      problems.push(`${rel}:${lineOf(src, m.index)} borderRadius "${v}" is not a known radius token — use var(--radius-sm) / var(--radius-md) / var(--radius-pill)`);
  }
  for (const m of src.matchAll(/boxShadow\s*:\s*["'`]([^"'`]+)["'`]/g)) {
    if (!ALLOWED_SHADOWS.has(m[1].trim()))
      problems.push(`${rel}:${lineOf(src, m.index)} boxShadow "${m[1]}" — panels sit flat on a rule; only ${[...ALLOWED_SHADOWS].join(" / ")} are permitted`);
  }
  for (const m of src.matchAll(/(?<![-\w])(drop-)?shadow-(?!none\b)[a-z0-9[]/g)) {
    problems.push(`${rel}:${lineOf(src, m.index)} Tailwind shadow utility — elevation is not in the register; use boxShadow: "var(--shadow-card)"`);
  }
  for (const m of src.matchAll(/\b(linear|radial|conic)-gradient\s*\(/g)) {
    problems.push(`${rel}:${lineOf(src, m.index)} ${m[1]}-gradient — colour arrives as a filled region with an edge, not a fade`);
  }
}

if (problems.length) {
  console.error("✗ Token drift — index.css is the source of truth, fix the mirrors:\n");
  for (const p of problems) console.error("  - " + p);
  console.error(`\n${problems.length} issue(s). See web/scripts/check-tokens.mjs.`);
  process.exit(1);
}
console.log(
  `✓ Tokens in sync — ${tok.refs.size} var refs resolve, ${Object.keys(KIND_MAP).length} KIND colors match across index.css and tokens.ts.`,
);
console.log(
  "✓ Design invariants hold — no raw colors, px type in vocabulary, register chrome shared, overlays export-ignored.",
);
console.log(
  `✓ Instrument register holds — corner radius ≤ ${MAX_RADIUS_PX}px, lift limited to --shadow-card, no gradients.`,
);
