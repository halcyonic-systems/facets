// Canvas-local display tables — how a Lens/Kind/Primitive READS on screen. The
// wire shapes themselves (CanvasModel/Thing/Relation/Lens/Kind/ProcessPrimitive)
// live once in ../kernel/types.ts (the wasm boundary contract); this file only
// adds presentation, so nothing is defined twice.
import type { Kind, Lens, ProcessPrimitive } from "../kernel/types";

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

export const KIND_COLOR: Record<Kind, string> = {
  Matter: "#5a7a4f",
  Energy: "#b06a1f",
  Informational: "#8a5a9c",
  Field: "#3f6f8f",
  Unspecified: "var(--text-muted)",
};

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
