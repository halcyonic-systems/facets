// #154 P2 — Klir's source-system register (Table 4.1): the two DERIVED columns
// (basic/supporting, in/out) read off R, and the two AUTHORED columns (scale,
// state set) surface their inline editors. Held to the same static-markup
// harness the Mobus register uses.
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { CanvasModel } from "../kernel/types";
import { SourceSystemTable } from "./KlirRegister";

const noop = () => {};

// Driver → Signal → (env) Readout: a directed chain so in/out is non-trivial,
// plus an isolated backdrop variable that reads as supporting.
const model = {
  lens: "Klir",
  things: [
    { id: 1, name: "Driver", x: 0, y: 0, role: "Component", scale: "Nominal", states: ["On", "Off"] },
    { id: 2, name: "Signal", x: 0, y: 0, role: "Component" },
    { id: 3, name: "Readout", x: 0, y: 0, role: "Environment" },
    { id: 4, name: "Clock", x: 0, y: 0, role: "Component" },
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

  it("derives basic-vs-supporting from coupling into R", () => {
    // Clock is in no relation → backdrop → supporting; the coupled ones basic.
    const m = markup();
    expect(m).toContain("basic");
    expect(m).toContain("supporting");
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

  it("scale and state set are authorable on components only — env reads backdrop", () => {
    // The environment Readout shows no editors: a muted 'env' / '—' pair.
    const m = markup();
    expect(m).toContain("env");
  });
});
