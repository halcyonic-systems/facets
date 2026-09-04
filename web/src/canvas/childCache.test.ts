// #139 M0: the resolved-child cache. Holds parsed models, evicts the least
// recently used, and remembers a miss only long enough to stop a per-frame
// refetch — a child saved during the session must be able to appear.
import { describe, expect, it } from "vitest";
import { ChildCache } from "./childCache";
import type { CanvasModel } from "../kernel/types";

const model = (name: string) => ({ name, lens: "Mobus", things: [], relations: [] }) as unknown as CanvasModel;

describe("ChildCache", () => {
  it("distinguishes unknown from known-missing", () => {
    const c = new ChildCache();
    expect(c.get("a")).toBeUndefined();
    c.set("a", null);
    expect(c.get("a")).toBeNull();
    c.set("a", model("A"));
    expect(c.get("a")).toEqual(model("A"));
  });

  it("lets a miss go stale so a saved child stops being missing", () => {
    let now = 1000;
    const c = new ChildCache(() => now);
    c.set("a", null);
    expect(c.get("a")).toBeNull();
    now += 5001;
    expect(c.get("a")).toBeUndefined();
  });

  it("keeps a resolved model however long it sits — only a MISS expires", () => {
    let now = 0;
    const c = new ChildCache(() => now);
    c.set("a", model("A"));
    now += 60_000;
    expect(c.get("a")).toEqual(model("A"));
  });

  it("evicts the least recently used past the cap, and a read counts as use", () => {
    const c = new ChildCache();
    for (let i = 0; i < 32; i++) c.set(`m${i}`, model(`M${i}`));
    expect(c.size).toBe(32);
    c.get("m0"); // m1 is now the oldest
    c.set("m32", model("M32"));
    expect(c.size).toBe(32);
    expect(c.get("m0")).toEqual(model("M0"));
    expect(c.get("m1")).toBeUndefined();
    expect(c.get("m32")).toEqual(model("M32"));
  });

  it("forgets one entry on invalidate and everything on clear", () => {
    const c = new ChildCache();
    c.set("a", model("A"));
    c.set("b", model("B"));
    c.invalidate("a");
    expect(c.get("a")).toBeUndefined();
    expect(c.get("b")).toEqual(model("B"));
    c.clear();
    expect(c.get("b")).toBeUndefined();
    expect(c.size).toBe(0);
  });
});
