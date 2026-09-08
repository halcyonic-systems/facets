// #10: the co-author's persistence — history survives a reload (localStorage,
// no cap). vitest's node environment has no browser localStorage, so this
// stubs the same in-memory Storage contract; the real thing is confirmed live
// in a browser (see the PR's manual verification note).
import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadCoauthorTurns, saveCoauthorTurns, draftSlWithRetry, type DraftStage } from "./coauthor";
import type { CoauthorTurn } from "./coauthor";

// #218: draftSlWithRetry's stage callback — the loop already knows which
// attempt it is on; these tests pin the exact sequence a caller sees, since
// that sequence IS the fix (a static "Drafting…" becomes three legible steps).
const authorSlMock = vi.hoisted(() => vi.fn());
const compileSlMock = vi.hoisted(() => vi.fn());
// #377 M1: the loop asks the kernel after a clean compile. Default: no
// findings, so every pre-M1 test reads exactly as it did.
const validateModeMock = vi.hoisted(() => vi.fn((..._args: unknown[]) => ({ issues: [] as unknown[] })));
vi.mock("./gsr", () => ({ authorSl: authorSlMock }));
vi.mock("./kernel", () => ({ compileSl: compileSlMock, validateMode: validateModeMock }));

class MemoryStorage {
  private store = new Map<string, string>();
  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }
  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  clear(): void {
    this.store.clear();
  }
}

beforeEach(() => {
  (globalThis as unknown as { localStorage: MemoryStorage }).localStorage = new MemoryStorage();
});

describe("coauthor turn persistence", () => {
  it("loads an empty history when nothing is stored yet", () => {
    expect(loadCoauthorTurns()).toEqual([]);
  });

  it("round-trips a saved history through localStorage", () => {
    const turns: CoauthorTurn[] = [
      { id: "1", description: "a thermostat", sl: "system Thermostat", at: "2026-07-24T00:00:00.000Z", status: "accepted" },
      { id: "2", description: "a bad draft", sl: "system X", at: "2026-07-24T00:01:00.000Z", status: "compile-error", errorText: "line 1: bad" },
    ];
    saveCoauthorTurns(turns);
    expect(loadCoauthorTurns()).toEqual(turns);
  });

  it("survives a fresh load call (simulating a reload) without re-saving", () => {
    saveCoauthorTurns([{ id: "1", description: "x", sl: "system X", at: "t", status: "previewing" }]);
    const first = loadCoauthorTurns();
    const second = loadCoauthorTurns();
    expect(second).toEqual(first);
  });

  it("falls back to an empty history on corrupt stored JSON, not a throw", () => {
    (globalThis as unknown as { localStorage: MemoryStorage }).localStorage.setItem(
      "bert-lenses.coauthor-turns",
      "{not json",
    );
    expect(() => loadCoauthorTurns()).not.toThrow();
    expect(loadCoauthorTurns()).toEqual([]);
  });
});

