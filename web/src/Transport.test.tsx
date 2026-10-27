// The transport's run-on toggle (one-surface.md): shown only where a run can
// run on, pressed when it will, and the scrubber is handed the engine step
// only while it is set.
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Transport } from "./Transport";

const noop = () => {};
const base = {
  onRun: noop,
  onStep: noop,
  runnable: true,
  runTitle: "Run from the declared amounts",
  steps: 12,
  tick: 11,
  onTick: noop,
  playing: false,
  onPlayingChange: noop,
  loop: false,
  verdict: null,
};

describe("the transport's run on", () => {
  it("is absent where a run cannot run on (forced by data, or a Markov run)", () => {
    expect(renderToStaticMarkup(<Transport {...base} />)).not.toContain("run on");
  });

  it("is a pressed toggle with its word when set, unpressed when not", () => {
    const on = renderToStaticMarkup(<Transport {...base} runOn onRunOnChange={noop} onRunOnTick={noop} />);
    expect(on).toContain("run on");
    expect(on).toMatch(/title="Run on:[^"]*"[^>]*aria-pressed="true"/);
    const off = renderToStaticMarkup(<Transport {...base} runOn={false} onRunOnChange={noop} onRunOnTick={noop} />);
    expect(off).toMatch(/title="Stops at the run length[^"]*"[^>]*aria-pressed="false"/);
  });
});
