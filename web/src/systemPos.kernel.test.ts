// The system of interest's own position (`system_pos`, SL `@system x y`,
// 2026-11-02) through the real wasm: text to model, model to text, a drag's
// splice, and the library archive all carry it, and a model without it
// reads and writes exactly as before.
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { initSync } from "facets-kernel";
import { compileSl, emitSl, openModel, splicePositions, writeArchive } from "./kernel";

initSync({
  module: fs.readFileSync(path.resolve(__dirname, "../../crates/facets-kernel/pkg/facets_kernel_bg.wasm")),
});

const ok = (sl: string) => {
  const out = compileSl(sl);
  if ("errors" in out) throw new Error(JSON.stringify(out.errors));
  return out.ok;
};

describe("system_pos through the kernel", () => {
  it("compiles from @system and emits it back", () => {
    const m = ok('system "Theory of Change"\ncomponent T1\n@pos T1 60 0\n@system 0 0\n');
    expect(m.system_pos).toEqual([0, 0]);
    expect(emitSl(m)).toContain("@system 0 0");
  });

  it("is absent, and written nowhere, on a model that never pinned it", () => {
    const m = ok("component T1\n");
    expect(m.system_pos).toBeUndefined();
    expect(emitSl(m)).not.toContain("@system");
    expect(writeArchive(m)).not.toContain("system_pos");
  });

  it("survives the archive and a positions splice", () => {
    const src = "component T1\n# a note\n@pos T1 1 2\n";
    const m = { ...ok(src), system_pos: [12, -3] as [number, number] };
    expect(openModel(writeArchive(m)).system_pos).toEqual([12, -3]);
    const spliced = splicePositions(src, m);
    expect(spliced).toContain("# a note");
    expect(ok(spliced).system_pos).toEqual([12, -3]);
  });
});
