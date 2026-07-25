// How the canvas reads a `validate_connection` verdict. The kernel RATES every
// issue (`Severity::Error` | `Severity::Warning`) and the face must honour the
// rating: only an Error refuses the gesture. A Warning is the kernel naming
// something and leaving intent to a human — `check_dead_ends` says so in as
// many words — so the edge lands and the observation goes to the soft channel.
// No verdict is derived here; this only reads the severity the kernel wrote.
import type { ValidationIssue, ValidationResult } from "../kernel/types";

/** The issue that refuses the connection, or null when none does. Errors
 *  outrank Warnings, so this is the MOST SEVERE issue — never `issues[0]`,
 *  which a Warning arriving first would otherwise mask. */
export function refusal(verdict: ValidationResult): ValidationIssue | null {
  return verdict.issues.find((i) => i.severity === "Error") ?? null;
}

/** The non-blocking remainder: observations to surface alongside a legal edge. */
export function observations(verdict: ValidationResult): ValidationIssue[] {
  return verdict.issues.filter((i) => i.severity !== "Error");
}
