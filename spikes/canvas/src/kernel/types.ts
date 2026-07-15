// Hand-written TS mirrors of the frozen kernel boundary's Phase-2 canvas seam
// (crates/bert-lenses-kernel/API.md). THE INVARIANT: these describe shapes the
// Rust kernel computes or consumes — the face never derives a verdict, it only
// builds candidates and renders what comes back.

export type Lens = "Klir" | "Bunge" | "Mobus";
export type Role = "Component" | "Environment";
export type Kind = "Unspecified" | "Energy" | "Matter" | "Field" | "Informational";

export interface Thing {
  id: number;
  name: string;
  x: number;
  y: number;
  role?: Role;
  primitive?: string;
}

export interface Relation {
  id: number;
  a: number;
  b: number;
  name?: string;
  is_bond?: boolean;
  kind?: Kind;
}

export interface CanvasModel {
  lens: Lens;
  things: Thing[];
  relations: Relation[];
}

export type Severity = "Error" | "Warning";

export interface ValidationIssue {
  severity: Severity;
  location: string;
  message: string;
  suggestion: string | null;
}

export interface ValidationResult {
  issues: ValidationIssue[];
}

/** Lens → validate_mode's mode string. */
export const LENS_MODE: Record<Lens, "Core" | "Structural" | "Operational"> = {
  Klir: "Core",
  Bunge: "Structural",
  Mobus: "Operational",
};

export const PRIMITIVE_BADGE: Record<string, string> = {
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