describe("draftSlWithRetry stage reporting (#218)", () => {
  beforeEach(() => {
    authorSlMock.mockReset();
    compileSlMock.mockReset();
  });

  it("reports asking then nothing else on a clean first-try compile", async () => {
    authorSlMock.mockResolvedValueOnce({ sl: "system X", model: "gemma4:12b" });
    compileSlMock.mockReturnValueOnce({ ok: {}, lens_explicit: false });
    const stages: DraftStage[] = [];
    const { sl } = await draftSlWithRetry("a thermostat", undefined, (s) => stages.push(s));
    expect(sl).toBe("system X");
    expect(stages).toEqual([{ kind: "asking" }, { kind: "compiling" }]);
    expect(authorSlMock).toHaveBeenCalledTimes(1);
  });

  it("names the retry explicitly — attempt 2 of 3 — on the first compile failure", async () => {
    authorSlMock
      .mockResolvedValueOnce({ sl: "system X (broken)", model: "gemma4:12b" })
      .mockResolvedValueOnce({ sl: "system X (fixed)", model: "gemma4:12b" });
    compileSlMock
      .mockReturnValueOnce({ errors: [{ line: 1, message: "unknown keyword" }] })
      .mockReturnValueOnce({ ok: {}, lens_explicit: false });
    const stages: DraftStage[] = [];
    const { sl } = await draftSlWithRetry("a thermostat", undefined, (s) => stages.push(s));
    expect(sl).toBe("system X (fixed)");
    expect(stages).toEqual([
      { kind: "asking" },
      { kind: "compiling" },
      { kind: "retrying", attempt: 2, maxAttempts: 3 },
      { kind: "compiling" },
    ]);
    expect(authorSlMock).toHaveBeenCalledTimes(2);
  });

  it("reaches attempt 3 of 3 on a second consecutive compile failure, then stops healing", async () => {
    authorSlMock
      .mockResolvedValueOnce({ sl: "v1", model: "gemma4:12b" })
      .mockResolvedValueOnce({ sl: "v2", model: "gemma4:12b" })
      .mockResolvedValueOnce({ sl: "v3", model: "gemma4:12b" });
    compileSlMock
      .mockReturnValueOnce({ errors: [{ line: 1, message: "bad" }] })
      .mockReturnValueOnce({ errors: [{ line: 1, message: "still bad" }] })
      .mockReturnValueOnce({ errors: [{ line: 1, message: "and still bad" }] });
    validateModeMock.mockClear();
    const stages: DraftStage[] = [];
    const { sl } = await draftSlWithRetry("a thermostat", undefined, (s) => stages.push(s));
    // The loop caps at 2 parse heals (3 total asks). Since #377 M1 the third
    // draft IS compiled here — the kernel pass needs the model — but a third
    // parse failure asks nothing more; the text is returned as-is and the
    // caller's own compile shows the faults.
    expect(sl).toBe("v3");
    expect(stages).toEqual([
      { kind: "asking" },
      { kind: "compiling" },
      { kind: "retrying", attempt: 2, maxAttempts: 3 },
      { kind: "compiling" },
      { kind: "retrying", attempt: 3, maxAttempts: 3 },
      { kind: "compiling" },
    ]);
    expect(authorSlMock).toHaveBeenCalledTimes(3);
    expect(validateModeMock).not.toHaveBeenCalled();
  });

  it("works with no onStage callback at all (manual/legacy callers)", async () => {
    authorSlMock.mockResolvedValueOnce({ sl: "system X", model: "gemma4:12b" });
    compileSlMock.mockReturnValueOnce({ ok: {}, lens_explicit: false });
    await expect(draftSlWithRetry("a thermostat")).resolves.toMatchObject({ sl: "system X" });
  });
});

// #377 M1 — the drafter asks the kernel, not just the parser.
//
// The specimen (docs/design/coauthor-deep-analysis.md §1): "an aquarium" came
// back with five of five components stamped `interface` and one with no flows.
// It compiled clean, so the loop stopped and the four refusals waited behind
// the Review button. The findings below are the kernel's own words for that
// draft, copied from `bert verdict --lens mobus` on 2026-09-08 — the mock
// carries what the real kernel said, not an invented message.
const FLOWLESS_FILTER = {
  severity: "Error",
  code: "interface_carries_no_flow",
  location: "systems[0].boundary.interfaces[1]",
  message:
    "interface 'Filter' carries no boundary-crossing flow — Mobus defines an interface as a component that transports a flow across the boundary, so one that transports nothing is a mislabelled component (Lean `MobusSystem.interfaces_carry_flow`)",
};
const FLOWLESS_PUMP = { ...FLOWLESS_FILTER, location: "systems[0].boundary.interfaces[3]", message: FLOWLESS_FILTER.message.replace("Filter", "Pump") };
const PUMP_NO_FLOWS_WARNING = {
  severity: "Warning",
  code: "interface_processor_without_flows",
  location: "systems.Pump",
  message: "Processor 'Pump' has parent_interface but no connecting flows",
};
const MOBUS_MODEL = { lens: "Mobus", things: [], relations: [] };

