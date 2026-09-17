// The name↔line bridge for shared selection (Tier 4). Numeric ids are NOT
// stable across canonicalization, so the pane and the canvas meet on the
// one surface both hold: declared thing names (spec §7.2 — names are the
// text's identifiers). Pure functions over lines; the tokenizer is mode.ts.
import { isContinuationLine, lexLine } from "./mode";
import { bandOfLine } from "./bands";

const THING_HEADS = new Set([
  "component",
  "source",
  "sink",
  "environment",
  "interface",
  "milieu",
]);

function tokenText(line: string, tok: { from: number; to: number; type: string }): string {
  if (tok.type !== "string") return line.slice(tok.from, tok.to);
  const closed = line[tok.to - 1] === '"' && tok.to - tok.from >= 2;
  return line.slice(tok.from + 1, closed ? tok.to - 1 : tok.to);
}

/** The thing name declared on a line, or null if the line declares none. */
export function thingNameOnLine(line: string): string | null {
  if (bandOfLine(line) !== "things") return null;
  const toks = lexLine(line);
  const head = toks[0];
  if (!head || head.type !== "head") return null;
  if (!THING_HEADS.has(line.slice(head.from, head.to).toLowerCase())) return null;
  const name = toks[1];
  if (!name || (name.type !== "name" && name.type !== "string")) return null;
  return tokenText(line, name);
}

/** A flow line's endpoints and label. Flows carry no unique name of their
 *  own, so the bridge matches on (from, to, label) — with an ordinal for
 *  the duplicate-triple case, computed by the callers below. */
export interface FlowRef {
  from: string;
  to: string;
  /** The flow's quoted label after its kind word ("" when unlabeled). */
  label: string;
}

export function flowOnLine(line: string): FlowRef | null {
  if (bandOfLine(line) !== "flows") return null;
  const toks = lexLine(line);
  const arrowIdx = toks.findIndex((t) => t.type === "arrow");
  if (arrowIdx === -1) return null;
  const isName = (t: { type: string }) => t.type === "name" || t.type === "string";
  const from = toks.slice(1, arrowIdx).find(isName);
  const to = toks.slice(arrowIdx + 1).find(isName);
  if (!from || !to) return null;
  const kindIdx = toks.findIndex((t, i) => i > arrowIdx && t.type === "kind");
  const labelTok =
    kindIdx === -1 ? undefined : toks.slice(kindIdx + 1).find((t) => t.type === "string");
  return {
    from: tokenText(line, from),
    to: tokenText(line, to),
    label: labelTok ? tokenText(line, labelTok) : "",
  };
}

// Joined on newline: thing names may contain spaces, but never a newline
// (quote() refuses them), so the key cannot collide across splits.
const flowKey = (r: FlowRef) => [r.from, r.to, r.label].join("\n");

/** The line a cursor on `lineNo` (1-based) is about: a `description`
 *  continuation belongs to the declaration directly above it. */
export function declarationLine(lines: readonly string[], lineNo: number): number {
  return lineNo > 1 && isContinuationLine(lines[lineNo - 1] ?? "") ? lineNo - 1 : lineNo;
}

/** The flow declared on `lineNo` (1-based), plus its ordinal among earlier
 *  lines declaring the same (from, to, label) triple. */
export function flowAtLine(
  lines: readonly string[],
  lineNo: number
): { ref: FlowRef; ordinal: number } | null {
  lineNo = declarationLine(lines, lineNo);
  const ref = flowOnLine(lines[lineNo - 1] ?? "");
  if (!ref) return null;
  let ordinal = 0;
  for (let i = 0; i < lineNo - 1; i++) {
    const other = flowOnLine(lines[i]);
    if (other && flowKey(other) === flowKey(ref)) ordinal++;
  }
  return { ref, ordinal };
}

/** The 1-based line of the (ordinal+1)-th flow matching `ref`, or null. */
export function flowToLine(
  lines: readonly string[],
  ref: FlowRef,
  ordinal: number
): number | null {
  let seen = 0;
  for (let i = 0; i < lines.length; i++) {
    const other = flowOnLine(lines[i]);
    if (other && flowKey(other) === flowKey(ref)) {
      if (seen === ordinal) return i + 1;
      seen++;
    }
  }
  return null;
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
  for (const [name, line] of nameToLine(lines)) {
    map.set(line, name);
    if (isContinuationLine(lines[line] ?? "")) map.set(line + 1, name);
  }
  return map;
}
