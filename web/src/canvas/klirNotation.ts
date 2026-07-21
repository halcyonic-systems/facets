// Pure helpers behind the Klir register (#100): tuple notation, matrix cell
// membership, and placement for register-born things. Presentation arithmetic
// only — no systems verdict lives here (legality stays validate_connection's;
// these functions just typeset and place what the model already says).
import type { CanvasModel, Relation, Thing } from "../kernel/types";

/** Next fresh id — same rule the gesture layer uses (max + 1). */
export function nextIdOf(ids: number[]): number {
  return (ids.length ? Math.max(...ids) : 0) + 1;
}

/** One relation as Eq. 1.1 element text: an ordered pair when the observer has
 *  toggled it directed, an unordered pair-set otherwise. */
export function relationTuple(r: Relation, nameOf: (id: number) => string): string {
  const a = nameOf(r.a);
  const b = nameOf(r.b);
  return r.klir_directed === true ? `(${a}, ${b})` : `{${a}, ${b}}`;
}

/** The relations that put a mark in incidence cell (a, b) — reading the matrix
 *  as ordered pairs (row, col). A directed relation marks its own order only;
 *  a neutral relation marks both orders (R ⊆ T×T, symmetric closure of the
 *  undirected reading). */
export function cellRelations(model: CanvasModel, a: number, b: number): Relation[] {
  return model.relations.filter((r) =>
    r.klir_directed === true
      ? r.a === a && r.b === b
      : (r.a === a && r.b === b) || (r.a === b && r.b === a),
  );
}

/** What an incidence cell shows (#100 harvest, from the matrix-centric arm):
 *  nothing (empty), ● (neutral occupant), → (directed, read row → col),
 *  ↺ (diagonal self-relation), with a ×N count when relations stack. Pure
 *  typesetting over cellRelations' reading — no verdict. */
export function cellGlyph(row: number, col: number, rs: Relation[]): string {
  if (rs.length === 0) return "";
  const head = row === col ? "↺" : rs.some((r) => r.klir_directed === true && r.a === row) ? "→" : "●";
  return rs.length > 1 ? `${head}×${rs.length}` : head;
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
