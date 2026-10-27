// The ONE chart wrapper (run-legibility ws4): every run chart mounts this and
// inherits the instrument's chrome for free — labeled axes (x carries the
// model's declared time unit, y the quantity's unit as a caption over the
// plot), the #341 series tokens, round axis ticks, the shared-cursor reference
// line, quiet hairline grid and axis ink, and NO recharts tooltip chrome (the
// cursor + glance row already answer "what's the value"; scrubbing IS the
// hover). Callers stay thin data shapers: they build the rows and the <Line>
// marks, nothing else.
//
// Makeover slice F (2026-10-26, the dataviz skill): colour follows the entity
// across every chart on a surface (`entitySlots`, assigned once from the
// sorted entity set, never per chart and never by row); the time axis shows at
// most six labels in the model's time unit (`timeTicks`); y ticks compact with
// SI prefixes (`compactTick`: 3.8M, 19.5K); the unit rides a caption line, not
// a rotated label that collides with wide ticks; lines are 2px; the grid is the
// hairline.
import {
  CartesianGrid,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import type { CanvasModel, RunResultRich } from "./kernel/types";
import { evaluateMetrics } from "./metrics";

/** The chart-series ink (#341, validated under the six dataviz checks in both
 *  modes, re-run 2026-08-17): identity colors used ONLY inside charts. */
export const CHART_SERIES = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
];

/** One entity's stroke: its hue, and past the fourth entity a dash as the
 *  secondary encoding (the palette has four hues and is never extended; a
 *  fifth entity keeps a hue and is told apart by its dash). */
export interface SeriesSlot {
  color: string;
  dash?: string;
}
const OVERFLOW_DASH = "6 3";

/** One slot per entity for a whole surface: sorted once over every entity the
 *  surface plots, so "Router" is the same stroke in the levels chart, the
 *  share chart, the run card's headline and the dock's sparkline. Colour
 *  follows the entity, never its rank in one chart (dataviz). */
export function entitySlots(names: Iterable<string>): Map<string, SeriesSlot> {
  const sorted = [...new Set(names)].sort((a, b) => a.localeCompare(b));
  return new Map(
    sorted.map((name, i) => [
      name,
      { color: CHART_SERIES[i % CHART_SERIES.length], dash: i >= CHART_SERIES.length ? OVERFLOW_DASH : undefined },
    ]),
  );
}

/** Every entity a run surface plots: the metrics' entities and the internal
 *  stocks with a trajectory. One list, so the run card, the Readouts and the
 *  element sparkline draw from the same slot table. */
export function surfaceEntities(model: CanvasModel | null | undefined, result: RunResultRich | null): string[] {
  const names: string[] = [];
  if (result) {
    const internal = new Set(result.levels.filter((l) => l.category === "internal").map((l) => l.name));
    for (const t of result.trajectories) if (internal.has(t.name)) names.push(t.name);
    for (const c of result.comparisons) names.push(c.element);
    if (model) for (const r of evaluateMetrics(model, result)?.readings ?? []) names.push(r.entity);
  }
  return names;
}

export const FALLBACK_SLOT: SeriesSlot = { color: "var(--text-muted)" };

/** The three series roles wear three strokes, not three shades (#283):
 *  executed solid, actual dashed, declared dotted. Drawn identically in charts
 *  and legend swatches. 2px is the dataviz line (the run was 2.5). */
export const STROKES = {
  executed: { dash: undefined as string | undefined, width: 2 },
  actual: { dash: "6 4" as string | undefined, width: 2 },
  declared: { dash: "1 4" as string | undefined, width: 1.5 },
};

/** Progressive draw (2026-08-16): while the shared cursor is mid-run, curves
 *  grow to it — past full, future faint — so playback moves the panel the way
 *  it moves the diagram. 0.45, not 0.25: at 0.25 the future curve fell under
 *  2:1 on the sheet and read as a gridline (readouts audit #33). */
export function midRun(tick: number | undefined, n: number): boolean {
  return tick !== undefined && tick > 0 && tick < n - 1;
}
export const FUTURE_OPACITY = 0.45;
export const PAST = (k: string) => `≤ ${k}`;

const NICE_STEPS = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 2500, 5000, 10000];

/** Regular tick marks for a run axis: multiples of a round step chosen so at
 *  most `maxLabels` labels show (six by default), always including the last
 *  frame. A last frame that would crowd its neighbour replaces it, so "625
 *  659" never happens (readouts audit, charts item 4). */
export function timeTicks(n: number, maxLabels = 6): number[] {
  if (n <= 1) return [0];
  const last = n - 1;
  const step = NICE_STEPS.find((s) => Math.floor(last / s) + 1 <= maxLabels) ?? NICE_STEPS[NICE_STEPS.length - 1];
  const out: number[] = [];
  for (let t = 0; t < last; t += step) out.push(t);
  if (out.length > 1 && last - out[out.length - 1] <= step / 2) out.pop();
  out.push(last);
  return out;
}

/** The older name, kept for the one test that pins the shape. */
export const axisTicks = timeTicks;

/** A y tick compacted from 1,000 up with an SI prefix (3.8M, 2.85M, 19.5K):
 *  three significant figures at most, the sign kept, a share left alone. */
export function compactTick(v: number): string {
  if (!Number.isFinite(v)) return "";
  const a = Math.abs(v);
  if (a === 0) return "0";
  const units: [number, string][] = [
    [1e12, "T"],
    [1e9, "G"],
    [1e6, "M"],
    [1e3, "K"],
  ];
  for (const [scale, suffix] of units) {
    if (a >= scale) {
      const m = v / scale;
      return `${trim(m)}${suffix}`;
    }
  }
  return trim(v);
}
function trim(x: number): string {
  const a = Math.abs(x);
  const digits = a >= 100 ? 0 : a >= 10 ? 1 : 2;
  return Number(x.toFixed(digits)).toString();
}

/** The x axis says what it measures: the model's declared time unit when there
 *  is one ("time (second)"), plain ticks when there isn't. */
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
  yTicks,
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
  /** The quantity's unit, as a caption over the plot (not a rotated label). */
  yLabel?: string;
  yDomain?: [number, number];
  /** Explicit y ticks (the headline chart draws 0, 0.5 and 1 only). */
  yTicks?: number[];
  /** "t" for a timed run, "step" for a DTMC. */
  xKey?: string;
  /** The caller's marks: <Line>s (and reference areas), nothing else. */
  children: React.ReactNode;
}) {
  return (
    <div>
      {yLabel && (
        <div className="text-[11px] leading-none" style={{ color: "var(--text-muted)" }}>
          {yLabel}
        </div>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 16, left: 0 }}>
          <CartesianGrid stroke="var(--hairline)" vertical={false} />
          {tick !== undefined && tick > 0 && tick < n && (
            <ReferenceLine x={tick} stroke="var(--accent)" strokeOpacity={0.7} />
          )}
          <XAxis
            dataKey={xKey}
            ticks={timeTicks(n)}
            tick={AXIS_TICK}
            tickLine={{ stroke: "var(--hairline)" }}
            stroke="var(--hairline)"
            label={{ value: xLabel, position: "insideBottom", offset: -12, ...AXIS_LABEL }}
          />
          <YAxis
            domain={yDomain}
            ticks={yTicks}
            tick={AXIS_TICK}
            tickLine={{ stroke: "var(--hairline)" }}
            tickFormatter={compactTick}
            stroke="var(--hairline)"
            width={44}
          />
          {children}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
