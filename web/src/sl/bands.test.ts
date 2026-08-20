// Band detection over the real corpus. The stress case is
// translation-apparatus.sl: banner comments between sections must neither
// start a band nor break one.
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { BAND_ORDER, bandOfLine, bandStarts } from "./bands";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const read = (p: string) => readFileSync(join(repoRoot, p), "utf8").split("\n");

describe("bandOfLine", () => {
  it("maps each head to its §7.1 band", () => {
    expect(bandOfLine("system \"X\" : Concrete")).toBe("header");
    expect(bandOfLine("time unit second")).toBe("header");
    expect(bandOfLine("component Furnace")).toBe("things");
    expect(bandOfLine('milieu "pH" value 7.2')).toBe("things");
    expect(bandOfLine('flow A -> B : matter "iron"')).toBe("flows");
    expect(bandOfLine("param intake range 0 10")).toBe("params");
    expect(bandOfLine("metric waste share of output")).toBe("metrics");
    expect(bandOfLine("boundary porosity 0.7")).toBe("boundary");
    expect(bandOfLine("@lens mobus")).toBe("annotations");
    expect(bandOfLine("@pos Furnace 480 320")).toBe("annotations");
  });

  it("gives comments and blanks no band at all", () => {
    expect(bandOfLine("")).toBeNull();
    expect(bandOfLine("   ")).toBeNull();
    expect(bandOfLine("# ── The processors, inside ──")).toBeNull();
  });
});

describe("bandStarts", () => {
  it("reports one start per contiguous run, banner comments notwithstanding", () => {
    const starts = bandStarts(read("assets/examples/translation-apparatus.sl"));
    const bands = starts.map((s) => s.band);
    // The stress file is canonical-ordered: each band appears as ONE run
    // even though banner comments sit inside the things band.
    expect(new Set(bands).size).toBe(bands.length);
    const order = bands.map((b) => BAND_ORDER.indexOf(b));
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  it("holds §7.1 monotone order across every canonical golden", () => {
    const files = readdirSync(join(repoRoot, "fixtures/sl"))
      .filter((f) => f.endsWith(".sl"))
      .map((f) => `fixtures/sl/${f}`);
    expect(files.length).toBeGreaterThanOrEqual(3);
    for (const f of files) {
      const order = bandStarts(read(f)).map((s) => BAND_ORDER.indexOf(s.band));
      expect([...order].sort((a, b) => a - b), f).toEqual(order);
    }
  });

  it("does not crash on the deliberate-error teaching files", () => {
    for (const f of readdirSync(join(repoRoot, "fixtures/sl/teaching")).filter((x) =>
      x.endsWith(".sl")
    )) {
      expect(() => bandStarts(read(`fixtures/sl/teaching/${f}`))).not.toThrow();
    }
  });

  it("reports interleaved (non-canonical) bands truthfully", () => {
    const starts = bandStarts([
      "component A",
      'flow A -> A : matter "x"',
      "component B",
    ]);
    expect(starts.map((s) => s.band)).toEqual(["things", "flows", "things"]);
  });
});
