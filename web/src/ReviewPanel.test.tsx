// #204 — the review report. Static-markup render checks (no DOM, no wasm): the
// headline names lens and mode, the verdict's sentence leads, its citation
// survives demoted, and warnings read as observations rather than failures.
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ReviewPanel } from "./ReviewPanel";
import type { CanvasModel, ValidationIssue } from "./kernel/types";

const model: CanvasModel = {
  lens: "Bunge",
  things: [
    { id: 1, name: "A", x: 0, y: 0, role: "Component" },
    { id: 2, name: "B", x: 0, y: 0, role: "Component" },
  ],
  relations: [],
  boundary: { porosity: 0, perceptive_fuzziness: 0 },
};

const aggregate: ValidationIssue = {
  severity: "Error",
  location: "mode/Structural",
  message:
    "Bunge Def 1.1: a system requires at least one bond between distinct components; an unbonded collection is an aggregate",
  suggestion: "Add an interaction between two distinct systems, or author in Core mode",
  doc: "docs/glossary.md#bond",
};

const deadEnd: ValidationIssue = {
  severity: "Warning",
  location: "systems[0]",
  message: "'Furnace' is terminal/absorbing: no flow leaves it",
  suggestion: null,
  doc: null,
};

function render(m: CanvasModel, issues: ValidationIssue[], reviewedAt: string | null = null) {
  return renderToStaticMarkup(
    <ReviewPanel
      model={m}
      validation={{ issues }}
      targets={issues.map(() => ({ thing: null, relation: null }))}
      reviewedAt={reviewedAt}
      onReview={() => {}}
      onNavigate={() => {}}
    />,
  );
}

describe("ReviewPanel", () => {
  it("leads with what the kernel did, naming the lens and the mode", () => {
    const m = render(model, [aggregate]);
    expect(m).toContain("Reviewed 2 things and 0 relations under Bunge, Structural mode. 1 error.");
    expect(m).toContain("Structural mode checks bonding only");
  });

  it("names the Mobus mode differently, because it checks different things", () => {
    const m = render({ ...model, lens: "Mobus" }, []);
    expect(m).toContain("under Mobus, Operational mode");
    expect(m).toContain("dead ends");
  });

  it("puts the verdict's own sentence first and keeps the citation after it", () => {
    const m = render(model, [aggregate]);
    const sentence = "A system requires at least one bond between distinct components";
    expect(m).toContain(sentence);
    expect(m).toContain("Bunge Def 1.1");
    expect(m.indexOf(sentence)).toBeLessThan(m.indexOf("Bunge Def 1.1"));
  });

  it("keeps the doc anchor as a link", () => {
    expect(render(model, [aggregate])).toContain("docs/glossary.md#bond");
  });

  it("reads a warning as an observation, not a failure", () => {
    const m = render({ ...model, lens: "Mobus" }, [deadEnd]);
    expect(m).toContain("Observations");
    expect(m).toContain("Whether they are wrong is your call");
    expect(m).not.toContain("Refusals");
  });

  it("separates refusals from observations", () => {
    const m = render({ ...model, lens: "Mobus" }, [aggregate, deadEnd]);
    expect(m).toContain("Refusals");
    expect(m).toContain("Observations");
    expect(m).toContain("The kernel refuses this model at this mode.");
  });

  it("reports a clean model as a verdict rather than an empty list", () => {
    const m = render(model, []);
    expect(m).toContain("No issues found");
    expect(m).toContain("That is a verdict, not a silence");
  });

  it("offers the review as an action and stamps the last one", () => {
    const m = render(model, [], "14:32:05");
    expect(m).toContain("Review model");
    expect(m).toContain("reviewed 14:32:05");
  });
});
