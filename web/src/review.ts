// The review reading (#204): what the kernel actually did, in the author's
// language. Presentation logic only — every verdict here is already a kernel
// verdict; this module counts them, names the mode they were judged at, and
// reorders a message so its plain sentence leads and its citation follows.
import type { CanvasModel, Lens, Severity, ValidationResult } from "./kernel/types";

/** The kernel's own lens→mode gate (bert-canvas `Lens::mode`, canvas.rs). A
 *  verdict without its mode is meaningless: Bunge runs Structural (bonding
 *  only) while Mobus runs Operational (self-loops, dead ends, reachability,
 *  stock dimensions), so the same model reads differently under each. */
export const MODE_BY_LENS: Record<Lens, string> = {
  Klir: "Core",
  Bunge: "Structural",
  Mobus: "Operational",
};

/** What the active mode looked at — said out loud, because "clean under Bunge"
 *  and "clean under Mobus" are different claims. */
export const MODE_SCOPE: Record<Lens, string> = {
  Klir: "Core mode checks that every relation's endpoints resolve. It does not check bonding, dead ends, or dynamics.",
  Bunge:
    "Structural mode checks bonding only — whether two distinct components are bonded at all. It says nothing about dead ends, reachability, or stock units.",
  Mobus:
    "Operational mode checks self-loops, dead ends, reachability, and stock dimensions, plus openness and flowless interfaces.",
};

/** The edge noun each tradition uses for what the canvas stores as a relation. */
const EDGE_NOUN: Record<Lens, [string, string]> = {
  Klir: ["relation", "relations"],
  Bunge: ["relation", "relations"],
  Mobus: ["flow", "flows"],
};

export interface ReviewCounts {
  things: number;
  relations: number;
  errors: number;
  warnings: number;
}

export function reviewCounts(model: CanvasModel, validation: ValidationResult | null): ReviewCounts {
  const issues = validation?.issues ?? [];
  return {
    things: model.things.length,
    relations: model.relations.length,
    errors: issues.filter((i) => i.severity === "Error").length,
    warnings: issues.filter((i) => i.severity === "Warning").length,
  };
}

function count(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** "2 errors and 1 warning" / "1 warning" / "No issues found". */
export function findingsPhrase(errors: number, warnings: number): string {
  const parts: string[] = [];
  if (errors > 0) parts.push(count(errors, "error", "errors"));
  if (warnings > 0) parts.push(count(warnings, "warning", "warnings"));
  if (parts.length === 0) return "No issues found";
  return parts.join(" and ");
}

/** The headline: what was reviewed, under which lens and mode, and what came
 *  back. Lens and mode are always named. */
export function summaryLine(model: CanvasModel, validation: ValidationResult | null): string {
  const c = reviewCounts(model, validation);
  const [edgeOne, edgeMany] = EDGE_NOUN[model.lens];
  const scope = `${count(c.things, "thing", "things")} and ${count(c.relations, edgeOne, edgeMany)}`;
  return `Reviewed ${scope} under ${model.lens}, ${MODE_BY_LENS[model.lens]} mode. ${findingsPhrase(c.errors, c.warnings)}.`;
}

/** Kernel messages lead with their citation ("Bunge Def 1.1: a system requires
 *  …"). The verdict is the sentence; the citation is where to read why. Split
 *  them so the sentence can lead — the message text itself is never rewritten. */
const CITATION = /^([A-Z][A-Za-z]+ (?:§|Def|Definition|Postulate|Axiom|Thm|Theorem|Ch\.|Fig\.)[^:]*): (.+)$/s;

export function plainFirst(message: string): { plain: string; citation: string | null } {
  const m = CITATION.exec(message);
  if (!m) return { plain: message, citation: null };
  const rest = m[2];
  return { plain: rest.charAt(0).toUpperCase() + rest.slice(1), citation: m[1] };
}

/** What a severity means, in one line. A Warning is the kernel naming something
 *  and leaving the judgment to the author; only an Error is a refusal (#212). */
export const SEVERITY_GLOSS: Record<Severity, string> = {
  Error: "The kernel refuses this model at this mode.",
  Warning: "The kernel is naming these. Whether they are wrong is your call.",
};

export const SEVERITY_HEADING: Record<Severity, string> = {
  Error: "Refusals",
  Warning: "Observations",
};
