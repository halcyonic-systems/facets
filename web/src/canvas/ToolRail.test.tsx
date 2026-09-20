// The tool rail (#409 M2): the registry's rows as icons, the kernel's
// derived kinds folded into the interface tool's tooltip, SL at the foot.
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ToolRail } from "./ToolRail";

const noop = () => {};

describe("ToolRail", () => {
  it("offers select, the place tools, the flow gesture, the primitives and SL under Mobus", () => {
    const m = renderToStaticMarkup(<ToolRail lens="Mobus" armed={null} onArm={noop} onOpenSl={noop} slOpen={false} />);
    for (const id of ["tool-select", "tool-component", "tool-env-object", "tool-interface", "tool-sl"]) expect(m).toContain(id);
    expect(m).toContain(">flow<");
    expect(m).toContain("Buffering");
    expect(m).not.toContain("the kernel draws these");
  });

  it("puts what the kernel draws into the interface tool's tooltip", () => {
    const m = renderToStaticMarkup(<ToolRail lens="Mobus" armed={null} onArm={noop} onOpenSl={noop} slOpen={false} />);
    expect(m).toMatch(/tool-interface[^>]*>|The kernel draws these: boundary/);
    expect(m).toContain("The kernel draws these: boundary");
  });

  it("marks select as active when nothing is armed", () => {
    const m = renderToStaticMarkup(<ToolRail lens="Klir" armed={null} onArm={noop} onOpenSl={noop} slOpen={false} />);
    expect(m).toMatch(/aria-pressed="true"[^>]*aria-label="Select/);
  });
});

describe("#418 item 4: a primitive's meaning is on the rail, not only its stamp", () => {
  it("every process tool's title carries the gloss, not just the verb", () => {
    const m = renderToStaticMarkup(<ToolRail lens="Mobus" armed={null} onArm={noop} onOpenSl={noop} slOpen={false} />);
    expect(m).toContain("Buffering: holds a stock between inflow and outflow");
    expect(m).toContain("Inverting: compares to a setpoint");
    expect(m).not.toContain("work process: buffering — click empty canvas");
  });
});
