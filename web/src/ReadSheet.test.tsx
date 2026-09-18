// Read's sheet (#409 M3): the count rows are a pure reading of describe(),
// narrowing keeps issues and targets in step, and the sheet renders its
// three sections in order with the element on top when one is selected.
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ReadSheet, formalRows, narrowReview } from "./ReadSheet";
import type { CanvasModel, IssueTarget, LensDescription, ValidationResult } from "./kernel/types";
import { kernelVerdict } from "./kernel/testVerdict";

const noop = () => {};
const model = {
  lens: "Mobus",
  things: [
    { id: 1, name: "Tub", role: "Component", primitive: "Buffering", x: 0, y: 0 },
    { id: 2, name: "Faucet", role: "Environment", env_kind: "Source", x: -50, y: 0 },
  ],
  relations: [{ id: 10, a: 2, b: 1, name: "inflow" }],
  boundary: { porosity: 0, perceptive_fuzziness: 0 },
} as unknown as CanvasModel;
const mobus = {
  lens: "Mobus",
  question: "q",
  c: ["Tub"],
  n: 0,
  e_objects: ["Faucet"],
  milieu_note: "milieu opaque",
  g: 1,
  b_interfaces: [],
  porosity: 0,
  perceptive_fuzziness: 0,
  t_note: "T note",
  h_note: "H note",
  dt_note: "dt note",
  self_loop_conflicts: [],
} as unknown as LensDescription;

describe("formalRows", () => {
  it("names every slot of the Mobus tuple with its count, and lists what a slot holds", () => {
    const rows = formalRows(mobus);
    expect(rows.map((r) => r.label)).toEqual(["C", "N", "E", "G", "B", "T", "H", "Δt"]);
    expect(rows[0]).toMatchObject({ value: "1 component", items: ["Tub"] });
    expect(rows[2].value).toContain("milieu opaque");
  });

  it("reads Klir as (T, R) with the dependencies behind R", () => {
    const rows = formalRows({ lens: "Klir", question: "q", things: 2, relations: 1, directed: 1, neutral: 0, dependencies: ["a → b"], note: "", ladder: {} } as unknown as LensDescription);
    expect(rows[0].value).toBe("2 things");
    expect(rows[1].items).toEqual(["a → b"]);
  });
});

describe("narrowReview", () => {
  const issue = (severity: "Error" | "Warning", message: string) =>
    kernelVerdict({ severity, code: "x", location: "mode/Operational", message, suggestion: null, doc: null });
  const verdict: ValidationResult = { issues: [issue("Error", "one"), issue("Warning", "two")] };
  const targets: IssueTarget[] = [
    { thing: 1, relation: null, disregarded_relations: 0 },
    { thing: null, relation: 10, disregarded_relations: 0 },
  ];
  it("keeps only the notes about the selected element, targets in step", () => {
    const t = narrowReview(verdict, targets, { thing: 1, relation: null });
    expect(t.verdict.issues.map((i) => i.message)).toEqual(["one"]);
    expect(t.targets).toEqual([targets[0]]);
    const r = narrowReview(verdict, targets, { thing: null, relation: 10 });
    expect(r.verdict.issues.map((i) => i.message)).toEqual(["two"]);
  });
});

describe("ReadSheet", () => {
  const base = {
    model,
    desc: mobus,
    verdict: { issues: [] } satisfies ValidationResult,
    issueTargets: [] as IssueTarget[],
    analysisError: null,
    reviewedAt: null,
    onReview: noop,
    onNavigate: noop,
    onHover: noop,
    onClearSelection: noop,
  };
  it("stacks review, the formal object and the analyst, in that order", () => {
    const m = renderToStaticMarkup(<ReadSheet {...base} selection={{ thing: null, relation: null }} />);
    const at = (s: string) => m.indexOf(s);
    expect(at("Review")).toBeGreaterThan(-1);
    expect(at("Review")).toBeLessThan(at("The formal object"));
    expect(at("The formal object")).toBeLessThan(at("Analyst"));
    expect(m).toContain("where this comes from");
    expect(m).not.toContain("math.systems ↗");
    expect(m).not.toContain("read-element");
  });

  it("puts the selected element on top and offers the whole model back", () => {
    const m = renderToStaticMarkup(<ReadSheet {...base} selection={{ thing: 1, relation: null }} />);
    expect(m.indexOf("read-element")).toBeLessThan(m.indexOf("The formal object"));
    expect(m).toContain("Tub");
    expect(m).toContain("buffering");
    expect(m).toContain("in: Faucet (inflow)");
    expect(m).toContain("whole model");
  });
});
