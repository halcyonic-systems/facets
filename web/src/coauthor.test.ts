// #10: the co-author's persistence — history survives a reload (localStorage,
// no cap). vitest's node environment has no browser localStorage, so this
// stubs the same in-memory Storage contract; the real thing is confirmed live
// in a browser (see the PR's manual verification note).
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  FLOWLESS_INTERFACE_NOTE,
  loadCoauthorTurns,
  saveCoauthorTurns,
  draftSlWithRetry,
  repairsPhrase,
  splitHistory,
  stampInterfacesFromCrossings,
  type DraftStage,
} from "./coauthor";
import type { CoauthorTurn } from "./coauthor";
import type { CanvasModel, Relation, Thing } from "./kernel/types";

// #218: draftSlWithRetry's stage callback — the loop already knows which
// attempt it is on; these tests pin the exact sequence a caller sees, since
// that sequence IS the fix (a static "Drafting…" becomes three legible steps).
const authorSlMock = vi.hoisted(() => vi.fn());
const compileSlMock = vi.hoisted(() => vi.fn());
// #377 M1: the loop asks the kernel after a clean compile. Default: no
// findings, so every pre-M1 test reads exactly as it did.
const validateModeMock = vi.hoisted(() => vi.fn((..._args: unknown[]) => ({ issues: [] as unknown[] })));
vi.mock("./gsr", () => ({ authorSl: authorSlMock }));
const emitSlMock = vi.hoisted(() => vi.fn());
vi.mock("./kernel", () => ({ compileSl: compileSlMock, emitSl: emitSlMock, validateMode: validateModeMock }));

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

  it("carries effort on the first ask and on every heal, and omits it when none was given", async () => {
    authorSlMock
      .mockResolvedValueOnce({ sl: "bad", model: "claude-opus-5" })
      .mockResolvedValueOnce({ sl: "system X", model: "claude-opus-5" });
    compileSlMock
      .mockReturnValueOnce({ errors: [{ line: 1, message: "bad" }] })
      .mockReturnValueOnce({ ok: {}, lens_explicit: false });
    await draftSlWithRetry("a thermostat", undefined, undefined, "claude-opus-5", undefined, "low");
    expect(authorSlMock.mock.calls.map((c) => c[0].effort)).toEqual(["low", "low"]);

    authorSlMock.mockReset();
    compileSlMock.mockReset();
    authorSlMock.mockResolvedValueOnce({ sl: "system X", model: "claude-opus-5" });
    compileSlMock.mockReturnValueOnce({ ok: {}, lens_explicit: false });
    await draftSlWithRetry("a thermostat", undefined, undefined, "claude-opus-5");
    expect(authorSlMock.mock.calls[0][0].effort).toBeUndefined();
  });

  it("hands on what the reasoner said about effort, and nothing when it said nothing", async () => {
    const shapes = [
      [{ effortRan: "low", effortDropped: false }, { effortRan: "low", effortDropped: false }],
      [{ effortRan: null, effortDropped: true }, { effortRan: null, effortDropped: true }],
      [{}, {}],
    ] as const;
    for (const [reply, kept] of shapes) {
      authorSlMock.mockReset();
      compileSlMock.mockReset();
      authorSlMock.mockResolvedValueOnce({ sl: "system X", model: "m", ...reply });
      compileSlMock.mockReturnValueOnce({ ok: {}, lens_explicit: false });
      const out = await draftSlWithRetry("a thermostat", undefined, undefined, "m", undefined, "low");
      expect({ effortRan: out.effortRan, effortDropped: out.effortDropped }).toEqual({ effortRan: undefined, effortDropped: undefined, ...kept });
    }
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
    // Since #399 the healed draft is read too, so a missing stamp on it can
    // still be derived. Reading is not asking: the heal budget stays at one.
    expect(validateModeMock).toHaveBeenCalledTimes(2);
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

describe("splitHistory (what the pane shows before the history is opened)", () => {
  const turn = (id: string, status: CoauthorTurn["status"]): CoauthorTurn => ({
    id,
    description: id,
    sl: "system X",
    at: "2026-09-17T12:00:00.000Z",
    status,
  });
  const ids = (ts: CoauthorTurn[]) => ts.map((t) => t.id);

  it("keeps the newest turn in view, including a failure, and folds the rest", () => {
    const s = splitHistory([turn("n", "network-error"), turn("a", "accepted"), turn("d", "discarded")], null);
    expect(ids(s.current)).toEqual(["n"]);
    expect(ids(s.past)).toEqual(["a"]);
    expect(ids(s.discarded)).toEqual(["d"]);
  });

  it("folds a newest turn that was discarded", () => {
    const s = splitHistory([turn("d", "discarded"), turn("a", "accepted")], null);
    expect(ids(s.current)).toEqual([]);
    expect(ids(s.past)).toEqual(["a"]);
    expect(ids(s.discarded)).toEqual(["d"]);
  });

  it("keeps a previewing turn and the turn being corrected in view at any age", () => {
    const turns = [turn("n", "accepted"), turn("p", "previewing"), turn("c", "discarded"), turn("o", "accepted")];
    const s = splitHistory(turns, "c");
    expect(ids(s.current)).toEqual(["n", "p", "c"]);
    expect(ids(s.past)).toEqual(["o"]);
    expect(ids(s.discarded)).toEqual([]);
  });
});

// #399 — the named interface-stamp repair, on first drafts and corrections.
//
// Across 162 kernel-scored first drafts every refusal was a crossing flow
// landing on an unstamped component, a stamp with no crossing, or both. The
// first has one repair and the drafter's own flow states it; the second has
// two and nothing says which. So the first is derived here and the second
// goes back to the drafter.
const t = (id: number, name: string, role: Thing["role"], extra: Partial<Thing> = {}): Thing =>
  ({ id, name, x: 0, y: 0, role, ...extra }) as Thing;
const rel = (id: number, a: number, b: number, name: string, is_bond = true): Relation =>
  ({ id, a, b, name, is_bond, kind: "Matter" }) as Relation;

/** A kettle as a drafter writes it: every crossing wired, no stamp anywhere. */
function kettle(): CanvasModel {
  return {
    lens: "Mobus",
    things: [
      t(1, "Element", "Component"),
      t(2, "Pot", "Component"),
      t(3, "Vent", "Component"),
      t(4, "Lid", "Component"),
      t(5, "Thermostat", "Component"),
      t(10, "Mains", "Environment", { env_kind: "Source" }),
      t(11, "Cup", "Environment", { env_kind: "Sink" }),
      t(12, "Room", "Environment", { env_kind: "Neutral" }),
    ],
    relations: [
      rel(1, 10, 1, "power"),
      rel(2, 1, 2, "heat"),
      rel(3, 2, 11, "hot water"),
      rel(4, 3, 12, "steam"),
      rel(5, 12, 3, "draught"),
      rel(6, 4, 12, "seal", false),
      rel(7, 5, 1, "switch"),
    ],
    boundary: { porosity: 0, perceptive_fuzziness: 0 },
  };
}

const MISSING = (k: number) => ({
  severity: "Error",
  code: "crossing_flow_without_interface",
  location: `interactions[${k}].sink_interface`,
  message: "flow crosses the boundary without an interface",
});

describe("stampInterfacesFromCrossings on a first draft (#399)", () => {
  it("stamps the carrier of a source, a sink and an environment crossing, in either direction", () => {
    const { model } = stampInterfacesFromCrossings(kettle());
    const stamped = model.things.filter((x) => x.interface).map((x) => x.name);
    expect(stamped).toEqual(["Element", "Pot", "Vent"]);
  });

  it("does not read a `mere` relation as a crossing, nor an internal flow", () => {
    const { model } = stampInterfacesFromCrossings(kettle());
    expect(model.things.find((x) => x.name === "Lid")?.interface).toBeFalsy();
    expect(model.things.find((x) => x.name === "Thermostat")?.interface).toBeFalsy();
  });

  it("records one line per stamp, naming every crossing the component carries", () => {
    const { repairs } = stampInterfacesFromCrossings(kettle());
    expect(repairs).toEqual([
      "interface stamped on Element (carries power from Mains)",
      "interface stamped on Pot (carries hot water to Cup)",
      "interface stamped on Vent (carries steam to Room, draught from Room)",
    ]);
  });

  it("never removes a stamp, flowless or not", () => {
    const over = kettle();
    over.things = over.things.map((x) => (x.name === "Lid" || x.name === "Pot" ? { ...x, interface: true } : x));
    const { model, repairs } = stampInterfacesFromCrossings(over);
    expect(model.things.find((x) => x.name === "Lid")?.interface).toBe(true);
    expect(model.things.find((x) => x.name === "Pot")?.interface).toBe(true);
    expect(repairs.some((l) => l.includes("Lid") || l.includes("Pot"))).toBe(false);
  });

  it("is idempotent: a stamped model comes back by identity with nothing to report", () => {
    const once = stampInterfacesFromCrossings(kettle());
    const twice = stampInterfacesFromCrossings(once.model);
    expect(twice.model).toBe(once.model);
    expect(twice.repairs).toEqual([]);
  });

  it("says the repairs in the notice the way the interior path always has", () => {
    expect(repairsPhrase([])).toBe("");
    expect(repairsPhrase(["a"])).toBe("; 1 interface stamp derived from the crossings (the drafter left it off)");
    expect(repairsPhrase(["a", "b"])).toBe("; 2 interface stamps derived from the crossings (the drafter left them off)");
  });
});

describe("draftSlWithRetry derives a missing stamp instead of asking again (#399)", () => {
  beforeEach(() => {
    authorSlMock.mockReset();
    compileSlMock.mockReset();
    emitSlMock.mockReset();
    validateModeMock.mockReset();
    validateModeMock.mockReturnValue({ issues: [] });
  });

  it("a draft whose only fault is the missing stamp makes ONE model call", async () => {
    const drafted = kettle();
    const recompiled = stampInterfacesFromCrossings(kettle()).model;
    authorSlMock.mockResolvedValueOnce({ sl: "kettle as drafted", model: "claude-opus-5", latencyMs: 9000 });
    compileSlMock
      .mockReturnValueOnce({ ok: drafted, lens_explicit: true })
      .mockReturnValueOnce({ ok: recompiled, lens_explicit: true });
    emitSlMock.mockReturnValueOnce("kettle, stamped");
    validateModeMock.mockReturnValueOnce({ issues: [MISSING(0), MISSING(2), MISSING(3)] }).mockReturnValueOnce({ issues: [] });
    const stages: DraftStage[] = [];
    const out = await draftSlWithRetry("a kettle", "Mobus", (s) => stages.push(s));

    expect(authorSlMock).toHaveBeenCalledTimes(1);
    expect(out.modelCalls).toBe(1);
    // The text handed on is the kernel's emission of the stamped model, and
    // the verdict that cleared it was reached on what that text compiles to.
    expect(out.sl).toBe("kettle, stamped");
    expect(emitSlMock.mock.calls[0][0].things.filter((x: Thing) => x.interface).map((x: Thing) => x.name)).toEqual([
      "Element",
      "Pot",
      "Vent",
    ]);
    expect(compileSlMock).toHaveBeenLastCalledWith("kettle, stamped");
    expect(validateModeMock).toHaveBeenLastCalledWith(recompiled, "Operational");
    expect(out.repairs).toHaveLength(3);
    expect(stages.some((s) => s.kind === "kernel-retry")).toBe(false);
  });

  it("an over-stamped draft still goes to the heal loop, with both repairs named", async () => {
    const over = stampInterfacesFromCrossings(kettle()).model;
    over.things = over.things.map((x) => (x.name === "Lid" ? { ...x, interface: true } : x));
    authorSlMock
      .mockResolvedValueOnce({ sl: "kettle, Lid stamped", model: "claude-opus-5" })
      .mockResolvedValueOnce({ sl: "kettle, healed", model: "claude-opus-5" });
    compileSlMock.mockReturnValue({ ok: over, lens_explicit: true });
    validateModeMock.mockReturnValueOnce({ issues: [FLOWLESS_FILTER] }).mockReturnValueOnce({ issues: [] });
    const out = await draftSlWithRetry("a kettle", "Mobus");

    expect(authorSlMock).toHaveBeenCalledTimes(2);
    expect(emitSlMock).not.toHaveBeenCalled();
    expect(out.repairs).toEqual([]);
    expect(out.sl).toBe("kettle, healed");
    const heal = authorSlMock.mock.calls[1][0];
    expect(heal.priorSl).toBe("kettle, Lid stamped");
    expect(heal.errors).toContain(FLOWLESS_INTERFACE_NOTE);
    expect(heal.errors).toMatch(/remove `interface`/);
    expect(heal.errors).toMatch(/add the flow/);
    expect(heal.errors).toMatch(/`mere` relation never counts/);
  });

  it("names both repairs only for that fault, and as the harness's words", async () => {
    authorSlMock
      .mockResolvedValueOnce({ sl: "a", model: "m" })
      .mockResolvedValueOnce({ sl: "b", model: "m" });
    compileSlMock.mockReturnValue({ ok: MOBUS_MODEL, lens_explicit: true });
    validateModeMock.mockReturnValueOnce({ issues: [{ ...FLOWLESS_FILTER, code: "dead_end", message: "dead end at Pump" }] });
    await draftSlWithRetry("an aquarium", "Mobus");
    expect(authorSlMock.mock.calls[1][0].errors).not.toContain("authoring harness");
    expect(FLOWLESS_INTERFACE_NOTE).toMatch(/^Note from the authoring harness, not the kernel/);
  });

  it("a draft missing a stamp AND over-stamped is stamped first, then healed from the stamped text", async () => {
    const drafted = kettle();
    drafted.things = drafted.things.map((x) => (x.name === "Lid" ? { ...x, interface: true } : x));
    const recompiled = stampInterfacesFromCrossings(drafted).model;
    authorSlMock
      .mockResolvedValueOnce({ sl: "drafted", model: "m" })
      .mockResolvedValueOnce({ sl: "healed", model: "m" });
    compileSlMock
      .mockReturnValueOnce({ ok: drafted, lens_explicit: true })
      .mockReturnValueOnce({ ok: recompiled, lens_explicit: true })
      .mockReturnValueOnce({ ok: recompiled, lens_explicit: true });
    emitSlMock.mockReturnValueOnce("stamped");
    validateModeMock
      .mockReturnValueOnce({ issues: [MISSING(0), FLOWLESS_FILTER] })
      .mockReturnValueOnce({ issues: [FLOWLESS_FILTER] })
      .mockReturnValueOnce({ issues: [] });
    const out = await draftSlWithRetry("a kettle", "Mobus");
    const heal = authorSlMock.mock.calls[1][0];
    expect(heal.priorSl).toBe("stamped");
    expect(heal.errors).toContain("1 error");
    expect(out.repairs).toHaveLength(3);
    expect(out.modelCalls).toBe(2);
  });

  it("leaves the draft as written when the emitter cannot write the stamped model", async () => {
    authorSlMock
      .mockResolvedValueOnce({ sl: "drafted", model: "m" })
      .mockResolvedValueOnce({ sl: "healed", model: "m" });
    compileSlMock.mockReturnValue({ ok: kettle(), lens_explicit: true });
    emitSlMock.mockImplementationOnce(() => {
      throw new Error("a name holds a quote");
    });
    validateModeMock.mockReturnValueOnce({ issues: [MISSING(0)] }).mockReturnValueOnce({ issues: [] });
    const out = await draftSlWithRetry("a kettle", "Mobus");
    expect(authorSlMock.mock.calls[1][0].priorSl).toBe("drafted");
    expect(out.repairs).toEqual([]);
  });

  it("stamps nothing under a lens whose mode never raises the refusal", async () => {
    authorSlMock.mockResolvedValueOnce({ sl: "drafted", model: "m" });
    compileSlMock.mockReturnValueOnce({ ok: { ...kettle(), lens: "Bunge" }, lens_explicit: true });
    const out = await draftSlWithRetry("a kettle", "Bunge");
    expect(emitSlMock).not.toHaveBeenCalled();
    expect(out).toMatchObject({ sl: "drafted", repairs: [] });
  });
});
