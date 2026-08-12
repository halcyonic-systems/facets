// The review reading (#204): what the kernel actually did, in the author's
// language. Presentation logic only — every verdict here is already a kernel
// verdict; this module counts them, names the mode they were judged at, and
// reorders a message so its plain sentence leads and its citation follows.
import type { CanvasModel, IssueTarget, Lens, Severity, ValidationIssue, ValidationResult } from "./kernel/types";

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
    "Operational mode checks self-loops, dead ends, reachability, stock dimensions, and that every interface carries a boundary-crossing flow, plus openness.",
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

// ---- grouping (#319) --------------------------------------------------------
//
// Seven refusals were two findings. Six of them differed only in a flow name and
// each carried the same paragraph of Lean citation, so the reader had to notice
// the repetition to read the panel at all: "I must admit I was a bit confused if
// the errors were even reporting correctly."
//
// What groups is a KERNEL judgment, not a text match. `ValidationIssue.code`
// names the defect kind (`bert_core::validate`, required at every construction
// site), so two issues collapse into one entry iff the kernel says they are the
// same defect. Nothing here reads the message to decide that, and no issue is
// ever dropped: every instance stays listed under its group, individually
// numbered and individually navigable.

/** One issue as the panel holds it: the verdict, its canvas target, and the
 *  position it occupies in the kernel's own ordering (the number the reader
 *  sees, so a grouped list still points back at a specific verdict). */
export interface IssueRow {
  issue: ValidationIssue;
  target: IssueTarget | undefined;
  index: number;
}

/** Repeats of one defect kind, with what all of them share hoisted out. */
export interface IssueGroup {
  /** The kernel's name for the defect. Empty when a verdict carries none, in
   *  which case the group is a singleton rather than a guess. */
  code: string;
  /** The code, spaced for reading. Typography only; the code is the fact. */
  label: string;
  /** Shared doc anchor, when every instance cites the same one. Also the
   *  adjacency key: the two halves of one authoring gap cite one entry. */
  doc: string | null;
  /** The repair, when every instance suggests the same one. This is what the
   *  reader acts on, so it leads. */
  repair: string | null;
  /** The justification clause, when every instance gives the same one. Carries
   *  the Lean citation, and belongs behind a disclosure rather than in front of
   *  the fix, read once instead of six times. */
  rationale: string | null;
  /** The citation prefix, when every instance leads with the same one. */
  citation: string | null;
  rows: IssueRow[];
}

/** The kernel writes `<verdict> — <why, with the citation in it>`. The verdict
 *  is what the reader needs first; the rest is what makes it checkable. Split
 *  at the first spaced em dash so the disclosure can hold the second half. The
 *  message text itself is never rewritten, and a message without one stays
 *  whole. */
export function splitRationale(plain: string): { claim: string; rationale: string | null } {
  const at = plain.indexOf(" — ");
  if (at < 0) return { claim: plain, rationale: null };
  return { claim: plain.slice(0, at), rationale: plain.slice(at + 3) };
}

/** "crossing_flow_without_interface" → "crossing flow without interface". */
export function codeLabel(code: string): string {
  return code.replace(/[._]/g, " ");
}

/** The one value every row agrees on, or null. Never invents a shared value: a
 *  group whose instances suggest different repairs shows them per instance. */
function shared<T>(rows: IssueRow[], of: (r: IssueRow) => T | null | undefined): T | null {
  const first = of(rows[0]) ?? null;
  if (first === null) return null;
  return rows.every((r) => (of(r) ?? null) === first) ? first : null;
}

/** Group by the kernel's defect kind, then set the halves of one gap side by
 *  side.
 *
 *  Order is the kernel's, twice over. Groups appear in the order their first
 *  instance did, and the only reordering is adjacency: a later group citing a
 *  doc anchor an earlier group already cited is pulled up next to it. "An
 *  interface with no flow" and "flows with no interface" are the same authoring
 *  mistake from both ends and cite one entry, so they land together and explain
 *  each other. An issue with no code is its own group; a missing key degrades to
 *  a singleton, never to a text match. */
export function groupIssues(rows: IssueRow[]): IssueGroup[] {
  const order: string[] = [];
  const byKey = new Map<string, IssueRow[]>();
  rows.forEach((row) => {
    const key = row.issue.code || ` singleton:${row.index}`;
    const bucket = byKey.get(key);
    if (bucket) bucket.push(row);
    else {
      byKey.set(key, [row]);
      order.push(key);
    }
  });

  const groups: IssueGroup[] = order.map((key) => {
    const bucket = byKey.get(key)!;
    const code = bucket[0].issue.code;
    const rationale = shared(bucket, (r) => splitRationale(plainFirst(r.issue.message).plain).rationale);
    return {
      code,
      label: codeLabel(code),
      doc: shared(bucket, (r) => r.issue.doc),
      repair: shared(bucket, (r) => r.issue.suggestion),
      rationale,
      citation: shared(bucket, (r) => plainFirst(r.issue.message).citation),
      rows: bucket,
    };
  });

  const paired: IssueGroup[] = [];
  const taken = new Set<number>();
  groups.forEach((g, i) => {
    if (taken.has(i)) return;
    taken.add(i);
    paired.push(g);
    if (g.doc === null) return;
    groups.forEach((other, j) => {
      if (j <= i || taken.has(j) || other.doc !== g.doc) return;
      taken.add(j);
      paired.push(other);
    });
  });
  return paired;
}

/** "2 findings, 7 instances" — the shape of the list, before the list. Seven
 *  items read as seven problems; naming the shape first is what stops that. */
export function shapePhrase(groups: IssueGroup[]): string {
  const instances = groups.reduce((n, g) => n + g.rows.length, 0);
  const findings = count(groups.length, "finding", "findings");
  if (instances === groups.length) return findings;
  return `${findings}, ${count(instances, "instance", "instances")}`;
}
