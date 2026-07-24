// #10: the co-author's persistence — history survives a reload (localStorage,
// no cap). vitest's node environment has no browser localStorage, so this
// stubs the same in-memory Storage contract; the real thing is confirmed live
// in a browser (see the PR's manual verification note).
import { beforeEach, describe, expect, it } from "vitest";
import { loadCoauthorTurns, saveCoauthorTurns } from "./coauthor";
import type { CoauthorTurn } from "./coauthor";

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
