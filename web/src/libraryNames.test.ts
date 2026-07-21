import { describe, it, expect } from "vitest";

import { mintLibraryName, parentSlotName } from "./libraryNames";

describe("mintLibraryName", () => {
  it("keeps a free base untouched", () => {
    expect(mintLibraryName("bedroom", new Set(["home"]))).toBe("bedroom");
  });

  it("suffixes past every taken slot instead of clobbering", () => {
    expect(mintLibraryName("bedroom", new Set(["bedroom"]))).toBe("bedroom-2");
    expect(mintLibraryName("bedroom", new Set(["bedroom", "bedroom-2"]))).toBe("bedroom-3");
  });
});

describe("parentSlotName", () => {
  it("reuses the current slot as-is, even when the name is taken", () => {
    expect(parentSlotName("home", "House", "demo", new Set(["home"]))).toEqual({
      name: "home",
      isNew: false,
    });
  });

  it("derives from the authored model name, collision-suffixed", () => {
    expect(parentSlotName(null, "home", undefined, new Set(["home"]))).toEqual({
      name: "home-2",
      isNew: true,
    });
  });

  it("falls back to the demo key when the model carries no name", () => {
    expect(parentSlotName(null, "  ", "boiler", new Set())).toEqual({
      name: "boiler",
      isNew: true,
    });
  });

  it("refuses (null) when there is nothing to derive from", () => {
    expect(parentSlotName(null, undefined, undefined, new Set())).toBeNull();
    expect(parentSlotName(null, "   ", "  ", new Set())).toBeNull();
  });
});
