// Pure DISPLAY parsing for the Analyst panel — resolve the citation tokens the
// LLM echoes back to canvas ids for click-navigation. This is NOT systems logic:
// it decides nothing about the model, only which spans of narration become
// clickable chips. A token that resolves to no existing id / issue index is left
// in place as plain text — the hallucination guard: a fabricated [thing:99] can
// never navigate, it degrades to visibly-uncited text.
import type { CanvasModel, CanvasAnalysis, IssueTarget } from "../kernel/types";

// The whole cross-layer contract (context.ts emits these, GSR echoes them).
const CITATION_RE = /\[(thing|relation|issue):(\d+)\]/g;
const ISSUE_TOKEN_RE = /\[issue:\d+\]/;

export type CitationSegment =
  | { kind: "text"; text: string }
  | { kind: "cite"; text: string; label: string; target: IssueTarget };

// The ids the tokens are allowed to resolve to, plus their names, lifted off the
// same context the LLM was handed. issueTargets is index-parallel with the
// kernel's issues.
export interface CitationResolver {
  thingIds: Set<number>;
  relationIds: Set<number>;
  issueTargets: IssueTarget[];
  thingNames: Map<number, string>;
  relationNames: Map<number, string>;
}

export function makeResolver(model: CanvasModel, analysis: CanvasAnalysis): CitationResolver {
  return {
    thingIds: new Set(model.things.map((t) => t.id)),
    relationIds: new Set(model.relations.map((r) => r.id)),
    issueTargets: analysis.issue_targets,
    thingNames: new Map(model.things.map((t) => [t.id, t.name])),
    relationNames: new Map(model.relations.map((r) => [r.id, r.name])),
  };
}

function resolveToken(kind: string, n: number, r: CitationResolver): IssueTarget | null {
  if (kind === "thing") return r.thingIds.has(n) ? { thing: n, relation: null } : null;
  if (kind === "relation") return r.relationIds.has(n) ? { thing: null, relation: n } : null;
  if (kind === "issue") {
    const t = r.issueTargets[n];
    return t && (t.thing !== null || t.relation !== null) ? t : null;
  }
  return null;
}

// A chip shows the element's name, not the raw token — so narration reads as
// "'Law' is a terminal state" rather than a token dump. A relation can carry an
// empty name, so fall back to a "kind N" form; a chip never renders a bare token.
function nameOr(name: string | undefined, kind: string, n: number): string {
  return name && name.trim() ? name : `${kind} ${n}`;
}

function labelFor(kind: string, n: number, target: IssueTarget, r: CitationResolver): string {
  if (kind === "thing") return nameOr(r.thingNames.get(n), "thing", n);
  if (kind === "relation") return nameOr(r.relationNames.get(n), "relation", n);
  // issue:N — label by the element the warning points at.
  if (target.thing !== null) return nameOr(r.thingNames.get(target.thing), "thing", target.thing);
  if (target.relation !== null) return nameOr(r.relationNames.get(target.relation), "relation", target.relation);
  return `issue ${n}`;
}

// Split a narration string into text runs and resolved-citation chips. An
// unresolved token is folded back into the surrounding text (never emitted as a
// chip), so it renders as plain, visibly-uncited text.
export function parseCitations(text: string, r: CitationResolver): CitationSegment[] {
  const out: CitationSegment[] = [];
  let last = 0;
  for (const m of text.matchAll(CITATION_RE)) {
    const [tok, kind, nStr] = m;
    const idx = m.index ?? 0;
    const n = Number(nStr);
    const target = resolveToken(kind, n, r);
    if (!target) continue; // unresolved → left in place, becomes plain text
    if (idx > last) out.push({ kind: "text", text: text.slice(last, idx) });
    out.push({ kind: "cite", text: tok, label: labelFor(kind, n, target, r), target });
    last = idx + tok.length;
  }
  if (last < text.length) out.push({ kind: "text", text: text.slice(last) });
  return out;
}

// Coverage dial's LLM leg: evidence entries the kernel could not have made —
// those carrying no [issue:N] token (§C).
export function countLlmFindings(evidence: string[]): number {
  return evidence.filter((e) => !ISSUE_TOKEN_RE.test(e)).length;
}
