// Canvas-local display tables — how a Lens/Kind/Primitive READS on screen. The
// wire shapes themselves (CanvasModel/Thing/Relation/Lens/Kind/ProcessPrimitive)
// live once in ../kernel/types.ts (the wasm boundary contract); this file only
// adds presentation, so nothing is defined twice.
import type { Kind, Lens, ProcessPrimitive } from "../kernel/types";
import { kind } from "../tokens";

/** One line per work process, in the house vocabulary (Mobus ch. 3–4 and the
 *  spec's own words for the engine parameters). The palette panel that used
 *  to carry these retired to the tool rail (#410); the rail's hover card and
 *  the inspector's process row read them from here (#418). Mechanism first,
 *  then the everyday instance. */
export const PRIMITIVE_GLOSS: Record<ProcessPrimitive, string> = {
  Buffering: "holds a stock between inflow and outflow, so what arrives can wait, accumulate, or be drawn down — a tank, an inventory",
  Modulating: "a valve: regulates a flow by a control signal — the decision or regulator process (Mobus Fig 4.17); throttled by backpressure",
  Splitting: "one input becomes several outputs — a fan-out, a sorter",
  Combining: "several inputs become one output — assembly, mixing, a furnace taking ore and coke together",
  Impeding: "resists or delays what passes — a filter, a bottleneck, friction",
  Propelling: "adds the energy that moves a flow — a pump, a conveyor",
  Copying: "reproduces a message or pattern without using it up — information copies freely, matter and energy do not",
  Sensing: "reads a state and emits a signal about it — the measurement, the gauge",
  Amplifying: "a small signal governs a large flow — the signal is present and never the binding constraint (min-selection, Fig 3.19)",
  Inverting: "compares to a setpoint and emits the difference — the comparator, (setpoint − signal), Fig 4.12",
};

/** The plain word for each process — what a modeller calls the thing before
 *  learning Mobus's word for it. Shown beside the Mobus word wherever a
 *  primitive is named (the rail's hover card, the inspector), so "a stock" and
 *  "Buffering" are never two vocabularies the reader has to bridge alone. */
export const PRIMITIVE_WORD: Record<ProcessPrimitive, string> = {
  Buffering: "a stock",
  Modulating: "a valve",
  Splitting: "a divider",
  Combining: "a merge",
  Impeding: "a resistance",
  Propelling: "a pump",
  Copying: "a broadcast",
  Sensing: "a gauge",
  Amplifying: "an amplifier",
  Inverting: "a comparator",
};

export const PRIMITIVE_BADGE: Record<ProcessPrimitive, string> = {
  Buffering: "Bu",
  Modulating: "Mo",
  Splitting: "Sp",
  Combining: "Cm",
  Impeding: "Im",
  Propelling: "Pr",
  Copying: "Cp",
  Sensing: "Se",
  Amplifying: "Am",
  Inverting: "In",
};

// KIND colors are the reserved substance-identity channel: they mean substance
// type, are never decorative, and stay constant across lenses. The values live in
// the token system (--kind-* in index.css, mirrored in tokens.ts `kind`); this is
// just the canvas-facing alias, so no raw hex lives here.
export const KIND_COLOR: Record<Kind, string> = kind;

export const LENS_TO_MODE: Record<Lens, "Core" | "Structural" | "Operational"> = {
  Klir: "Core",
  Bunge: "Structural",
  Mobus: "Operational",
};

/** The per-tick readout the scrubber indexes out of the kernel's RunResultRich
 *  and hands to the canvas — pure array indexing, no dynamics computed here. */
export interface SimFrame {
  /** `lost`: most of what entered the run was lost at this thing (walk row
   *  29), so the canvas outlines it. */
  nodes: Record<string, { value: number; unit: string; frac: number; lost?: boolean; holds?: boolean }>;
  edges: Record<string, { value: number; unit: string }>;
}

/** How full a node draws at one tick: the value's place between zero and the
 *  run's extreme, so an empty stock draws empty and the canvas agrees with the
 *  readouts chart, whose axis starts at zero. It was the series' own min–max,
 *  which drew a level that never moved as exactly half full whatever it held
 *  (2026-11-02 walk: stocks sitting at 0 looked half full and "never reset"). */
export function levelFrac(series: number[], value: number): number {
  const lo = Math.min(0, ...series);
  const hi = Math.max(0, ...series);
  return hi > lo ? (value - lo) / (hi - lo) : 0;
}

/** A run's frames and what each series shows at one (walk, 2026-11-03).
 *
 *  A run of N steps has N + 1 instants, 0 (before anything moves) to N. A
 *  level (a stock, what a sink has received: the kernel's `holds`) is a state
 *  at an instant, so its series has N + 1 values and frame k reads index k.
 *  Anything per step (a flow, a process's throughput, a source's emission, a
 *  metric over flows) is what moved between two instants, so its series has N
 *  values; frame k shows the step that ended at k, index k - 1, and frame 0
 *  shows none. One rule, read by the canvas, the charts and the readouts, so
 *  they cannot disagree about which step a number belongs to. */
export const frameCount = (ticks: number) => ticks + 1;

export function atFrame(series: number[], frame: number, perStep: boolean): number | null {
  if (series.length === 0) return null;
  const i = perStep ? frame - 1 : frame;
  if (i < 0) return null;
  return series[Math.min(i, series.length - 1)] ?? null;
}

/** The frame a series' index i belongs to: i for a level, i + 1 for a step
 *  (the instant it ended at). Charts place each value at its frame. */
export const frameOf = (i: number, perStep: boolean) => (perStep ? i + 1 : i);

/** `atFrame` without holding the last value past the end: a chart row for a
 *  frame the series does not reach is empty, not a repeat. */
export function exactAtFrame(series: number[], frame: number, perStep: boolean): number | null {
  const i = perStep ? frame - 1 : frame;
  return i < 0 ? null : (series[i] ?? null);
}
