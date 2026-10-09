// Stage 1 → stage 2 (#462 item 1, #308 part A): when the open model lands
// crossings on `interface unresolved`, the kernel can say whether another
// model of the SAME system — one that names its interfaces — resolves it
// (`check_resolution_canvas`, SSF #43's crossing half read between two
// stages). This module finds the candidates and runs the check; it decides
// nothing itself. Candidates come from the shelf and the author's library,
// matched by system name, and must themselves carry no `unresolved`.
import type { CanvasModel, ValidationIssue } from "./kernel/types";
import { checkResolutionCanvas } from "./kernel";

export interface PoolEntry {
  /** Where the candidate came from, for the row's provenance. */
  source: "shelf" | "library";
  label: string;
  model: CanvasModel;
}

export interface Stage2Candidate {
  source: "shelf" | "library";
  label: string;
  /** Empty = resolves every unresolved crossing. */
  issues: ValidationIssue[];
}

export interface Stage2Report {
  /** The system name the candidates were matched on. */
  system: string;
  candidates: Stage2Candidate[];
}

const UNRESOLVED = "unresolved";

export function isStage2Candidate(stage1: CanvasModel, cand: CanvasModel): boolean {
  const a = (stage1.name ?? "").trim().toLowerCase();
  const b = (cand.name ?? "").trim().toLowerCase();
  if (!a || a !== b) return false;
  if (cand.things.some((t) => t.name.toLowerCase() === UNRESOLVED)) return false;
  return cand.things.some((t) => t.role === "Component" && t.interface === true);
}

/** The report for `stage1` against `pool`. `check` is the kernel call,
 *  injectable so the matching can be tested without wasm. */
export function stage2Report(
  stage1: CanvasModel,
  pool: PoolEntry[],
  check: (a: CanvasModel, b: CanvasModel) => { issues: ValidationIssue[] } = checkResolutionCanvas,
): Stage2Report {
  const candidates = pool
    .filter((p) => p.model !== stage1 && isStage2Candidate(stage1, p.model))
    .map((p) => ({ source: p.source, label: p.label, issues: check(stage1, p.model).issues }));
  return { system: stage1.name ?? "", candidates };
}
