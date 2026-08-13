// The BONDHOOD channel (#320), bound at the level it is claimed: what the SVG
// actually terminates in.
//
// On 2026-08-12 a domain expert and the assistant both read a correct refusal as
// wrong, because the two relations touching the refused component were authored
// `mere` and were drawn as ordinary lines. The rule adopted from that: an
// ARROWHEAD ASSERTS A BOND. This file is its separating instance — the same
// model, the same two mere relations, rendered through the real Canvas, with the
// markers read off the output. Delete the `is_bond` branch in mobus.tsx or
// bunge.tsx and these go red.
//
// The rule is LENS-RELATIVE, and that is tested too:
//   Mobus — N is the flow set, a bond is a flow, a flow is transport. Arrowhead
//           ≡ bond, no exception, and a mere relation is not kind-coloured
//           either (it never projects; spec §4.4).
//   Bunge — a bond is a COUPLING and need not carry anything. Bonds keep their
//           arrow (it says which thing acts on which); mere loses it.
//   Klir  — `(T, R)` has no bond/non-bond split, so bondhood is not encoded.
//           The head here means "the observer toggled this directed", and a mere
//           relation must render EXACTLY like a bond.
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { CanvasModel, Lens, LensFacts } from "../kernel/types";
import Canvas from "./Canvas";

// The 2026-08-12 draft reduced to the shape that produced the misreading: one
// component whose only two relations are mere (the interface the kernel refused
// as carrying no boundary-crossing flow), alongside real bonds. Mirrors the
// RIBOSOME fixture in crates/bert-canvas/tests/issue_codes.rs.
const model: CanvasModel = {
  lens: "Mobus",
  things: [
    { id: 1, name: "Large Subunit", x: 260, y: 260, role: "Component" },
    { id: 2, name: "Peptidyl Transferase Center", x: 460, y: 260, role: "Component" },
    { id: 3, name: "Small Subunit", x: 360, y: 420, role: "Component" },
    { id: 4, name: "Cytosol", x: 80, y: 260, role: "Environment", env_kind: "Neutral" },
    { id: 5, name: "tRNA Pool", x: 80, y: 460, role: "Environment", env_kind: "Source" },
  ],
  relations: [
    { id: 10, a: 4, b: 1, name: "ionic milieu", kind: "Informational", is_bond: false },
    { id: 11, a: 1, b: 2, name: "rRNA scaffold", kind: "Informational", is_bond: false },
    { id: 12, a: 5, b: 3, name: "charged tRNA", kind: "Matter", is_bond: true },
    { id: 13, a: 3, b: 2, name: "peptidyl handoff", kind: "Matter", is_bond: true },
  ],
  boundary: { porosity: 0, perceptive_fuzziness: 0 },
};

const facts: LensFacts = {
  boundary_thing_ids: [3],
  environment_thing_ids: [4, 5],
  orphan_env_thing_ids: [4],
  authored_interface_thing_ids: [],
  boundary_props: { porosity: 0, perceptive_fuzziness: 0 },
  aggregate: false,
  edges: [],
  ports: [],
};

function render(lens: Lens, m: CanvasModel = model): string {
  return renderToStaticMarkup(
    <Canvas model={{ ...m, lens }} lens={lens} facts={facts} onModelChange={() => {}} onReject={() => {}} />,
  );
}

/** Every drawn path that ends in an arrowhead — the marks a reader counts as
 *  "something goes this way". `coupling` is deliberately not one of them. */
function arrowTerminatedPaths(html: string): string[] {
  return (html.match(/<path[^>]*marker-end="url\(#arrow[^"]*"[^>]*>/g) ?? []).filter(
    (p) => !p.includes('stroke="transparent"'),
  );
}

describe("bondhood is a reserved visual channel (#320)", () => {
  it("Mobus: exactly the bonds carry arrowheads — the two mere relations carry none", () => {
    const html = render("Mobus");
    // Two bonds drawn, two mere relations drawn, and only the bonds are headed.
    expect(arrowTerminatedPaths(html)).toHaveLength(2);
    expect(html).toContain('marker-end="url(#coupling)"');
    expect(html).toContain('marker-start="url(#coupling)"');
  });

  it("Mobus: a mere relation is not tagged into N or G, because it projects into neither", () => {
    const html = render("Mobus");
    expect(html).toContain("∉ N ∪ G");
    // The bonds still declare their set.
    expect(html).toContain("· N");
  });

  it("Bunge: bonds keep the arrow that says which thing acts; mere relations lose it", () => {
    const html = render("Bunge");
    expect(arrowTerminatedPaths(html)).toHaveLength(2);
    expect(html).toContain('marker-end="url(#coupling)"');
  });

  it("Klir: bondhood is not encoded — a mere relation renders exactly like a bond", () => {
    // (T, R) has no bond/non-bond split, so the ONLY thing that may move a Klir
    // arrowhead is the observer's `klir_directed` toggle. Flipping is_bond must
    // change nothing in the output.
    const allBonds: CanvasModel = {
      ...model,
      relations: model.relations.map((r) => ({ ...r, is_bond: true })),
    };
    expect(render("Klir", allBonds)).toEqual(render("Klir"));
  });

  it("Klir: the observer's direction toggle is what moves its arrowhead", () => {
    const directed: CanvasModel = {
      ...model,
      relations: model.relations.map((r) => ({ ...r, klir_directed: true })),
    };
    expect(arrowTerminatedPaths(render("Klir"))).toHaveLength(0);
    expect(arrowTerminatedPaths(render("Klir", directed))).toHaveLength(4);
  });
});
