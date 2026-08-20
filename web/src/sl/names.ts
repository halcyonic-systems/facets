// The name↔line bridge for shared selection (Tier 4). Numeric ids are NOT
// stable across canonicalization, so the pane and the canvas meet on the
// one surface both hold: declared thing names (spec §7.2 — names are the
// text's identifiers). Pure functions over lines; the tokenizer is mode.ts.
import { lexLine } from "./mode";
import { bandOfLine } from "./bands";

const THING_HEADS = new Set([
  "component",
  "source",
  "sink",
  "environment",
  "interface",
  "milieu",
]);

/** The thing name declared on a line, or null if the line declares none. */
export function thingNameOnLine(line: string): string | null {
  if (bandOfLine(line) !== "things") return null;
  const toks = lexLine(line);
  const head = toks[0];
  if (!head || head.type !== "head") return null;
  if (!THING_HEADS.has(line.slice(head.from, head.to).toLowerCase())) return null;
  const name = toks[1];
  if (!name || (name.type !== "name" && name.type !== "string")) return null;
  if (name.type !== "string") return line.slice(name.from, name.to);
  const closed = line[name.to - 1] === '"' && name.to - name.from >= 2;
  return line.slice(name.from + 1, closed ? name.to - 1 : name.to);
}

/** name → 1-based line of its declaration (first declaration wins, matching
 *  the parser's duplicate-name refusal: a legal file has no second one). */
export function nameToLine(lines: readonly string[]): Map<string, number> {
  const map = new Map<string, number>();
  for (let i = 0; i < lines.length; i++) {
    const name = thingNameOnLine(lines[i]);
    if (name !== null && !map.has(name)) map.set(name, i + 1);
  }
  return map;
}

/** 1-based line → declared name (the inverse view, for cursor → canvas). */
export function lineToName(lines: readonly string[]): Map<number, string> {
  const map = new Map<number, string>();
  for (const [name, line] of nameToLine(lines)) map.set(line, name);
  return map;
}
