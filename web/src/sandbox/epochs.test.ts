// The epoch decoder's laws (#389): rows decode by THEIR epoch's column map,
// never by the live node count; a node keeps its series across a break by
// id; a departed node's series ends; a break is marked where the structure
// changed and named by what changed.

import { describe, expect, it } from "vitest";
import { decode, describeEvent, epochFor, namesById } from "./epochs";
import type { SandboxEpoch, SandboxHistoryDelta, SandboxNode, SandboxSnapshot } from "../kernel/types";

function node(name: string): SandboxNode {
  return {
    kind: "Buffering", name, x: 0, y: 0, param: 1, release_rate: 1, initial_storage: 0, capacity: 0,
    setpoint: 1, time_constant: 0, maintenance: 0, back_pressure: false, substance: "Material",
    substance_base: "Material", activity: 0, storage: 0, total: 0, spark: [], process: null, equation: "",
  };
}

function snap(nodes: SandboxNode[], tick: number): SandboxSnapshot {
  return {
    tick, time: tick, invariant: "conserved", balance: 0, emitted: 0, sunk: 0, dissipated: 0, stored: 0,
    algebraic_cycle: null, nodes, wires: [],
  };
}

// Epoch 0: nodes 1,2 (Source 1, Sink 2). At tick 2 node 3 (Sensing 3) joins.
// At tick 4 node 2 leaves.
const EPOCHS: SandboxEpoch[] = [
  { start_tick: 0, node_ids: [1, 2], wire_ids: [4], events: [{ event: "Start" }] },
  { start_tick: 2, node_ids: [1, 2, 3], wire_ids: [4], events: [{ event: "AddNode", id: 3, kind: "Sensing", name: "Sensing 3" }] },
  { start_tick: 4, node_ids: [1, 3], wire_ids: [], events: [{ event: "RemoveNode", id: 2, name: "Sink 2" }, { event: "AddWire", id: 5, from: 1, to: 3 }] },
];

const row = (tick: number, ...triples: number[]) => [tick, ...triples];
const DELTA: SandboxHistoryDelta = {
  rows: [
    row(1, 1, 0, 1, 0, 0, 0),
    row(2, 1, 0, 2, 0, 0, 0),
    row(3, 1, 0, 3, 0, 0, 0, 9, 0, 9),
    row(4, 1, 0, 4, 0, 0, 0, 9, 0, 9),
    row(5, 1, 0, 5, 9, 0, 9),
    row(6, 1, 0, 6, 9, 0, 9),
  ],
  ledger: [],
  wires: [],
  epochs: EPOCHS,
};
const SNAP = snap([node("Source 1"), node("Sensing 3")], 6);

describe("epochFor", () => {
  it("assigns a row to the last epoch that started before its tick", () => {
    expect(epochFor(EPOCHS, 1)?.start_tick).toBe(0);
    expect(epochFor(EPOCHS, 2)?.start_tick).toBe(0);
    expect(epochFor(EPOCHS, 3)?.start_tick).toBe(2);
    expect(epochFor(EPOCHS, 5)?.start_tick).toBe(4);
  });
});

describe("decode", () => {
  const d = decode(DELTA, "activity", SNAP);

  it("keeps every row, decoded by its own epoch's width", () => {
    expect(d.points).toHaveLength(6);
    expect(d.points[0]).toEqual({ tick: 1, id1: 1, id2: 0 });
    expect(d.points[2]).toEqual({ tick: 3, id1: 1, id2: 0, id3: 9 });
    expect(d.points[5]).toEqual({ tick: 6, id1: 1, id3: 9 });
  });

  it("follows a node across the break by id, and ends a departed node's series", () => {
    expect(d.series.map((s) => s.id)).toEqual([1, 2, 3]);
    expect(d.series.find((s) => s.id === 1)?.live).toBe(true);
    expect(d.series.find((s) => s.id === 2)?.live).toBe(false);
    expect("id2" in d.points[5]).toBe(false);
  });

  it("names series from the live snapshot and from the events", () => {
    expect(d.series.map((s) => s.name)).toEqual(["Source 1", "Sink 2", "Sensing 3"]);
  });

  it("marks each break with what changed", () => {
    expect(d.breaks).toEqual([
      { tick: 2, label: "+ Sensing 3" },
      { tick: 4, label: "− Sink 2 · + bond Source 1 → Sensing 3" },
    ]);
  });

  it("reads the requested column", () => {
    const c = decode(DELTA, "cumulative", SNAP);
    expect(c.points[3]).toEqual({ tick: 4, id1: 4, id2: 0, id3: 9 });
  });

  it("skips a row whose width does not match its epoch rather than mis-decoding it", () => {
    const bad = { ...DELTA, rows: [...DELTA.rows, [7, 1, 2]] };
    expect(decode(bad, "activity", SNAP).points).toHaveLength(6);
  });
});

describe("describeEvent", () => {
  const names = namesById(EPOCHS, SNAP);
  it("names bonds by their endpoints", () => {
    expect(describeEvent({ event: "RemoveWire", id: 4, from: 1, to: 2 }, names)).toBe("− bond Source 1 → Sink 2");
  });
  it("names the unrecorded case honestly", () => {
    expect(describeEvent({ event: "Unrecorded" }, names)).toBe("structure changed (unrecorded)");
  });
});
