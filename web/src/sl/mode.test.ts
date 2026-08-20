// The mode's classification vs the keyword contract, both directions, plus
// a lex sweep over the real corpus. No EditorView here — the pure lexer
// carries all the correctness, the CM wrapper is wiring.
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import fixture from "../../../fixtures/contract/sl_keywords.json";
import {
  ANNOTATIONS,
  DECLARATION_HEADS,
  KIND_WORDS,
  KINGDOM_WORDS,
  POSITIONAL,
  PRIMITIVE_WORDS,
  RESERVED,
  SCALE_WORDS,
} from "./keywords";
import { lexLine } from "./mode";
import type { SlToken } from "./mode";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../../..");

function typesOf(line: string): string[] {
  return lexLine(line).map((t) => (t.type === "kind" ? `kind:${t.word}` : t.type));
}

describe("keyword contract ↔ mode classification", () => {
  it("mirrors the fixture exactly (both directions, by construction + count)", () => {
    // keywords.ts derives its sets FROM the fixture, so equality of sizes plus
    // membership of every fixture word is a full two-sided check.
    expect(RESERVED.size).toBe(fixture.reserved.length);
    expect(POSITIONAL.size).toBe(fixture.positional.length);
    expect(KINGDOM_WORDS.size).toBe(fixture.value_words.kingdom.length);
    expect(PRIMITIVE_WORDS.size).toBe(fixture.value_words.primitive.length);
    expect(SCALE_WORDS.size).toBe(fixture.value_words.scale.length);
    expect(KIND_WORDS.size).toBe(fixture.value_words.kind.length);
    expect([...ANNOTATIONS].sort()).toEqual([...fixture.annotations].sort());
  });

  it("classifies every fixture word as the fixture says", () => {
    for (const w of fixture.value_words.kind) {
      // In value position (not line-first) a kind word is a kind token.
      expect(typesOf(`flow A -> B : ${w}`)).toContain(`kind:${w.toLowerCase()}`);
    }
    for (const w of [
      ...fixture.value_words.kingdom,
      ...fixture.value_words.primitive,
      ...fixture.value_words.scale,
    ]) {
      expect(typesOf(`x ${w}`)).toEqual(["name", "value"]);
    }
    for (const w of [...fixture.reserved, ...fixture.positional]) {
      const kinds = new Set(fixture.value_words.kind.map((k) => k.toLowerCase()));
      if (kinds.has(w.toLowerCase())) continue; // kind wins over keyword
      const got = typesOf(`x ${w}`)[1];
      expect(["keyword", "value"], `word ${w}`).toContain(got);
    }
    for (const a of fixture.annotations) {
      expect(typesOf(`${a} something`)[0]).toBe("annotation");
    }
  });

  it("keeps every declaration head inside the keyword set", () => {
    for (const h of DECLARATION_HEADS) {
      expect(RESERVED.has(h) || POSITIONAL.has(h), `head ${h}`).toBe(true);
    }
  });
});

describe("lexLine", () => {
  it("reads a flow line as head, names, arrow, punct, kind, string", () => {
    expect(typesOf('flow "Iron Vendor" -> Furnace : matter "iron"')).toEqual([
      "head",
      "string",
      "arrow",
      "name",
      "punct",
      "kind:matter",
      "string",
    ]);
  });

  it("keeps a # inside a quoted name part of the string", () => {
    const toks = lexLine('component "shaft #2" # the real comment');
    expect(toks.map((t) => t.type)).toEqual(["head", "string", "comment"]);
  });

  it("does not read a decomposes @id as an annotation", () => {
    const types = typesOf('component Furnace decomposes "inner" @9xj4Kq');
    expect(types).toEqual(["head", "name", "keyword", "string", "name"]);
  });

  it("reads numbers, including negatives and floats", () => {
    expect(typesOf("boundary porosity 0.7 fuzziness 0.1")).toEqual([
      "head",
      "keyword",
      "number",
      "keyword",
      "number",
    ]);
    expect(typesOf("@pos Furnace -12.5 40")).toEqual([
      "annotation",
      "name",
      "number",
      "number",
    ]);
  });

  it("treats an unknown word as a name, and an unterminated string to EOL", () => {
    expect(typesOf("frobnicate widget")).toEqual(["name", "name"]);
    const toks = lexLine('description "no closing quote');
    expect(toks[1].type).toBe("string");
    expect(toks[1].to).toBe('description "no closing quote'.length);
  });

  it("covers the whole corpus without a crash or an uncovered character", () => {
    const files = [
      join(repoRoot, "assets/examples/translation-apparatus.sl"),
      ...readdirSync(join(repoRoot, "fixtures/sl"), { recursive: true })
        .map(String)
        .filter((f) => f.endsWith(".sl"))
        .map((f) => join(repoRoot, "fixtures/sl", f)),
    ];
    expect(files.length).toBeGreaterThan(5);
    for (const file of files) {
      const text = readFileSync(file, "utf8");
      for (const line of text.split("\n")) {
        const toks = lexLine(line);
        // Tokens tile the line left to right without overlap; only
        // whitespace may sit between them.
        let prev = 0;
        for (const t of toks) {
          expect(t.from).toBeGreaterThanOrEqual(prev);
          expect(t.to).toBeGreaterThan(t.from);
          expect(line.slice(prev, t.from).trim(), `${file}: ${line}`).toBe("");
          prev = t.to;
        }
        expect(line.slice(prev).trim()).toBe("");
      }
    }
  });
});

// Type-level guard: SlToken stays a plain data shape.
const _witness: SlToken = { from: 0, to: 1, type: "name" };
void _witness;
