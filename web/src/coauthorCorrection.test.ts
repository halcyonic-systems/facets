// #314 — the correction loop, and the one thing it must never do.
//
// The feature: George Mobus reviewed a drafted ribosome line by line on
// 2026-08-12, found three real errors (#313), and had nowhere to put them.
// "If you could tell it that, oh by the way, this is good as far as it goes,
// but you've identified flows as sources and sinks."
//
// THE INVARIANT under test: no generated text reaches a verdict. A correction
// produces SL, the SL is compiled by the same deterministic compiler, and only
// the compiler's own output travels onward. Two shortcuts are foreclosed here:
// a correction applied to the model without recompiling, and a correction
// dismissing a kernel issue. The first is bound by the identity and
// compile-error tests below; the second by `correctionChannel.test.ts` (the
// provenance brand refuses the merge at type-check time) plus the
// findings-are-input-only test at the end of this file.
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildCorrectionBrief,
  correctSlWithRetry,
  kernelFindingsBrief,
  runCorrectionTurn,
  slChangeSummary,
} from "./coauthor";
import type { CanvasModel, VerdictFields } from "./kernel/types";

const authorSlMock = vi.hoisted(() => vi.fn());
const compileSlMock = vi.hoisted(() => vi.fn());
vi.mock("./gsr", () => ({ authorSl: authorSlMock }));
vi.mock("./kernel", () => ({ compileSl: compileSlMock }));

const TARGET = {
  id: "t1",
  description: "a ribosome translating mRNA into a polypeptide",
  sl: 'system Ribosome\nsink "Polypeptide"\nsource "GTP"',
};

const REVISED = 'system Ribosome\nflow "Peptidyl transferase center" -> "Cytosolic chaperones" : matter "polypeptide"';

/** A distinct object so identity, not shape, is what the tests assert on. */
function freshModel(): CanvasModel {
  return { lens: "Mobus", things: [], relations: [], boundary: { porosity: 0, perceptive_fuzziness: 0 } };
}

beforeEach(() => {
  authorSlMock.mockReset();
  compileSlMock.mockReset();
});

describe("buildCorrectionBrief", () => {
  it("carries the author's correction through verbatim", () => {
    const brief = buildCorrectionBrief(
      "a ribosome",
      "this is good as far as it goes, but you've identified flows as sources and sinks",
    );
    expect(brief).toContain("you've identified flows as sources and sinks");
  });

  it("keeps the original description, so a correction amends the ask instead of replacing it", () => {
    const brief = buildCorrectionBrief("a ribosome translating mRNA", "GTP is an input, not a source");
    expect(brief).toContain("a ribosome translating mRNA");
    expect(brief).toContain("GTP is an input, not a source");
  });

  it("still reads as an instruction when the original description is empty", () => {
    const brief = buildCorrectionBrief("", "the polypeptide is a product, not a sink");
    expect(brief).toContain("the polypeptide is a product, not a sink");
    expect(brief).not.toContain("first described like this");
  });
});

describe("kernelFindingsBrief", () => {
  const issues: VerdictFields[] = [
    { severity: "Error", location: "Furnace", message: "Mobus §4.3: a component with no outgoing flow is a dead end", suggestion: null, doc: null },
    { severity: "Warning", location: "Sensor", message: "no boundary-crossing flow", suggestion: null, doc: null },
  ];

  it("names the lens and the mode the verdict was reached at", () => {
    expect(kernelFindingsBrief("Mobus", issues)).toContain("under Mobus, Operational mode");
    expect(kernelFindingsBrief("Bunge", issues)).toContain("under Bunge, Structural mode");
  });

  it("renders each issue as the kernel wrote it, without editing the message", () => {
    const brief = kernelFindingsBrief("Mobus", issues);
    expect(brief).toContain("Mobus §4.3: a component with no outgoing flow is a dead end");
    expect(brief).toContain("- Warning at Sensor: no boundary-crossing flow");
  });

  it("says so plainly when the kernel found nothing", () => {
    expect(kernelFindingsBrief("Klir", [])).toContain("No issues found");
  });
});

