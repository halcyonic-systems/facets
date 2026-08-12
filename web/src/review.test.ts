import { describe, expect, it } from "vitest";
import type { CanvasModel, ValidationResult } from "./kernel/types";
import { kernelVerdict } from "./kernel/testVerdict";
import { MODE_BY_LENS, findingsPhrase, plainFirst, reviewCounts, summaryLine } from "./review";

function model(over: Partial<CanvasModel> = {}): CanvasModel {
  return {
    lens: "Mobus",
    things: [],
    relations: [],
    boundary: { porosity: 0, perceptive_fuzziness: 0 },
    ...over,
  };
}

const thing = (id: number): CanvasModel["things"][number] => ({
  id,
  name: `t${id}`,
  x: 0,
  y: 0,
  role: "Component",
});
const rel = (id: number): CanvasModel["relations"][number] => ({
  id,
  a: 1,
  b: 2,
  name: `r${id}`,
  is_bond: true,
  kind: "Unspecified",
});

const result = (...issues: ValidationResult["issues"]): ValidationResult => ({ issues });
const warn = (message: string, code = "observed"): ValidationResult["issues"][number] =>
  kernelVerdict({ severity: "Warning", code, location: "x", message, suggestion: null, doc: null });
const err = (message: string, code = "refused"): ValidationResult["issues"][number] =>
  kernelVerdict({ severity: "Error", code, location: "x", message, suggestion: null, doc: null });

describe("summaryLine", () => {
  it("names the counts, the lens, and the mode", () => {
    const m = model({
      lens: "Mobus",
      things: [1, 2, 3, 4, 5, 6, 7].map(thing),
      relations: [1, 2, 3, 4, 5, 6, 7, 8].map(rel),
    });
    expect(summaryLine(m, result(warn("dead end")))).toBe(
      "Reviewed 7 things and 8 flows under Mobus, Operational mode. 1 warning.",
    );
  });

  it("uses each lens's own edge noun and mode", () => {
    const m = model({ lens: "Bunge", things: [1, 2].map(thing), relations: [rel(1)] });
    expect(summaryLine(m, result())).toBe(
      "Reviewed 2 things and 1 relation under Bunge, Structural mode. No issues found.",
    );
  });

  it("reports both severities when both are present", () => {
    const m = model({ lens: "Klir", things: [thing(1)], relations: [] });
    expect(summaryLine(m, result(err("a"), err("b"), warn("c")))).toBe(
      "Reviewed 1 thing and 0 relations under Klir, Core mode. 2 errors and 1 warning.",
    );
  });

  it("says nothing about findings before an analysis arrives", () => {
    expect(summaryLine(model(), null)).toContain("No issues found");
  });
});

describe("mode gate", () => {
  it("mirrors the kernel's lens→mode map", () => {
    expect(MODE_BY_LENS).toEqual({ Klir: "Core", Bunge: "Structural", Mobus: "Operational" });
  });
});

describe("reviewCounts", () => {
  it("splits errors from warnings", () => {
    const c = reviewCounts(model({ things: [thing(1)] }), result(err("a"), warn("b"), warn("c")));
    expect(c).toEqual({ things: 1, relations: 0, errors: 1, warnings: 2 });
  });
});

describe("findingsPhrase", () => {
  it("agrees number", () => {
    expect(findingsPhrase(0, 0)).toBe("No issues found");
    expect(findingsPhrase(1, 0)).toBe("1 error");
    expect(findingsPhrase(0, 2)).toBe("2 warnings");
    expect(findingsPhrase(2, 1)).toBe("2 errors and 1 warning");
  });
});

describe("plainFirst", () => {
  it("lifts the sentence out from under its citation", () => {
    const { plain, citation } = plainFirst(
      "Bunge Def 1.1: a system requires at least one bond between distinct components; an unbonded collection is an aggregate",
    );
    expect(plain).toBe(
      "A system requires at least one bond between distinct components; an unbonded collection is an aggregate",
    );
    expect(citation).toBe("Bunge Def 1.1");
  });

  it("recognizes a section citation", () => {
    expect(plainFirst("Mobus §4.3: flow edges require k ≠ o; 'f' has the same endpoint").citation).toBe(
      "Mobus §4.3",
    );
  });

  it("leaves an uncited message verbatim", () => {
    const message = "Full mode shows the dynamical face, but no system has a transformation";
    expect(plainFirst(message)).toEqual({ plain: message, citation: null });
  });

  it("does not mistake a colon inside prose for a citation", () => {
    const message = "'pump' is a dead end: nothing leaves it";
    expect(plainFirst(message).citation).toBeNull();
  });
});
