// #462 item 1 through the real wasm: the shelf's Rain Barrel Garden is a
// stage-2 candidate for a stage-1 copy of itself that lands the rain on
// `interface unresolved`, and the kernel says it resolves it. A candidate
// whose crossing kind differs is refused with the reason named.
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { initSync } from "bert-lenses-kernel";
import { compileSl } from "./kernel";
import { stage2Report } from "./resolution";

initSync({
  module: fs.readFileSync(path.resolve(__dirname, "../../crates/bert-lenses-kernel/pkg/bert_lenses_kernel_bg.wasm")),
});

const GARDEN = fs.readFileSync(path.resolve(__dirname, "../../assets/examples/rain-barrel-garden.sl"), "utf8");

const ok = (sl: string) => {
  const out = compileSl(sl);
  if ("errors" in out) throw new Error(JSON.stringify(out.errors));
  return out.ok;
};

describe("stage 2 through the kernel", () => {
  const stage2 = ok(GARDEN);
  // Stage 1: the rain lands on the reserved pass-way instead of the gutter.
  const stage1 = ok(
    GARDEN.replace("interface Gutter", "interface unresolved")
      .replace(/^ {4}description "Where the rain comes in[^\n]*\n/m, "")
      .replace("flow Rain -> Gutter", "flow Rain -> unresolved")
      .replace("flow Gutter -> \"Rain Barrel\"", "flow unresolved -> \"Rain Barrel\"")
      .replace('param "rainfall" : flow Rain -> Gutter', 'param "rainfall" : flow Rain -> unresolved'),
  );

  it("the shelf model resolves its own stage-1 reading", () => {
    const report = stage2Report(stage1, [{ source: "shelf", label: "Rain Barrel Garden", model: stage2 }]);
    expect(report.system).toBe("Rain Barrel Garden");
    expect(report.candidates.map((c) => [c.label, c.issues.map((i) => i.code)])).toEqual([["Rain Barrel Garden", []]]);
  });

  it("a candidate whose crossing changed kind is refused, by name", () => {
    const rekinded = ok(GARDEN.replace('flow Rain -> Gutter : matter "rainfall"', 'flow Rain -> Gutter : energy "rainfall"'));
    const report = stage2Report(stage1, [{ source: "library", label: "garden v2", model: rekinded }]);
    expect(report.candidates[0].issues.length).toBeGreaterThan(0);
    expect(report.candidates[0].issues.map((i) => i.severity)).toContain("Error");
  });
});
