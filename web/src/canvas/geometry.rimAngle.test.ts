// Arrowheads landing on one point. A rim contact is computed from the two node
// centres alone, so parallel siblings share both centres and contact the rim at
// exactly the same place — PARALLEL_BOW bows the middles apart and then returns
// every head to the identical pixel.
//
// The rule that survived measurement is "resolve the ties", NOT "fan the edges".
// An unconditional per-edge fan fixed the sibling case and REGRESSED
// llm-market.sl, whose heads were already distinct: rotating edges that had room
// pushed some into each other. These tests pin both halves of that lesson.
import { describe, expect, it } from "vitest";
import { rimAngleFor, MIN_RIM_GAP } from "./geometry";
import type { CanvasModel, Relation, Thing } from "../kernel/types";

const rel = (id: number, a: number, b: number, over: Partial<Relation> = {}): Relation =>
  ({ id, a, b, name: `f${id}`, kind: "Matter", is_bond: true, ...over }) as Relation;

const thing = (id: number, x: number, y: number): Thing =>
  ({ id, x, y, name: `t${id}`, role: "Component" }) as Thing;

const model = (things: Thing[], relations: Relation[]): CanvasModel =>
  ({ things, relations, lens: "Mobus" }) as unknown as CanvasModel;

/** Hub at the origin; neighbours placed on a circle at the given bearings. */
const hub = (bearings: number[]) => {
  const things = [thing(99, 0, 0), ...bearings.map((b, k) =>
    thing(k + 1, Math.cos(b) * 300, Math.sin(b) * 300))];
  const rels = bearings.map((_, k) => rel(k + 1, 99, k + 1));
  return model(things, rels);
};

describe("rimAngleFor", () => {
  it("returns null for a node the relation does not touch", () => {
    const m = hub([0]);
    expect(rimAngleFor(m, m.relations[0], 12345)).toBeNull();
  });

  it("leaves a lone edge on its true bearing", () => {
    const m = hub([0.7]);
    expect(rimAngleFor(m, m.relations[0], 99)).toBeCloseTo(0.7);
  });

  it("leaves well-separated edges completely alone — the llm-market regression", () => {
    // The unconditional fan moved these and collided some of them. Every bearing
    // here has room, so every one must come back untouched.
    const bearings = [-2.4, -1.2, 0, 1.1, 2.3];
    const m = hub(bearings);
    const got = m.relations.map((r) => rimAngleFor(m, r, 99)!).sort((a, b) => a - b);
    got.forEach((g, k) => expect(g).toBeCloseTo([...bearings].sort((a, b) => a - b)[k]));
  });

  it("separates parallel siblings, which share a bearing exactly", () => {
    // The dominant real case: 4 flows between one pair, all landing on one pixel.
    const m = model(
      [thing(99, 0, 0), thing(1, 300, 0)],
      [rel(1, 99, 1), rel(2, 99, 1), rel(3, 99, 1), rel(4, 99, 1)],
    );
    const got = m.relations.map((r) => rimAngleFor(m, r, 99)!);
    expect(new Set(got.map((g) => g.toFixed(6))).size).toBe(4);
    expect(got.map((g) => Math.round(g * 1e6) / 1e6)).toEqual(
      [-1.5, -0.5, 0.5, 1.5].map((s) => Math.round(s * MIN_RIM_GAP * 1e6) / 1e6),
    );
  });

  it("keeps a spread run centred on where it started", () => {
    // Siblings must straddle their true bearing, not drift off to one side.
    const m = model(
      [thing(99, 0, 0), thing(1, 0, 300)],
      [rel(1, 99, 1), rel(2, 99, 1), rel(3, 99, 1)],
    );
    const got = m.relations.map((r) => rimAngleFor(m, r, 99)!);
    expect(got.reduce((a, b) => a + b, 0) / got.length).toBeCloseTo(Math.PI / 2);
  });

  it("spreads a crowded run while leaving a distant neighbour untouched", () => {
    const m = hub([0, 0.05, 2.5]);
    const got = m.relations.map((r) => rimAngleFor(m, r, 99)!);
    expect(got[2]).toBeCloseTo(2.5); // had room, unmoved
    expect(Math.abs(got[0] - got[1])).toBeCloseTo(MIN_RIM_GAP);
  });

  it("gives every edge at least MIN_RIM_GAP once a run is resolved", () => {
    const m = hub([0, 0.02, 0.04, 0.06, 0.08]);
    const got = m.relations.map((r) => rimAngleFor(m, r, 99)!).sort((a, b) => a - b);
    for (let k = 1; k < got.length; k++) {
      expect(got[k] - got[k - 1]).toBeGreaterThanOrEqual(MIN_RIM_GAP - 1e-9);
    }
  });

  it("gives no slot to a self-loop, which takes no rim point", () => {
    // A self-loop draws its own bowed path, so a slot would open a gap in the
    // run where no line ever arrives.
    const m = model(
      [thing(99, 0, 0), thing(1, 300, 0)],
      [rel(1, 99, 1), rel(2, 99, 99)],
    );
    expect(rimAngleFor(m, m.relations[0], 99)).toBeCloseTo(0);
  });

  it("is stable across renders — ties break by id, not array order", () => {
    const things = [thing(99, 0, 0), thing(1, 300, 0)];
    const forward = model(things, [rel(1, 99, 1), rel(2, 99, 1)]);
    const reversed = model(things, [rel(2, 99, 1), rel(1, 99, 1)]);
    const byId = (m: CanvasModel, id: number) =>
      rimAngleFor(m, m.relations.find((r) => r.id === id)!, 99);
    expect(byId(forward, 1)).toBe(byId(reversed, 1));
    expect(byId(forward, 2)).toBe(byId(reversed, 2));
  });
});
