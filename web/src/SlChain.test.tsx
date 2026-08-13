// The compile chain strip. Static-markup render checks (no DOM, no wasm): each
// step names its kernel call and shows a live value, the verdict carries the
// kernel's own doc anchor, and — the test that earns its keep — the copy stays
// at the strength the claim is actually held at.
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { SlChain } from "./SlChain";
import type { CanvasModel, LensDescription, ValidationIssue } from "./kernel/types";
import { kernelVerdict } from "./kernel/testVerdict";

const model: CanvasModel = {
  lens: "Mobus",
  things: [
    { id: 1, name: "Plant", x: 0, y: 0, role: "Component" },
    { id: 2, name: "Vendor", x: 0, y: 0, role: "Environment" },
  ],
  relations: [{ id: 1, a: 2, b: 1, name: "iron", is_bond: true, kind: "Matter" }],
  boundary: { porosity: 0.7, perceptive_fuzziness: 0.1 },
};

const desc: LensDescription = {
  lens: "Mobus",
  question: "q",
  c: ["Plant"],
  n: 0,
  e_objects: ["Vendor"],
  milieu_note: "m",
  g: 1,
  b_interfaces: ["Plant"],
  porosity: 0.7,
  perceptive_fuzziness: 0.1,
  t_note: "t",
  h_note: "h",
  dt_note: "dt",
  self_loop_conflicts: [],
};

const refusal: ValidationIssue = kernelVerdict({
  severity: "Error",
  code: "dead_end",
  location: "mode/Operational",
  message: "'Plant' is terminal/absorbing: no flow leaves it",
  suggestion: null,
  doc: "docs/glossary.md#dead-end",
});

function render(issues: ValidationIssue[] = []) {
  return renderToStaticMarkup(
    <SlChain
      text={"system X\ncomponent Plant\nsource Vendor"}
      model={model}
      desc={desc}
      verdict={{ issues }}
      onShowFormal={() => {}}
    />,
  );
}

describe("SlChain — the chain is named end to end", () => {
  it("names every step's kernel call", () => {
    const m = render();
    for (const call of ["SL text", "compile_sl", "describe", "validate_mode"]) {
      expect(m).toContain(call);
    }
  });

  it("shows live values, not a static picture of a pipeline", () => {
    const m = render();
    expect(m).toContain("3 lines"); // the text in the pane
    expect(m).toContain("2 things"); // the compiled artifact
    expect(m).toContain("1 relation");
    expect(m).toContain("⟨C, N, E, G, B, T, H, Δt⟩"); // the lens's formal object
    expect(m).toContain("Operational"); // the mode that lens is judged at
  });

  it("reads clean with no issues and cites the kernel's rule when refused", () => {
    expect(render()).toContain("clean");
    const refused = render([refusal]);
    expect(refused).toContain("1 issue");
    // The anchor is the kernel's (#129), linked, not paraphrased.
    expect(refused).toContain("docs/glossary.md#dead-end");
    expect(refused).toContain("glossary § dead-end");
  });

  it("links the grammar out to the spec instead of restating EBNF", () => {
    const m = render();
    expect(m).toContain("docs/language/spec.md#4-grammar");
    expect(m).not.toContain("::=");
  });

  // The guard that matters. The Lean binding here covers the mode-ENTRY gate
  // (gates_truth_table.rs, 19 rows over kernels of <= 2 things) and nothing
  // else: the verdicts themselves are Rust, and no part of this chain is
  // proved in Lean. Copy that says otherwise is the failure mode this repo
  // legislates against, so it fails here.
  it("does not claim the compile or the verdict is proved", () => {
    const m = render([refusal]).toLowerCase();
    // Word-bounded: `lean-provenance` is a filename that contains "proven" and
    // is exactly the link an auditor should follow, so it must survive.
    for (const overstatement of [/machine-checked/, /\bproven\b/, /\bproved\b/, /\bverified\b/]) {
      expect(m).not.toMatch(overstatement);
    }
    // What it may say, and does: the gate is checked against Lean, bounded.
    expect(m).toContain("mode-entry gate is checked against a lean-emitted truth table");
    expect(m).toContain("19 rows");
  });
});
