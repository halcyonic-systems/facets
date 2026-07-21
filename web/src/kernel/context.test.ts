// buildModelContext / renderContextForPrompt — the substrate is pure assembly,
// so these tests carry no wasm and no LLM. renderContextForPrompt is exercised
// on hand-built ModelContexts (verbatim kernel shapes); buildModelContext is
// exercised with ./index mocked, since the real module pulls the wasm url import
// that only Vite resolves — the same reason contract.test.ts never touches it.

import { describe, it, expect, vi, beforeEach } from "vitest";

import type { CanvasModel, CanvasAnalysis, LensDescription } from "./types";
import type { ModelContext } from "./context";

vi.mock("./index", () => ({
  analyzeCanvas: vi.fn(),
  project: vi.fn(),
}));

import { analyzeCanvas, project } from "./index";
import { buildModelContext, renderContextForPrompt } from "./context";

// ---- fixtures (verbatim kernel-output shapes) -------------------------------

const mobusCanvas: CanvasModel = {
  lens: "Mobus",
  things: [
    { id: 1, name: "Pump", x: 0, y: 0, role: "Component" },
    { id: 2, name: "Tank", x: 0, y: 0, role: "Component" },
    { id: 3, name: "Grid", x: 0, y: 0, role: "Environment" },
  ],
  relations: [
    { id: 10, a: 1, b: 2, name: "drive", is_bond: true, kind: "Energy" },
    { id: 11, a: 3, b: 1, name: "supply", is_bond: true, kind: "Energy" },
    { id: 12, a: 2, b: 2, name: "recycle", is_bond: true, kind: "Matter" },
    { id: 13, a: 1, b: 2, name: "telemetry", is_bond: false, kind: "Unspecified" },
  ],
  boundary: { porosity: 0.35, perceptive_fuzziness: 0.2 },
};

const mobusDescription: LensDescription = {
  lens: "Mobus",
  question: "how is the mechanism built, and what happens when it runs?",
  c: ["Pump", "Tank"],
  n: 2,
  e_objects: ["Grid"],
  milieu_note: "μ (milieu) is parametric/opaque — the one element with no cross-lens preimage",
  g: 1,
  b_interfaces: ["Pump", "Tank (flowless)"],
  porosity: 0.35,
  perceptive_fuzziness: 0.2,
  t_note: "T: transforms — parametric by intent; bert-compose fills the slot",
  h_note: "H: history (accumulated state conditioning T) — NOT hierarchy",
  dt_note: "Δt: time scale — a parametric field on the system",
  self_loop_conflicts: ["recycle"],
};

const mobusAnalysis: CanvasAnalysis = {
  validation: {
    issues: [
      {
        severity: "Error",
        location: "interactions[2]",
        message: "Mobus §4.3: 'recycle' has the same endpoint as source and sink",
        suggestion: "Remove the self-loop; feedback as a first-class cycle is Cybernetic mode",
      },
    ],
  },
  issue_targets: [{ thing: null, relation: 12 }],
  facts: {
    boundary_thing_ids: [1],
    environment_thing_ids: [3],
    orphan_env_thing_ids: [],
    authored_interface_thing_ids: [2],
    boundary_props: { porosity: 0.35, perceptive_fuzziness: 0.2 },
    aggregate: false,
    edges: [
      { id: 10, a: 1, b: 2, bond: true, kind: "Energy", locus: "Endo", self_loop: false, mobus_ok: true },
      { id: 11, a: 3, b: 1, bond: true, kind: "Energy", locus: "Exo", self_loop: false, mobus_ok: true },
      { id: 12, a: 2, b: 2, bond: true, kind: "Matter", locus: "Endo", self_loop: true, mobus_ok: false },
      { id: 13, a: 1, b: 2, bond: false, kind: "Unspecified", locus: "Endo", self_loop: false, mobus_ok: true },
    ],
    ports: [{ component: 1, env: 3, relation_ids: [11], direction: "Receives", protocol: "supply" }],
  },
  description: mobusDescription,
  residue: {
    hidden: [{ count: 1, label: "mere relation" }],
    unspecified: [{ count: 1, label: "substance" }],
  },
};

function ctxOf(canvas: CanvasModel, analysis: CanvasAnalysis): ModelContext {
  return {
    lens: canvas.lens,
    canvas,
    world: null,
    analysis,
    provenance: { generated_at: "2026-07-17T00:00:00.000Z", source: "bert-lenses" },
  };
}

const mobusCtx = ctxOf(mobusCanvas, mobusAnalysis);

