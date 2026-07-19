import { describe, expect, it } from "vitest";
import { diagramFilename } from "./exportDiagram";
import type { CanvasModel } from "../kernel/types";

const base = (over: Partial<CanvasModel>): CanvasModel =>
  ({ things: [], relations: [], lens: "Klir", ...over }) as CanvasModel;

describe("diagramFilename", () => {
  it("prefers the author SOI name (#84)", () => {
    expect(diagramFilename(base({ name: "Steel Plant" }), "Demo Title")).toBe("steel-plant");
  });

  it("falls back to the label when no model name", () => {
    expect(diagramFilename(base({}), "Mobus's Steel Plant")).toBe("mobus-s-steel-plant");
  });

  it("falls back to 'model' when neither is usable", () => {
    expect(diagramFilename(base({}), null)).toBe("model");
    expect(diagramFilename(base({ name: "   " }), "  ")).toBe("model");
    expect(diagramFilename(base({ name: "!!!" }), null)).toBe("model");
  });
});
