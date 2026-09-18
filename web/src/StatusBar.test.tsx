// The bottom bar (#409 M1). Static-markup checks: what it says, and that it
// says it the same way whatever the mode, since it takes no mode at all.
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { SL_VERSION, StatusBar } from "./StatusBar";
import type { CanvasModel } from "./kernel/types";

const noop = () => {};
const model: CanvasModel = {
  lens: "Mobus",
  things: [{ id: 1, name: "A", role: "component", x: 0, y: 0 } as unknown as CanvasModel["things"][number]],
  relations: [],
  boundary: { porosity: 0, perceptive_fuzziness: 0 },
};

describe("StatusBar", () => {
  it("shows the verdict chip, the counts, the compile state, Focus and the build line", () => {
    const m = renderToStaticMarkup(
      <StatusBar model={model} verdict={{ issues: [] }} faults={0} previewing={false} focus={false} onToggleFocus={noop} onVerdict={noop} kernelLoaded />,
    );
    expect(m).toContain("✓ clean");
    expect(m).toContain("1 thing · 0 relations");
    expect(m).toContain("compiled");
    expect(m).toContain(">Focus</button>");
    expect(m).toContain(`kernel · wasm · SL v${SL_VERSION}`);
    expect(m).toContain("Opens Read");
  });

  it("names faults and a waiting draft as the compile state", () => {
    const faults = renderToStaticMarkup(
      <StatusBar model={model} verdict={null} faults={2} previewing={false} focus={false} onToggleFocus={noop} onVerdict={noop} kernelLoaded />,
    );
    expect(faults).toContain("2 SL faults");
    const previewing = renderToStaticMarkup(
      <StatusBar model={model} verdict={null} faults={0} previewing focus onToggleFocus={noop} onVerdict={noop} kernelLoaded />,
    );
    expect(previewing).toContain("previewing a draft");
    expect(previewing).toContain('aria-pressed="true"');
  });

  it("keeps Focus and the build line with no model loaded", () => {
    const m = renderToStaticMarkup(
      <StatusBar model={null} verdict={null} faults={0} previewing={false} focus={false} onToggleFocus={noop} onVerdict={noop} kernelLoaded={false} />,
    );
    expect(m).not.toContain("verdict-chip");
    expect(m).toContain("Focus");
    expect(m).toContain("loading…");
  });
});
