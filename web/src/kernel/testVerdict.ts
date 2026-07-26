// TEST SUPPORT ONLY (#233 §4). The single mint for a `ValidationIssue` outside
// the wasm boundary, so tests can build fixture verdicts without the brand
// leaking a public forge into the face.
//
// `verdictChannel.test.ts` is what keeps this honest: it fails if any module
// that is not a test imports this file, and it fails if any module outside
// `kernel/` asserts the brand on with a cast. Without that gate this file WOULD
// be the hole — a named forge is still a forge.
import type { ValidationIssue, VerdictFields } from "./types";

export function kernelVerdict(fields: VerdictFields): ValidationIssue {
  return fields as ValidationIssue;
}
