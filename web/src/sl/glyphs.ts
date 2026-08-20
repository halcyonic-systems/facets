// Which glyph a line earns in the gutter, as a pure function of the line's
// tokens. The vocabulary is the canvas palette's, not a new one: circle for
// a component, square for an environment thing, the pass-way gate for an
// interface (PaletteRail.tsx's RoleChip / PasswayChip shapes), and a KIND
// dot on flow lines in that kind's own color channel.
import { lexLine } from "./mode";

export type LineGlyph =
  | { type: "component" }
  | { type: "environment" }
  | { type: "passway" }
  | { type: "kind"; kind: string };

export function lineGlyph(line: string): LineGlyph | null {
  const toks = lexLine(line);
  const first = toks[0];
  if (!first || first.type !== "head") return null;
  switch (line.slice(first.from, first.to).toLowerCase()) {
    case "component":
      return { type: "component" };
    case "source":
    case "sink":
    case "environment":
    case "milieu":
      return { type: "environment" };
    case "interface":
      return { type: "passway" };
    case "flow": {
      const kind = toks.find((t) => t.type === "kind");
      return kind?.word ? { type: "kind", kind: kind.word } : null;
    }
    default:
      return null;
  }
}
