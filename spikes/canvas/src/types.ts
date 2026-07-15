// TS mirror of the canvas editing model. Kept structurally identical to
// crates/bert-lenses-kernel/src/canvas.rs — this shape is what gets
// JSON.stringify'd across the wasm boundary. No systems meaning lives here,
// only the wire shape.

export type Lens = "Klir" | "Bunge" | "Mobus";
export type Role = "Component" | "Environment";
export type Kind = "Unspecified" | "Energy" | "Matter" | "Field" | "Informational";

export type ProcessPrimitive =
  | "Combining"
  | "Splitting"
  | "Buffering"
  | "Impeding"
  | "Propelling"
  | "Copying"
  | "Sensing"
  | "Modulating"
  | "Amplifying"
  | "Inverting";

export interface Thing {
  id: number;
  name: string;
  x: number;
  y: number;
  role: Role;
  primitive?: ProcessPrimitive;
}

export interface Relation {
  id: number;
  a: number;
  b: number;
  name: string;
  is_bond: boolean;
  kind: Kind;
}

export interface CanvasModel {
  lens: Lens;
  things: Thing[];
  relations: Relation[];
}

export interface ValidationIssue {
  severity: "Error" | "Warning";
  location: string;
  message: string;
  suggestion: string | null;
}

export interface ValidationResult {
  issues: ValidationIssue[];
}

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
