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
    // The verdict is the one true Pill (data-pill) with its mark in the icon
    // slot, never a glyph in the word (makeover rules 3, 14).
    expect(m).toContain("clean");
    expect(m).toMatch(/data-pill=""[^>]*data-tone="ok"/);
    expect(m).toContain('data-icon="ok"');
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

describe("#427 the secondary-pane toggle at narrow widths", () => {
  // Below the breakpoint the toggles (the sheet, the overlays, Focus) fold
  // into one closed Menu so the bar stays one row at 390 (makeover rule 16);
  // above it they are the row of quiet Buttons and no menu is offered.
  it("offers the sheet behind the View options menu; absent above the breakpoint", () => {
    const narrow = renderToStaticMarkup(
      <StatusBar model={model} verdict={{ issues: [] }} faults={0} previewing={false} focus={false} onToggleFocus={noop} onVerdict={noop} kernelLoaded secondary={{ label: "Element", open: false }} onToggleSecondary={noop} />,
    );
    expect(narrow).toMatch(/aria-haspopup="menu"[^>]*aria-label="View options"/);
    expect(narrow).not.toContain(">Focus</button>");
    const wide = renderToStaticMarkup(
      <StatusBar model={model} verdict={{ issues: [] }} faults={0} previewing={false} focus={false} onToggleFocus={noop} onVerdict={noop} kernelLoaded />,
    );
    expect(wide).not.toContain("View options");
    expect(wide).not.toContain('data-testid="secondary-toggle"');
    expect(wide).toContain(">Focus</button>");
  });
});


describe("StatusBar · opaque reading (#462 item 2)", () => {
  it("offers the Opaque pill beside Grounding only when the host says the gesture applies", () => {
    const noop = () => {};
    const model = { name: "m", lens: "Mobus", things: [], relations: [] } as unknown as import("./kernel/types").CanvasModel;
    const withPill = renderToStaticMarkup(
      <StatusBar model={model} verdict={null} faults={0} previewing={false} focus={false} onToggleFocus={noop} onVerdict={noop} kernelLoaded opaque onToggleOpaque={noop} />,
    );
    expect(withPill).toContain('data-testid="view-opaque-toggle"');
    expect(withPill).toContain('aria-pressed="true"');
    const without = renderToStaticMarkup(
      <StatusBar model={model} verdict={null} faults={0} previewing={false} focus={false} onToggleFocus={noop} onVerdict={noop} kernelLoaded />,
    );
    expect(without).not.toContain("view-opaque-toggle");
  });
});
