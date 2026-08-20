// Visual alignment of `->` and `:` across contiguous flow runs — spacing
// widgets only, never text. Mutating the document would break the bit-exact
// round-trip, dirty the doc on viewing, and violate splicePositions' byte
// contract; changing what emit_sl writes is spec §7.1 owner territory. So
// the padding lives in zero-width inline widgets whose width is measured in
// ch (the pane is monospace), and the text underneath stays untouched.
import { lexLine } from "./mode";
import { bandOfLine } from "./bands";

export interface FlowPad {
  /** 1-based line number. */
  line: number;
  /** Character offset of the `->` token; pad inserted just before it. */
  arrowAt: number;
  /** ch of padding before the arrow so the run's arrows share a column. */
  arrowPad: number;
  /** Character offset of the `:` token, in this line's own text. */
  colonAt: number | null;
  /** ch of padding before the colon, computed after arrow padding. */
  colonPad: number;
}

/** Alignment pads for every contiguous run of `flow` lines. A run breaks on
 *  any line that is not a flow line (comments and blanks break it too — a
 *  visually separated group reads as a group, so it aligns as one). */
export function flowPads(lines: readonly string[]): FlowPad[] {
  const pads: FlowPad[] = [];
  let run: { line: number; arrowAt: number; colonAt: number | null }[] = [];

  const flush = () => {
    if (run.length > 1) {
      const arrowCol = Math.max(...run.map((r) => r.arrowAt));
      // After arrow padding, the colon's visual column is its own offset
      // plus this line's arrow pad; align those.
      const colonRows = run.filter((r) => r.colonAt !== null);
      const colonCol = colonRows.length
        ? Math.max(...colonRows.map((r) => (r.colonAt as number) + arrowCol - r.arrowAt))
        : 0;
      for (const r of run) {
        const arrowPad = arrowCol - r.arrowAt;
        pads.push({
          line: r.line,
          arrowAt: r.arrowAt,
          arrowPad,
          colonAt: r.colonAt,
          colonPad: r.colonAt === null ? 0 : colonCol - (r.colonAt + arrowPad),
        });
      }
    }
    run = [];
  };

  for (let i = 0; i < lines.length; i++) {
    if (bandOfLine(lines[i]) !== "flows") {
      flush();
      continue;
    }
    const toks = lexLine(lines[i]);
    const arrow = toks.find((t) => t.type === "arrow");
    if (!arrow) {
      flush();
      continue;
    }
    const colon = toks.find((t) => t.type === "punct" && lines[i][t.from] === ":");
    run.push({ line: i + 1, arrowAt: arrow.from, colonAt: colon ? colon.from : null });
  }
  flush();
  return pads.filter((p) => p.arrowPad > 0 || p.colonPad > 0);
}
