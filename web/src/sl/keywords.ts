// The SL vocabulary, read from the keyword contract fixture — never typed
// here. fixtures/contract/sl_keywords.json is written by the kernel's own
// consts (crates/bert-canvas/tests/sl_keywords.rs); `just check` runs cargo
// before vitest, so the fixture is always fresh when the tests read it.
import fixture from "../../../fixtures/contract/sl_keywords.json";

const lower = (ws: string[]) => new Set(ws.map((w) => w.toLowerCase()));

export const RESERVED = lower(fixture.reserved);
export const POSITIONAL = lower(fixture.positional);
export const KINGDOM_WORDS = lower(fixture.value_words.kingdom);
export const PRIMITIVE_WORDS = lower(fixture.value_words.primitive);
export const SCALE_WORDS = lower(fixture.value_words.scale);
export const KIND_WORDS = lower(fixture.value_words.kind);
export const ANNOTATIONS = new Set(fixture.annotations);

/** The words that open a line in canonical form (spec §7.1's band heads plus
 *  the header lines). A highlight distinction only; every head is also in
 *  RESERVED ∪ POSITIONAL, which the tests assert. */
export const DECLARATION_HEADS = new Set([
  "system",
  "domain",
  "description",
  "time",
  "level",
  "component",
  "source",
  "sink",
  "environment",
  "interface",
  "milieu",
  "flow",
  "param",
  "metric",
  "boundary",
]);

export function isKeyword(word: string): boolean {
  const w = word.toLowerCase();
  return RESERVED.has(w) || POSITIONAL.has(w);
}

export function isValueWord(word: string): boolean {
  const w = word.toLowerCase();
  return KINGDOM_WORDS.has(w) || PRIMITIVE_WORDS.has(w) || SCALE_WORDS.has(w);
}
