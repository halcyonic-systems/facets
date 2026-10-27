// The Klir lens's door (cut 2026-10-26). Closed by default; `?lens=klir` opens
// it and the choice is remembered; a model pinned to Klir opens under Klir
// whatever the door says, and the strip then shows the Klir tab so the author
// can leave it.
import { beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { initSync } from "facets-kernel";
import { compileSl } from "./kernel";
import { CORPUS } from "./corpus";
import { klirEnabled, lensTabs, promoteKlirFromSearch, resetKlirForTest, setKlirEnabled } from "./flags";

initSync({
  module: fs.readFileSync(path.resolve(__dirname, "../../crates/facets-kernel/pkg/facets_kernel_bg.wasm")),
});

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
  resetKlirForTest();
});

describe("the Klir lens door", () => {
  it("is closed by default", () => {
    expect(klirEnabled()).toBe(false);
  });
  it("opens on ?lens=klir and stays open across a reload", () => {
    expect(promoteKlirFromSearch("?lens=klir")).toBe(true);
    resetKlirForTest();
    expect(klirEnabled()).toBe(true);
  });
  it("closes on ?lens=0 and ignores other values", () => {
    setKlirEnabled(true);
    expect(promoteKlirFromSearch("?lens=bunge")).toBe(true);
    expect(promoteKlirFromSearch("?lens=0")).toBe(false);
    resetKlirForTest();
    expect(klirEnabled()).toBe(false);
  });
});

describe("the lens strip", () => {
  it("offers two lenses with the door closed", () => {
    expect(lensTabs("Mobus")).toEqual(["Bunge", "Mobus"]);
    expect(lensTabs("Bunge")).toEqual(["Bunge", "Mobus"]);
    expect(lensTabs(undefined)).toEqual(["Bunge", "Mobus"]);
  });
  it("offers all three with the door open", () => {
    setKlirEnabled(true);
    expect(lensTabs("Mobus")).toEqual(["Klir", "Bunge", "Mobus"]);
  });
  it("shows the Klir tab while the open model is Klir, so the author can leave it", () => {
    expect(lensTabs("Klir")).toEqual(["Klir", "Bunge", "Mobus"]);
  });
});

describe("a Klir-pinned corpus entry with the door closed", () => {
  it("still compiles under Klir and the strip shows its tab", () => {
    const entry = CORPUS.find((e) => e.file === "klir/students-in-a-course.sl");
    expect(entry).toBeDefined();
    const out = compileSl(entry!.sl);
    if ("errors" in out) throw new Error(JSON.stringify(out.errors));
    // The pin is the text's, not the flag's: `@lens klir` is explicit, so the
    // opener keeps Klir rather than the author's current lens (App.onSlCompiled).
    expect(out.lens_explicit).toBe(true);
    expect(out.ok.lens).toBe("Klir");
    expect(klirEnabled()).toBe(false);
    expect(lensTabs(out.ok.lens)).toContain("Klir");
  });
});
