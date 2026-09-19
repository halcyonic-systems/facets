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
  nodes: Record<string, { value: number; unit: string; frac: number }>;
  edges: Record<string, { value: number; unit: string }>;
}
