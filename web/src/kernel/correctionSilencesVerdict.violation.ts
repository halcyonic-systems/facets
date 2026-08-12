// THE SEPARATING INSTANCE for #314. This file does not compile, on purpose.
//
// The correction loop's second forbidden shortcut, written out in the form it
// would actually arrive in: the author says "no, that one is fine actually",
// and the correction is answered by rewriting the kernel's own issue list —
// dropping the issue the correction waved off and leaving a row, sourced from
// the human's sentence, in its place.
//
// That is human text overriding a verdict. It is refused here by the same
// provenance brand that refuses a co-author draft (`types.ts`,
// `KERNEL_VERDICT`): the replacement row is an object literal, so it carries
// no brand, so it cannot enter a `ValidationResult`.
//
// `correctionChannel.test.ts` type-checks this file in isolation and FAILS if
// it compiles. Excluded from the app's typecheck by `tsconfig.json`'s
// `exclude` (`src/**/*.violation.ts`), and imported by nothing.
import type { CoauthorTurn } from "../coauthor";
import type { ValidationResult } from "./types";

export function correctionSilencesVerdict(
  verdict: ValidationResult,
  correction: CoauthorTurn,
): ValidationResult {
  return {
    issues: [
      ...verdict.issues.filter((i) => !correction.correction?.includes(i.location)),
      {
        severity: "Warning",
        location: "coauthor",
        message: `The author corrected this: ${correction.correction}`,
        suggestion: correction.sl,
        doc: null,
      },
    ],
  };
}
