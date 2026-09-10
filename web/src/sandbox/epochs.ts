// Decoding a recorded run by epoch (#389). The engine's history rows are
// positional per epoch; a node's identity across a structural change is its
// stable id, which each epoch's column map carries. These helpers turn a
// `history_since` delta into chart series keyed by node id, plus the break
// markers where the structure changed. Pure, so the chart can be tested
// without recharts or wasm.

import type { SandboxEpoch, SandboxEpochEvent, SandboxHistoryDelta, SandboxSnapshot } from "../kernel/types";

/** Which per-node column of a row to read. */
export type Column = "activity" | "storage" | "cumulative";

const OFFSET: Record<Column, number> = { activity: 1, storage: 2, cumulative: 3 };

export interface Series {
  id: number;
  name: string;
  /** Whether the node is in the current structure (false = departed). */
  live: boolean;
}

export interface Break {
  tick: number;
  label: string;
}

export interface Decoded {
  /** One point per row: `{ tick, [`id${n}`]: value }` for the nodes of that row's epoch. */
  points: Array<Record<string, number>>;
  /** Every node id any returned row carries, in first-seen order. */
  series: Series[];
  /** One marker per epoch boundary inside the returned rows. */
  breaks: Break[];
}

/** The epoch a row with `tick` belongs to: the last with `start_tick < tick`. */
export function epochFor(epochs: SandboxEpoch[], tick: number): SandboxEpoch | undefined {
  let found: SandboxEpoch | undefined;
  for (const e of epochs) {
    if (e.start_tick < tick) found = e;
    else break;
  }
  return found;
}

/** Node names by id: the live structure from the snapshot (index ↔ the
 *  current epoch's map), departed nodes from the events that named them. */
export function namesById(epochs: SandboxEpoch[], snapshot: SandboxSnapshot): Map<number, string> {
  const names = new Map<number, string>();
  for (const e of epochs) {
    for (const ev of e.events) {
      if (ev.event === "AddNode" || ev.event === "RemoveNode") names.set(ev.id, ev.name);
    }
  }
  const current = epochs[epochs.length - 1];
  if (current && current.node_ids.length === snapshot.nodes.length) {
    current.node_ids.forEach((id, i) => names.set(id, snapshot.nodes[i].name));
  }
  return names;
}

/** A short label for a structural event, for the break marker and the log. */
export function describeEvent(ev: SandboxEpochEvent, names: Map<number, string>): string {
  const nm = (id: number) => names.get(id) ?? `#${id}`;
  switch (ev.event) {
    case "Start":
      return "start";
    case "AddNode":
      return `+ ${ev.name}`;
    case "RemoveNode":
      return `− ${ev.name}`;
    case "AddWire":
      return `+ bond ${nm(ev.from)} → ${nm(ev.to)}`;
    case "RemoveWire":
      return `− bond ${nm(ev.from)} → ${nm(ev.to)}`;
    case "Stamp":
      return `stamp ${ev.name || "process"} (${ev.node_ids.length})`;
    case "Unrecorded":
      return "structure changed (unrecorded)";
  }
}

/** All of an epoch's events on one line. */
export function describeEpoch(e: SandboxEpoch, names: Map<number, string>): string {
  return e.events.map((ev) => describeEvent(ev, names)).join(" · ");
}

/** Decode the delta's rows into id-keyed points. Rows whose epoch is not in
 *  the delta (should not happen: the engine returns every epoch its rows
 *  need) are skipped rather than mis-decoded. */
export function decode(delta: SandboxHistoryDelta, column: Column, snapshot: SandboxSnapshot): Decoded {
  const names = namesById(delta.epochs, snapshot);
  const liveIds = new Set(delta.epochs[delta.epochs.length - 1]?.node_ids ?? []);
  const seen = new Map<number, Series>();
  const points: Array<Record<string, number>> = [];
  const breaks: Break[] = [];
  const offset = OFFSET[column];
  let last: SandboxEpoch | undefined;
  for (const row of delta.rows) {
    const tick = row[0];
    const epoch = epochFor(delta.epochs, tick);
    if (!epoch || row.length !== 1 + epoch.node_ids.length * 3) continue;
    if (last && epoch !== last) {
      breaks.push({ tick: epoch.start_tick, label: describeEpoch(epoch, names) });
    } else if (!last && tick === epoch.start_tick + 1 && epoch.events[0]?.event !== "Start") {
      // The window opens exactly on a break: still mark it.
      breaks.push({ tick: epoch.start_tick, label: describeEpoch(epoch, names) });
    }
    last = epoch;
    const point: Record<string, number> = { tick };
    epoch.node_ids.forEach((id, i) => {
      point[`id${id}`] = row[1 + i * 3 + (offset - 1)];
      if (!seen.has(id)) seen.set(id, { id, name: names.get(id) ?? `#${id}`, live: liveIds.has(id) });
    });
    points.push(point);
  }
  return { points, series: [...seen.values()], breaks };
}
