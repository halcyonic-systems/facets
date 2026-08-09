// #304 M1: the Data mode table — a column IS a declared flow (binding by
// declaration), a broken binding is SHOWN not dropped, an unbound declared
// flow sits in the rail, and a structural-only model states its condition.
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { CanvasModel, Manifest } from "./kernel/types";

vi.mock("./kernel", () => ({
  parseCsv: (text: string) => {
    const [head, ...rest] = text.trim().split("\n");
    return {
      headers: head.split(","),
      rows: rest.map((r) => r.split(",")),
    };
  },
}));

import { DataMode } from "./DataMode";

const model: CanvasModel = {
  lens: "Mobus",
  klir_level: "Structure",
  things: [
    { id: 1, name: "Balance Sheet", x: 0, y: 0, role: "Component", interface: true },
    { id: 2, name: "U.S. Treasury", x: 1, y: 0, role: "Environment" },
  ],
  relations: [
    { id: 10, a: 2, b: 1, name: "TGA deposits", kind: "Matter", is_bond: true },
    { id: 11, a: 1, b: 2, name: "remittances", kind: "Matter", is_bond: true },
  ],
  boundary: { porosity: 0, perceptive_fuzziness: 0 },
};

const manifest: Manifest = {
  model: "fed",
  data: "fed.csv",
  t: 2,
  mapping: [
    { column: "week", as: "time" },
    { column: "tga", as: "flow", element: "TGA deposits", unit: "$B", force: true },
    { column: "ghost", as: "flow", element: "renamed away", unit: "$B" },
  ],
};

const csv = "week,tga,ghost\n2023-01-04,536.2,1\n2023-01-11,477.8,2\n";

describe("Data mode (#304 M1)", () => {
  it("renders bound columns as declared flows with endpoints and source column", () => {
    const html = renderToStaticMarkup(
      <DataMode model={model} modelName="Federal Reserve" csv={csv} manifest={manifest} />,
    );
    expect(html).toContain("TGA deposits");
    expect(html).toContain("U.S. Treasury → Balance Sheet");
    expect(html).toContain("forces the flow");
    expect(html).toContain("536.2");
    expect(html).toContain("2 observations");
    expect(html).toContain("model declares level Structure");
  });

  it("shows a broken binding instead of silently dropping the column", () => {
    const html = renderToStaticMarkup(
      <DataMode model={model} modelName="Federal Reserve" csv={csv} manifest={manifest} />,
    );
    expect(html).toContain("broken binding");
    expect(html).toContain("renamed away");
  });

  it("lists declared-but-unbound flows in the rail", () => {
    const html = renderToStaticMarkup(
      <DataMode model={model} modelName="Federal Reserve" csv={csv} manifest={manifest} />,
    );
    expect(html).toContain("Declared, not bound");
    expect(html).toContain("remittances");
  });

  it("states the structural-only condition when no data is attached", () => {
    const html = renderToStaticMarkup(
      <DataMode model={model} modelName="Federal Reserve" csv={null} manifest={null} />,
    );
    expect(html).toContain("no data attached");
    expect(html).toContain("TGA deposits"); // every declared flow waits in the rail
    expect(html).toContain("remittances");
  });
});
