// The citation parser is pure display parsing over a resolver of canvas ids — no
// kernel, no wasm, no LLM, so this test carries none. It nails the three things
// the hallucination guard depends on: grammar match, unresolvable-token drop,
// and issue:N resolution through issue_targets.
import { describe, it, expect } from "vitest";
import type { CanvasModel, CanvasAnalysis } from "../kernel/types";
import { makeResolver, parseCitations, countLlmFindings } from "./citations";

const canvas: CanvasModel = {
  lens: "Mobus",
  things: [
    { id: 1, name: "A", x: 0, y: 0, role: "Component" },
    { id: 2, name: "B", x: 0, y: 0, role: "Component" },
  ],
  relations: [{ id: 10, a: 1, b: 2, name: "flow", is_bond: true, kind: "Energy" }],
  boundary: { porosity: 0, perceptive_fuzziness: 0 },
};

const analysis = {
  issue_targets: [
    { thing: 2, relation: null }, // issue:0 → thing 2
    { thing: null, relation: null }, // issue:1 → no subject, not navigable
  ],
} as unknown as CanvasAnalysis;

const resolver = makeResolver(canvas, analysis);

describe("parseCitations", () => {
  it("resolves thing and relation tokens to their targets", () => {
    const segs = parseCitations("[thing:1] drives [relation:10].", resolver);
    const cites = segs.filter((s) => s.kind === "cite");
    expect(cites).toHaveLength(2);
    expect(cites[0]).toMatchObject({ text: "[thing:1]", target: { thing: 1, relation: null } });
    expect(cites[1]).toMatchObject({ text: "[relation:10]", target: { thing: null, relation: 10 } });
    // the interstitial prose survives as text runs
    expect(segs.map((s) => s.kind)).toEqual(["cite", "text", "cite", "text"]);
  });

  it("drops an unresolvable token to plain text (hallucination guard)", () => {
    const segs = parseCitations("see [thing:99] and [relation:404]", resolver);
    expect(segs.every((s) => s.kind === "text")).toBe(true);
    expect(segs.map((s) => (s.kind === "text" ? s.text : "")).join("")).toBe(
      "see [thing:99] and [relation:404]",
    );
  });

  it("resolves issue:N through issue_targets, dropping out-of-range and subjectless issues", () => {
    const ok = parseCitations("[issue:0]", resolver).filter((s) => s.kind === "cite");
    expect(ok).toHaveLength(1);
    expect(ok[0]).toMatchObject({ target: { thing: 2, relation: null } });

    // issue:1 has both-null subject → not navigable → dropped
    expect(parseCitations("[issue:1]", resolver).every((s) => s.kind === "text")).toBe(true);
    // issue:9 is out of range → dropped
    expect(parseCitations("[issue:9]", resolver).every((s) => s.kind === "text")).toBe(true);
  });
});

describe("countLlmFindings", () => {
  it("counts evidence entries carrying no [issue:N] token", () => {
    const evidence = [
      "the veto path is missing [relation:10]", // LLM finding (no issue token)
      "confirms the kernel warning [issue:0]", // kernel-echoed, not an LLM finding
      "labels are swapped [thing:1] [thing:2]", // LLM finding
    ];
    expect(countLlmFindings(evidence)).toBe(2);
  });
});