// A clean-gate Klir context, to cover the Klir formal object + the "no issues"
// verdict + suggestion-null path in one fixture.
const klirCanvas: CanvasModel = {
  lens: "Klir",
  things: [
    { id: 1, name: "A", x: 0, y: 0, role: "Component" },
    { id: 2, name: "B", x: 0, y: 0, role: "Component" },
  ],
  relations: [{ id: 5, a: 1, b: 2, name: "couples", is_bond: false, kind: "Unspecified" }],
  boundary: { porosity: 0, perceptive_fuzziness: 0 },
};

const klirAnalysis: CanvasAnalysis = {
  validation: { issues: [] },
  issue_targets: [],
  facts: {
    boundary_thing_ids: [],
    environment_thing_ids: [],
    orphan_env_thing_ids: [],
    authored_interface_thing_ids: [],
    boundary_props: { porosity: 0, perceptive_fuzziness: 0 },
    aggregate: false,
    edges: [{ id: 5, a: 1, b: 2, bond: false, kind: "Unspecified", locus: "Endo", self_loop: false, mobus_ok: true }],
    ports: [],
  },
  description: {
    lens: "Klir",
    question: "what does the data commit me to?",
    things: 2,
    relations: 1,
    directed: 0,
    neutral: 1,
    note: "a system is what is distinguished as a system by the investigator",
  },
  residue: { hidden: [], unspecified: [] },
};

const klirCtx = ctxOf(klirCanvas, klirAnalysis);

// A Bunge context with a thing-targeted issue, to cover the Bunge formal object
// and the [thing:N] target branch.
const bungeAnalysis: CanvasAnalysis = {
  validation: {
    issues: [
      {
        severity: "Warning",
        location: "systems[0]",
        message: "'A' is unreachable from any entry point",
        suggestion: null,
      },
    ],
  },
  issue_targets: [{ thing: 1, relation: null }],
  facts: klirAnalysis.facts,
  description: {
    lens: "Bunge",
    question: "what is the thing, and by what mechanism does it change?",
    composition: ["A", "B"],
    environment: [],
    endostructure: 1,
    exostructure: 0,
    bondage: 0,
    mere_relations: 1,
    boundary_components: [],
    verdict: "aggregate",
    mechanism_note: "M (mechanism) is documented but formally UNbridged: CES, not CESM.",
  },
  residue: { hidden: [], unspecified: [] },
};

const bungeCtx = ctxOf({ ...klirCanvas, lens: "Bunge" }, bungeAnalysis);

// ---- renderContextForPrompt -------------------------------------------------

