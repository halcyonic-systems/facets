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
 * Run: npm run check:tokens (also part of just check and CI).
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const INDEX_CSS = resolve(here, "../src/index.css");
const TOKENS = resolve(here, "../src/tokens.ts");

const norm = (h) => h.trim().toLowerCase();
// Strip /* */ and // comments so prose like "can't read var(--x)" isn't scanned.
const stripComments = (src) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");

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

if (problems.length) {
  console.error("✗ Token drift — index.css is the source of truth, fix the mirrors:\n");
  for (const p of problems) console.error("  - " + p);
  console.error(`\n${problems.length} issue(s). See web/scripts/check-tokens.mjs.`);
  process.exit(1);
}
console.log(
  `✓ Tokens in sync — ${tok.refs.size} var refs resolve, ${Object.keys(KIND_MAP).length} KIND colors match across index.css and tokens.ts.`,
);
