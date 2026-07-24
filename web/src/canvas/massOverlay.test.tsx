// #67 J9 — mass on the diagram. Two invariants: the overlay scales each state's
// disc size AND opacity with its probability (so the eye reads more mass as more
// ink); and a Markov run's readout carries NO conservation verdict (a
// distribution run has no residual — the pill is kind-discriminated away).
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { MarkovRunResult, Thing } from "../kernel/types";
import { MassOverlay } from "./MassOverlay";
import { MarkovReadout } from "./MarkovReadout";

const things = [
  { id: 1, name: "Even", x: 0, y: 0 },
  { id: 2, name: "Odd", x: 120, y: 0 },
] as unknown as Thing[];

// Parse a `<circle r=.. opacity=..>` for the disc under a named state's group.
function discFor(markup: string, name: string): { r: number; opacity: number } {
  const g = markup.split(`data-mass-node="${name}"`)[1] ?? "";
  const circle = g.slice(0, g.indexOf("</g>"));
  const r = Number(/ r="([\d.]+)"/.exec(circle)?.[1]);
  const opacity = Number(/opacity="([\d.]+)"/.exec(circle)?.[1]);
  return { r, opacity };
}

describe("MassOverlay — probability mass rides the nodes", () => {
  it("draws one disc per state, keyed by state name", () => {
    const m = renderToStaticMarkup(<MassOverlay things={things} mass={{ Even: 0.5, Odd: 0.5 }} />);
    expect(m).toContain('data-mass-node="Even"');
    expect(m).toContain('data-mass-node="Odd"');
  });

  it("scales a state's disc size AND opacity with its probability", () => {
    const m = renderToStaticMarkup(<MassOverlay things={things} mass={{ Even: 0.9, Odd: 0.1 }} />);
    const heavy = discFor(m, "Even");
    const light = discFor(m, "Odd");
    expect(heavy.r).toBeGreaterThan(light.r);
    expect(heavy.opacity).toBeGreaterThan(light.opacity);
  });

  it("reads a uniform distribution as equal mass on both states", () => {
    const m = renderToStaticMarkup(<MassOverlay things={things} mass={{ Even: 0.5, Odd: 0.5 }} />);
    const a = discFor(m, "Even");
    const b = discFor(m, "Odd");
    expect(a.r).toBeCloseTo(b.r);
    expect(a.opacity).toBeCloseTo(b.opacity);
    expect(m).toContain("50%");
  });

  it("skips a state with no matching node (no stray disc)", () => {
    const m = renderToStaticMarkup(<MassOverlay things={things} mass={{ Even: 1, Ghost: 0 }} />);
    expect(m).not.toContain('data-mass-node="Ghost"');
  });
});

describe("kind discrimination — a Markov run shows no conservation verdict", () => {
  const run: MarkovRunResult = {
    kind: "markov",
    states: ["Even", "Odd"],
    history: [
      [1, 0],
      [0.5, 0.5],
    ],
  };

  it("renders the distribution but never a conservation pill or residual", () => {
    const m = renderToStaticMarkup(<MarkovReadout run={run} tick={1} onTick={() => {}} />);
    expect(m).toContain("distribution");
    expect(m).toContain("Even 50%");
    expect(m).toContain("Odd 50%");
    // The conservation vocabulary belongs only to a RunResultRich.
    expect(m).not.toContain("conserved");
    expect(m).not.toContain("leak");
    expect(m).not.toContain("residual");
  });
});
