// Grounding (#411): whose word an element rests on, as the canvas reads it.
//
// The clause is authorial (spec C4, v1.7): it projects, it round-trips, and no
// verdict reads it. So the canvas treats it as an optional READING rather than
// a permanent mark — an overlay the reader switches on, which recolours every
// thing and flow by grade and puts a legend in the corner, and leaves the
// canvas exactly as it was when off. Dashes were not available for the job:
// an informational flow is already dashed and a `mere` relation dotted, so a
// stroke treatment would have collided with what the substance encoding says.
//
// Two hue families, not one ramp (a single-hue ramp was tried first and the
// grades were indistinguishable at video scale). COOL for evidence that
// executes or was measured — chain, spec, observed — and WARM for evidence
// that is someone's word — asserted, third-party. The family is the first
// thing the eye reads, the strength within it the second. `unknown` is grey
// and dashed: a hole the author chose to draw. Ungraded fades.
import { createContext, useContext } from "react";
import type { ReactNode } from "react";
import { GROUNDING_GRADES } from "../kernel/types";
import type { Grounding, GroundingGrade, Relation, Thing } from "../kernel/types";

export const GroundingOverlayContext = createContext(false);
export const useGroundingOverlay = () => useContext(GroundingOverlayContext);

/** One colour per grade, weakest first. `unknown` has no ink of its own: it
 *  is drawn hollow (see `groundingStroke`). */
export const GRADE_COLOR: Record<GroundingGrade, string> = {
  unknown: "var(--text-muted)",
  "third-party": "color-mix(in srgb, var(--verdict-warning) 55%, var(--bg-secondary))",
  asserted: "var(--verdict-warning)",
  observed: "var(--kind-field)",
  spec: "var(--accent)",
  chain: "var(--accent-indigo)",
};

/** A grade's one-line meaning, for the legend and the inspector. */
export const GRADE_GLOSS: Record<GroundingGrade, string> = {
  unknown: "nothing found says this; the author is saying so",
  "third-party": "someone else's word about the subject",
  asserted: "the subject's own word: docs, blog, terms",
  observed: "the modeler measured it, dated",
  spec: "an artifact that executes: a spec, a schema",
  chain: "verified source at a stated address; or a proof",
};

/** The stroke treatment the overlay applies to a thing or flow. Ungraded
 *  elements fade rather than vanish: the overlay is about what IS graded, and
 *  an ungraded element in a graded model is itself a finding. */
export function groundingStroke(g: Grounding | undefined): {
  color: string;
  opacity: number;
  dash?: string;
} {
  if (!g) return { color: "var(--text-muted)", opacity: 0.35 };
  if (g.grade === "unknown") return { color: GRADE_COLOR.unknown, opacity: 0.9, dash: "3 4" };
  return { color: GRADE_COLOR[g.grade], opacity: 1 };
}

/** The reading a hover or an inspector gives: `chain · StakingV2.sol:314`. */
export function groundingLine(g: Grounding | undefined): string | null {
  if (!g) return null;
  return g.reference ? `${g.grade} · ${g.reference}` : g.grade;
}

/** How many elements carry each grade, for the legend's counts. */
export function gradeCensus(things: Thing[], relations: Relation[]): Record<GroundingGrade | "ungraded", number> {
  const census = Object.fromEntries([...GROUNDING_GRADES, "ungraded"].map((k) => [k, 0])) as Record<
    GroundingGrade | "ungraded",
    number
  >;
  for (const e of [...things, ...relations]) {
    if (e.grounding) census[e.grounding.grade] += 1;
    else census.ungraded += 1;
  }
  return census;
}

/** The corner legend, drawn only while the overlay is on. Counts are the
 *  model's own census, so the legend doubles as the summary a reader wants
 *  first: how much of this rests on what. */
export function GroundingLegend({ things, relations }: { things: Thing[]; relations: Relation[] }) {
  const census = gradeCensus(things, relations);
  const row = (grade: GroundingGrade | "ungraded", swatch: ReactNode, label: string) => (
    <div key={grade} className="flex items-center gap-2" title={grade === "ungraded" ? "no grounding clause" : GRADE_GLOSS[grade]}>
      <svg width="22" height="10" aria-hidden="true">
        {swatch}
      </svg>
      <span style={{ color: "var(--text-primary)" }}>{label}</span>
      <span style={{ color: "var(--text-muted)", marginLeft: "auto" }}>{census[grade]}</span>
    </div>
  );
  return (
    <div
      data-grounding-legend
      className="absolute bottom-3 right-3 rounded-md px-2.5 py-2 text-[11px] leading-5"
      style={{
        background: "var(--bg-secondary)",
        border: "1px solid var(--border)",
        color: "var(--text-secondary)",
        width: "12.5rem",
        fontFamily: "var(--font-mono, ui-monospace, monospace)",
      }}
    >
      <div className="mb-1" style={{ color: "var(--text-secondary)" }}>
        grounding — whose word
      </div>
      <div className="mb-1 leading-4" style={{ color: "var(--text-muted)" }}>
        cool: it runs, or was measured
        <br />
        warm: someone said so
      </div>
      {[...GROUNDING_GRADES].reverse().map((grade) =>
        row(
          grade,
          grade === "unknown" ? (
            <line x1="1" y1="5" x2="21" y2="5" stroke={GRADE_COLOR.unknown} strokeWidth="2" strokeDasharray="3 4" />
          ) : (
            <line x1="1" y1="5" x2="21" y2="5" stroke={GRADE_COLOR[grade]} strokeWidth="2.5" />
          ),
          grade,
        ),
      )}
      {row(
        "ungraded",
        <line x1="1" y1="5" x2="21" y2="5" stroke="var(--text-muted)" strokeWidth="2" strokeOpacity="0.35" />,
        "ungraded",
      )}
    </div>
  );
}
