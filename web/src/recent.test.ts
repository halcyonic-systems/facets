// The recency list's two rules, which are the whole module: newest first, and
// one row per model. Everything else about the Recent section (which four are
// shown, what their sublines say, whether a stale address is drawn at all) is
// the page's reading and is pinned in HomeScreen.test.tsx.
import { beforeEach, describe, expect, it } from "vitest";
import { noteOpened, readArrange, readRecent, remember, type RecentEntry } from "./recent";

class MemoryStorage {
  private store = new Map<string, string>();
  getItem(k: string) {
    return this.store.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.store.set(k, v);
  }
  removeItem(k: string) {
    this.store.delete(k);
  }
}

const entry = (key: string, at: number): RecentEntry => ({ kind: "example", key, at });

describe("remember", () => {
  it("puts the newest open first", () => {
    const list = remember(remember([], entry("a", 1)), entry("b", 2));
    expect(list.map((e) => e.key)).toEqual(["b", "a"]);
  });

  it("moves a re-opened model rather than listing it twice", () => {
    const list = remember(remember(remember([], entry("a", 1)), entry("b", 2)), entry("a", 3));
    expect(list.map((e) => e.key)).toEqual(["a", "b"]);
    expect(list.filter((e) => e.key === "a")).toHaveLength(1);
  });

  it("keeps the same key under two kinds apart — an address is kind plus key", () => {
    const list = remember([{ kind: "library", key: "hal", at: 1 }], entry("hal", 2));
    expect(list).toHaveLength(2);
  });

  it("caps the list", () => {
    let list: RecentEntry[] = [];
    for (let i = 0; i < 20; i += 1) list = remember(list, entry(`m${i}`, i), 12);
    expect(list).toHaveLength(12);
    expect(list[0].key).toBe("m19");
  });
});

describe("storage", () => {
  beforeEach(() => {
    (globalThis as unknown as { localStorage: MemoryStorage }).localStorage = new MemoryStorage();
  });

  it("round-trips an open", () => {
    noteOpened("corpus", "mobus/steel-plant.sl", 1000);
    expect(readRecent()).toEqual([{ kind: "corpus", key: "mobus/steel-plant.sl", at: 1000 }]);
  });

  it("reads corrupt or foreign storage as no history", () => {
    localStorage.setItem("facets.recent", "not json");
    expect(readRecent()).toEqual([]);
    localStorage.setItem("facets.recent", JSON.stringify([{ kind: "nonsense", key: 4 }]));
    expect(readRecent()).toEqual([]);
  });

  it("defaults the arrangement to the lens cut", () => {
    expect(readArrange()).toBe("lens");
  });
});