describe("correctSlWithRetry — the same seam a first draft rides", () => {
  it("sends the prior SL and the kernel's findings on the FIRST ask, not only on a heal", async () => {
    authorSlMock.mockResolvedValueOnce({ sl: REVISED, model: "gemma4:12b" });
    compileSlMock.mockReturnValueOnce({ ok: freshModel(), lens_explicit: false });
    await correctSlWithRetry({
      description: TARGET.description,
      correction: "GTP is an input, not a source",
      priorSl: TARGET.sl,
      findings: "The kernel reads this model under Mobus, Operational mode. No issues found.",
      lens: "Mobus",
    });
    expect(authorSlMock).toHaveBeenCalledTimes(1);
    expect(authorSlMock.mock.calls[0][0]).toMatchObject({
      priorSl: TARGET.sl,
      errors: "The kernel reads this model under Mobus, Operational mode. No issues found.",
      lens: "Mobus",
    });
    expect(authorSlMock.mock.calls[0][0].description).toContain("GTP is an input, not a source");
  });

  it("still heals a correction whose revision does not compile, and reports the model that answered last", async () => {
    authorSlMock
      .mockResolvedValueOnce({ sl: "broken", model: "gemma4:12b" })
      .mockResolvedValueOnce({ sl: REVISED, model: "gemma4:12b" });
    compileSlMock
      .mockReturnValueOnce({ errors: [{ line: 2, message: "unknown keyword" }] })
      .mockReturnValueOnce({ ok: freshModel(), lens_explicit: false });
    const out = await correctSlWithRetry({
      description: TARGET.description,
      correction: "flows, not sinks",
      priorSl: TARGET.sl,
    });
    expect(authorSlMock).toHaveBeenCalledTimes(2);
    // The heal's own ask replaces the seed with the compiler's faults — both
    // are kernel-sourced, so nothing a human typed is ever presented as a
    // kernel complaint.
    expect(authorSlMock.mock.calls[1][0].errors).toContain("line 2: unknown keyword");
    expect(out).toMatchObject({ sl: REVISED, answeredModel: "gemma4:12b", modelCalls: 2 });
  });
});

