// The pure glyph classifier, exercised over crafted lines and the teaching
// corpus (the deliberate-error files are the fault-glyph fixtures at the
// wiring level; here they prove classification never throws on them).
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { lineGlyph } from "./glyphs";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../../..");

describe("lineGlyph", () => {
  it("gives things their palette shape", () => {
    expect(lineGlyph("component Furnace primitive Combining")).toEqual({ type: "component" });
    expect(lineGlyph('source "Iron Vendor"')).toEqual({ type: "environment" });
    expect(lineGlyph("sink Customers")).toEqual({ type: "environment" });
    expect(lineGlyph('milieu "pH" value 7.2')).toEqual({ type: "environment" });
    expect(lineGlyph('interface "mRNA Entry Channel" protocol "x"')).toEqual({ type: "passway" });
  });

  it("gives flow lines their KIND dot", () => {
    expect(lineGlyph('flow A -> B : matter "iron"')).toEqual({ type: "kind", kind: "matter" });
    expect(lineGlyph('flow A -> B : energy "heat"')).toEqual({ type: "kind", kind: "energy" });
  });

  it("gives a kindless flow, headers, comments, and blanks nothing", () => {
    expect(lineGlyph("flow A -> B")).toBeNull();
    expect(lineGlyph('system "X" : Concrete')).toBeNull();
    expect(lineGlyph("# banner")).toBeNull();
    expect(lineGlyph("")).toBeNull();
  });

  it("never throws on the teaching corpus, error files included", () => {
    for (const f of readdirSync(join(repoRoot, "fixtures/sl/teaching")).filter((x) =>
      x.endsWith(".sl")
    )) {
      const lines = readFileSync(join(repoRoot, "fixtures/sl/teaching", f), "utf8").split("\n");
      for (const line of lines) expect(() => lineGlyph(line)).not.toThrow();
    }
  });
});
