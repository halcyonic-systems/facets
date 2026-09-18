// Write's margin (#409 M2): the caret reading is a pure function of the text,
// the line and the compiled model, and the cards render from it.
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { WriteMargin, atCursor, thingKind, thingStamps } from "./WriteMargin";
import type { CanvasModel } from "./kernel/types";

const noop = () => {};
const model = {
  lens: "Mobus",
  things: [
    { id: 1, name: "Tub", role: "Component", primitive: "Buffering", interface: true, x: 0, y: 0 },
    { id: 2, name: "Faucet", role: "Environment", env_kind: "Source", x: -50, y: 0 },
    { id: 3, name: "Drain", role: "Environment", env_kind: "Sink", x: 50, y: 0 },
  ],
  relations: [
    { id: 10, a: 2, b: 1, name: "inflow" },
    { id: 11, a: 1, b: 3, name: "outflow" },
  ],
  boundary: { porosity: 0, perceptive_fuzziness: 0 },
} as unknown as CanvasModel;
const text = 'system "Bathtub"\ncomponent Tub primitive Buffering interface\nsource Faucet\nsink Drain\nflow Faucet -> Tub : matter "inflow"\n';

describe("atCursor", () => {
  it("reads the thing on the caret's line with its flows and crossings", () => {
    const here = atCursor(text.split("\n"), 2, model);
    expect(here?.thing.name).toBe("Tub");
    expect(here?.inflows.map((r) => r.name)).toEqual(["inflow"]);
    expect(here?.outflows.map((r) => r.name)).toEqual(["outflow"]);
    expect(here?.crossings).toHaveLength(2);
    expect(thingKind(here!.thing)).toBe("component");
    expect(thingStamps(here!.thing)).toEqual(["buffering", "interface"]);
  });

  it("is null off a thing line, and null for a name the compiled model lacks", () => {
    expect(atCursor(text.split("\n"), 1, model)).toBeNull();
    expect(atCursor(["component Ghost"], 1, model)).toBeNull();
    expect(atCursor(text.split("\n"), 2, null)).toBeNull();
  });

  it("names environment things by the author's word", () => {
    expect(thingKind(model.things[1])).toBe("source");
    expect(thingKind(model.things[2])).toBe("sink");
  });
});

describe("WriteMargin", () => {
  it("renders the three cards with the doors to Build and Read", () => {
    const m = renderToStaticMarkup(
      <WriteMargin model={model} verdict={{ issues: [] }} text={text} cursorLine={2} onBuild={noop} onRead={noop} />,
    );
    expect(m).toContain("Diagram");
    expect(m).toContain("<svg");
    expect(m).toContain("Build ↗");
    expect(m).toContain("What the kernel says");
    expect(m).toContain("✓ clean");
    expect(m).toContain("Read ↗");
    expect(m).toContain("At the cursor");
    expect(m).toContain("Tub");
    expect(m).toContain("2 boundary crossings");
  });

  it("says what is missing rather than hiding a card", () => {
    const m = renderToStaticMarkup(
      <WriteMargin model={null} verdict={null} text="" cursorLine={null} onBuild={noop} onRead={noop} />,
    );
    expect(m).toContain("nothing to draw yet");
    expect(m).toContain("Compile the text and the verdict appears here.");
    expect(m).toContain("Put the caret on a component, source or sink line.");
  });
});
