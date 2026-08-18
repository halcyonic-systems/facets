// The inspector's load-bearing claims, rendered to static markup:
//   1. the substance rule — a pass-through INHERITS ("set it at the Source"),
//      a signal primitive is LOCKED to Message, a Sink absorbs; only free
//      emitters get the chooser.
//   2. the Buffering block appears only on a buffer, with the drain-law
//      toggle (rate | smoothed τ).
//   3. a stamped node names its Troncale process (provenance, not a new atom).
//   4. the teaching card leads with plain English.

import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import SandboxInspector from "./SandboxInspector";
import type { SandboxNode, SandboxPaletteEntry, SandboxSnapshot } from "../kernel/types";

const card = (plain: string): SandboxPaletteEntry["card"] => ({
  plain,
  everyday: "an everyday case",
  math: "out = f(in)",
  substance: "takes and gives",
  theory: "Mobus",
  code: "…",
});

const PALETTE: SandboxPaletteEntry[] = [
  { kind: "Source", param_spec: ["rate / tick", 10], emits_signal: false, inherits_substance: false, default_out: "Material", card: card("Where something enters.") },
  { kind: "Buffering", param_spec: null, emits_signal: false, inherits_substance: true, default_out: "Material", card: card("A store.") },
  { kind: "Sensing", param_spec: ["sensor gain  k", 1], emits_signal: true, inherits_substance: false, default_out: "Message", card: card("Reads a flow.") },
  { kind: "Sink", param_spec: null, emits_signal: false, inherits_substance: false, default_out: "Material", card: card("Where it leaves.") },
];

function node(kind: string, over: Partial<SandboxNode> = {}): SandboxNode {
  return {
    kind,
    name: `${kind} 1`,
    x: 0,
    y: 0,
    param: 1,
    release_rate: 1,
    initial_storage: 0,
    capacity: 0,
    setpoint: 1,
    time_constant: 0,
    maintenance: 0,
    back_pressure: false,
    substance: "Material",
    substance_base: "Material",
    activity: 0,
    storage: 0,
    total: 0,
    spark: [],
    process: null,
    ...over,
  };
}

function snap(nodes: SandboxNode[]): SandboxSnapshot {
  return {
    tick: 0,
    time: 0,
    invariant: "conserved",
    balance: 0,
    emitted: 0,
    sunk: 0,
    dissipated: 0,
    stored: 0,
    algebraic_cycle: null,
    nodes,
    wires: [],
  };
}

const render = (nodes: SandboxNode[], index = 0) =>
  renderToStaticMarkup(
    <SandboxInspector
      snapshot={snap(nodes)}
      palette={PALETTE}
      selected={{ kind: "node", index }}
      mutate={() => {}}
      onDelete={() => {}}
    />,
  );

describe("sandbox inspector", () => {
  it("a pass-through inherits its substance — set it at the Source", () => {
    const html = render([node("Buffering")]);
    expect(html).toContain("inherited from inflow");
    expect(html).not.toContain("<select");
  });

  it("a signal primitive is locked to Message", () => {
    const html = render([node("Sensing", { substance: "Message", substance_base: "Message" })]);
    expect(html).toContain("signal (Message)");
    expect(html).toContain("fixed by this process");
    expect(html).not.toContain("<select");
  });

  it("a Sink absorbs; a free emitter gets the chooser", () => {
    expect(render([node("Sink")])).toContain("absorbs everything");
    expect(render([node("Source")])).toContain("<select");
  });

  it("the Buffering block carries the drain-law toggle; others don't", () => {
    const buf = render([node("Buffering")]);
    expect(buf).toContain("smoothed τ");
    expect(buf).toContain("release / tick");
    expect(render([node("Source")])).not.toContain("smoothed τ");
  });

  it("a stamped node names its Troncale process", () => {
    const html = render([node("Buffering", { process: "Flows" })]);
    expect(html).toContain("part of a");
    expect(html).toContain("Flows");
    expect(html).toContain("editable freely");
  });

  it("the teaching card leads with plain English", () => {
    expect(render([node("Source")])).toContain("Where something enters.");
  });
});
