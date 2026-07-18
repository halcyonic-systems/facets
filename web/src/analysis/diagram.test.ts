// The diagram builder is pure layout over resolved citations — no kernel, no
// wasm, no LLM. It nails what the visual depends on: only resolvable tokens
// become nodes (the same hallucination guard the chips carry), consecutive
// cites in a line become a directed hop, and a graph too thin to draw is null.
import { describe, it, expect } from "vitest";
import type { CanvasModel, CanvasAnalysis } from "../kernel/types";
import { makeResolver } from "./citations";
import { buildTraceDiagram } from "./diagram";

const canvas: CanvasModel = {
  lens: "Mobus",
  things: [
    { id: 1, name: "A", x: 0, y: 0, role: "Component" },
    { id: 2, name: "B", x: 0, y: 0, role: "Component" },
    { id: 3, name: "C", x: 0, y: 0, role: "Component" },
  ],
  relations: [{ id: 10, a: 1, b: 2, name: "flow", is_bond: true, kind: "Energy" }],
  boundary: { porosity: 0, perceptive_fuzziness: 0 },
};

const analysis = { issue_targets: [] } as unknown as CanvasAnalysis;
const resolver = makeResolver(canvas, analysis);

describe("buildTraceDiagram", () => {
  it("makes a node per distinct resolved element and a hop per consecutive pair", () => {
    const g = buildTraceDiagram(["[thing:1] grounds [relation:10] then [thing:2]"], [], resolver);
    expect(g).not.toBeNull();
    expect(g!.nodes.map((n) => n.key).sort()).toEqual(["relation:10", "thing:1", "thing:2"]);
    expect(g!.edges.map((e) => `${e.from}->${e.to}`)).toEqual([
      "thing:1->relation:10",
      "relation:10->thing:2",
    ]);
    // a relation node is tagged as such (dashed-outline branch in the view)
    expect(g!.nodes.find((n) => n.key === "relation:10")!.kind).toBe("relation");
  });

  it("dedups nodes and edges across trace and evidence lines", () => {
    const g = buildTraceDiagram(
      ["[thing:1] to [thing:2]", "[thing:1] to [thing:2]"],
      ["[thing:2] to [thing:3]"],
      resolver,
    );
    expect(g!.nodes).toHaveLength(3);
    expect(g!.edges).toHaveLength(2); // the repeated 1->2 collapses
  });

  it("ignores unresolvable tokens (hallucination guard) and returns null when too thin", () => {
    // one real element + a fabricated one → a single node, no edge → nothing to draw
    expect(buildTraceDiagram(["[thing:1] and [thing:99]"], [], resolver)).toBeNull();
    // no citations at all
    expect(buildTraceDiagram(["just prose, no tokens"], [], resolver)).toBeNull();
  });

  it("survives a cycle without looping and still lays every node out", () => {
    const g = buildTraceDiagram(["[thing:1] to [thing:2]", "[thing:2] to [thing:1]"], [], resolver);
    expect(g!.nodes).toHaveLength(2);
    expect(g!.edges).toHaveLength(2);
    expect(g!.width).toBeGreaterThan(0);
    expect(g!.height).toBeGreaterThan(0);
  });
});
