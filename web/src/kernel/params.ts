// Param→relation resolution (run-legibility ws5) — ONE place that answers
// "which declared magnitudes does this param govern". The run rail's inputs
// card and the canvas EdgePopover both resolve through here, so a param can
// never mean different flows on different surfaces. Reads declarations only;
// decides nothing.
import type { CanvasModel, Manifest, ParamDecl, Relation } from "./types";

/** The declared magnitudes: bond relations carrying an amount (or ample). */
export function declaredRelations(model: CanvasModel): Relation[] {
  return model.relations.filter((r) => r.is_bond && (r.amount != null || r.ample));
}

/** The data column forcing this flow, if any — a forced flow's series, not
 *  its scalar, is what runs, so its scalar is never editable. */
export function forcedByColumn(manifest: Manifest | null, r: Relation): string | undefined {
  return manifest?.mapping.find((m) => m.as === "flow" && m.force && m.element === r.name)?.column;
}

export interface ParamRow {
  param: ParamDecl;
  /** Flow-anchored: the one declared relation the param governs. */
  relation?: Relation;
  /** Shares-anchored: the fanout group (≥ 2 declared outflows of the thing). */
  group?: Relation[];
}

/** Declared params in declaration order, each resolved to its relation(s).
 *  Unresolvable params (missing relation, degenerate share group) are
 *  dropped, exactly as the inputs card always treated them. */
export function resolveParamRows(model: CanvasModel): ParamRow[] {
  const declared = declaredRelations(model);
  const rows: ParamRow[] = [];
  for (const p of model.params ?? []) {
    const anchor = p.anchor;
    if ("Flow" in anchor) {
      const r = declared.find((r) => r.id === anchor.Flow.relation);
      if (r) rows.push({ param: p, relation: r });
    } else {
      const group = declared.filter((r) => r.a === anchor.Shares.thing);
      if (group.length >= 2) rows.push({ param: p, group });
    }
  }
  return rows;
}

/** The Flow-anchored param governing this relation, if one is declared.
 *  Shares-anchored params return null — a % split is a group behavior and
 *  keeps its group surface (the rail); the popover slider is for the flow
 *  that answers for itself. */
export function flowParamFor(model: CanvasModel, relationId: number): ParamDecl | null {
  for (const p of model.params ?? []) {
    if ("Flow" in p.anchor && p.anchor.Flow.relation === relationId) return p;
  }
  return null;
}
