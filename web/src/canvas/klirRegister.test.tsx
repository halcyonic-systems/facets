// #154 P2 — Klir's source-system register (Table 4.1): the one DERIVED column
// (in/out, read off R) and the three AUTHORED columns (basic/support, scale,
// state set) surface their inline editors — on environment variables too (#154
// revision). Held to the same static-markup harness the Mobus register uses.
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { CanvasModel } from "../kernel/types";
import { SourceSystemTable } from "./KlirRegister";

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