describe("draftSlWithRetry asks the kernel after a clean compile (#377 M1)", () => {
  beforeEach(() => {
    authorSlMock.mockReset();
    compileSlMock.mockReset();
    validateModeMock.mockReset();
    validateModeMock.mockReturnValue({ issues: [] });
  });

  it("a flowless-interface draft triggers exactly one repair ask, carrying the kernel's own findings", async () => {
    authorSlMock
      .mockResolvedValueOnce({ sl: "flat aquarium", model: "claude-haiku-4-5" })
      .mockResolvedValueOnce({ sl: "repaired aquarium", model: "claude-haiku-4-5" });
    compileSlMock.mockReturnValue({ ok: MOBUS_MODEL, lens_explicit: true });
    validateModeMock
      .mockReturnValueOnce({ issues: [FLOWLESS_FILTER, FLOWLESS_PUMP, PUMP_NO_FLOWS_WARNING] })
      .mockReturnValueOnce({ issues: [] });
    const stages: DraftStage[] = [];
    const out = await draftSlWithRetry("an aquarium", "Mobus", (s) => stages.push(s));

    expect(out.sl).toBe("repaired aquarium");
    expect(out.modelCalls).toBe(2);
    expect(authorSlMock).toHaveBeenCalledTimes(2);
    // Validated at the lens's mode — Mobus reads Operational, where the
    // interface checks live.
    expect(validateModeMock).toHaveBeenCalledWith(MOBUS_MODEL, "Operational");
    const repair = authorSlMock.mock.calls[1][0];
    expect(repair.priorSl).toBe("flat aquarium");
    expect(repair.errors).toContain("2 errors");
    expect(repair.errors).toContain("interface 'Filter' carries no boundary-crossing flow");
    expect(repair.errors).toContain("interface 'Pump' carries no boundary-crossing flow");
    // Warnings stay for the human.
    expect(repair.errors).not.toContain("Processor 'Pump' has parent_interface");
    expect(stages).toEqual([
      { kind: "asking" },
      { kind: "compiling" },
      { kind: "kernel-retry", errors: 2 },
      { kind: "compiling" },
    ]);
  });

  it("a clean draft triggers no repair ask", async () => {
    authorSlMock.mockResolvedValueOnce({ sl: "clean", model: "gemma4:12b" });
    compileSlMock.mockReturnValueOnce({ ok: MOBUS_MODEL, lens_explicit: true });
    validateModeMock.mockReturnValueOnce({ issues: [PUMP_NO_FLOWS_WARNING] });
    const stages: DraftStage[] = [];
    const out = await draftSlWithRetry("an aquarium", "Mobus", (s) => stages.push(s));
    expect(out).toMatchObject({ sl: "clean", modelCalls: 1 });
    expect(authorSlMock).toHaveBeenCalledTimes(1);
    expect(stages).toEqual([{ kind: "asking" }, { kind: "compiling" }]);
  });

  it("asks the kernel once: a repair the kernel still refuses is returned, not re-healed", async () => {
    authorSlMock
      .mockResolvedValueOnce({ sl: "flat", model: "gemma4:12b" })
      .mockResolvedValueOnce({ sl: "still flat", model: "gemma4:12b" });
    compileSlMock.mockReturnValue({ ok: MOBUS_MODEL, lens_explicit: true });
    validateModeMock.mockReturnValue({ issues: [FLOWLESS_FILTER] });
    const out = await draftSlWithRetry("an aquarium", "Mobus");
    expect(out).toMatchObject({ sl: "still flat", modelCalls: 2 });
    expect(authorSlMock).toHaveBeenCalledTimes(2);
    // The kernel is asked only about the FIRST compiling draft; the repaired
    // draft is the caller's to compile and review.
    expect(validateModeMock).toHaveBeenCalledTimes(1);
  });

  it("a repair that no longer compiles is parse-healed on the same budget", async () => {
    authorSlMock
      .mockResolvedValueOnce({ sl: "flat", model: "gemma4:12b" })
      .mockResolvedValueOnce({ sl: "repair with a typo", model: "gemma4:12b" })
      .mockResolvedValueOnce({ sl: "repair", model: "gemma4:12b" });
    compileSlMock
      .mockReturnValueOnce({ ok: MOBUS_MODEL, lens_explicit: true })
      .mockReturnValueOnce({ errors: [{ line: 3, message: "`Keeper` is not declared" }] })
      .mockReturnValueOnce({ ok: MOBUS_MODEL, lens_explicit: true });
    validateModeMock.mockReturnValueOnce({ issues: [FLOWLESS_FILTER] });
    const stages: DraftStage[] = [];
    const out = await draftSlWithRetry("an aquarium", "Mobus", (s) => stages.push(s));
    expect(out).toMatchObject({ sl: "repair", modelCalls: 3 });
    expect(stages).toEqual([
      { kind: "asking" },
      { kind: "compiling" },
      { kind: "kernel-retry", errors: 1 },
      { kind: "compiling" },
      { kind: "retrying", attempt: 2, maxAttempts: 3 },
      { kind: "compiling" },
    ]);
  });

  it("reads the compiled model's own lens when the caller named none", async () => {
    authorSlMock.mockResolvedValueOnce({ sl: "x", model: "gemma4:12b" });
    compileSlMock.mockReturnValueOnce({ ok: { ...MOBUS_MODEL, lens: "Bunge" }, lens_explicit: true });
    await draftSlWithRetry("a thing");
    expect(validateModeMock).toHaveBeenCalledWith(expect.objectContaining({ lens: "Bunge" }), "Structural");
  });
});

