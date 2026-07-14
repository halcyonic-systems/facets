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
  // bert-core's shape; the face only shows `.message`-like text in Phase 0.
  [key: string]: unknown;
}

export interface RunResult {
  dt: number;
  /** per-tick [tick, n0.activity, n0.storage, n0.total, n1...] */
  history: number[][];
  /** per-tick [emitted, sunk, stored, dissipated] */
  ledger_history: [number, number, number, number][];
  /** conservation residual (≈0 = mass conserved) */
  final_balance: number;
}

export interface CsvParse {
  headers: string[];
  rows: string[][];
}
