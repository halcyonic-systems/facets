// #336: the Mobus flow popover has ONE job — name, endpoints, substance,
// description. The subtraction is gated so it cannot silently regrow: driving
// a flow with data is DataMode's surface (#304 M2, fork 2), and the popover
// says at most one plain sentence about Run state, only when it is true.
// MobusBody is rendered directly (the popover shell portals into
// document.body, which this DOM-free suite cannot host).
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MobusBody } from "./EdgePopover";
import type { Manifest, Relation } from "../kernel/types";

const relation = (over: Partial<Relation> = {}): Relation => ({
  id: 7,
  a: 1,
  b: 2,
  name: "securities held",
  is_bond: true,
  kind: "Matter",
  ...over,
});

const emptyManifest: Manifest = { model: "", data: "", t: 12, mapping: [] };

const render = (r: Relation, manifest = emptyManifest) =>
  renderToStaticMarkup(
    <MobusBody
      relation={r}
      manifest={manifest}
      fromName="Vault"
      toName="Dealers"
      onUpdate={() => {}}
      onClose={() => {}}
    />,
  );

describe("the Mobus flow popover has one job (#336)", () => {
  it("states the flow's identity in plain words, and repeats the name nowhere", () => {
    const html = render(relation());
    expect(html).toContain("from Vault → to Dealers");
    // The old duplicate title (`flow "name"`) is gone: the name lives in the
    // shared editable field above the body, and the body never restates it.
    expect(html).not.toContain("securities held");
  });

  it("carries no drive-with-data form and no formalism strip", () => {
    const html = render(relation());
    for (const gone of ["drive with data", "drive it", "choose column", "formalism", "declared"]) {
      expect(html).not.toContain(gone);
    }
  });

  it("says nothing about Run state on an unquantified, unbound flow", () => {
    expect(render(relation())).not.toContain("adjust in");
  });

  it("names a live binding in one sentence, pointing at Data", () => {
    const manifest: Manifest = {
      ...emptyManifest,
      mapping: [{ column: "WRESBAL", as: "flow", element: "securities held", force: true }],
    };
    const html = render(relation(), manifest);
    expect(html).toContain("driven by");
    expect(html).toContain("WRESBAL");
    expect(html).toContain("adjust in Data");
  });

  it("states a declared amount in one sentence, pointing at Run · Inputs", () => {
    const html = render(relation({ amount: "1.5", unit: "units/mo" }));
    expect(html).toContain("amount 1.5 units/mo");
    expect(html).toContain("Run · Inputs");
  });
});
