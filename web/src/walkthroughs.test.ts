import { describe, expect, it } from "vitest";
import { bundledModelByRef, shelfByRef } from "./walkthroughs";

describe("shelfByRef", () => {
  it("keys each archive by its own model_id", () => {
    const a = JSON.stringify({ model_id: "AbC123", things: [] });
    const b = JSON.stringify({ model_id: "XyZ789", things: [] });
    const shelf = shelfByRef([a, b]);
    expect(shelf.get("AbC123")).toBe(a);
    expect(shelf.get("XyZ789")).toBe(b);
  });

  it("skips files without an identity and survives malformed JSON", () => {
    const anonymous = JSON.stringify({ things: [] });
    const shelf = shelfByRef([anonymous, "{ not json", JSON.stringify({ model_id: 7 })]);
    expect(shelf.size).toBe(0);
  });

  it("first file wins a duplicated identity", () => {
    const first = JSON.stringify({ model_id: "Dup1", things: [{ name: "first" }] });
    const second = JSON.stringify({ model_id: "Dup1", things: [{ name: "second" }] });
    expect(shelfByRef([first, second]).get("Dup1")).toBe(first);
  });
});

describe("the shipped shelf", () => {
  // The steel-plant walkthrough's two pinned identities — the ids its parent
  // and middle levels stamp in their `decomposes` clauses. The kernel's
  // steel_walkthrough gate holds the archives to these; this side holds that
  // the app actually bundles and resolves them.
  it("resolves both steel-plant levels by their pinned ids", () => {
    for (const id of ["WVv2pzPHybekS7U3ewwVxx", "VjCKBe5psWuHcmW2yE8nXM"]) {
      const text = bundledModelByRef(id);
      expect(text, `bundled archive for ${id}`).not.toBeNull();
      expect((JSON.parse(text!) as { model_id?: string }).model_id).toBe(id);
    }
  });

  it("resolves nothing for an unknown id", () => {
    expect(bundledModelByRef("NotARealId")).toBeNull();
  });
});