// The model choice. GSR routes on the model name and reports the model that
// actually answered; when it holds no key for a Claude model the request still
// SUCCEEDS on a local one, so the answering model is the only trustworthy fact
// here and it has to survive the heal loop intact.
describe("draftSlWithRetry model choice", () => {
  beforeEach(() => {
    authorSlMock.mockReset();
    compileSlMock.mockReset();
  });

  it("asks for the reasoner's default when no model is chosen", async () => {
    authorSlMock.mockResolvedValueOnce({ sl: "system X", model: "gemma4:12b" });
    compileSlMock.mockReturnValueOnce({ ok: {}, lens_explicit: false });
    const out = await draftSlWithRetry("a thermostat");
    expect(authorSlMock).toHaveBeenCalledWith(expect.objectContaining({ model: "" }));
    expect(out.requestedModel).toBe("");
    expect(out.answeredModel).toBe("gemma4:12b");
  });

  it("sends the chosen model and reports the model that answered", async () => {
    authorSlMock.mockResolvedValueOnce({ sl: "system X", model: "claude-sonnet-4-6" });
    compileSlMock.mockReturnValueOnce({ ok: {}, lens_explicit: false });
    const out = await draftSlWithRetry("a thermostat", undefined, undefined, "claude-sonnet-4-6");
    expect(authorSlMock).toHaveBeenCalledWith(expect.objectContaining({ model: "claude-sonnet-4-6" }));
    expect(out).toMatchObject({ requestedModel: "claude-sonnet-4-6", answeredModel: "claude-sonnet-4-6" });
  });

  // THE HAZARD: no key at the reasoner, so the Claude ask falls through to a
  // local model and the call succeeds. Nothing throws. The returned pair is
  // what keeps the author from believing Claude wrote this.
  it("returns the local model that actually answered when the Claude ask falls through", async () => {
    authorSlMock.mockResolvedValueOnce({ sl: "system X", model: "gemma4:12b" });
    compileSlMock.mockReturnValueOnce({ ok: {}, lens_explicit: false });
    const out = await draftSlWithRetry("a thermostat", undefined, undefined, "claude-sonnet-4-6");
    expect(out.requestedModel).toBe("claude-sonnet-4-6");
    expect(out.answeredModel).toBe("gemma4:12b");
    expect(out.answeredModel).not.toBe(out.requestedModel);
  });

  it("carries the chosen model through every heal, and reports the model that wrote the returned draft", async () => {
    authorSlMock
      .mockResolvedValueOnce({ sl: "broken", model: "claude-sonnet-4-6" })
      .mockResolvedValueOnce({ sl: "fixed", model: "claude-sonnet-4-6" });
    compileSlMock
      .mockReturnValueOnce({ errors: [{ line: 1, message: "unknown keyword" }] })
      .mockReturnValueOnce({ ok: {}, lens_explicit: false });
    const out = await draftSlWithRetry("a thermostat", undefined, undefined, "claude-sonnet-4-6");
    expect(authorSlMock).toHaveBeenCalledTimes(2);
    for (const call of authorSlMock.mock.calls) {
      expect(call[0]).toMatchObject({ model: "claude-sonnet-4-6" });
    }
    expect(out).toMatchObject({ sl: "fixed", answeredModel: "claude-sonnet-4-6" });
  });

  it("reports the model that answered the LAST ask, not the first, when a retry lands elsewhere", async () => {
    authorSlMock
      .mockResolvedValueOnce({ sl: "broken", model: "claude-sonnet-4-6" })
      .mockResolvedValueOnce({ sl: "fixed", model: "gemma4:12b" });
    compileSlMock
      .mockReturnValueOnce({ errors: [{ line: 1, message: "bad" }] })
      .mockReturnValueOnce({ ok: {}, lens_explicit: false });
    const out = await draftSlWithRetry("a thermostat", undefined, undefined, "claude-sonnet-4-6");
    expect(out).toMatchObject({ sl: "fixed", answeredModel: "gemma4:12b" });
  });
});

