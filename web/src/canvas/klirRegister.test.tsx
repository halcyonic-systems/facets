// #154 P2 — Klir's source-system register (Table 4.1): the one DERIVED column
// (in/out, read off R) and the three AUTHORED columns (basic/support, scale,
// state set) surface their inline editors — on environment variables too (#154
// revision). Held to the same static-markup harness the Mobus register uses.
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { CanvasModel, RunResultRich } from "../kernel/types";
import { MaskTable, SourceSystemTable } from "./KlirRegister";

const noop = () => {};

// Driver → Signal → (env) Readout: a directed chain so in/out is non-trivial.
// Clock is an authored Support variable (the support set, not read off R); the
// env Readout carries an authored scale, proving env rows are characterizable.
const model = {
  lens: "Klir",
  things: [
    { id: 1, name: "Driver", x: 0, y: 0, role: "Component", scale: "Nominal", states: ["On", "Off"] },
    { id: 2, name: "Signal", x: 0, y: 0, role: "Component" },
    { id: 3, name: "Readout", x: 0, y: 0, role: "Environment", scale: "Ordinal" },
    { id: 4, name: "Clock", x: 0, y: 0, role: "Component", variable_kind: "Support" },
  ],
  relations: [
    { id: 10, a: 1, b: 2, name: "", is_bond: true, kind: "Unspecified", klir_directed: true },
    { id: 11, a: 2, b: 3, name: "", is_bond: true, kind: "Unspecified", klir_directed: true },
  ],
} as unknown as CanvasModel;

const markup = () =>
  renderToStaticMarkup(
    <SourceSystemTable
      model={model}
      selectedThingId={null}
      onSelectThing={noop}
      onUpdateThing={noop}
    />,
  );

describe("Table 4.1 — the source-system register", () => {
  it("registers one row per variable in T", () => {
    const m = markup();
    for (const name of ["Driver", "Signal", "Readout", "Clock"]) {
      expect(m).toContain(name);
    }
  });

  it("derives in/out from directed relations", () => {
    // Driver only drives (input), Signal both, uncoupled Clock reads —.
    const m = markup();
    expect(m).toContain("input");
    expect(m).toContain("in/out");
  });

  it("surfaces basic/support as an authored select, default Basic", () => {
    // Not derived from R: Clock declares Support; the coupled ones default Basic.
    const m = markup();
    expect(m).toContain('value="Support"');
    expect(m).toContain('value="Basic"');
  });

  it("surfaces the authored scale as a select preset to the thing's value", () => {
    const m = markup();
    expect(m).toContain("<select");
    // The Driver's authored Nominal scale is the select's current value.
    expect(m).toContain('value="Nominal"');
  });

  it("surfaces the state set as a comma-listed editable field", () => {
    const m = markup();
    expect(m).toContain('value="On, Off"');
  });

  it("characterizes environment variables too — the env Readout's scale is editable", () => {
    // #154 revision: env rows carry authored source-system metadata (Table 4.1
    // most wants the input variables, often the environmental drivers).
    const m = markup();
    expect(m).toContain('value="Ordinal"');
  });
});

// #154 P3 — the behavior-function / mask readout (Fig. 4.3 / Table 4.3): f: Ḡ → G
// read off a Mobus conservation run's trajectory. Ḡ = state at t, G = state at
// t+1 (first-order deterministic step). Same static-markup harness.
const run = (series0: number[], series1: number[]): RunResultRich => ({
  ticks: series0.length,
  dt: 1,
  residual: 0,
  conserved: true,
  levels: [],
  comparisons: [],
  trajectories: [
    { name: "Tank", unit: "L", unit_derived: false, series: series0 },
    { name: "Sink", unit: "L", unit_derived: false, series: series1 },
  ],
});

describe("Fig. 4.3 / Table 4.3 — the behavior-function mask readout", () => {
  it("shows an honest empty state and the deferral caveat with no run", () => {
    const m = renderToStaticMarkup(<MaskTable result={null} />);
    expect(m).toContain("No run to read");
    // The honest labeling the P3 scope rests on.
    expect(m).toContain("Mobus conservation run");
    expect(m).toContain("deferred");
    expect(m).toContain("#67");
  });

  it("produces a Ḡ → G row per step from a ≥2-stock Mobus run", () => {
    // 3 sampled ticks → 2 steps (the final tick has no successor row).
    const m = renderToStaticMarkup(<MaskTable result={run([4, 3, 2], [0, 1, 2])} />);
    expect(m).toContain("f: Ḡ → G");
    expect(m).toContain("Ḡ:Tank");
    expect(m).toContain("G:Tank");
    // Step t=0: Ḡ=(4,0) → G=(3,1); step t=1: Ḡ=(3,1) → G=(2,2).
    for (const v of ["4", "3", "2", "1"]) expect(m).toContain(v);
  });

  it("highlights the current mask row at the scrubber tick", () => {
    const m = renderToStaticMarkup(<MaskTable result={run([4, 3, 2], [0, 1, 2])} tick={1} />);
    // The live row carries the accent wash + step marker; the clamp keeps it on
    // an existing step (tick 1 → the second of two rows).
    expect(m).toContain('aria-current="step"');
    expect(m).toContain("◂");
  });

  it("clamps a tick past the last step onto the final row (no off-path marker)", () => {
    // 2 ticks → 1 row (index 0); tick 9 clamps to it, never off the path.
    const m = renderToStaticMarkup(<MaskTable result={run([5, 4], [0, 1])} tick={9} />);
    expect(m).toContain('aria-current="step"');
  });
});
