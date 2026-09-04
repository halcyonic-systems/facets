// #139 M3 rule 3: the breadcrumb is a readout of the view's frame chain, not a
// record of clicks. One crumb per frame, the focused frame last and not a link,
// and a crossing that carries no embed marked so the exit knows it is a fit.
import { describe, expect, it } from "vitest";
import { frameChain, type FrameLink } from "./frameChain";

const link = (label: string, extra: Partial<FrameLink> = {}): FrameLink => ({
  label,
  modelId: label.toLowerCase(),
  clean: true,
  continuous: true,
  ...extra,
});

describe("frameChain", () => {
  it("is one crumb per frame, outermost first", () => {
    const chain = frameChain([link("Plant"), link("Furnace")], link("Burner"));
    expect(chain.map((c) => c.label)).toEqual(["Plant", "Furnace", "Burner"]);
    expect(chain.map((c) => c.depth)).toEqual([0, 1, 2]);
  });

  it("focuses the last frame and only it — the one that is editable", () => {
    const chain = frameChain([link("Plant")], link("Furnace"));
    expect(chain.filter((c) => c.focused).map((c) => c.label)).toEqual(["Furnace"]);
  });

  it("is a single crumb at the root, where there is nothing to exit to", () => {
    expect(frameChain([], link("Plant"))).toEqual([
      { label: "Plant", modelId: "plant", clean: true, continuous: true, depth: 0, focused: true },
    ]);
  });

  it("carries each frame's seam status through unchanged", () => {
    const chain = frameChain([link("Plant", { clean: false })], link("Furnace"));
    expect(chain.map((c) => c.clean)).toEqual([false, true]);
  });

  it("marks a crossing with no embed, which can only be left by a fit", () => {
    const chain = frameChain([link("Plant"), link("Furnace", { continuous: false })], link("Burner"));
    expect(chain.map((c) => c.continuous)).toEqual([true, false, true]);
  });
});