// The reasoner times its own call (`latency_ms`) and that number was being
// dropped. A turn keeps the TOTAL across its asks, or nothing at all.
describe("draftSlWithRetry model time", () => {
  beforeEach(() => {
    authorSlMock.mockReset();
    compileSlMock.mockReset();
  });

  it("carries a single ask's reported time through as the turn's total", async () => {
    authorSlMock.mockResolvedValueOnce({ sl: "system X", model: "gemma4:12b", latencyMs: 12400 });
    compileSlMock.mockReturnValueOnce({ ok: {}, lens_explicit: false });
    const out = await draftSlWithRetry("a thermostat");
    expect(out).toMatchObject({ modelMs: 12400, modelCalls: 1 });
  });

  it("sums the heal loop's asks and says how many they were", async () => {
    authorSlMock
      .mockResolvedValueOnce({ sl: "broken", model: "gemma4:12b", latencyMs: 10000 })
      .mockResolvedValueOnce({ sl: "fixed", model: "gemma4:12b", latencyMs: 21000 });
    compileSlMock
      .mockReturnValueOnce({ errors: [{ line: 1, message: "bad" }] })
      .mockReturnValueOnce({ ok: {}, lens_explicit: false });
    const out = await draftSlWithRetry("a thermostat");
    expect(out).toMatchObject({ modelMs: 31000, modelCalls: 2 });
  });

  it("reports no time at all when the reasoner reported none", async () => {
    authorSlMock.mockResolvedValueOnce({ sl: "system X", model: "gemma4:12b" });
    compileSlMock.mockReturnValueOnce({ ok: {}, lens_explicit: false });
    const out = await draftSlWithRetry("a thermostat");
    expect(out.modelMs).toBeUndefined();
    expect(out.modelCalls).toBe(1);
  });

  it("reports no total when only some of the turn's asks were timed", async () => {
    authorSlMock
      .mockResolvedValueOnce({ sl: "broken", model: "gemma4:12b", latencyMs: 10000 })
      .mockResolvedValueOnce({ sl: "fixed", model: "gemma4:12b" });
    compileSlMock
      .mockReturnValueOnce({ errors: [{ line: 1, message: "bad" }] })
      .mockReturnValueOnce({ ok: {}, lens_explicit: false });
    const out = await draftSlWithRetry("a thermostat");
    expect(out.modelMs).toBeUndefined();
  });
});
