// The drafting model is a stored preference, like the reasoner's address:
// chosen once, honoured on every later draft, in this session and the next.
import { beforeEach, describe, expect, it } from "vitest";
import {
  DRAFTER_MODELS,
  drafterModel,
  drafterModelLabel,
  drafterModelWhere,
  resetDrafterModelForTest,
  setDrafterModel,
  subscribeDrafterModel,
} from "./drafterModel";

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
  resetDrafterModelForTest();
});

describe("the drafting model preference", () => {
  it("starts at the reasoner's own default", () => {
    expect(drafterModel()).toBe("");
  });

  it("survives a reload, which is the whole point of storing it", () => {
    setDrafterModel("claude-sonnet-4-6");
    resetDrafterModelForTest(); // the next session, same storage
    expect(drafterModel()).toBe("claude-sonnet-4-6");
  });

  it("notifies subscribers so the pane and the request cannot disagree", () => {
    const seen: string[] = [];
    const off = subscribeDrafterModel((m) => seen.push(m));
    setDrafterModel("qwen3:32b");
    off();
    setDrafterModel("");
    expect(seen).toEqual(["qwen3:32b"]);
  });

  it("offers both places a model can run, and says which is which", () => {
    expect(DRAFTER_MODELS.some((m) => m.where === "on the reasoner's machine")).toBe(true);
    expect(DRAFTER_MODELS.some((m) => m.where === "through the reasoner's cloud path")).toBe(true);
    expect(drafterModelWhere("claude-sonnet-4-6")).toBe("through the reasoner's cloud path");
  });

  it("makes no claim about a model it does not know", () => {
    expect(drafterModelWhere("mystery:7b")).toBeNull();
    expect(drafterModelLabel("mystery:7b")).toBe("mystery:7b");
  });

  it("names no model as better than another, only where it runs", () => {
    for (const m of DRAFTER_MODELS) {
      expect(`${m.label} ${m.where}`).not.toMatch(/better|smarter|stronger|best|premium/i);
    }
  });
});
