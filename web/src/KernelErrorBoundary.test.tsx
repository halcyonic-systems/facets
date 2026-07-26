// The copy the boundary renders must be TRUE of the failure it caught (#233).
//
// "The canvas recovers on its own" is true of a contractual refusal — the reset
// keys clear it on the next edit and the kernel was never unwell. It was false
// of a trap, which is the one failure the kernel cannot describe, and which the
// old copy nevertheless described. This test is the mechanism that keeps the
// two sentences attached to the right errors: a future edit that hands the
// recovery claim back to the trap branch fails here.
//
// It renders the boundary's error branch directly (React's server renderer does
// not run `getDerivedStateFromError`, so the state is set the way React sets it
// and `render()` is called for real).

import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { ReactElement } from "react";

import { KernelErrorBoundary } from "./KernelErrorBoundary";
import { KernelError, KernelTrap } from "./kernel";

function renderCaught(error: Error): string {
  const boundary = new KernelErrorBoundary({ resetKeys: [], children: null });
  boundary.state = KernelErrorBoundary.getDerivedStateFromError(error);
  return renderToStaticMarkup(boundary.render() as ReactElement);
}

describe("the error boundary's copy matches the failure", () => {
  it("promises recovery for a contractual refusal", () => {
    const html = renderCaught(new KernelError("analyze_canvas", "Mobus §4.3: flow edges require k ≠ o"));

    expect(html).toContain("Kernel rejected this state");
    expect(html).toContain("Mobus §4.3: flow edges require k ≠ o");
    expect(html).toContain("the canvas recovers on its own");
  });

  it("promises no recovery for a trap, and names it a kernel bug", () => {
    const html = renderCaught(new KernelTrap("analyze_canvas", "the kernel aborted inside analyze_canvas()"));

    // The claim that is false of a trap must be absent.
    expect(html).not.toContain("recovers on its own");
    // And what replaces it has to say whose fault it is and what to do.
    expect(html).toContain("bug in the kernel");
    expect(html).toContain("not a verdict about your model");
    expect(html).toContain("console");
  });

  it("says nothing about recovery for an unrelated JS error", () => {
    const html = renderCaught(new Error("Cannot read properties of undefined"));

    expect(html).not.toContain("recovers on its own");
    expect(html).not.toContain("bug in the kernel");
  });
});
