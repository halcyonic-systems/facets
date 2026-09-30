import { describe, expect, it } from "vitest";
import type { CanvasModel, LensFacts } from "../kernel/types";
import { sceneFromCanvasModel } from "./scene";

// facets#435 stage 0 kill criterion: the builder is synchronous and must stay
// well under a frame for a model larger than anything in the library.
function synthetic(components: number, envs: number, flows: number): { model: CanvasModel; facts: LensFacts } {
  const things: CanvasModel["things"] = [];
  for (let i = 0; i < components; i++) things.push({ id: i + 1, name: `c${i}`, x: (i * 97) % 500, y: (i * 61) % 400, role: "Component", interface: i % 4 === 0 });
  for (let i = 0; i < envs; i++) things.push({ id: 1000 + i, name: `e${i}`, x: -100, y: i * 30, role: "Environment", env_kind: i % 2 ? "Sink" : "Source" });
  const relations: CanvasModel["relations"] = [];
  for (let i = 0; i < flows; i++) {
    const a = i % 3 === 0 ? 1000 + (i % envs) : 1 + (i % components);
    const b = 1 + ((i * 7) % components);
    relations.push({ id: 5000 + i, a, b, name: `f${i}`, is_bond: true, kind: "Matter" });
  }
  const authored = things.filter((t) => t.role === "Component" && t.interface).map((t) => t.id);
  const ports: LensFacts["ports"] = relations
    .filter((r) => r.a >= 1000)
    .map((r) => ({ component: r.b, env: r.a, relation_ids: [r.id], direction: "Receives" as const, protocol: r.name }));
  return {
    model: { lens: "Mobus", boundary: { porosity: 0, perceptive_fuzziness: 0 }, things, relations },
    facts: {
      boundary_thing_ids: [...new Set(ports.map((p) => p.component))],
      environment_thing_ids: things.filter((t) => t.role === "Environment").map((t) => t.id),
      orphan_env_thing_ids: [],
      authored_interface_thing_ids: authored,
      boundary_props: { porosity: 0, perceptive_fuzziness: 0 },
      aggregate: false,
      edges: [],
      ports,
    },
  };
}

describe("scene builder budget", () => {
  it("builds a 60-component, 20-environment, 200-flow model in under 20 ms", () => {
    const { model, facts } = synthetic(60, 20, 200);
    sceneFromCanvasModel(model, facts, null, "capsule");
    const t0 = performance.now();
    const scene = sceneFromCanvasModel(model, facts, null, "capsule");
    const ms = performance.now() - t0;
    expect(scene.entities).toHaveLength(80);
    expect(scene.flows).toHaveLength(200);
    expect(ms).toBeLessThan(20);
  });
});
