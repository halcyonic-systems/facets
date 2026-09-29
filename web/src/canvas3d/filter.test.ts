import { describe, expect, it } from "vitest";
import { NO_FILTER, filterActive, litUnder } from "./filter";
import type { Scene3D } from "./scene";
import { v3 } from "./vec3";

// River → Intake(interface) → Pump → Tank → Town, plus Weather (neutral, orphan)
// and a heat flow Pump → Tank beside the material one.
const entity = (id: number, name: string, kind: Scene3D["entities"][number]["kind"]) => ({
  id, name, kind, base: v3(), radius: 0.3, orphan: false, hasChild: false,
});
const flow = (id: number, a: number, b: number, kind: Scene3D["flows"][number]["kind"], name = `f${id}`) => ({
  id, a, b, kind, name, path: [], lane: 0, selfLoop: a === b, bond: true, ample: false,
});
const scene: Scene3D = {
  shell: "capsule",
  shape: { halfLength: 1, radius: 1, e: 0.5 },
  rootName: "Pumphouse",
  entities: [
    entity(1, "River", "source"),
    entity(2, "Intake", "interface"),
    entity(3, "Pump", "component"),
    entity(4, "Tank", "component"),
    entity(5, "Town", "sink"),
    entity(6, "Weather", "neutral"),
  ],
  ports: [
    { key: "2:1", component: 2, env: 1, at: v3(), normal: v3(0, 1, 0), direction: "Receives", protocol: "raw water", relationIds: [10] },
    { key: "4:5", component: 4, env: 5, at: v3(), normal: v3(0, 1, 0), direction: "Exports", protocol: "supply", relationIds: [13] },
  ],
  flows: [flow(10, 1, 2, "Matter"), flow(11, 2, 3, "Matter"), flow(12, 3, 4, "Matter"), flow(13, 4, 5, "Matter"), flow(14, 3, 4, "Energy")],
};

const ids = (s: Set<number>) => [...s].sort((a, b) => a - b);

describe("the view filter", () => {
  it("lights everything with nothing active", () => {
    expect(filterActive(NO_FILTER)).toBe(false);
    const lit = litUnder(scene, NO_FILTER);
    expect(ids(lit.entities)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(ids(lit.flows)).toEqual([10, 11, 12, 13, 14]);
  });

  it("selection keeps the body, its neighbours and their flows", () => {
    const lit = litUnder(scene, { ...NO_FILTER, selected: 3 });
    expect(ids(lit.entities)).toEqual([2, 3, 4]);
    expect(ids(lit.flows)).toEqual([11, 12, 14]);
  });

  it("a kind filter keeps only flows of that kind and the bodies they touch", () => {
    const lit = litUnder(scene, { ...NO_FILTER, kinds: new Set(["Energy"]) });
    expect(ids(lit.flows)).toEqual([14]);
    expect(ids(lit.entities)).toEqual([3, 4]);
  });

  it("an environment filter keeps what touches that environment thing", () => {
    const lit = litUnder(scene, { ...NO_FILTER, envIds: new Set([5]) });
    expect(ids(lit.flows)).toEqual([13]);
    expect(ids(lit.entities)).toEqual([4, 5]);
  });

  it("a port filter keeps the crossings through that port", () => {
    const lit = litUnder(scene, { ...NO_FILTER, portKeys: new Set(["2:1"]) });
    expect(ids(lit.flows)).toEqual([10]);
    expect(ids(lit.entities)).toEqual([1, 2]);
  });

  it("filters compose by intersection, and selection always keeps itself", () => {
    const lit = litUnder(scene, { selected: 4, kinds: new Set(["Matter"]), envIds: null, portKeys: null });
    expect(ids(lit.flows)).toEqual([12, 13]);
    expect(ids(lit.entities)).toEqual([3, 4, 5]);
    const alone = litUnder(scene, { selected: 6, kinds: new Set(["Energy"]), envIds: null, portKeys: null });
    expect(ids(alone.flows)).toEqual([]);
    expect(ids(alone.entities)).toEqual([6]);
  });
});
