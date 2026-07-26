// The severity contract at the connection gesture: a Warning is an observation
// the kernel leaves to a human, so it must not refuse a legal edge; only an
// Error refuses, and the reported refusal is the most severe issue rather than
// whichever issue happened to be first.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { Severity, ValidationIssue, ValidationResult } from "../kernel/types";
import { kernelVerdict } from "../kernel/testVerdict";
import { observations, refusal } from "./connectionVerdict";

const issue = (severity: Severity, message: string, location = "interactions[0]"): ValidationIssue =>
  kernelVerdict({ severity, location, message, suggestion: null, doc: null });

const verdict = (...issues: ValidationIssue[]): ValidationResult => ({ issues });

describe("connection verdict — severity is consulted", () => {
  it("a clean verdict refuses nothing", () => {
    expect(refusal(verdict())).toBeNull();
  });

  it("warnings alone do not refuse the edge", () => {
    const v = verdict(
      issue("Warning", "'h' has no outgoing transitions — intended as a terminal/absorbing state?", "systems[1]"),
      issue("Warning", "duplicate edge 0→1 (same type and substance as interactions[0])"),
    );
    expect(refusal(v)).toBeNull();
    expect(observations(v)).toHaveLength(2);
  });

  it("an error refuses the edge", () => {
    const v = verdict(issue("Error", "Mobus §4.3: flow edges require k ≠ o"));
    expect(refusal(v)?.message).toContain("k ≠ o");
  });

  it("reports the error even when a warning arrives first", () => {
    const v = verdict(
      issue("Warning", "duplicate edge 0→1"),
      issue("Error", "Mobus §4.3: flow edges require k ≠ o"),
    );
    // `issues[0]` would report the duplicate and hide the real refusal.
    expect(refusal(v)?.severity).toBe("Error");
    expect(refusal(v)?.message).toContain("k ≠ o");
  });

  it("observations exclude the refusal itself", () => {
    const v = verdict(issue("Error", "boom"), issue("Warning", "noted"));
    expect(observations(v).map((i) => i.message)).toEqual(["noted"]);
  });
});

// A gate, not a style check: the defect this file fixes was three call sites
// each deciding on `issues.length` and reporting `issues[0]`. Every connection
// site must route through the helpers above.
describe("every connection call site reads severity", () => {
  const sites = ["useCanvasGestures.ts", "KlirRegister.tsx", "BungeRegister.tsx"];
  for (const site of sites) {
    it(`${site} does not gate on issue count`, () => {
      const src = readFileSync(fileURLToPath(new URL(`./${site}`, import.meta.url)), "utf8");
      expect(src).toContain("refusal(verdict)");
      expect(src).not.toContain("verdict.issues.length === 0");
      expect(src).not.toContain("verdict.issues[0]");
    });
  }
});
