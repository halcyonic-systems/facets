// The inputs rail's engine floor (#463 move 3): every engine field a
// component line declares and no `param` names gets a row under the
// component; a field a param already covers does not appear twice; the
// primitive's own knob takes the kernel palette's label.
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { RunInputs, engineRows } from "./RunInputs";
import type { CanvasModel, Thing } from "./kernel/types";

const barrel = {
  id: 2,
  name: "Barrel",
  role: "Component",
  primitive: "Buffering",
  stock_unit: "L",
  initial_state: { storage: 60 },
  cognitive_params: { release_rate: 12, capacity: 200 },
} as unknown as Thing;
const amp = { id: 3, name: "Amp", role: "Component", primitive: "Amplifying", agency_capacity: 2 } as unknown as Thing;
const gate = { id: 4, name: "Gate", role: "Component", passway: true, interface: true } as unknown as Thing;

const model = {
  name: "m",
  lens: "Mobus",
  things: [barrel, amp, gate],
  relations: [],
  params: [{ name: "drain", anchor: { Field: { thing: 2, field: "release_rate" } }, range: { min: "0", max: "40" } }],
} as unknown as CanvasModel;

describe("engine floor", () => {
  it("lists declared engine fields not already named by a param", () => {
    const rows = engineRows(barrel, new Set(["release_rate"]));
    expect(rows.map((r) => [r.key, r.label, r.value])).toEqual([
      ["initial_storage", "initial stock", 60],
      ["capacity", "capacity", 200],
    ]);
    expect(rows[1].put(250).cognitive_params).toEqual({ release_rate: 12, capacity: 250 });
    expect(rows[0].put(10).initial_state).toEqual({ storage: 10 });
  });

  it("labels the primitive's own knob from the palette and skips pass-ways", () => {
    expect(engineRows(amp, new Set(), { Amplifying: "gain" })[0]).toMatchObject({ key: "param", label: "gain", value: 2 });
    expect(engineRows(amp, new Set())[0].label).toBe("parameter");
    expect(engineRows(gate, new Set())).toEqual([]);
  });

  it("renders a group per component with the declared param kept to its own row", () => {
    const html = renderToStaticMarkup(
      <RunInputs model={model} manifest={null} onEdit={() => {}} onEditThing={() => {}} engineLabels={{ Amplifying: "gain" }} />,
    );
    expect(html).toContain("field-param-drain");
    expect(html).toContain("Barrel · engine");
    expect(html).toContain("initial stock");
    expect(html).toContain("Amp · engine");
    expect(html).toContain("gain");
    expect(html).not.toContain("Gate · engine");
    // No duplicate: the barrel's release is the param's row, not an engine row.
    expect(html.match(/aria-label="release"/g)).toBeNull();
  });
});
