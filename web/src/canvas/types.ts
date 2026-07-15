// Canvas-local display tables — how a Lens/Kind/Primitive READS on screen. The
// wire shapes themselves (CanvasModel/Thing/Relation/Lens/Kind/ProcessPrimitive)
// live once in ../kernel/types.ts (the wasm boundary contract); this file only
// adds presentation, so nothing is defined twice.
import type { Kind, Lens, ProcessPrimitive } from "../kernel/types";
import { kind } from "../tokens";

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
