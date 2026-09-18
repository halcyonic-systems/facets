import { describe, expect, it } from "vitest";
import { arrangementForSeed, diagramHidden, loadSlArrangement, previewGateInPane, type SlArrangement } from "./slArrangement";

const ALL: SlArrangement[] = ["sl", "split", "diagram"];

describe("SL pane arrangement", () => {
  it("defaults to split when nothing is stored or storage is missing", () => {
    expect(loadSlArrangement()).toBe("split");
  });

  it("hides the diagram only for text-only, and only while the pane is showing", () => {
    expect(diagramHidden("sl", true)).toBe(true);
    expect(diagramHidden("sl", false)).toBe(false);
    expect(diagramHidden("split", true)).toBe(false);
    expect(diagramHidden("diagram", true)).toBe(false);
  });

  it("puts the Accept/Discard gate in the pane exactly when the canvas banner cannot be seen", () => {
    for (const a of ALL) {
      for (const paneShown of [true, false]) {
        const canvasVisible = !diagramHidden(a, paneShown);
        expect(previewGateInPane(a, paneShown, true)).toBe(!canvasVisible);
        expect(previewGateInPane(a, paneShown, false)).toBe(false);
      }
    }
  });

  it("unfolds the rail for a description handed to the co-author, and leaves the rest alone", () => {
    expect(arrangementForSeed("diagram")).toBe("split");
    expect(arrangementForSeed("split")).toBe("split");
    expect(arrangementForSeed("sl")).toBe("sl");
  });
});
