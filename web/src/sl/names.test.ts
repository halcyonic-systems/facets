import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { nameToLine, thingNameOnLine } from "./names";

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
