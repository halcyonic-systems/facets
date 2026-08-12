// #204 — the review report. Static-markup render checks (no DOM, no wasm): the
// headline names lens and mode, the verdict's sentence leads, its citation
// survives demoted, and warnings read as observations rather than failures.
//
// #319 adds the shape of the list. Six refusals that differ only in a flow name
// are one finding with six instances, and a reader should be told that before
// being handed the six. The grouping key is the kernel's `code`; the citation
// moves behind a disclosure and stays on the page; no issue is dropped.
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ReviewPanel } from "./ReviewPanel";
import type { CanvasModel, IssueTarget, ValidationIssue } from "./kernel/types";
import { kernelVerdict } from "./kernel/testVerdict";

const model: CanvasModel = {
  lens: "Bunge",
  things: [
    { id: 1, name: "A", x: 0, y: 0, role: "Component" },
    { id: 2, name: "B", x: 0, y: 0, role: "Component" },
  ],
  relations: [],
  boundary: { porosity: 0, perceptive_fuzziness: 0 },
};

const aggregate: ValidationIssue = kernelVerdict({
  severity: "Error",
  code: "aggregate_no_bond",
  location: "mode/Structural",
  message:
    "Bunge Def 1.1: a system requires at least one bond between distinct components; an unbonded collection is an aggregate",
  suggestion: "Add an interaction between two distinct systems, or author in Core mode",
  doc: "docs/glossary.md#bond",
});

const deadEnd: ValidationIssue = kernelVerdict({
  severity: "Warning",
  code: "dead_end",
  location: "systems[0]",
  message: "'Furnace' is terminal/absorbing: no flow leaves it",
  suggestion: null,
  doc: null,
});

const INTERFACE_DOC = "docs/language/terminology-concordance.md#9-interface";

/** The 2026-08-12 ribosome demo, verbatim in shape: one interface refusal and
 *  six crossing-flow refusals carrying the same paragraph. */
const crossing = (flow: string): ValidationIssue =>
  kernelVerdict({
    severity: "Error",
    code: "crossing_flow_without_interface",
    location: "interactions[0].source_interface",
    message: `flow '${flow}' enters the system but crosses the boundary without an interface — in Mobus's tuple every external flow passes through a member of I (SSF \`bipartite_implies_boundary_complete\`)`,
    suggestion: "Designate the component as an interface, or re-route the flow through an existing one",
    doc: INTERFACE_DOC,
  });

const interfaceCarriesNothing: ValidationIssue = kernelVerdict({
  severity: "Error",
  code: "interface_carries_no_flow",
  location: "systems[0].boundary.interfaces[0]",
  message:
    "interface 'Large Subunit' carries no boundary-crossing flow — Mobus defines an interface as a component that transports a flow across the boundary (Lean `MobusSystem.interfaces_carry_flow`)",
  suggestion: "Draw the flow this interface gates, or drop the interface designation",
  doc: INTERFACE_DOC,
});

const RIBOSOME: ValidationIssue[] = [
  interfaceCarriesNothing,
  crossing("charged tRNA sampled"),
  crossing("spent tRNA released from E site"),
  crossing("GTP binding and hydrolysis"),
  crossing("hydrolysis products"),
  crossing("dissipation"),
  crossing("nascent chain emerges"),
];

const noTarget: IssueTarget = { thing: null, relation: null, disregarded_relations: 0 };

function render(m: CanvasModel, issues: ValidationIssue[], reviewedAt: string | null = null, targets?: IssueTarget[]) {
  return renderToStaticMarkup(
    <ReviewPanel
      model={m}
      validation={{ issues }}
      targets={targets ?? issues.map(() => noTarget)}
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

  describe("seven refusals, two findings (#319)", () => {
    const m = render({ ...model, lens: "Mobus" }, RIBOSOME);

    it("says the shape before it says the list", () => {
      expect(m).toContain("2 findings, 7 instances");
    });

    it("names each defect kind once, with its count", () => {
      expect(m).toContain("crossing flow without interface");
      expect(m).toContain("6 instances");
      expect(m).toContain("interface carries no flow");
      expect(m).toContain("1 instance");
    });

    it("still lists every instance, individually numbered", () => {
      for (const flow of [
        "charged tRNA sampled",
        "spent tRNA released from E site",
        "GTP binding and hydrolysis",
        "hydrolysis products",
        "dissipation",
        "nascent chain emerges",
      ]) {
        expect(m).toContain(flow);
      }
      expect(m).toContain("07");
    });

    it("says the repair once, and puts it above the instances", () => {
      const repair = "Designate the component as an interface, or re-route the flow through an existing one";
      expect(m.split(repair).length - 1).toBe(1);
      expect(m.indexOf(repair)).toBeLessThan(m.indexOf("charged tRNA sampled"));
    });

    it("folds the shared rationale into one disclosure instead of six paragraphs", () => {
      expect(m).toContain("Why the kernel says so");
      expect(m.split("bipartite_implies_boundary_complete").length - 1).toBe(1);
      expect(m).toContain(INTERFACE_DOC);
    });

    it("sets the two halves of one authoring gap side by side", () => {
      // Both cite the same entry, so the panel puts them adjacent: an interface
      // with no flow and flows with no interface explain each other.
      const first = m.indexOf("interface carries no flow");
      const second = m.indexOf("crossing flow without interface");
      expect(first).toBeGreaterThan(-1);
      expect(second).toBeGreaterThan(first);
      expect(m.slice(first, second)).not.toContain("Observations");
    });

    it("never merges two defect kinds because their text is alike", () => {
      // One block per code. Both sentences are about interfaces and boundary
      // crossings; only the kernel's code separates them, and it must.
      expect(m).toContain("Large Subunit");
      expect(m).toContain("interface carries no flow");
      expect(m).toContain("crossing flow without interface");
    });
  });

  it("says which relations a refusal disregarded, when the kernel counted any", () => {
    const targets: IssueTarget[] = [{ thing: 4, relation: null, disregarded_relations: 2 }];
    const m = render({ ...model, lens: "Mobus" }, [interfaceCarriesNothing], null, targets);
    expect(m).toContain("2 relations drawn here are mere");
  });

  it("says nothing about disregarded relations when there are none", () => {
    const m = render({ ...model, lens: "Mobus" }, [interfaceCarriesNothing]);
    expect(m).not.toContain("are mere");
  });
});
