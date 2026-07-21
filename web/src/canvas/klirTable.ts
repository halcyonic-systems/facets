// Pure data helpers for the Klir matrix register (#100). The incidence matrix
// IS presentation: which relations occupy cell (row, col) is a plain reading of
// the model's (T, R) — no verdict lives here (legality stays the kernel's via
// validate_connection; boundary/edge facts stay in LensFacts). Kept DOM-free so
// the cell semantics are testable on their own.
import type { CanvasModel, Relation, Thing } from "../kernel/types";

/** The relations occupying cell (row, col) of the T×T incidence table.
 *
 *  Reading discipline: a directed relation (a, b) occupies only its own cell;
 *  a neutral relation occupies both mirrored cells (R ⊆ T×T with the observer
 *  not having asserted an ordering — Facets ch. 4, the per-relation toggle).
 *  The diagonal guard keeps a self-loop from being read twice through its own
 *  mirror. */
export function relationsAt(model: CanvasModel, row: number, col: number): Relation[] {
  return model.relations.filter(
    (r) =>
      (r.a === row && r.b === col) ||
      (r.klir_directed !== true && r.a === col && r.b === row && row !== col),
  );
}

/** Klir's signature label for a relation — index-of convention shared with the
 *  diagram face (klir.tsx): rN by position in the model's relation list. */
export function sigLabel(model: CanvasModel, r: Relation): string {
  return `r${model.relations.indexOf(r) + 1}`;
}

/** Mint the next free id the same way the gesture layer does (max + 1). */
export function nextFreeId(ids: number[]): number {
  return (ids.length ? Math.max(...ids) : 0) + 1;
}

/** A layout position for a thing born from the matrix. The matrix does not
 *  care where things sit, but the other two lenses (and the locator margin)
 *  do — so mint a deterministic spot below the existing content, walking
 *  rightward in slots so successive adds don't pile onto one point. Pure
 *  presentation: coordinates carry no systems meaning. */
export function mintThingPosition(things: Thing[]): { x: number; y: number } {
  if (things.length === 0) return { x: 0, y: 0 };
  const minX = Math.min(...things.map((t) => t.x));
  const maxY = Math.max(...things.map((t) => t.y));
  const slot = things.length % 4;
  return { x: minX + slot * 160, y: maxY + 140 };
}
