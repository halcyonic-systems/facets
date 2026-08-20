import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { flowPads } from "./align";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../../..");

describe("flowPads", () => {
  it("aligns arrows and colons across a contiguous run", () => {
    const lines = [
      'flow A -> B : matter "x"',
      'flow "Long Name Here" -> B : energy "y"',
    ];
    const pads = flowPads(lines);
    const short = pads.find((p) => p.line === 1);
    expect(short).toBeDefined();
    // After padding, both arrows sit at the same visual column…
    expect(short!.arrowAt + short!.arrowPad).toBe('flow "Long Name Here" '.length);
    // …and both colons do too.
    const colonColumns = lines.map((l, i) => {
      const p = pads.find((q) => q.line === i + 1);
      return l.indexOf(" :") + 1 + (p ? p.arrowPad + p.colonPad : 0);
    });
    expect(new Set(colonColumns).size).toBe(1);
  });

  it("pads nothing when a line stands alone or lines already agree", () => {
    expect(flowPads(['flow A -> B : matter "x"'])).toEqual([]);
    expect(
      flowPads(['flow AA -> B : matter "x"', 'flow BB -> C : energy "y"'])
    ).toEqual([]);
  });

  it("breaks runs on comments, blanks, and non-flow lines", () => {
    const pads = flowPads([
      'flow A -> B : matter "x"',
      "# a banner between groups",
      'flow "Much Longer Name" -> B : matter "y"',
    ]);
    expect(pads).toEqual([]);
  });

  it("never pads a negative width over the real corpus", () => {
    const text = readFileSync(
      join(repoRoot, "assets/examples/translation-apparatus.sl"),
      "utf8"
    );
    for (const p of flowPads(text.split("\n"))) {
      expect(p.arrowPad).toBeGreaterThanOrEqual(0);
      expect(p.colonPad).toBeGreaterThanOrEqual(0);
    }
  });
});
