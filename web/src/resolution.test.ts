// #462 item 1: candidates are the models of the SAME system that name their
// interfaces and carry no `unresolved`; the kernel check is injected here so
// the matching is pinned without wasm (the check itself is pinned in
// crates/bert-lenses-kernel/tests/resolution.rs).
import { describe, expect, it } from "vitest";
import { isStage2Candidate, stage2Report } from "./resolution";
import type { CanvasModel } from "./kernel/types";

const model = (name: string, things: Array<Partial<CanvasModel["things"][number]>>): CanvasModel =>
  ({ name, lens: "Mobus", things: things.map((t, i) => ({ id: i + 1, role: "Component", x: 0, y: 0, ...t })), relations: [] }) as unknown as CanvasModel;

const stage1 = model("Venice", [{ name: "unresolved", interface: true, passway: true }, { name: "Lagoon" }]);
const stage2 = model("Venice", [{ name: "Grand Canal", interface: true, passway: true }, { name: "Lagoon" }]);
const stillUnresolved = model("Venice", [{ name: "unresolved", interface: true, passway: true }]);
const other = model("Florence", [{ name: "Arno gate", interface: true, passway: true }]);
const noInterfaces = model("venice", [{ name: "Lagoon" }]);

describe("stage 2 candidates", () => {
  it("match by system name, need named interfaces, and must not be unresolved themselves", () => {
    expect(isStage2Candidate(stage1, stage2)).toBe(true);
    expect(isStage2Candidate(stage1, stillUnresolved)).toBe(false);
    expect(isStage2Candidate(stage1, other)).toBe(false);
    expect(isStage2Candidate(stage1, noInterfaces)).toBe(false);
  });

  it("run the kernel check on each candidate and carry its issues", () => {
    const seen: string[] = [];
    const report = stage2Report(
      stage1,
      [
        { source: "shelf", label: "Venice (named)", model: stage2 },
        { source: "library", label: "Venice v2", model: stillUnresolved },
        { source: "shelf", label: "Florence", model: other },
      ],
      (a, b) => {
        seen.push(`${a.name}->${b.name}`);
        return { issues: [] };
      },
    );
    expect(report.system).toBe("Venice");
    expect(report.candidates.map((c) => [c.label, c.issues.length])).toEqual([["Venice (named)", 0]]);
    expect(seen).toEqual(["Venice->Venice"]);
  });
});
