// Hand-written TS mirrors of the frozen kernel boundary (crates/bert-lenses-kernel/API.md).
// The wasm functions return `any`; these types are the contract the face reads
// against. THE INVARIANT: these describe shapes the Rust kernel computes — the
// face never derives a verdict, it only renders these.

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

/** validate_operational: either the executable spec, or the reasons it refused. */
export type OperationalOutcome =
  | { ok: unknown } // OperationalSpec (opaque to the face in Phase 0)
  | { errors: OperationalError[] };

export interface OperationalError {
  [key: string]: unknown;
}

/** Phase-0 authored-run result (no forcing). */
export interface RunResult {
  dt: number;
  history: number[][];
  ledger_history: [number, number, number, number][];
  final_balance: number;
}

export interface CsvParse {
  headers: string[];
  rows: string[][];
}

// ---- Phase 1: the tether wizard + forced run --------------------------------

export interface FlowTarget {
  id: number;
  name: string;
  unit: string;
}
export interface ComponentTarget {
  id: number;
  name: string;
}
export interface Targets {
  flows: FlowTarget[];
  components: ComponentTarget[];
}

/** The CSV column roles the wizard assigns. */
export type Role = "time" | "flow" | "stock" | "param" | "ignore";

/** One column's mapping — the manifest's ColumnMapping shape. */
export interface ColumnMapping {
  column: string;
  as: Role;
  element?: string;
  unit?: string;
  force?: boolean;
  every?: number;
}

/** The manifest-shaped object the wizard holds and hands to the kernel. */
export interface Manifest {
  model: string;
  data: string;
  t: number;
  dt?: number;
  mapping: ColumnMapping[];
}

export interface MappingStatus {
  t1_ok: boolean;
  t2_ok: boolean;
  t2_msg: string | null;
  t4_ok: boolean;
  t4_msg: string | null;
  can_finish: boolean;
  translations: string[];
  inferred_dt: number | null;
  apply_error: string | null;
}

export interface Comparison {
  element: string;
  kind: "stock" | "flow";
  unit: string;
  simulated: number[];
  actual: number[];
  declared: number[] | null;
  divergence_pct: number | null;
}
export interface Level {
  name: string;
  unit: string;
  value: number;
  category: "product" | "resource" | "internal";
}
export interface Trajectory {
  name: string;
  unit: string;
  series: number[];
}
export interface RunResultRich {
  ticks: number;
  dt: number;
  residual: number;
  conserved: boolean;
  levels: Level[];
  comparisons: Comparison[];
  trajectories: Trajectory[];
}

// ---- Phase 2: the canvas editing model --------------------------------------
// Mirrors crates/bert-lenses-kernel/src/canvas.rs — the JSON shape that crosses
// the wasm boundary via `project` / `to_canvas` / `validate_connection`.

export type Lens = "Klir" | "Bunge" | "Mobus";
export type CanvasRole = "Component" | "Environment";
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
  role: CanvasRole;
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
