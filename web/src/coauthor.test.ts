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
vi.mock("./gsr", () => ({ authorSl: authorSlMock }));
vi.mock("./kernel", () => ({ compileSl: compileSlMock }));

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
    const sl = await draftSlWithRetry("a thermostat", undefined, (s) => stages.push(s));
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
    const sl = await draftSlWithRetry("a thermostat", undefined, (s) => stages.push(s));
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
      .mockReturnValueOnce({ errors: [{ line: 1, message: "still bad" }] });
    const stages: DraftStage[] = [];
    const sl = await draftSlWithRetry("a thermostat", undefined, (s) => stages.push(s));
    // The loop caps at 2 kernel-reported heals (3 total asks); the 3rd draft's
    // compile is the caller's job, not this function's — it is returned as-is.
    expect(sl).toBe("v3");
    expect(stages).toEqual([
      { kind: "asking" },
      { kind: "compiling" },
      { kind: "retrying", attempt: 2, maxAttempts: 3 },
      { kind: "compiling" },
      { kind: "retrying", attempt: 3, maxAttempts: 3 },
    ]);
    expect(authorSlMock).toHaveBeenCalledTimes(3);
  });

  it("works with no onStage callback at all (manual/legacy callers)", async () => {
    authorSlMock.mockResolvedValueOnce({ sl: "system X", model: "gemma4:12b" });
    compileSlMock.mockReturnValueOnce({ ok: {}, lens_explicit: false });
    await expect(draftSlWithRetry("a thermostat")).resolves.toBe("system X");
  });
});
