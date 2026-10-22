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

import { DataMode, bindingEntry, proposeBindings } from "./DataMode";

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
    expect(html).toContain("2 rows × 3 columns"); // console graft: shape on open
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

  it("offers acquisition and binding when the callbacks are present (M2 slice 1)", () => {
    const html = renderToStaticMarkup(
      <DataMode
        model={model}
        modelName="Federal Reserve"
        csv={csv}
        manifest={manifest}
        onAttachCsv={() => {}}
        onManifestChange={() => {}}
      />,
    );
    expect(html).toContain("replace CSV…"); // data present → replace wording
    expect(html).toContain("Column bindings");
    expect(html).toContain("time (support)");
    expect(html).toContain("→ remittances"); // every declared flow is a bind target
  });

  it("offers import from the empty state when no data is attached", () => {
    const html = renderToStaticMarkup(
      <DataMode
        model={model}
        modelName="Federal Reserve"
        csv={null}
        manifest={null}
        onAttachCsv={() => {}}
        onManifestChange={() => {}}
      />,
    );
    expect(html).toContain("import CSV…");
  });

  it("stays read-only when the callbacks are absent", () => {
    const html = renderToStaticMarkup(
      <DataMode model={model} modelName="Federal Reserve" csv={csv} manifest={manifest} />,
    );
    expect(html).not.toContain("import CSV");
    expect(html).not.toContain("Column bindings");
  });

  it("states the structural-only condition when no data is attached", () => {
    const html = renderToStaticMarkup(
      <DataMode model={model} modelName="Federal Reserve" csv={null} manifest={null} />,
    );
    expect(html).toContain("no data attached");
    expect(html).toContain("TGA deposits"); // every declared flow waits in the rail
    expect(html).toContain("remittances");
  });

  // Run-from-attached (#304): a stock binds too — the column's t0 observation
  // supplies the component's initial level. Offered only for Buffering
  // components (the things that hold a level), and value-prefixed so a stock
  // and a flow sharing a name cannot collide in one dropdown.
  it("offers Buffering components as stock-level bindings, and only those", () => {
    const stocky: CanvasModel = {
      ...model,
      things: [
        ...model.things,
        { id: 3, name: "Reserve", x: 2, y: 0, role: "Component", primitive: "Buffering" },
      ],
    };
    const html = renderToStaticMarkup(
      <DataMode
        model={stocky}
        modelName="Federal Reserve"
        csv={csv}
        manifest={manifest}
        onAttachCsv={() => {}}
        onManifestChange={() => {}}
      />,
    );
    expect(html).toContain("stock level (t0 = initial)");
    expect(html).toContain('value="stock:Reserve"');
    // Balance Sheet has no Buffering primitive, so it is not offered as a stock.
    expect(html).not.toContain('value="stock:Balance Sheet"');
  });

  it("round-trips a stock binding through the manifest", () => {
    const withStock: Manifest = {
      ...manifest,
      mapping: [...manifest.mapping, { column: "reserve", as: "stock", element: "Reserve" }],
    };
    const stocky: CanvasModel = {
      ...model,
      things: [
        ...model.things,
        { id: 3, name: "Reserve", x: 2, y: 0, role: "Component", primitive: "Buffering" },
      ],
    };
    const html = renderToStaticMarkup(
      <DataMode
        model={stocky}
        modelName="Federal Reserve"
        csv={"week,tga,ghost,reserve\n2023-01-04,536.2,1,100\n"}
        manifest={withStock}
        onAttachCsv={() => {}}
        onManifestChange={() => {}}
      />,
    );
    // The dropdown for the bound column shows the stock as selected — the
    // prefixed value survives currentBinding's read-back.
    expect(html).toContain('value="stock:Reserve"');
  });
});

