// The canonical bands of an SL file (spec §7.1), as pure functions over
// text. Band is a function of a line's first token and nothing else, so
// banner comments, blank lines, and hand-authored interleavings can never
// confuse the detection: comments and blanks belong to no band, and a band
// "starts" on the first structure line whose band differs from the previous
// structure line's.
import { lexLine } from "./mode";

export type Band =
  | "header"
  | "things"
  | "flows"
  | "params"
  | "metrics"
  | "boundary"
  | "annotations";

/** §7.1's emission order; visual order in the gutter follows it. */
export const BAND_ORDER: Band[] = [
  "header",
  "things",
  "flows",
  "params",
  "metrics",
  "boundary",
  "annotations",
];

const BAND_OF_HEAD: Record<string, Band> = {
  system: "header",
  domain: "header",
  description: "header",
  time: "header",
  level: "header",
  component: "things",
  source: "things",
  sink: "things",
  environment: "things",
  interface: "things",
  milieu: "things",
  flow: "flows",
  param: "params",
  metric: "metrics",
  boundary: "boundary",
};

/** The band a line opens, or null for blank lines, comments, and anything
 *  else that carries no band of its own (it continues the current one). */
export function bandOfLine(line: string): Band | null {
  const first = lexLine(line)[0];
  if (!first) return null;
  if (first.type === "annotation") return "annotations";
  if (first.type !== "head") return null;
  return BAND_OF_HEAD[line.slice(first.from, first.to).toLowerCase()] ?? null;
}

export interface BandStart {
  /** 1-based line number of the first structure line of the run. */
  line: number;
  band: Band;
}

/** Where each contiguous band run begins. Comments and blanks never start
 *  or break a run; a non-canonical file (hand-interleaved bands) simply
 *  reports more starts, truthfully. */
export function bandStarts(lines: readonly string[]): BandStart[] {
  const starts: BandStart[] = [];
  let current: Band | null = null;
  for (let i = 0; i < lines.length; i++) {
    const band = bandOfLine(lines[i]);
    if (band !== null && band !== current) {
      starts.push({ line: i + 1, band });
      current = band;
    }
  }
  return starts;
}
