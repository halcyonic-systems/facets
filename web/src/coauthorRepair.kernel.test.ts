// #399 — the interface-stamp repair against the REAL kernel. The mocked suite
// (coauthor.test.ts) pins the loop's shape; this one pins the claim the loop
// rests on: that stamping the carriers clears `crossing_flow_without_interface`
// and nothing else, that the kernel's own emitter writes the stamp into text
// which compiles back to a model the kernel accepts, and that an over-stamped
// draft is still refused afterwards. Only the network is mocked.
import { beforeEach, describe, expect, it, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { initSync, compile_sl, emit_sl, project, validate_mode } from "bert-lenses-kernel";

initSync({
  module: fs.readFileSync(path.resolve(__dirname, "../../crates/bert-lenses-kernel/pkg/bert_lenses_kernel_bg.wasm")),
});

const authorSlMock = vi.hoisted(() => vi.fn());
vi.mock("./gsr", () => ({ authorSl: authorSlMock }));
vi.mock("./kernel", () => ({
  compileSl: (text: string) => compile_sl(text),
  emitSl: (model: unknown) => emit_sl(JSON.stringify(model)),
  validateMode: (model: unknown, mode: string) => validate_mode(JSON.stringify(project(JSON.stringify(model))), mode),
}));

import { draftSlWithRetry, runCorrectionTurn } from "./coauthor";
import { compileSl, validateMode } from "./kernel";
import type { CanvasModel } from "./kernel/types";

const KETTLE = `# the drafter's own note
system "Kettle" : Concrete/Technical
component "Element" primitive Propelling
component "Pot" primitive Buffering
component "Lid"
source Mains
sink Cup
environment Room
flow Mains -> "Element" : energy "power"
flow "Element" -> "Pot" : energy "heat"
flow "Pot" -> Cup : matter "hot water"
flow "Pot" -> Room : energy "steam"
flow "Lid" -> Room : informational "seal" mere
@lens mobus
`;
const OVER_STAMPED = KETTLE.replace('component "Lid"', 'component "Lid" interface');

function refusals(sl: string): string[] {
  const out = compileSl(sl);
  if (!("ok" in out)) throw new Error(`did not compile: ${JSON.stringify(out.errors)}`);
  return validateMode(out.ok as CanvasModel, "Operational")
    .issues.filter((i) => i.severity === "Error")
    .map((i) => i.code);
}

beforeEach(() => authorSlMock.mockReset());

describe("the stamp repair, judged by the kernel (#399)", () => {
  it("the specimen is refused for the missing stamp and for nothing else", () => {
    expect(new Set(refusals(KETTLE))).toEqual(new Set(["crossing_flow_without_interface"]));
  });

  it("one model call: the returned text carries the stamps and the kernel accepts it", async () => {
    authorSlMock.mockResolvedValueOnce({ sl: KETTLE, model: "claude-opus-5", latencyMs: 9000 });
    const out = await draftSlWithRetry("a kettle", "Mobus");
    expect(authorSlMock).toHaveBeenCalledTimes(1);
    expect(out.repairs).toEqual([
      "interface stamped on Element (carries power from Mains)",
      "interface stamped on Pot (carries hot water to Cup, steam to Room)",
    ]);
    expect(out.sl).toMatch(/^component Element .*\binterface\b/m);
    expect(out.sl).toMatch(/^component Pot .*\binterface\b/m);
    expect(out.sl).toMatch(/^component Lid$/m);
    expect(refusals(out.sl)).toEqual([]);
  });

  it("an over-stamped draft keeps its stamp and goes back to the drafter", async () => {
    authorSlMock
      .mockResolvedValueOnce({ sl: OVER_STAMPED, model: "claude-opus-5" })
      .mockResolvedValueOnce({ sl: OVER_STAMPED, model: "claude-opus-5" });
    const out = await draftSlWithRetry("a kettle", "Mobus");
    expect(authorSlMock).toHaveBeenCalledTimes(2);
    expect(authorSlMock.mock.calls[1][0].priorSl).toMatch(/^component Lid interface$/m);
    expect(authorSlMock.mock.calls[1][0].errors).toContain("interface 'Lid' carries no boundary-crossing flow");
    expect(out.sl).toMatch(/^component Lid interface$/m);
    expect(refusals(out.sl)).toEqual(["interface_carries_no_flow"]);
  });

  it("a correction rides the same repair, and its model is still the compiler's reading of the text", async () => {
    authorSlMock.mockResolvedValueOnce({ sl: KETTLE, model: "claude-opus-5" });
    const outcome = await runCorrectionTurn({
      id: "c1",
      target: { id: "t1", description: "a kettle", sl: "system Kettle" },
      correction: "the lid only seals, it carries nothing",
      lens: "Mobus",
    });
    expect(authorSlMock).toHaveBeenCalledTimes(1);
    if (outcome.kind !== "compiled") throw new Error(outcome.kind);
    expect(outcome.turn.repairs).toHaveLength(2);
    expect(outcome.turn.sl).toBe(outcome.sl);
    expect(outcome.model).toEqual((compileSl(outcome.sl) as { ok: CanvasModel }).ok);
    expect(outcome.model.things.filter((x) => x.interface).map((x) => x.name)).toEqual(["Element", "Pot"]);
  });
});