// #535 item 1 (found in #530): a bound column carries the COLUMN's unit.
describe("binding a column keeps its declared unit (#535 item 1)", () => {
  const routed: CanvasModel = {
    ...model,
    relations: [{ id: 20, a: 1, b: 2, name: "Router -> Open", kind: "Matter", is_bond: true, unit: "Gtok/day" }],
  };

  it("a column already declared `weight` stays `weight` when bound to a Gtok/day flow", () => {
    const prior = { column: "open_weight", as: "flow" as const, element: "Router -> Open", unit: "weight", force: true };
    expect(bindingEntry("open_weight", "Router -> Open", routed, prior)?.unit).toBe("weight");
  });

  it("a column nothing has declared takes the flow's unit as its default", () => {
    expect(bindingEntry("open_tok", "Router -> Open", routed)?.unit).toBe("Gtok/day");
  });

  it("a column that was time and is now bound does not carry a stale unit", () => {
    const prior = { column: "month", as: "time" as const };
    expect(bindingEntry("month", "Router -> Open", routed, prior)?.unit).toBe("Gtok/day");
  });

  it("time, stock and ignore write no unit", () => {
    expect(bindingEntry("month", "time", routed)).toEqual({ column: "month", as: "time" });
    expect(bindingEntry("x", "ignore", routed)).toBeNull();
    expect(bindingEntry("lvl", "stock:Balance Sheet", routed)).toEqual({ column: "lvl", as: "stock", element: "Balance Sheet" });
  });

  it("the binding row shows the column's unit, editable", () => {
    const m: Manifest = { ...manifest, mapping: [{ column: "tga", as: "flow", element: "TGA deposits", unit: "weight", force: true }] };
    const html = renderToStaticMarkup(
      <DataMode model={model} modelName="Federal Reserve" csv={csv} manifest={m} onManifestChange={() => {}} />,
    );
    expect(html).toContain('aria-label="unit of tga"');
    expect(html).toContain('value="weight"');
  });
});

describe("bindings proposed by name (#535 item 2, #339)", () => {
  const stockModel: CanvasModel = {
    ...model,
    things: [
      ...model.things,
      { id: 3, name: "Reserves", x: 2, y: 0, role: "Component", primitive: "Buffering" },
    ],
  };

  it("proposes a flow, a stock level and the support from matching names, case-insensitively", () => {
    const p = proposeBindings(["Week", "tga deposits", "RESERVES", "Date"], stockModel);
    expect(Object.fromEntries(p)).toEqual({
      "tga deposits": "TGA deposits",
      RESERVES: "stock:Reserves",
      Date: "time",
    });
  });

  it("proposes nothing for a column matching nothing, or matching more than one target", () => {
    const twin: CanvasModel = {
      ...model,
      relations: [...model.relations, { id: 12, a: 1, b: 2, name: "tga deposits", kind: "Matter", is_bond: true }],
    };
    expect(proposeBindings(["noise", "TGA deposits"], twin).size).toBe(0);
  });

  it("leaves a bound column, a bound target and a held support alone", () => {
    const mapping = [
      { column: "week", as: "time" as const },
      { column: "tga", as: "flow" as const, element: "TGA deposits", force: true },
    ];
    const p = proposeBindings(["week", "date", "tga", "TGA deposits", "remittances"], model, mapping);
    expect(Object.fromEntries(p)).toEqual({ remittances: "remittances" });
  });

  it("shows proposals distinct from bindings and writes nothing until confirmed", () => {
    const onManifestChange = vi.fn();
    const html = renderToStaticMarkup(
      <DataMode
        model={model}
        modelName="Federal Reserve"
        csv={"date,remittances\n2023-01-04,1\n"}
        manifest={null}
        onAttachCsv={() => {}}
        onManifestChange={onManifestChange}
      />,
    );
    expect(html).toContain("confirm 2 proposed by name");
    expect(html).toContain('data-proposed="remittances"');
    expect(html).toContain('data-proposed="time"');
    expect(onManifestChange).not.toHaveBeenCalled();
  });

  it("a confirmed proposal is the binding the dropdown would write", () => {
    const value = proposeBindings(["remittances"], model).get("remittances")!;
    expect(bindingEntry("remittances", value, model)).toEqual({
      column: "remittances",
      as: "flow",
      element: "remittances",
      force: true,
    });
  });
});
