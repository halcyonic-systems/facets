import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { flowAtLine, flowOnLine, flowToLine, nameToLine, thingNameOnLine } from "./names";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../../..");

describe("thingNameOnLine", () => {
  it("reads bare and quoted names off every thing head", () => {
    expect(thingNameOnLine("component Furnace primitive Combining")).toBe("Furnace");
    expect(thingNameOnLine('source "Iron Vendor"')).toBe("Iron Vendor");
    expect(thingNameOnLine('interface "mRNA Entry Channel" protocol "x"')).toBe(
      "mRNA Entry Channel"
    );
    expect(thingNameOnLine('milieu "Mg2+ milieu" value 1 unit mM')).toBe("Mg2+ milieu");
  });

  it("declares nothing on flow, header, comment, or malformed lines", () => {
    expect(thingNameOnLine('flow A -> B : matter "x"')).toBeNull();
    expect(thingNameOnLine('system "X" : Concrete')).toBeNull();
    expect(thingNameOnLine("# component NotReal")).toBeNull();
    expect(thingNameOnLine("component")).toBeNull();
  });
});

describe("nameToLine", () => {
  it("maps every thing in the stress corpus to its declaration line", () => {
    const lines = readFileSync(
      join(repoRoot, "assets/examples/translation-apparatus.sl"),
      "utf8"
    ).split("\n");
    const map = nameToLine(lines);
    for (const [name, line] of map) {
      expect(lines[line - 1]).toContain(name);
    }
    expect(map.size).toBeGreaterThanOrEqual(8);
    expect(map.has("Exit Tunnel")).toBe(true);
  });
});

describe("flow bridging", () => {
  const lines = [
    "component Furnace",
    'source "Iron Vendor"',
    'flow "Iron Vendor" -> Furnace : matter "iron"',
    'flow Furnace -> "Iron Vendor" : informational "order"',
    'flow "Iron Vendor" -> Furnace : matter "iron"',
  ];

  it("reads endpoints and label off a flow line", () => {
    expect(flowOnLine(lines[2])).toEqual({ from: "Iron Vendor", to: "Furnace", label: "iron" });
    expect(flowOnLine("flow A -> B")).toEqual({ from: "A", to: "B", label: "" });
    expect(flowOnLine("component A")).toBeNull();
  });

  it("disambiguates duplicate triples by ordinal, both directions", () => {
    expect(flowAtLine(lines, 3)).toEqual({
      ref: { from: "Iron Vendor", to: "Furnace", label: "iron" },
      ordinal: 0,
    });
    expect(flowAtLine(lines, 5)?.ordinal).toBe(1);
    const ref = { from: "Iron Vendor", to: "Furnace", label: "iron" };
    expect(flowToLine(lines, ref, 0)).toBe(3);
    expect(flowToLine(lines, ref, 1)).toBe(5);
    expect(flowToLine(lines, ref, 2)).toBeNull();
  });
});
