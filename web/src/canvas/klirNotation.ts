// Presentation helpers behind the Klir register (#100): tuple notation, glyphs,
// and placement for register-born things.
//
// TOMBSTONE (#233). The cell-membership rule used to live here — including the
// symmetric closure that makes a neutral relation mark both orders of the
// matrix. That is a reading of Klir, not typesetting, and the register is a
// write surface, so it moved to the kernel:
//
//   crates/bert-canvas/src/notation.rs :: klir_incidence_cells
//   crates/bert-lenses-kernel/src/api.rs :: klir_incidence_cells (wasm export)
//   web/src/kernel/index.ts :: klirIncidenceCells (the forwarder)
//
// What remains below is typography and layout: mapping a kernel-decided mark
// onto a character, and finding a free spot on the demoted picture. Nothing here
// decides what a cell means.
import type { KlirCell, KlirIncidence, KlirMark, Relation, Thing } from "../kernel/types";

/** Next fresh id — same rule the gesture layer uses (max + 1). */
export function nextIdOf(ids: number[]): number {
  return (ids.length ? Math.max(...ids) : 0) + 1;
}

/** One relation as Eq. 1.1 element text: an ordered pair when the observer has
 *  toggled it directed, an unordered pair-set otherwise. Typesets the model's
 *  own `klir_directed` flag — no membership is derived here. */
export function relationTuple(r: Relation, nameOf: (id: number) => string): string {
  return r.klir_directed === true ? `(${nameOf(r.a)}, ${nameOf(r.b)})` : `{${nameOf(r.a)}, ${nameOf(r.b)}}`;
}

/** The kernel's incidence cells, addressable by (row, col) thing id. */
export function cellIndex(incidence: KlirIncidence): Map<string, KlirCell> {
  return new Map(incidence.cells.map((c) => [`${c.row},${c.col}`, c]));
}

/** The relations a cell holds, resolved against the model in the kernel's
 *  order. Ids the model no longer carries are dropped rather than faked. */
export function relationsIn(relations: Relation[], ids: number[]): Relation[] {
  const byId = new Map(relations.map((r) => [r.id, r]));
  return ids.flatMap((id) => {
    const r = byId.get(id);
    return r ? [r] : [];
  });
}

/** What an incidence cell shows (#100 harvest, from the matrix-centric arm):
 *  nothing, ● (neutral occupant), → (directed, read row → col), ↺ (diagonal
 *  self-relation), with a ×N count when relations stack. Pure typesetting over
 *  the kernel's mark. */
export function klirGlyph(mark: KlirMark, count: number): string {
  if (mark.mark === "empty" || count === 0) return "";
  const head = mark.mark === "self_loop" ? "↺" : mark.mark === "directed" ? "→" : "●";
  return count > 1 ? `${head}×${count}` : head;
}

/** Where a register-born thing lands on the (demoted) picture. Layout carries
 *  no Klir meaning — this only guarantees a fresh, non-overlapping spot: x
 *  strictly right of everything, y cycling a short column. */
export function nextThingPosition(things: Thing[]): { x: number; y: number } {
  if (things.length === 0) return { x: 0, y: 0 };
  const maxX = Math.max(...things.map((t) => t.x));
  const minY = Math.min(...things.map((t) => t.y));
  return { x: maxX + 150, y: minY + (things.length % 4) * 110 };
}
