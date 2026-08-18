// The wasm-boundary map pin (2026-08-16): the kernel's to_js must serialize
// HashMaps as PLAIN OBJECTS (json_compatible), never ES Maps — a Map dies in
// JSON.stringify as {}, which silently emptied cognitive_params/initial_state
// on the face's first re-projection (the tRNA pool ran empty; live field
// report). This drives the real wasm through the exact browser pipeline:
// compile → mutate an amount → project → run.
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { initSync, compile_sl, project as wasmProject, run_rich } from "bert-lenses-kernel";

const wasmBytes = fs.readFileSync(
  path.resolve(__dirname, "../../../crates/bert-lenses-kernel/pkg/bert_lenses_kernel_bg.wasm"),
);
initSync({ module: wasmBytes });

describe("edit-path audit", () => {
  it("the web pipeline's projection keeps the pool params and runs like Rust", () => {
    const sl = fs.readFileSync(
      path.resolve(__dirname, "../../../assets/examples/translation-apparatus.sl"),
      "utf8",
    );
    const compiled = compile_sl(sl) as any;
    if (!("ok" in compiled)) throw new Error("demo SL must compile: " + JSON.stringify(compiled));
    const model = compiled.ok;
    const pool = model.things.find((t: any) => t.name === "tRNA Pool");
    console.log("pool cognitive_params:", JSON.stringify(pool.cognitive_params));
    console.log("pool initial_state:", JSON.stringify(pool.initial_state));

    const mrna = model.relations.find((r: any) => r.name === "mRNA transcript" && r.amount != null);
    mrna.amount = "10";
    const world = wasmProject(JSON.stringify(model)) as any;
    const poolSys = world.systems.find((s: any) => s.info.name === "tRNA Pool");
    console.log("projected pool agent:", JSON.stringify(poolSys?.agent));

    const result = run_rich(JSON.stringify(world), 1.0, 15.0) as any;
    const nascent = result.flows.find((f: any) => f.name.includes("nascent"));
    const delivered = nascent.series.reduce((a: number, b: number) => a + b, 0);
    console.log("delivered:", delivered);
    expect(delivered).toBeCloseTo(28.125, 1);
  });
});