describe("runCorrectionTurn — the compiler is the only door", () => {
  // THE ONE THAT MATTERS. If a correction's text ever reached the canvas
  // without passing the compiler, this is what would notice.
  it("never yields a model when the revision fails to compile", async () => {
    // The heal loop gets its full three asks and still cannot produce SL that
    // parses; the gate below is what stops the last one anyway.
    authorSlMock.mockResolvedValue({ sl: "not sl at all", model: "gemma4:12b" });
    compileSlMock.mockReturnValue({ errors: [{ line: 1, message: "unknown keyword" }] });
    const outcome = await runCorrectionTurn({
      id: "c1",
      target: TARGET,
      correction: "the polypeptide is a product, not a sink",
    });
    expect(outcome.kind).toBe("compile-error");
    expect(outcome).not.toHaveProperty("model");
    expect(outcome.turn.status).toBe("compile-error");
    // The correction is still on the record, and the faulty text is still
    // returned, so the author can hand-fix a near miss.
    expect(outcome.turn.correction).toBe("the polypeptide is a product, not a sink");
  });

  it("hands on the compiler's own output object, by identity, never a reshaping of the text", async () => {
    const compiled = freshModel();
    authorSlMock.mockResolvedValueOnce({ sl: REVISED, model: "gemma4:12b" });
    // Two calls: the heal loop's own check, then this function's gate. Same
    // object both times, so identity below is a claim about the gate.
    compileSlMock.mockReturnValue({ ok: compiled, lens_explicit: true });
    const outcome = await runCorrectionTurn({ id: "c1", target: TARGET, correction: "flows, not sinks" });
    expect(outcome.kind).toBe("compiled");
    if (outcome.kind !== "compiled") return;
    expect(outcome.model).toBe(compiled); // identity, not shape
    expect(outcome.lensExplicit).toBe(true);
    expect(compileSlMock).toHaveBeenCalledWith(REVISED);
  });

  it("compiles the drafter's SL and nothing else — the correction text is never compiled", async () => {
    authorSlMock.mockResolvedValueOnce({ sl: REVISED, model: "gemma4:12b" });
    compileSlMock.mockReturnValue({ ok: freshModel(), lens_explicit: false });
    await runCorrectionTurn({ id: "c1", target: TARGET, correction: "GTP is an input, not a source" });
    // Called at all — a turn that reached the canvas without asking the
    // compiler anything would otherwise satisfy the loop below for free.
    expect(compileSlMock).toHaveBeenCalledWith(REVISED);
    for (const call of compileSlMock.mock.calls) {
      expect(call[0]).not.toContain("GTP is an input, not a source");
    }
  });

  it("records a correction turn as a correction, linked to what it corrected", async () => {
    authorSlMock.mockResolvedValueOnce({ sl: REVISED, model: "gemma4:12b", latencyMs: 8000 });
    compileSlMock.mockReturnValue({ ok: freshModel(), lens_explicit: false });
    const outcome = await runCorrectionTurn({
      id: "c1",
      target: TARGET,
      correction: "flows, not sinks",
      findings: "The kernel reads this model under Mobus, Operational mode. 1 error.",
      requestedModel: "claude-sonnet-4-6",
      now: () => "2026-08-12T12:00:00.000Z",
    });
    expect(outcome.turn).toMatchObject({
      kind: "correction",
      correctsTurnId: "t1",
      description: TARGET.description,
      correction: "flows, not sinks",
      slBefore: TARGET.sl,
      sl: REVISED,
      status: "previewing",
      model: "gemma4:12b",
      requestedModel: "claude-sonnet-4-6",
      modelMs: 8000,
      modelCalls: 1,
      at: "2026-08-12T12:00:00.000Z",
      priorFindings: "The kernel reads this model under Mobus, Operational mode. 1 error.",
    });
  });

  it("records an unreachable drafter as a turn rather than losing the correction", async () => {
    authorSlMock.mockRejectedValueOnce(new Error("Could not reach the reasoner"));
    const outcome = await runCorrectionTurn({ id: "c1", target: TARGET, correction: "flows, not sinks" });
    expect(outcome.kind).toBe("network-error");
    expect(outcome.turn).toMatchObject({ kind: "correction", status: "network-error", correction: "flows, not sinks" });
    expect(compileSlMock).not.toHaveBeenCalled();
  });

  // Forbidden shortcut 2, at runtime: a correction is not allowed to make the
  // kernel quieter. The findings go IN as a string and never come back out;
  // the turn carries a copy for the transcript and nothing else.
  it("treats the kernel's findings as an input only — nothing about them is changed or returned as a verdict", async () => {
    const findings = "The kernel reads this model under Mobus, Operational mode. 1 error.\n- Error at Ribosome: dead end";
    authorSlMock.mockResolvedValueOnce({ sl: REVISED, model: "gemma4:12b" });
    compileSlMock.mockReturnValue({ ok: freshModel(), lens_explicit: false });
    const outcome = await runCorrectionTurn({
      id: "c1",
      target: TARGET,
      correction: "no, the dead end is fine actually",
      findings,
    });
    expect(outcome.kind).toBe("compiled");
    if (outcome.kind !== "compiled") return;
    // The findings are unchanged, and the outcome carries no issue list of any
    // kind — the canvas re-judges the revised model from scratch.
    expect(outcome.turn.priorFindings).toBe(findings);
    expect(outcome).not.toHaveProperty("issues");
    expect(outcome).not.toHaveProperty("validation");
    expect(outcome.model).not.toHaveProperty("issues");
  });
});

describe("slChangeSummary — what moved, said honestly", () => {
  it("counts added and removed lines", () => {
    expect(slChangeSummary("a\nb\nc", "a\nb\nd\ne")).toBe("2 lines added, 1 line removed.");
  });

  it("calls a pure reordering no change, because it is not one", () => {
    expect(slChangeSummary("a\nb\nc", "c\nb\na")).toBe("No lines changed.");
  });

  it("ignores blank lines and indentation", () => {
    expect(slChangeSummary("a\n\n  b\n", "a\nb")).toBe("No lines changed.");
  });

  it("reports the first draft of a correction on an empty prior as all added", () => {
    expect(slChangeSummary("", "a\nb")).toBe("2 lines added.");
  });
});
