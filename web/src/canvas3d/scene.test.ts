import { describe, expect, it } from "vitest";
import type { CanvasModel, LensFacts } from "../kernel/types";
import { sceneFromCanvasModel } from "./scene";

// A pump between a river and a tank: two interior components, one authored
// interface, a source, a sink, and an orphan the kernel flags.
const model: CanvasModel = {
  lens: "Mobus",
  name: "Pumphouse",
  boundary: { porosity: 0, perceptive_fuzziness: 0 },
  things: [
    { id: 1, name: "River", x: 0, y: 100, role: "Environment", env_kind: "Source" },
    { id: 2, name: "Intake", x: 100, y: 100, role: "Component", interface: true },
    { id: 3, name: "Pump", x: 200, y: 60, role: "Component", primitive: "Propelling" },
    { id: 4, name: "Tank", x: 200, y: 140, role: "Component", primitive: "Buffering", child_model: { name: "tank", id: "x" } },
    { id: 5, name: "Town", x: 320, y: 100, role: "Environment", env_kind: "Sink" },
    { id: 6, name: "Weather", x: 160, y: 0, role: "Environment", env_kind: "Neutral" },
  ],
  relations: [
    { id: 10, a: 1, b: 2, name: "raw water", is_bond: true, kind: "Matter", amount: "3", unit: "ML/d" },
    { id: 11, a: 2, b: 3, name: "feed", is_bond: true, kind: "Matter" },
    { id: 12, a: 3, b: 4, name: "lift", is_bond: true, kind: "Matter" },
    { id: 13, a: 4, b: 5, name: "supply", is_bond: true, kind: "Matter", ample: true },
    { id: 14, a: 3, b: 4, name: "heat", is_bond: true, kind: "Energy" },
    { id: 15, a: 3, b: 3, name: "recirculate", is_bond: false, kind: "Matter" },
  ],
};

const facts: LensFacts = {
  boundary_thing_ids: [2, 4],
  environment_thing_ids: [1, 5, 6],
  orphan_env_thing_ids: [6],
  authored_interface_thing_ids: [2],
  boundary_props: { porosity: 0, perceptive_fuzziness: 0 },
  aggregate: false,
  edges: [],
  ports: [
    { component: 2, env: 1, relation_ids: [10], direction: "Receives", protocol: "raw water" },
    { component: 4, env: 5, relation_ids: [13], direction: "Exports", protocol: "supply" },
  ],
};

describe("the scene builder", () => {
  const scene = sceneFromCanvasModel(model, facts, null, "capsule");
  const byId = (id: number) => scene.entities.find((e) => e.id === id)!;

  it("draws every thing once and types it from the facts", () => {
    expect(scene.entities).toHaveLength(6);
    expect(byId(3).kind).toBe("component");
    expect(byId(2).kind).toBe("interface");
    expect(byId(1).kind).toBe("source");
    expect(byId(5).kind).toBe("sink");
    expect(byId(6).kind).toBe("neutral");
  });

  it("keeps interior bodies inside the shell and interfaces on it", () => {
    const cap = scene.capsule;
    for (const e of scene.entities.filter((x) => x.kind === "component")) {
      const ax = Math.max(-cap.halfLength, Math.min(cap.halfLength, e.base.x));
      expect(Math.hypot(e.base.x - ax, e.base.y, e.base.z)).toBeLessThan(cap.radius);
    }
    const i = byId(2);
    const ax = Math.max(-cap.halfLength, Math.min(cap.halfLength, i.base.x));
    expect(Math.hypot(i.base.x - ax, i.base.y, i.base.z)).toBeCloseTo(cap.radius, 5);
    expect(i.normal).toBeDefined();
  });

  it("banks sources at negative x and sinks at positive x", () => {
    expect(byId(1).base.x).toBeLessThan(0);
    expect(byId(5).base.x).toBeGreaterThan(0);
  });

  it("marks orphans and children from the facts and the model", () => {
    expect(byId(6).orphan).toBe(true);
    expect(byId(4).hasChild).toBe(true);
  });

  it("makes one port per kernel port, on the shell, and reuses the interface for its own", () => {
    expect(scene.ports).toHaveLength(2);
    const viaInterface = scene.ports.find((p) => p.component === 2)!;
    expect(viaInterface.at).toEqual(byId(2).base);
    const plain = scene.ports.find((p) => p.component === 4)!;
    const cap = scene.capsule;
    const ax = Math.max(-cap.halfLength, Math.min(cap.halfLength, plain.at.x));
    expect(Math.hypot(plain.at.x - ax, plain.at.y, plain.at.z)).toBeCloseTo(cap.radius, 5);
  });

  it("routes a crossing through its plain port and not through an interface twice", () => {
    const supply = scene.flows.find((f) => f.id === 13)!;
    expect(supply.path.map((s) => s.ref)).toEqual(["entity", "port", "entity"]);
    const raw = scene.flows.find((f) => f.id === 10)!;
    expect(raw.path.map((s) => s.ref)).toEqual(["entity", "entity"]);
  });

  it("carries kind, ample, amount and self-loop through, and bundles parallel flows", () => {
    const lift = scene.flows.find((f) => f.id === 12)!;
    const heat = scene.flows.find((f) => f.id === 14)!;
    expect(new Set([lift.lane, heat.lane])).toEqual(new Set([-0.5, 0.5]));
    expect(heat.kind).toBe("Energy");
    expect(scene.flows.find((f) => f.id === 13)!.ample).toBe(true);
    expect(scene.flows.find((f) => f.id === 10)!.amount).toBe("3");
    expect(scene.flows.find((f) => f.id === 15)!.selfLoop).toBe(true);
    expect(scene.flows.find((f) => f.id === 15)!.bond).toBe(false);
  });

  it("is deterministic", () => {
    expect(sceneFromCanvasModel(model, facts, null, "capsule")).toEqual(scene);
  });
});

describe("without facts", () => {
  it("decides no boundary: every component is interior and there are no ports", () => {
    const scene = sceneFromCanvasModel(model, null, null, "capsule");
    expect(scene.ports).toHaveLength(0);
    expect(scene.entities.filter((e) => e.kind === "interface")).toHaveLength(0);
    expect(scene.entities.filter((e) => e.kind === "component")).toHaveLength(3);
  });
});

describe("with a sim frame", () => {
  it("attaches node fill and edge values by name and nothing else", () => {
    const sim = { nodes: { Tank: { value: 4, unit: "ML", frac: 0.4 } }, edges: { feed: { value: 2, unit: "ML/d" } } };
    const scene = sceneFromCanvasModel(model, facts, sim, "capsule");
    expect(scene.entities.find((e) => e.id === 4)!.fill).toBe(0.4);
    expect(scene.entities.find((e) => e.id === 3)!.fill).toBeUndefined();
    expect(scene.flows.find((f) => f.id === 11)!.sim).toEqual({ value: 2, unit: "ML/d" });
    expect(scene.flows.find((f) => f.id === 12)!.sim).toBeUndefined();
  });
});