describe("renderContextForPrompt", () => {
  it("renders the Mobus context (snapshot)", () => {
    expect(renderContextForPrompt(mobusCtx)).toMatchInlineSnapshot(`
      "## Lens
      Mobus — 8-tuple system ⟨C,N,E,G,B,T,H,Δt⟩ (E first-class = Lean's addition to the book's 7-tuple)

      ## Formal object (kernel: describe)
      8-tuple ⟨C,N,E,G,B,T,H,Δt⟩:
      C=[Pump, Tank] (n=2)
      E objects=[Grid]
      μ (milieu) is parametric/opaque — the one element with no cross-lens preimage
      G=1
      B interfaces=[Pump, Tank (flowless)], porosity=0.35, perceptive_fuzziness=0.2
      T: transforms — parametric by intent; bert-compose fills the slot
      H: history (accumulated state conditioning T) — NOT hierarchy
      Δt: time scale — a parametric field on the system
      self_loop_conflicts=[recycle]

      ## Elements
      Things:
      - [thing:1] "Pump" (Component, boundary=y, interface=n)
      - [thing:2] "Tank" (Component, boundary=n, interface=y)
      - [thing:3] "Grid" (Environment, boundary=n, interface=n)
      Relations:
      - [relation:10] "drive": [thing:1] -> [thing:2] (bond=y, kind=Energy, locus=Endo, self_loop=n)
      - [relation:11] "supply": [thing:3] -> [thing:1] (bond=y, kind=Energy, locus=Exo, self_loop=n)
      - [relation:12] "recycle": [thing:2] -> [thing:2] (bond=y, kind=Matter, locus=Endo, self_loop=y)
      - [relation:13] "telemetry": [thing:1] -> [thing:2] (bond=n, kind=Unspecified, locus=Endo, self_loop=n)
      Ports (Mobus lens only):
      - [thing:1] <-> [thing:3]: direction=Receives, protocol=supply

      ## Kernel verdicts (analysis.validation)
      - [issue:0] Error at interactions[2]: Mobus §4.3: 'recycle' has the same endpoint as source and sink — Suggestion: Remove the self-loop; feedback as a first-class cycle is Cybernetic mode (target: [relation:12])"
    `);
  });

  it("renders the Klir formal object and a clean gate", () => {
    const out = renderContextForPrompt(klirCtx);
    expect(out).toContain("S = (T, R): things=2, relations=1, directed=0, neutral=1");
    expect(out).toContain("No issues. The kernel gate is clean at Core.");
    expect(out).not.toContain("Ports (Mobus lens only):");
  });

  it("renders the Bunge formal object and a thing-target issue with a null suggestion", () => {
    const out = renderContextForPrompt(bungeCtx);
    expect(out).toContain("µ(σ) = ⟨C,E,S,M⟩: composition=[A, B]");
    expect(out).toContain("verdict=aggregate");
    expect(out).toContain("- [issue:0] Warning at systems[0]: 'A' is unreachable from any entry point (target: [thing:1])");
    expect(out).not.toContain("Suggestion:");
  });

  it("gives every thing, relation, and issue exactly one citation token", () => {
    const out = renderContextForPrompt(mobusCtx);
    // Scope each element class to its own section to keep the ports block (which
    // re-uses thing tokens) from inflating the per-thing count.
    const elems = out.slice(out.indexOf("## Elements"), out.indexOf("## Kernel verdicts"));
    const things = elems.slice(elems.indexOf("Things:"), elems.indexOf("Relations:"));
    const relations = elems.slice(elems.indexOf("Relations:"), elems.indexOf("Ports"));
    for (const t of mobusCanvas.things) {
      expect(things.match(new RegExp(`\\[thing:${t.id}\\]`, "g"))).toHaveLength(1);
    }
    for (const e of mobusAnalysis.facts.edges) {
      expect(relations.match(new RegExp(`\\[relation:${e.id}\\]`, "g"))).toHaveLength(1);
    }
    const issueSection = out.slice(out.indexOf("## Kernel verdicts"));
    mobusAnalysis.validation.issues.forEach((_, i) => {
      expect(issueSection.match(new RegExp(`\\[issue:${i}\\]`, "g"))).toHaveLength(1);
    });
  });

  it("renders a ## System type section when the model asserts one (omitting blanks)", () => {
    const typed = renderContextForPrompt({
      ...mobusCtx,
      system_type: { kingdom: "Concrete", genus: "Social", domain: "U.S. legislative process" },
    });
    expect(typed).toContain("## System type\nKingdom: Concrete · Genus: Social · Domain: U.S. legislative process");

    // A partial assertion omits the unspecified fields.
    const partial = renderContextForPrompt({ ...mobusCtx, system_type: { kingdom: "Conceptual" } });
    expect(partial).toContain("## System type\nKingdom: Conceptual");
    expect(partial).not.toContain("Genus:");
  });

  it("omits the System type section entirely when nothing is asserted", () => {
    expect(renderContextForPrompt(mobusCtx)).not.toContain("## System type");
  });

  it("is deterministic: two calls (differing provenance) yield identical bodies", () => {
    const a = renderContextForPrompt(mobusCtx);
    const b = renderContextForPrompt({
      ...mobusCtx,
      provenance: { generated_at: "1999-01-01T00:00:00.000Z", source: "bert-lenses" },
    });
    expect(a).toBe(b);
  });
});

// ---- buildModelContext (kernel mocked) --------------------------------------

describe("buildModelContext", () => {
  beforeEach(() => {
    vi.mocked(analyzeCanvas).mockReset();
    vi.mocked(project).mockReset();
  });

  it("assembles analyzeCanvas + project verbatim", () => {
    const world = { world: true };
    vi.mocked(analyzeCanvas).mockReturnValue(mobusAnalysis);
    vi.mocked(project).mockReturnValue(world);

    const ctx = buildModelContext(mobusCanvas);

    expect(ctx.lens).toBe("Mobus");
    expect(ctx.canvas).toBe(mobusCanvas);
    expect(ctx.analysis).toBe(mobusAnalysis);
    expect(ctx.world).toBe(world);
    expect(ctx.provenance.source).toBe("bert-lenses");
    expect(analyzeCanvas).toHaveBeenCalledTimes(1);
    expect(project).toHaveBeenCalledTimes(1);
  });

  it("yields world:null when project throws, without itself throwing", () => {
    vi.mocked(analyzeCanvas).mockReturnValue(mobusAnalysis);
    vi.mocked(project).mockImplementation(() => {
      throw new Error("projection refused");
    });

    const ctx = buildModelContext(mobusCanvas);

    expect(ctx.world).toBeNull();
    expect(ctx.analysis).toBe(mobusAnalysis);
  });
});
