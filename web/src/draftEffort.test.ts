// Careful or Fast is a stored preference beside the drafting model, and it
// reaches the wire only for a drafter that takes it.
import { beforeEach, describe, expect, it } from "vitest";
import {
  DRAFT_EFFORTS,
  chosenEffort,
  draftEffort,
  effortApplies,
  effortOnWire,
  resetDraftEffortForTest,
  setDraftEffort,
  subscribeDraftEffort,
} from "./draftEffort";

class MemoryStorage {
  private store = new Map<string, string>();
  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }
  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
}

beforeEach(() => {
  (globalThis as unknown as { localStorage: MemoryStorage }).localStorage = new MemoryStorage();
  resetDraftEffortForTest();
});

describe("the Careful / Fast preference", () => {
  it("starts on Careful", () => {
    expect(draftEffort()).toBe("careful");
  });

  it("survives a reload", () => {
    setDraftEffort("fast");
    resetDraftEffortForTest();
    expect(draftEffort()).toBe("fast");
  });

  it("reads anything it does not recognise in storage as Careful", () => {
    localStorage.setItem("bert-lenses.coauthor-effort", "turbo");
    expect(draftEffort()).toBe("careful");
  });

  it("notifies subscribers so the pane and the request cannot disagree", () => {
    const seen: string[] = [];
    const off = subscribeDraftEffort((e) => seen.push(e));
    setDraftEffort("fast");
    off();
    setDraftEffort("careful");
    expect(seen).toEqual(["fast"]);
  });

  it("applies to the Claude 5 drafters and to nothing else on the list", () => {
    expect(effortApplies("claude-opus-5")).toBe(true);
    expect(effortApplies("claude-sonnet-5")).toBe(true);
    expect(effortApplies("claude-sonnet-4-6")).toBe(false);
    expect(effortApplies("claude-haiku-4-5-20251001")).toBe(false);
    expect(effortApplies("qwen3:32b")).toBe(false);
    expect(effortApplies("")).toBe(false);
  });

  it("records a mode only for a drafter that takes it", () => {
    setDraftEffort("fast");
    expect(chosenEffort("claude-opus-5")).toBe("fast");
    expect(chosenEffort("claude-haiku-4-5-20251001")).toBeUndefined();
    expect(chosenEffort("")).toBeUndefined();
  });

  it("sends low for Fast and nothing for Careful", () => {
    expect(effortOnWire("fast")).toBe("low");
    expect(effortOnWire("careful")).toBeUndefined();
    expect(effortOnWire(undefined)).toBeUndefined();
  });

  it("states typical times as ranges", () => {
    for (const o of DRAFT_EFFORTS) expect(o.detail).toMatch(/often/);
  });
});
