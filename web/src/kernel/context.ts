// The ONE model-context provider: a formatter over kernel output, never a
// second brain. buildModelContext is pure assembly — one analyzeCanvas call and
// one guarded project call, every fact copied verbatim. renderContextForPrompt
// is deterministic string assembly over that. No systemhood is decided here; if
// you find a re-count, re-derivation, or re-interpretation of a kernel fact
// below, it is a bug — the kernel's verdict IS the context.

import type { CanvasModel, CanvasAnalysis, LensDescription, Lens, SystemType } from "./types";
import { analyzeCanvas, project } from "./index";

export type ModelContext = {
  lens: Lens;
  canvas: CanvasModel;
  /** The author-asserted system type, verbatim from the model (may be absent). */
  system_type?: SystemType;
  /** project(canvas) when the projection succeeds; null when it throws.
   *  Carried for provenance/debug — renderContextForPrompt does NOT dump it. */
  world: unknown | null;
  /** analyzeCanvas output, verbatim. The kernel's verdict IS the context. */
  analysis: CanvasAnalysis;
  provenance: { generated_at: string; source: "bert-lenses" };
};

/** Pure assembly: one analyzeCanvas call + one guarded project call. */
export function buildModelContext(model: CanvasModel): ModelContext {
  const analysis = analyzeCanvas(model);
  let world: unknown | null;
  try {
    world = project(model);
  } catch {
    world = null;
  }
  return {
    lens: model.lens,
    canvas: model,
    system_type: model.system_type,
    world,
    analysis,
    provenance: { generated_at: new Date().toISOString(), source: "bert-lenses" },
  };
}

// The lens's own framing line + the mode the canvas lens validates at. Static
// orientation labels, not derived verdicts — the formal object and the kernel
// verdicts below carry every computed fact.
const LENS_FRAMING: Record<Lens, string> = {
  Klir: "state/structure system S = (T, R), observer-relative distinction",
  // µ(σ) is the four-coordinate CESM object (2004); σ alone is the 1979 CES triple
  // (concordance row 1). E first-class is the Lean's addition to Mobus's 7-tuple.
  Bunge: "CESM ontology µ(σ) = ⟨C,E,S,M⟩ (composition, environment, structure, mechanism)",
  Mobus: "8-tuple system ⟨C,N,E,G,B,T,H,Δt⟩ (E first-class = Lean's addition to the book's 7-tuple)",
};

const LENS_MODE: Record<Lens, string> = {
  Klir: "Core",
  Bunge: "Structural",
  Mobus: "Operational",
};

function byId<T extends { id: number }>(items: readonly T[]): T[] {
  return [...items].sort((x, y) => x.id - y.id);
}

function yn(b: boolean): string {
  return b ? "y" : "n";
}

function list(names: readonly string[]): string {
  return `[${names.join(", ")}]`;
}

function renderFormalObject(d: LensDescription): string {
  switch (d.lens) {
    case "Klir":
      return [
        `S = (T, R): things=${d.things}, relations=${d.relations}, directed=${d.directed}, neutral=${d.neutral}`,
        d.note,
      ].join("\n");
    case "Bunge":
      return [
        `µ(σ) = ⟨C,E,S,M⟩: composition=${list(d.composition)}, environment=${list(d.environment)},`,
        `endostructure=${d.endostructure}, exostructure=${d.exostructure}, bondage=${d.bondage}, mere_relations=${d.mere_relations},`,
        `boundary_components=${list(d.boundary_components)}, verdict=${d.verdict}`,
        d.mechanism_note,
      ].join("\n");
    case "Mobus":
      return [
        `8-tuple ⟨C,N,E,G,B,T,H,Δt⟩:`,
        `C=${list(d.c)} (n=${d.n})`,
        `E objects=${list(d.e_objects)}`,
        d.milieu_note,
        `G=${d.g}`,
        `B interfaces=${list(d.b_interfaces)}, porosity=${d.porosity}, perceptive_fuzziness=${d.perceptive_fuzziness}`,
        d.t_note,
        d.h_note,
        d.dt_note,
        `self_loop_conflicts=${list(d.self_loop_conflicts)}`,
      ].join("\n");
  }
}

function renderElements(ctx: ModelContext): string {
  const { canvas, analysis, lens } = ctx;
  const relName = new Map(canvas.relations.map((r) => [r.id, r.name]));
  const boundary = new Set(analysis.facts.boundary_thing_ids);
  const iface = new Set(analysis.facts.authored_interface_thing_ids);

  const things = byId(canvas.things).map(
    (t) =>
      `- [thing:${t.id}] "${t.name}" (${t.role}, boundary=${yn(boundary.has(t.id))}, interface=${yn(iface.has(t.id))})`,
  );

  const relations = byId(analysis.facts.edges).map((e) => {
    const name = relName.get(e.id) ?? "";
    return `- [relation:${e.id}] "${name}": [thing:${e.a}] -> [thing:${e.b}] (bond=${yn(e.bond)}, kind=${e.kind}, locus=${e.locus}, self_loop=${yn(e.self_loop)})`;
  });

  const sections = [`Things:`, ...things, `Relations:`, ...relations];

  if (lens === "Mobus") {
    const ports = analysis.facts.ports.map(
      (p) => `- [thing:${p.component}] <-> [thing:${p.env}]: direction=${p.direction}, protocol=${p.protocol}`,
    );
    sections.push(`Ports (Mobus lens only):`, ...ports);
  }

  return sections.join("\n");
}

function renderVerdicts(ctx: ModelContext): string {
  const { analysis, lens } = ctx;
  const issues = analysis.validation.issues;
  if (issues.length === 0) {
    return `No issues. The kernel gate is clean at ${LENS_MODE[lens]}.`;
  }
  return issues
    .map((issue, i) => {
      const suggestion = issue.suggestion === null ? "" : ` — Suggestion: ${issue.suggestion}`;
      const t = analysis.issue_targets[i];
      let target = "";
      if (t) {
        if (t.thing !== null) target = ` (target: [thing:${t.thing}])`;
        else if (t.relation !== null) target = ` (target: [relation:${t.relation}])`;
      }
      return `- [issue:${i}] ${issue.severity} at ${issue.location}: ${issue.message}${suggestion}${target}`;
    })
    .join("\n");
}

// The author's asserted type, one line — omitting any unspecified field. Returns
// null when nothing is asserted, so the section drops out entirely (matching
// pre-existing models, whose system_type is absent).
function renderSystemType(st: SystemType | undefined): string | null {
  if (!st) return null;
  const parts: string[] = [];
  if (st.kingdom) parts.push(`Kingdom: ${st.kingdom}`);
  if (st.genus) parts.push(`Genus: ${st.genus}`);
  if (st.domain && st.domain.trim()) parts.push(`Domain: ${st.domain.trim()}`);
  return parts.length === 0 ? null : parts.join(" · ");
}

/** Deterministic text the LLM sees. Same input → same string (the provenance
 *  timestamp is carried on the context but never rendered into the body). */
export function renderContextForPrompt(ctx: ModelContext): string {
  const lens = ctx.analysis.description.lens;
  const systemType = renderSystemType(ctx.system_type);
  return [
    `## Lens`,
    `${lens} — ${LENS_FRAMING[lens]}`,
    ...(systemType === null ? [] : [``, `## System type`, systemType]),
    ``,
    `## Formal object (kernel: describe)`,
    renderFormalObject(ctx.analysis.description),
    ``,
    `## Elements`,
    renderElements(ctx),
    ``,
    `## Kernel verdicts (analysis.validation)`,
    renderVerdicts(ctx),
  ].join("\n");
}
