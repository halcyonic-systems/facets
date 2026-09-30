import { beforeEach, describe, expect, it } from "vitest";
import { promoteFromSearch, resetView3dForTest, setView3dEnabled, subscribeView3d, view3dEnabled } from "./flag";

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
}

beforeEach(() => {
  (globalThis as unknown as { localStorage: MemoryStorage }).localStorage = new MemoryStorage();
  resetView3dForTest();
});

describe("the 3D beta door", () => {
  it("is open by default", () => {
    expect(view3dEnabled()).toBe(true);
  });
  it("closes on ?beta=0 and stays closed across a reload", () => {
    expect(promoteFromSearch("?beta=0")).toBe(false);
    resetView3dForTest();
    expect(view3dEnabled()).toBe(false);
  });
  it("reopens on ?beta=3d and ignores other values", () => {
    setView3dEnabled(false);
    expect(promoteFromSearch("?beta=2d")).toBe(false);
    expect(promoteFromSearch("?beta=3d")).toBe(true);
    resetView3dForTest();
    expect(view3dEnabled()).toBe(true);
  });
  it("tells subscribers", () => {
    const seen: boolean[] = [];
    subscribeView3d((on) => seen.push(on));
    setView3dEnabled(true);
    setView3dEnabled(false);
    expect(seen).toEqual([true, false]);
  });
});
