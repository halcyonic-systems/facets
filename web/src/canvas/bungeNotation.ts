// Pure helpers behind the Bunge coupling-matrix register (#100 phase 2):
// row/col ordering, cell membership, and cell glyphs for Bunge's M — his own
// second notation (the coupling matrix, M₀ᵣ / Mₛ₀ / Mᵣₛ). Presentation
// arithmetic only — no systems verdict lives here (the action's channel and
// bond/mere reading are kernel facts; legality stays validate_connection's).
// Klir's sibling helpers live in klirNotation.ts — same file grammar, each
// lens reading its OWN semantics off the shared model.
import type { CanvasModel, Kind, Relation, Thing } from "../kernel/types";

/** Row/col order for M: composition first, then environment — one flat
 *  ontology (env things are the same shape), with the cut visible as the
 *  matrix's own ordering; the M₀ᵣ (input) and Mₛ₀ (output) blocks fall out
 *  of it. Order within each side is authoring order, same as the model. */
export function matrixThings(model: CanvasModel): Thing[] {
  return [
    ...model.things.filter((t) => t.role === "Component"),
    ...model.things.filter((t) => t.role === "Environment"),
  ];
}

/** The relations occupying cell (row, col), read as "row acts on col": a bond
 *  is directed action, so it marks its own order only; a mere relation holds
 *  but does not act, so it marks both orders (no channel to orient it). */
export function bungeCellRelations(model: CanvasModel, row: number, col: number): Relation[] {
  return model.relations.filter((r) =>
    r.is_bond
      ? r.a === row && r.b === col
      : (r.a === row && r.b === col) || (r.a === col && r.b === row),
  );
}

/** The KIND of action, in Bunge's own four-kind enum (his vocabulary, F3/F7):
 *  e = energy, m = matter, f = field, i = informational; · = a bond whose kind
 *  is not yet stated (the residue register counts it). */
export function kindGlyph(kind: Kind): string {
  switch (kind) {
    case "Energy":
      return "e";
    case "Matter":
      return "m";
    case "Field":
      return "f";
    case "Informational":
      return "i";
    default:
      return "·";
  }
}

/** What a coupling cell shows: the kind glyph of the acting bond (what makes a
 *  bond a bond IS the kind of action — F7), ∼ for a mere relation that holds
 *  without acting, ↺ on the diagonal, with a ×N stack count. Pure typesetting
 *  over bungeCellRelations' reading — no verdict. */
export function bungeCellGlyph(row: number, col: number, rs: Relation[]): string {
  if (rs.length === 0) return "";
  const bond = rs.find((r) => r.is_bond);
  const head = row === col ? "↺" : bond ? kindGlyph(bond.kind) : "∼";
  return rs.length > 1 ? `${head}×${rs.length}` : head;
}
