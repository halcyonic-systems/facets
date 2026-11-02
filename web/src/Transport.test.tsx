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
    expect(renderToStaticMarkup(<Transport {...base} />)).not.toContain("keep going");
  });

  it("is a pressed toggle with its word when set, unpressed when not", () => {
    const on = renderToStaticMarkup(<Transport {...base} runOn onRunOnChange={noop} onRunOnTick={noop} />);
    expect(on).toContain("keep going");
    expect(on).toMatch(/title="Keep going:[^"]*"[^>]*aria-pressed="true"/);
    const off = renderToStaticMarkup(<Transport {...base} runOn={false} onRunOnChange={noop} onRunOnTick={noop} />);
    expect(off).toMatch(/title="Stops at the run length[^"]*"[^>]*aria-pressed="false"/);
  });
});

// Decision 1 (2026-11-02): one strip is the one way into the run.
describe("the strip as the run's one entry", () => {
  it("opens the readouts, and offers the way back once they are open", () => {
    const closed = renderToStaticMarkup(<Transport {...base} readouts={{ open: false, onToggle: noop }} />);
    expect(closed).toContain("inputs &amp; readouts");
    const open = renderToStaticMarkup(<Transport {...base} readouts={{ open: true, onToggle: noop }} />);
    expect(open).toMatch(/aria-pressed="true"[^>]*>.*model/s);
  });

  it("says when a knob changed mid-run, so mixed totals do not look wrong", () => {
    expect(renderToStaticMarkup(<Transport {...base} />)).not.toContain("changed at tick");
    expect(renderToStaticMarkup(<Transport {...base} changedAt={[4]} />)).toContain("knob changed at tick 4");
    expect(renderToStaticMarkup(<Transport {...base} changedAt={[4, 7]} />)).toContain("knobs changed at ticks 4, 7");
  });
});
