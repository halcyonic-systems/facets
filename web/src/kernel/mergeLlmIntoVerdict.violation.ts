// THE SEPARATING INSTANCE (#233 §4). This file does not compile, on purpose.
//
// It is the violation the doctrine forbids, written out in the form it would
// actually arrive in: a co-author turn — LLM output — reshaped into a verdict
// row and concatenated onto the kernel's issue list, so a generated suggestion
// renders in the same list as a Lean-backed refusal under the heading "Every
// line above is a machine-checked verdict from the kernel."
//
// `verdictChannel.test.ts` type-checks this file in isolation and FAILS if it
// compiles. A constraint nothing can violate proves nothing; this is the thing
// that violates it. Excluded from the app's own typecheck by
// `tsconfig.json`'s `exclude` (`src/**/*.violation.ts`), and imported by
// nothing, so it never reaches a build.
import type { CoauthorTurn } from "../coauthor";
import type { ValidationResult } from "./types";

export function mergeLlmIntoVerdict(
  verdict: ValidationResult,
  turn: CoauthorTurn,
): ValidationResult {
  return {
    issues: [
      ...verdict.issues,
      {
        severity: "Warning",
        location: "coauthor",
        message: turn.sl,
        suggestion: turn.description,
        doc: null,
      },
    ],
  };
}
