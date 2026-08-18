// The ONE chart wrapper (run-legibility ws4): every run chart mounts this and
// inherits the instrument's chrome for free — labeled axes (x carries the
// model's declared time unit, y the quantity's unit), the #341 series tokens,
// round axis ticks, the shared-cursor reference line, quiet hairline grid and
// axis ink, and NO recharts tooltip chrome (the cursor + glance row already
// answer "what's the value"; scrubbing IS the hover). Callers stay thin data
// shapers: they build the rows and the <Line> marks, nothing else.
import {
  CartesianGrid,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";

/** The chart-series ink (#341, validated under the six dataviz checks in both
 *  modes, re-run 2026-08-17): identity colors used ONLY inside charts.
 *  Fixed assignment order 1→4 by the entity's ALPHABETICAL index — stable
 *  across runs, never cycled (color follows the entity, never its rank). */
export const CHART_SERIES = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
];

/** The three series roles wear three strokes, not three shades (#283):
 *  executed solid (and slightly heavier — it is the run), actual dashed,
 *  declared dotted. Drawn identically in charts and legend swatches. */
export const STROKES = {
  executed: { dash: undefined as string | undefined, width: 2.5 },
  actual: { dash: "6 4" as string | undefined, width: 2 },
  declared: { dash: "1 4" as string | undefined, width: 1.5 },
};

/** Progressive draw (2026-08-16): while the shared cursor is mid-run, curves
 *  grow to it — past full, future faint — so playback moves the panel the way
 *  it moves the diagram. */
export function midRun(tick: number | undefined, n: number): boolean {
  return tick !== undefined && tick > 0 && tick < n - 1;
}
export const FUTURE_OPACITY = 0.25;
export const PAST = (k: string) => `≤ ${k}`;

/** Regular tick marks for a run axis (#344 item 3): multiples of a round step,
 *  instead of recharts' irregular auto picks ("2 5 8 11…" read as noise). */
export function axisTicks(n: number): number[] {
  const step = n <= 16 ? 2 : n <= 60 ? 5 : n <= 120 ? 10 : 25;
  const out: number[] = [];
  for (let t = 0; t < n; t += step) out.push(t);
  if (out[out.length - 1] !== n - 1) out.push(n - 1);
  return out;
}

/** The x axis says what it measures: the model's declared time unit when there
 *  is one ("t · second"), plain ticks when there isn't. */
export function timeAxisLabel(unit?: string | null): string {
  return unit?.trim() ? `time (${unit.trim()})` : "time (ticks)";
}

const AXIS_TICK = { fontSize: 10, fill: "var(--text-muted)" };
const AXIS_LABEL = { fontSize: 10, fill: "var(--text-muted)" };

export function RunChart({
  data,
  n,
  tick,
  height,
  xLabel,
  yLabel,
  yDomain,
  xKey = "t",
  children,
}: {
  /** One row per tick; the caller shaped it (including any `≤`-past keys). */
  data: Record<string, number | null>[];
  /** Frame count — drives the round tick marks and the cursor guard. */
  n: number;
  /** The shared cursor; drawn on every chart so playback moves the panel. */
  tick?: number;
  height: number;
  /** What the x axis measures — build with timeAxisLabel(model.time_unit). */
  xLabel: string;
  /** The quantity's unit, ON the axis (not only in the header). */
  yLabel?: string;
  yDomain?: [number, number];
  /** "t" for a timed run, "step" for a DTMC. */
  xKey?: string;
  /** The caller's marks: <Line>s (and reference areas), nothing else. */
  children: React.ReactNode;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 6, right: 12, bottom: 16, left: 0 }}>
        <CartesianGrid stroke="var(--hairline)" vertical={false} />
        {tick !== undefined && tick > 0 && tick < n && (
          <ReferenceLine x={tick} stroke="var(--accent)" strokeOpacity={0.7} />
        )}
        <XAxis
          dataKey={xKey}
          ticks={axisTicks(n)}
          tick={AXIS_TICK}
          stroke="var(--hairline)"
          label={{ value: xLabel, position: "insideBottom", offset: -12, ...AXIS_LABEL }}
        />
        <YAxis
          domain={yDomain}
          tick={AXIS_TICK}
          stroke="var(--hairline)"
          width={52}
          label={
            yLabel
              ? { value: yLabel, angle: -90, position: "insideLeft", offset: 8, ...AXIS_LABEL }
              : undefined
          }
        />
        {children}
      </LineChart>
    </ResponsiveContainer>
  );
}
