// "My library" through its storage interface (library.ts) rather than through
// IndexedDB. The load-bearing claim: a saved model round-trips — save, list,
// load, rename, remove — with only the LibraryBackend contract in play, so the
// Tauri filesystem backend can be dropped in by satisfying this same contract.
//
// ./kernel is mocked only because library.ts reaches modelStore, which pulls
// the Vite-only wasm url import (same reason as modelStore.test.ts). No
// IndexedDB is touched here: the memory backend is the whole storage layer.
import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("./kernel", () => ({
  modelIdentity: (json: string) => {
    const id = (JSON.parse(json) as { model_id?: unknown }).model_id;
    if (typeof id !== "string") throw new Error("no model_id");
    return id;
  },
}));

const { library, memoryBackend, setLibraryBackend } = await import("./library");
type Archive = Parameters<typeof library.save>[1];

const archive = (id: string) => JSON.stringify({ model_id: id, things: [] }) as Archive;

describe("library", () => {
  beforeEach(() => setLibraryBackend(memoryBackend()));

  it("round-trips a saved model", async () => {
    await library.save("steel plant", archive("Ab12"));
    expect(await library.list()).toHaveLength(1);
    expect(JSON.parse(await library.load("steel plant")).model_id).toBe("Ab12");
    expect(await library.loadByRef("Ab12")).toBe(archive("Ab12"));
  });

  it("renames a slot without touching its identity, and refuses a taken name", async () => {
    await library.save("a", archive("Ab12"));
    await library.save("b", archive("Cd34"));
    await library.rename("a", "steel plant");
    expect(await library.loadByRef("Ab12")).toBe(archive("Ab12"));
    expect((await library.list()).map((r) => r.name).sort()).toEqual(["b", "steel plant"]);
    await expect(library.rename("b", "steel plant")).rejects.toThrow(/already saved/);
  });

  it("removes a slot", async () => {
    await library.save("a", archive("Ab12"));
    await library.remove("a");
    expect(await library.list()).toEqual([]);
    await expect(library.load("a")).rejects.toThrow(/no saved model/);
  });

  it("delegates to whichever backend is installed", async () => {
    const first = memoryBackend();
    setLibraryBackend(first);
    await library.save("a", archive("Ab12"));
    setLibraryBackend(memoryBackend());
    expect(await library.list()).toEqual([]);
    setLibraryBackend(first);
    expect(await library.list()).toHaveLength(1);
  });
});
