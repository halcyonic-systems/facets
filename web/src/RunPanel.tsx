// The run/results panel — legible, domain-named. Every label is the model's own
// name + unit; every number is the kernel's. The face renders, it does not judge.
import { useState } from "react";
import { Line, ReferenceArea, ReferenceLine } from "recharts";
import type { CanvasModel, Comparison, Level, MarkovRunResult, RunResultRich } from "./kernel/types";
import { Button, Card, Pill, Verdict, humanize } from "./ui";
import { Icon } from "./icons";

/** The 11/600 uppercase label (rule 5) and the 13/600 numeral (`--t-num`, mono
 *  for the kernel's numbers), as the pieces a className cannot carry. */
const LABEL = "text-[11px] font-semibold uppercase";
const LABEL_STYLE = { letterSpacing: "var(--tracking-label)" } as const;
const NUM = "tabular font-semibold";
const NUM_STYLE = { fontSize: "var(--t-num)" } as const;

/** A small figure with its label under it: the Table tab's run stats, at the
 *  numeral size rather than as a second hero (audit #26). The hero of the
 *  Readouts view is the glance row's share. */
function Figure({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <div className={NUM} style={{ ...NUM_STYLE, color: color ?? "var(--text-primary)" }}>
        {value}
      </div>
      <div className="mt-0.5 text-xs" style={{ color: "var(--text-muted)" }}>
        {label}
      </div>
    </div>
  );
}
import { horizonOf, unitLabel } from "./runViz";
import { BungeStateSpace } from "./canvas/BungeStateSpace";
import { evaluateMetrics, type MetricReading } from "./metrics";
import {
  CHART_SERIES,
  FALLBACK_SLOT,
  FUTURE_OPACITY,
  PAST,
  RunChart,
  STROKES,
  compactTick,
  entitySlots,
  midRun,
  surfaceEntities,
  timeAxisLabel,
  type SeriesSlot,
} from "./RunChart";

// Category labels are lens-faithful (K≅2 on the run panel): Klir and Bunge share
// input/output/internal (both authors' own words — Klir ch.2 "input, output, and
// internal states"; Bunge Vol.4 ch.1 input=receiver/output=donor vs environment);
// only Mobus adds purpose (products/waste, resources). The subtitle states what
// the value IS — a sink's total delivered vs a source/process level at run end.
const CATEGORY_SUB: Record<Level["category"], (ticks: number) => string> = {
  product: (t) => `total delivered over ${t} ticks`,
  // A source has no level — what it shows is its declared per-tick supply
  // (#344 item 2: a rate presented as a level read as nonsense).
  resource: () => "declared supply, per tick",
  internal: () => "level at run end",
};
const CATEGORY_LABEL: Record<CanvasModel["lens"], Record<Level["category"], string>> = {
  Klir: { product: "Outputs", resource: "Inputs", internal: "Internal" },
  Bunge: { product: "Outputs", resource: "Inputs", internal: "Internal" },
  Mobus: { product: "Products & waste", resource: "Resources", internal: "Internal" },
};
function categoryHeader(cat: Level["category"], lens: CanvasModel["lens"]) {
  return { label: CATEGORY_LABEL[lens][cat], sub: CATEGORY_SUB[cat] };
}

// Provisional domain wording for the kernel checks (#33) — Mobus purpose-category
// renames, grouped here for easy tweaking. Rigor stays in the numbers (the
// residual is still shown in exponential form); only the labels soften.
const WORDING = {
  ranClean: "Ran clean",
  ranLeak: "Ran — some quantity went missing",
  conservedPill: "nothing lost or created",
  leakPill: "quantity leaked",
  residualLabel: "balance residual",
};

/** The residual, humanly: an exact zero says "0" instead of the exponential
 *  form's "0.0e+0" (fresh-eyes pass, 2026-08-18); a nonzero keeps the
 *  exponential — its magnitude IS the reading. */
export function residualText(residual: number): string {
  return residual === 0 ? "0 (exact)" : residual.toExponential(1);
}

/** The glance facts (shared by the dock/Readouts glance row and the bench's
 *  RunCard): the headline metric at the cursor, the key responding stock, and
 *  the residual. Reads the same kernel outputs as the tabs; computes nothing
 *  the kernel didn't. */
/** #463 move 4: the kept baseline rides every chart as a dashed twin of each
 *  series, keyed `b_<name>` — "without the change" beside "with it". Pure, so
 *  the merge is testable without a chart. */
export const BASE = (name: string) => `b_${name}`;
export function withBaselineRows(
  data: Record<string, number | null>[],
  baseline: { name: string; series: number[] }[] | null | undefined,
): Record<string, number | null>[] {
  if (!baseline || baseline.length === 0) return data;
  return data.map((row, t) => {
    const merged = { ...row };
    for (const b of baseline) merged[BASE(b.name)] = b.series[t] ?? null;
    return merged;
  });
}

/** The dashed twin's stroke: the same hue, a dash, a touch lighter. */
export const BASELINE_DASH = "5 4";

export function glanceFacts(
  result: RunResultRich,
  model: CanvasModel | null | undefined,
  tick: number | undefined,
) {
  const metrics = model ? evaluateMetrics(model, result) : null;
  const head = metrics?.readings[0] ?? null;
  const n = head?.series.length ?? result.ticks;
  const at = tick !== undefined ? Math.max(0, Math.min(n - 1, tick)) : n - 1;
  const headValue = head
    ? head.kind === "share"
      ? `${(((head.series[at] ?? head.endpoint) as number) * 100).toFixed(1)}%`
      : `${humanize(head.series[at] ?? head.endpoint)}${head.unit ? ` ${head.unit}` : ""}`
    : null;
  // The key responding stock: the first internal level with a trajectory.
  const internal = result.levels.find((l) => l.category === "internal") ?? null;
  const stockTraj = internal
    ? result.trajectories.find((t) => t.name === internal.name)
    : undefined;
  const stockValue = stockTraj
    ? (stockTraj.series[Math.min(at, stockTraj.series.length - 1)] ?? internal!.value)
    : (internal?.value ?? null);
  return { head, headValue, internal, stockValue };
}

/** The run's always-visible glance row: the three numbers a cold viewer needs
 *  before any tab. */
export function RunGlance({
  result,
  model,
  tick,
  baseline = null,
}: {
  result: RunResultRich;
  model?: CanvasModel | null;
  tick?: number;
  /** #463 move 4: the kept baseline, read beside the live numbers. */
  baseline?: RunResultRich | null;
}) {
  const { head, headValue, internal, stockValue } = glanceFacts(result, model, tick);
  const base = baseline ? glanceFacts(baseline, model, tick) : null;
  return (
    <div
      className="flex flex-wrap items-baseline gap-x-6 gap-y-1 px-4 py-2"
      style={{ borderBottom: "1px solid var(--hairline)" }}
    >
      {head && headValue && (
        <span className="inline-flex items-baseline gap-2" title={head.detail}>
          {/* The view's one hero figure: proportional, ink (dataviz; audit #27, #37). */}
          <span className="text-2xl font-semibold" style={{ color: "var(--text-primary)" }}>
            {headValue}
          </span>
          <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
            {head.name}
            <span style={{ color: "var(--text-muted)" }}>
              {head.kind === "sum" ? " · running total" : " · share"}
            </span>
          </span>
          {base?.headValue && base.headValue !== headValue && (
            <span className="text-xs tabular" style={{ color: "var(--text-muted)" }} data-testid="glance-baseline">
              vs baseline {base.headValue}
            </span>
          )}
        </span>
      )}
      {internal && stockValue != null && (
        <span className="inline-flex items-baseline gap-1.5 text-sm">
          <span className={NUM} style={{ ...NUM_STYLE, color: "var(--text-primary)" }}>
            {humanize(stockValue)}
          </span>
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            {internal.name} · level
            {internal.unit ? ` · ${unitLabel(internal.unit).text}` : ""}
          </span>
          {base?.stockValue != null && base.stockValue !== stockValue && (
            <span className="text-xs tabular" style={{ color: "var(--text-muted)" }}>
              vs {humanize(base.stockValue)}
            </span>
          )}
        </span>
      )}
      <span className="ml-auto text-xs tabular" style={{ color: "var(--text-muted)" }}>
        {WORDING.residualLabel} {residualText(result.residual)}
      </span>
    </div>
  );
}

export function RunStory({
  result,
  lens,
  tick,
  model,
  baseline = null,
}: {
  result: RunResultRich;
  lens: CanvasModel["lens"];
  tick?: number;
  model?: CanvasModel | null;
  /** #463 move 4: the kept baseline, drawn dashed beside every series. */
  baseline?: RunResultRich | null;
}) {
  const metrics = model ? evaluateMetrics(model, result) : null;
  const baseMetrics = model && baseline ? evaluateMetrics(model, baseline) : null;
  const baseFor = (name: string) => baseMetrics?.readings.find((b) => b.name === name) ?? null;
  // One colour per entity across every chart on this surface (dataviz): the
  // slots are assigned once from the whole entity set, never per chart.
  const slots = entitySlots(surfaceEntities(model, result));
  const CHART_H = 210;
  return (
    <div className="grid gap-5">
      {metrics && (metrics.readings.length > 0 || metrics.failures.length > 0) && (
        <div className="grid gap-x-8 gap-y-5 xl:grid-cols-2">
          {groupReadings(metrics.readings).map((g) =>
            g.length === 1 ? (
              <MetricRow key={g[0].name} r={g[0]} tick={tick} height={CHART_H} timeUnit={model?.time_unit} baseline={baseFor(g[0].name)} slot={slots.get(g[0].entity)} />
            ) : (
              <MetricFamilyChart
                key={g[0].familyKey}
                readings={g}
                tick={tick}
                height={CHART_H}
                timeUnit={model?.time_unit}
                baseline={g.map((r) => baseFor(r.name)).filter((b): b is MetricReading => b !== null)}
                slots={slots}
              />
            ),
          )}
          {metrics.failures.map((f) => (
            <p key={f.name} className="text-xs" style={{ color: "var(--verdict-warning)" }}>
              {f.name}: {f.reason}
            </p>
          ))}
        </div>
      )}
      {metrics && metrics.readings.length === 0 && metrics.failures.length === 0 && (
        // The capacity, surfaced (#203): a model with no declared metrics is
        // told — quietly — that it can ask its own questions of a run.
        <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
          No declared metrics — name the readouts you want to watch, in the
          model&rsquo;s own words:{" "}
          <code className="font-mono">
            metric &quot;delivered&quot; : sum into{" "}
            {model?.things.find((t) => t.role === "Environment" && t.env_kind === "Sink")?.name ??
              "<a sink>"}
          </code>
        </p>
      )}
      {result.trajectories.length > 0 &&
        result.levels.some((l) => l.category === "internal") && (
          <div>
            <SectionLabel>Levels over the run</SectionLabel>
            <LevelsChart
              trajectories={result.trajectories}
              levels={result.levels}
              tick={tick}
              height={CHART_H}
              timeUnit={model?.time_unit}
              baseline={baseline?.trajectories ?? null}
              slots={slots}
            />
          </div>
        )}
      {/* #100 phase 5: under Bunge the run reads as a trajectory through state
          space, in Bunge's register. */}
      {lens === "Bunge" && result.trajectories.length > 0 && (
        <div>
          <SectionLabel>State space</SectionLabel>
          <BungeStateSpace result={result} tick={tick} />
        </div>
      )}
    </div>
  );
}

/** The Fit tab (ws3) — only mounted when a CSV is bound (absence is ontology:
 *  no data, no fit). The sharpest MEANINGFUL divergence headlines; a forced
 *  flow trivially matching its own data never does. */
export function RunFit({ result, tick, timeUnit, model }: { result: RunResultRich; tick?: number; timeUnit?: string | null; model?: CanvasModel | null }) {
  const slots = entitySlots(surfaceEntities(model, result));
  const lead = result.comparisons
    .map((c) => ({ c, pct: c.divergence_pct }))
    .filter((r) => r.pct != null && r.pct > 0.5)
    .sort((a, b) => (b.pct ?? 0) - (a.pct ?? 0))[0];
  const forecastTicks = lead ? lead.c.simulated.length - lead.c.actual.length : 0;
  const obs = result.comparisons[0]?.actual.length ?? 0;
  return (
    <div className="grid gap-4">
      {/* Provenance first — a cold viewer's "what data, from where?" (fresh-eyes
          pass, 2026-08-18). The comparisons exist only because a CSV is bound
          in Data mode, so that is the sentence's whole content. */}
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        Each chart overlays the executed run on the observations bound in Data mode —{" "}
        {result.comparisons.length} bound series · {obs} observation{obs === 1 ? "" : "s"} each.
        "% off" is the run's mean divergence from that data over the observed window.
      </p>
      {!lead && result.comparisons.length > 0 && (
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          no series diverges from its data by more than 0.5% — the run reproduces the bound
          observations.
        </p>
      )}
      {lead && (
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          largest gap from your data: <span className="font-medium">{lead.c.element}</span>,{" "}
          {Math.round(lead.pct ?? 0)}% off · {lead.c.actual.length} observation
          {lead.c.actual.length === 1 ? "" : "s"}
          {forecastTicks > 0 && ` · the remaining ${forecastTicks} ticks run past the data`}
        </p>
      )}
      {/* Small multiples; same-UNIT comparisons merge into one chart (#341).
          Mixed units never share an axis — that is the #1 chart lie. */}
      <div className="grid gap-x-8 gap-y-6 xl:grid-cols-2">
        {groupComparisons(result.comparisons).map((g) =>
          g.length === 1 ? (
            <ComparisonChart key={g[0].element} c={g[0]} tick={tick} height={230} timeUnit={timeUnit} slot={slots.get(g[0].element) ?? FALLBACK_SLOT} />
          ) : (
            <ComparisonFamilyChart key={g[0].unit || "unitless"} comparisons={g} tick={tick} height={230} timeUnit={timeUnit} slots={slots} />
          ),
        )}
      </div>
    </div>
  );
}

/** The Table tab (ws3): every thing's number at run end, plus the run's own
 *  stats — the reference reading, one tab away instead of a disclosure. */
export function RunTable({
  result,
  ranEdited,
  lens,
  onAcceptUnit,
  tick,
}: {
  result: RunResultRich;
  ranEdited?: boolean;
  lens: CanvasModel["lens"];
  onAcceptUnit?: (name: string, unit: string) => void;
  tick?: number;
}) {
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-4">
        {/* Which model ran (ADR run-seam-canvas-document) — the kernel hash
            already knows; this is the plain-word version for the reader. */}
        <Pill tone={ranEdited ? "warning" : "neutral"}>
          {ranEdited ? "ran your edited model" : "ran the model as shipped"}
        </Pill>
        <Figure
          label={WORDING.residualLabel}
          value={residualText(result.residual)}
          color={result.conserved ? "var(--verdict-ok)" : "var(--verdict-error)"}
        />
        <Figure label="ticks" value={String(result.ticks)} />
        <Figure label="step size (Δt)" value={result.dt.toFixed(1)} />
      </div>
      <Levels
        levels={result.levels}
        ticks={result.ticks}
        lens={lens}
        onAcceptUnit={onAcceptUnit}
        trajectories={result.trajectories}
        tick={tick}
      />
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className={`mb-2 ${LABEL}`} style={{ ...LABEL_STYLE, color: "var(--text-muted)" }}>
      {children}
    </div>
  );
}


/** Family grouping (#341): consecutive-key-independent, order-preserving on
 *  first appearance. Families larger than the palette split into chunks of
 *  four — a fifth hue is never invented. */
function groupReadings(readings: MetricReading[]): MetricReading[][] {
  const byKey = new Map<string, MetricReading[]>();
  for (const r of readings) {
    const g = byKey.get(r.familyKey);
    if (g) g.push(r);
    else byKey.set(r.familyKey, [r]);
  }
  const out: MetricReading[][] = [];
  for (const g of byKey.values()) {
    for (let i = 0; i < g.length; i += CHART_SERIES.length) {
      out.push(g.slice(i, i + CHART_SERIES.length));
    }
  }
  return out;
}

function groupComparisons(comparisons: Comparison[]): Comparison[][] {
  const byUnit = new Map<string, Comparison[]>();
  for (const c of comparisons) {
    const key = c.unit || "";
    const g = byUnit.get(key);
    if (g) g.push(c);
    else byUnit.set(key, [c]);
  }
  const out: Comparison[][] = [];
  for (const g of byUnit.values()) {
    for (let i = 0; i < g.length; i += CHART_SERIES.length) {
      out.push(g.slice(i, i + CHART_SERIES.length));
    }
  }
  return out;
}

/** A family of readings as ONE chart (#341): the question in the header, a
 *  ranked leaderboard of entities beside it, one line per entity below. Hue
 *  by alphabetical entity order; the leaderboard order is the endpoint's. */


function MetricFamilyChart({ readings, tick, height = 150, timeUnit, baseline = [], slots }: { readings: MetricReading[]; tick?: number; height?: number; timeUnit?: string | null; baseline?: MetricReading[]; slots: Map<string, SeriesSlot> }) {
  const first = readings[0];
  const byEntity = [...readings].sort((a, b) => a.entity.localeCompare(b.entity));
  const slotOf = (entity: string) => slots.get(entity) ?? FALLBACK_SLOT;
  const n = Math.max(...readings.map((r) => r.series.length), ...baseline.map((r) => r.series.length));
  const mid = midRun(tick, n);
  // The value at the cursor while scrubbing, the endpoint at rest: the legend
  // line is the chart's readout (dataviz hover layer; the cursor is the hover).
  const at = mid ? tick! : null;
  const fmt = (r: MetricReading, v: number) =>
    r.kind === "share" ? `${(v * 100).toFixed(1)}%` : `${humanize(v)}${r.unit ? ` ${r.unit}` : ""}`;
  const data = withBaselineRows(
    Array.from({ length: n }, (_, t) => {
      const row: Record<string, number | null> = { t };
      for (const r of readings) {
        row[r.entity] = r.series[t] ?? null;
        if (mid) row[PAST(r.entity)] = t <= tick! ? (r.series[t] ?? null) : null;
      }
      return row;
    }),
    baseline.map((b) => ({ name: b.entity, series: b.series })),
  );
  const readoutOf = (r: MetricReading) => fmt(r, at !== null ? (r.series[Math.min(at, r.series.length - 1)] ?? r.endpoint) : r.endpoint);
  return (
    <div>
      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
          {first.family}
          {at !== null && (
            <span className="ml-1.5 text-[11px] font-normal" style={{ color: "var(--text-muted)" }}>
              at t={at}
            </span>
          )}
        </div>
        {/* The leaderboard: endpoint-ranked (the readings arrive pre-sorted). */}
        <div className="flex flex-wrap justify-end gap-x-3 gap-y-0.5 text-[11px]">
          {readings.map((r) => (
            <span key={r.entity} className="inline-flex items-center gap-1">
              <Swatch slot={slotOf(r.entity)} />
              <span style={{ color: "var(--text-secondary)" }}>{r.entity}</span>
              <span className="tabular font-medium" style={{ color: "var(--text-primary)" }}>
                {readoutOf(r)}
              </span>
            </span>
          ))}
        </div>
      </div>
      <RunChart
        data={data}
        n={n}
        tick={tick}
        height={height}
        xLabel={timeAxisLabel(timeUnit)}
        yLabel={first.kind === "share" ? "share" : first.unit || undefined}
        yDomain={first.kind === "share" ? [0, 1] : undefined}
      >
          {byEntity.map((r) => (
            <Line
              key={r.entity}
              type="monotone"
              dataKey={r.entity}
              name={r.entity}
              stroke={slotOf(r.entity).color}
              strokeDasharray={slotOf(r.entity).dash}
              strokeOpacity={mid ? FUTURE_OPACITY : 1}
              dot={false}
              strokeWidth={STROKES.executed.width}
              isAnimationActive={false}
            />
          ))}
          {mid &&
            byEntity.map((r) => (
              <Line
                key={`${r.entity}-past`}
                type="monotone"
                dataKey={PAST(r.entity)}
                stroke={slotOf(r.entity).color}
                strokeDasharray={slotOf(r.entity).dash}
                dot={false}
                strokeWidth={STROKES.executed.width}
                isAnimationActive={false}
                tooltipType="none"
              />
            ))}
          {baseline.map((b) => (
            <Line
              key={`${b.entity}-baseline`}
              type="monotone"
              dataKey={BASE(b.entity)}
              name={`${b.entity} (baseline)`}
              stroke={slotOf(b.entity).color}
              strokeDasharray={BASELINE_DASH}
              strokeOpacity={0.7}
              dot={false}
              strokeWidth={1.5}
              isAnimationActive={false}
            />
          ))}
      </RunChart>
    </div>
  );
}

/** A same-unit comparison family as ONE chart (#341): hue = flow, stroke
 *  style keeps role (solid executed, dashed actual). Declared-mean lines stay
 *  with the singleton view — three encodings per entity is past the ink
 *  budget of a merged chart. */
function ComparisonFamilyChart({ comparisons, tick, height = 150, timeUnit, slots }: { comparisons: Comparison[]; tick?: number; height?: number; timeUnit?: string | null; slots: Map<string, SeriesSlot> }) {
  const byFlow = [...comparisons].sort((a, b) => a.element.localeCompare(b.element));
  const slotOf = (element: string) => slots.get(element) ?? FALLBACK_SLOT;
  // The x domain is the observations' (dataviz, readouts audit charts item 7):
  // past the data the run is a forecast with nothing to check against, and
  // the Fit header already says how many ticks run on past it.
  const n = Math.max(...comparisons.map((c) => c.actual.length));
  const mid = midRun(tick, n);
  const data = Array.from({ length: n }, (_, t) => {
    const row: Record<string, number | null> = { t };
    for (const c of comparisons) {
      row[`${c.element} · executed`] = c.simulated[t] ?? null;
      row[`${c.element} · actual`] = c.actual[t] ?? null;
      if (mid)
        row[PAST(`${c.element} · executed`)] = t <= tick! ? (c.simulated[t] ?? null) : null;
    }
    return row;
  });
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
          {comparisons[0].unit || "model units"}
        </div>
        <div className="flex flex-wrap justify-end gap-x-3 gap-y-0.5 text-[11px]">
          {comparisons.map((c) => (
            <span key={c.element} className="inline-flex items-center gap-1">
              <Swatch slot={slotOf(c.element)} />
              <span style={{ color: "var(--text-secondary)" }}>{c.element}</span>
              {c.divergence_pct != null && (
                <span className="tabular" style={{ color: "var(--text-muted)" }}>
                  {Math.round(c.divergence_pct)}% off
                </span>
              )}
            </span>
          ))}
        </div>
      </div>
      <RunChart
        data={data}
        n={n}
        tick={tick}
        height={height}
        xLabel={timeAxisLabel(timeUnit)}
        yLabel={comparisons[0].unit || "model units"}
      >
          {byFlow.map((c) => (
            <Line
              key={`${c.element}-x`}
              type="monotone"
              dataKey={`${c.element} · executed`}
              stroke={slotOf(c.element).color}
              strokeOpacity={mid ? FUTURE_OPACITY : 1}
              dot={false}
              strokeWidth={STROKES.executed.width}
              isAnimationActive={false}
            />
          ))}
          {mid &&
            byFlow.map((c) => (
              <Line
                key={`${c.element}-x-past`}
                type="monotone"
                dataKey={PAST(`${c.element} · executed`)}
                stroke={slotOf(c.element).color}
                dot={false}
                strokeWidth={STROKES.executed.width}
                isAnimationActive={false}
                tooltipType="none"
              />
            ))}
          {byFlow.map((c) => (
            <Line
              key={`${c.element}-a`}
              type="monotone"
              dataKey={`${c.element} · actual`}
              stroke={slotOf(c.element).color}
              strokeDasharray={STROKES.actual.dash}
              dot={false}
              strokeWidth={STROKES.actual.width}
              isAnimationActive={false}
            />
          ))}
      </RunChart>
      <p className="mt-1 text-[11px]" style={{ color: "var(--text-muted)" }}>
        solid = executed (the run) · dashed = actual (your data)
      </p>
    </div>
  );
}

/** One declared metric's reading (#203): the author's name and endpoint
 *  number lead; the executed series rides below as a small chart. Same-verb
 *  families arrive pre-sorted by endpoint — the leaderboard reading. */
export function MetricRow({ r, tick, height = 90, timeUnit, baseline = null, slot = FALLBACK_SLOT }: { r: MetricReading; tick?: number; height?: number; timeUnit?: string | null; baseline?: MetricReading | null; slot?: SeriesSlot }) {
  const n = Math.max(r.series.length, baseline?.series.length ?? 0);
  const mid = midRun(tick, n);
  const fmt = (v: number) => (r.kind === "share" ? `${(v * 100).toFixed(1)}%` : `${humanize(v)}${r.unit ? ` ${r.unit}` : ""}`);
  // The header value reads at the cursor while scrubbing (the readout the
  // dataviz hover layer asks for; the cursor is the hover here).
  const at = mid ? Math.min(tick!, r.series.length - 1) : null;
  const shown = at !== null ? fmt(r.series[at] ?? r.endpoint) : fmt(r.endpoint);
  const data = Array.from({ length: n }, (_, t) => ({
    t,
    v: r.series[t] ?? null,
    past: mid && t <= tick! ? (r.series[t] ?? null) : null,
    b: baseline ? (baseline.series[t] ?? null) : null,
  }));
  const baseEndpoint =
    baseline && baseline.endpoint !== r.endpoint
      ? baseline.kind === "share"
        ? `${(baseline.endpoint * 100).toFixed(1)}%`
        : `${humanize(baseline.endpoint)}${baseline.unit ? ` ${baseline.unit}` : ""}`
      : null;
  const endpoint = fmt(r.endpoint);
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <div>
          {/* A single series: the title names it, no legend box (dataviz). */}
          <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
            {r.name}
          </div>
          <div className="text-[11px]" style={{ color: "var(--text-muted)" }}>
            {r.detail}
          </div>
        </div>
        <div className="text-right">
          {/* The chart's header value: a numeral, not a second hero (audit #26). */}
          <div className={NUM} style={{ ...NUM_STYLE, color: "var(--text-primary)" }}>
            {shown}
          </div>
          <div className="text-[11px]" style={{ color: "var(--text-muted)" }}>
            {at !== null
              ? `at t=${at} · run end ${endpoint}`
              : r.kind === "share"
                ? "at run end"
                : `over ${n} ticks · ≈${humanize(r.endpoint / Math.max(1, n))}/tick`}
            {baseEndpoint && <span className="tabular"> · vs baseline {baseEndpoint}</span>}
          </div>
        </div>
      </div>
      <RunChart
        data={data}
        n={n}
        tick={tick}
        height={height}
        xLabel={timeAxisLabel(timeUnit)}
        yLabel={r.kind === "share" ? "share" : r.unit || undefined}
        yDomain={r.kind === "share" ? [0, 1] : undefined}
      >
          <Line
            type="monotone"
            dataKey="v"
            name={r.name}
            stroke={slot.color}
            strokeDasharray={slot.dash}
            strokeOpacity={mid ? FUTURE_OPACITY : 1}
            dot={false}
            strokeWidth={STROKES.executed.width}
            isAnimationActive={false}
          />
          {mid && (
            <Line
              type="monotone"
              dataKey="past"
              stroke={slot.color}
              strokeDasharray={slot.dash}
              dot={false}
              strokeWidth={STROKES.executed.width}
              isAnimationActive={false}
              tooltipType="none"
            />
          )}
          {baseline && (
            <Line
              type="monotone"
              dataKey="b"
              name={`${r.name} (baseline)`}
              stroke={slot.color}
              strokeDasharray={BASELINE_DASH}
              strokeOpacity={0.7}
              dot={false}
              strokeWidth={1.5}
              isAnimationActive={false}
            />
          )}
</RunChart>
    </div>
  );
}

function ComparisonChart({ c, tick, height = 150, timeUnit, slot }: { c: Comparison; tick?: number; height?: number; timeUnit?: string | null; slot: SeriesSlot }) {
  // The x domain is the observations' (dataviz; readouts audit charts item 7):
  // the executed and declared series are clipped to the window the data
  // covers, and the forecast past it is stated in words under the chart.
  const n = c.actual.length;
  const mid = midRun(tick, n);
  const data = Array.from({ length: n }, (_, i) => ({
    t: i,
    executed: c.simulated[i] ?? null,
    actual: c.actual[i] ?? null,
    declared: c.declared ? (c.declared[i] ?? null) : null,
    // The declared mean stays whole — it is a reference, not a trajectory.
    pastExecuted: mid && i <= tick! ? (c.simulated[i] ?? null) : null,
  }));
  // The horizon is where the data ends; past it the executed line is a forecast
  // with nothing to check against. Fit is scored in-sample only.
  const h = horizonOf(c);
  const forecastTicks = c.simulated.length - c.actual.length;
  const pct = c.divergence_pct;
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
          {c.element}
          <span className="ml-2 text-xs" style={{ color: "var(--text-muted)" }}>
            {c.unit}
          </span>
        </div>
        {pct != null && (
          <span className={NUM} style={{ ...NUM_STYLE, color: "var(--text-primary)" }}>
            {Math.round(pct)}% off (in-sample)
          </span>
        )}
      </div>
      <RunChart
        data={data}
        n={n}
        tick={tick}
        height={height}
        xLabel={timeAxisLabel(timeUnit)}
        yLabel={c.unit || "model units"}
      >
          {/* The forecast region, when the data ends inside the window: past
              the horizon the executed line is a forecast with nothing to
              check against (fit is in-sample only). */}
          {forecastTicks > 0 && h != null && h < n - 1 && (
            <ReferenceArea
              x1={h}
              x2={n - 1}
              fill="var(--text-muted)"
              fillOpacity={0.06}
            />
          )}
          {forecastTicks > 0 && h != null && h < n - 1 && (
            <ReferenceLine x={h} stroke="var(--text-muted)" strokeDasharray="4 4" />
          )}
          {c.declared && (
            <Line
              type="monotone"
              dataKey="declared"
              name="declared (mean)"
              stroke="var(--text-muted)"
              strokeDasharray={STROKES.declared.dash}
              strokeLinecap="round"
              dot={false}
              strokeWidth={STROKES.declared.width}
              isAnimationActive={false}
            />
          )}
          <Line
            type="monotone"
            dataKey="executed"
            name="executed"
            stroke={slot.color}
            strokeOpacity={mid ? FUTURE_OPACITY : 1}
            dot={false}
            strokeWidth={STROKES.executed.width}
            isAnimationActive={false}
          />
          {mid && (
            <Line
              type="monotone"
              dataKey="pastExecuted"
              stroke={slot.color}
              dot={false}
              strokeWidth={STROKES.executed.width}
              isAnimationActive={false}
              tooltipType="none"
            />
          )}
          <Line
            type="monotone"
            dataKey="actual"
            name="actual"
            stroke={slot.color}
            strokeDasharray={STROKES.actual.dash}
            dot={false}
            strokeWidth={STROKES.actual.width}
            isAnimationActive={false}
          />
      </RunChart>
      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[11px]" style={{ color: "var(--text-muted)" }}>
        <LegendSwatch stroke={STROKES.executed} color={slot.color} label="executed (the run, model units)" />
        <LegendSwatch
          stroke={STROKES.actual}
          color={slot.color}
          label={`actual (your data${c.unit ? `, ${c.unit}` : ""})`}
        />
        {c.declared && (
          <LegendSwatch stroke={STROKES.declared} color="var(--text-muted)" label="declared mean" />
        )}
      </div>
      {forecastTicks > 0 && h != null && (
        <p className="mt-0.5 text-xs" style={{ color: "var(--text-muted)" }}>
          data ends at tick {h} — the remaining {forecastTicks} ticks run past the data and are not drawn here;
          beyond the data the model is forecasting, nothing to check against
        </p>
      )}
    </div>
  );
}


// #282: the Klir deck — a DTMC run wears DTMC semantics. Steps, states, and
// occupancy; no Δt, no conservation chrome (probability is the only mass here,
// and MarkovReadout's rule holds: no conservation pill on a distribution run).
// The states take the four series slots by name (never cycled through the
// accent and verdict tokens: status never impersonates a series).

/** Provenance of the chain's transition weights (#282 follow-up): `weight` on
 *  a relation is the author's declared count; absent defaults to uniform 1.
 *  A defaulted run and a declared run are different statements, and the deck
 *  must say which one it executed — the trichotomy stays legible. */
export type WeightProvenance = "declared" | "partial" | "defaulted";

export function weightProvenance(relations: { weight?: number }[]): WeightProvenance {
  const declared = relations.filter((r) => r.weight != null).length;
  if (declared === 0) return "defaulted";
  return declared === relations.length ? "declared" : "partial";
}

const WEIGHT_PILL: Record<WeightProvenance, { tone: "neutral" | "warning"; text: string }> = {
  declared: { tone: "neutral", text: "declared transition weights" },
  partial: { tone: "warning", text: "weights partially declared — the rest default to 1" },
  defaulted: { tone: "warning", text: "weights defaulted — uniform 1, none declared" },
};

export function DtmcPanel({
  run,
  tick,
  weights,
}: {
  run: MarkovRunResult;
  tick?: number;
  /** Absent = host had no model to read (never the same as "declared"). */
  weights?: WeightProvenance;
}) {
  const steps = run.history.length;
  const data = run.history.map((row, i) => {
    const d: Record<string, number> = { step: i };
    run.states.forEach((s, j) => {
      d[s] = row[j] ?? 0;
    });
    return d;
  });
  const at = tick !== undefined ? Math.max(0, Math.min(steps - 1, tick)) : steps - 1;
  const shown = run.history[at] ?? [];
  const slots = entitySlots(run.states);
  const slotOf = (s: string) => slots.get(s) ?? FALLBACK_SLOT;
  return (
    <div className="grid gap-5">
      <Card title="Result" source="facets-compose · wasm">
        <div className="mb-4">
          <Verdict tone="ok">Ran the state machine as a Markov chain</Verdict>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <Pill tone="neutral">Markov chain · probability over states</Pill>
          {weights && <Pill tone={WEIGHT_PILL[weights].tone}>{WEIGHT_PILL[weights].text}</Pill>}
          <Figure label="steps" value={String(steps)} />
          <Figure label="states" value={String(run.states.length)} />
        </div>
      </Card>

      <Card title="State occupancy" source="facets-compose · wasm">
        <RunChart
          data={data}
          n={steps}
          tick={tick}
          height={170}
          xKey="step"
          xLabel="step"
          yLabel="probability"
          yDomain={[0, 1]}
        >
            {run.states.map((s) => (
              <Line
                key={s}
                type="monotone"
                dataKey={s}
                stroke={slotOf(s).color}
                strokeDasharray={slotOf(s).dash}
                dot={false}
                strokeWidth={STROKES.executed.width}
                isAnimationActive={false}
              />
            ))}
      </RunChart>
        {/* The legend carries the value at the cursor beside each state. */}
        {run.states.length > 1 && (
          <div
            className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[11px]"
            style={{ color: "var(--text-muted)" }}
          >
            {run.states.map((s, i) => (
              <span key={s} className="inline-flex items-center gap-1.5">
                <LegendSwatch stroke={{ ...STROKES.executed, dash: slotOf(s).dash }} color={slotOf(s).color} label={s} />
                <span className="tabular" style={{ color: "var(--text-primary)" }}>
                  {((shown[i] ?? 0) * 100).toFixed(0)}%
                </span>
              </span>
            ))}
          </div>
        )}
      </Card>

      <Card title={at === steps - 1 ? "Final distribution" : `Distribution at step ${at}`} source="facets-compose · wasm">
        <div className="grid gap-1.5">
          {run.states.map((s, i) => (
            <div key={s} className="flex items-baseline justify-between gap-3 text-sm">
              <span style={{ color: "var(--text-primary)" }}>{s}</span>
              <span className="tabular" style={{ color: "var(--text-secondary)" }}>
                {((shown[i] ?? 0) * 100).toFixed(0)}%
              </span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/** The 12x2 line key beside an entity's name, in its slot's stroke. */
function Swatch({ slot }: { slot: SeriesSlot }) {
  return (
    <svg width="12" height="4" aria-hidden="true" className="shrink-0">
      <line x1="0" y1="2" x2="12" y2="2" stroke={slot.color} strokeWidth={2} strokeDasharray={slot.dash} />
    </svg>
  );
}

function LegendSwatch({
  stroke,
  color,
  label,
}: {
  stroke: { dash: string | undefined; width: number };
  color: string;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <svg width="24" height="8" aria-hidden="true" className="shrink-0">
        <line
          x1="1"
          y1="4"
          x2="23"
          y2="4"
          stroke={color}
          strokeWidth={stroke.width}
          strokeDasharray={stroke.dash}
          strokeLinecap="round"
        />
      </svg>
      {label}
    </span>
  );
}

/** The stocks' own curves (field report 2026-08-16: at steady state the flow
 *  charts are flat constants, and the run's actual STORY — a pool drifting, a
 *  level responding — lived only in end-of-run numbers). One chart per unit
 *  family; progressive to the shared cursor like every other chart. */
function LevelsChart({
  trajectories,
  levels,
  tick,
  height = 110,
  timeUnit,
  baseline = null,
  slots,
}: {
  trajectories: NonNullable<RunResultRich["trajectories"]>;
  levels: Level[];
  tick?: number;
  height?: number;
  timeUnit?: string | null;
  /** #463 move 4: the kept baseline's trajectories, dashed. */
  baseline?: RunResultRich["trajectories"] | null;
  slots: Map<string, SeriesSlot>;
}) {
  const slotOf = (name: string) => slots.get(name) ?? FALLBACK_SLOT;
  // Internal stocks only: a source's "trajectory" is its declared rate drawn
  // flat — the rates-as-levels confusion all over again (#344 item 2). The
  // curves that carry the run's story are the levels that RESPOND.
  const internal = new Set(levels.filter((l) => l.category === "internal").map((l) => l.name));
  const shown = trajectories.filter((t) => internal.has(t.name));
  const groups = new Map<string, typeof trajectories>();
  for (const t of shown) {
    const k = t.unit || "level";
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(t);
  }
  return (
    <div className="grid gap-x-8 gap-y-4 xl:grid-cols-2">
      {[...groups.entries()].map(([unit, fam]) => {
        const byName = [...fam].sort((a, b) => a.name.localeCompare(b.name));
        const famBase = (baseline ?? []).filter((b) => fam.some((t) => t.name === b.name));
        const n = Math.max(...fam.map((t) => t.series.length), ...famBase.map((b) => b.series.length));
        const mid = midRun(tick, n);
        // The legend reads the value at the cursor while scrubbing, the final
        // level at rest. A single stock needs no legend: its name is the title.
        const at = mid ? tick! : null;
        const valueOf = (t: (typeof fam)[number]) => {
          const i = at !== null ? Math.min(at, t.series.length - 1) : t.series.length - 1;
          return compactTick(t.series[i] ?? 0);
        };
        const single = byName.length === 1;
        const data = withBaselineRows(
          Array.from({ length: n }, (_, i) => {
            const row: Record<string, number | null> = { t: i };
            for (const tr of fam) {
              row[tr.name] = tr.series[i] ?? null;
              if (mid) row[PAST(tr.name)] = i <= tick! ? (tr.series[i] ?? null) : null;
            }
            return row;
          }),
          famBase,
        );
        return (
          <div key={unit}>
            <div className="mb-1 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
              <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                {single ? byName[0].name : unitLabel(unit).text}
                {at !== null && (
                  <span className="ml-1.5 text-[11px] font-normal" style={{ color: "var(--text-muted)" }}>
                    at t={at}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap justify-end gap-x-3 gap-y-0.5 text-[11px]">
                {byName.map((t) => (
                  <span key={t.name} className="inline-flex items-center gap-1">
                    {!single && <Swatch slot={slotOf(t.name)} />}
                    {!single && <span style={{ color: "var(--text-secondary)" }}>{t.name}</span>}
                    <span className="tabular font-medium" style={{ color: "var(--text-primary)" }}>
                      {valueOf(t)}
                    </span>
                  </span>
                ))}
              </div>
            </div>
            <RunChart
              data={data}
              n={n}
              tick={tick}
              height={height}
              xLabel={timeAxisLabel(timeUnit)}
              yLabel={unitLabel(unit).text}
            >
                {byName.map((t) => (
                  <Line
                    key={t.name}
                    type="monotone"
                    dataKey={t.name}
                    name={t.name}
                    stroke={slotOf(t.name).color}
                    strokeDasharray={slotOf(t.name).dash}
                    strokeOpacity={mid ? FUTURE_OPACITY : 1}
                    dot={false}
                    strokeWidth={STROKES.executed.width}
                    isAnimationActive={false}
                  />
                ))}
                {mid &&
                  byName.map((t) => (
                    <Line
                      key={`${t.name}-past`}
                      type="monotone"
                      dataKey={PAST(t.name)}
                      stroke={slotOf(t.name).color}
                      strokeDasharray={slotOf(t.name).dash}
                      dot={false}
                      strokeWidth={STROKES.executed.width}
                      isAnimationActive={false}
                      tooltipType="none"
                    />
                  ))}
                {famBase.map((b) => (
                  <Line
                    key={`${b.name}-baseline`}
                    type="monotone"
                    dataKey={BASE(b.name)}
                    name={`${b.name} (baseline)`}
                    stroke={slotOf(b.name).color}
                    strokeDasharray={BASELINE_DASH}
                    strokeOpacity={0.7}
                    dot={false}
                    strokeWidth={1.5}
                    isAnimationActive={false}
                  />
                ))}
      </RunChart>
          </div>
        );
      })}
    </div>
  );
}

function Levels({
  levels,
  ticks,
  lens,
  onAcceptUnit,
  trajectories,
  tick,
}: {
  levels: Level[];
  ticks: number;
  lens: CanvasModel["lens"];
  onAcceptUnit?: (name: string, unit: string) => void;
  trajectories?: RunResultRich["trajectories"];
  tick?: number;
}) {
  const groups: Level["category"][] = ["product", "resource", "internal"];
  // Mid-scrub, each row also shows its value AT the scrubbed tick (walkthrough
  // #10) — the final stays primary, the at-tick value rides along, so the
  // panel moves with playback instead of sitting frozen on run-end numbers.
  const scrubbed = tick !== undefined && tick > 0 && tick < ticks - 1;
  const atTick = (name: string): number | null => {
    if (!scrubbed || !trajectories) return null;
    const t = trajectories.find((tr) => tr.name === name);
    return t ? (t.series[Math.min(tick, t.series.length - 1)] ?? null) : null;
  };
  return (
    <div className="grid gap-4">
      {groups.map((cat) => {
        const rows = levels.filter((l) => l.category === cat);
        if (rows.length === 0) return null;
        const header = categoryHeader(cat, lens);
        return (
          <div key={cat}>
            <div className={`mb-1 ${LABEL}`} style={{ ...LABEL_STYLE, color: "var(--text-muted)" }}>
              {header.label}
              <span className="ml-1.5 font-normal normal-case" style={{ letterSpacing: 0 }}>
                · {header.sub(ticks)}
              </span>
            </div>
            {/* A real table, not a list of name/number pairs (fresh-eyes pass,
                2026-08-18): fixed columns so the eye reads DOWN a column
                instead of re-parsing each row. The at-cursor column exists
                only mid-scrub — absent, not blank. Rows are separated by a
                hairline, not by whitespace (audit #23). */}
            <div
              className="grid items-baseline gap-x-6"
              style={{
                gridTemplateColumns: scrubbed
                  ? "minmax(0,1fr) auto auto auto"
                  : "minmax(0,1fr) auto auto",
                // Full-page Readouts would otherwise stretch the name column
                // into a canyon between name and number — the table reads as
                // a table only when the columns sit within one eye-span.
                maxWidth: "42rem",
              }}
            >
              <span className={CELL} style={CELL_STYLE} />
              {scrubbed && (
                <span className={`${CELL} text-right ${LABEL}`} style={{ ...CELL_STYLE, ...LABEL_STYLE, color: "var(--text-muted)" }}>
                  at t={tick}
                </span>
              )}
              <span className={`${CELL} text-right ${LABEL}`} style={{ ...CELL_STYLE, ...LABEL_STYLE, color: "var(--text-muted)" }}>
                final
              </span>
              <span className={`${CELL} text-right ${LABEL}`} style={{ ...CELL_STYLE, ...LABEL_STYLE, color: "var(--text-muted)" }}>
                unit
              </span>
              {rows.map((l) => (
                // Keyed by name + unit so an accepted row's local state resets
                // when a different model/run puts a different unit on the name.
                <LevelRow
                  key={`${l.name}·${l.unit}`}
                  level={l}
                  onAcceptUnit={onAcceptUnit}
                  atTickValue={atTick(l.name)}
                  scrubbed={scrubbed}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** One cell of the levels table: a hairline under every row (audit #23). */
const CELL = "py-1.5";
const CELL_STYLE = { borderBottom: "1px solid var(--hairline)" } as const;

function LevelRow({
  level: l,
  onAcceptUnit,
  atTickValue,
  scrubbed,
}: {
  level: Level;
  onAcceptUnit?: (name: string, unit: string) => void;
  /** The row's trajectory value at the scrubbed tick; null = no matching
   *  trajectory (the cell shows an em dash while the column exists). */
  atTickValue?: number | null;
  /** Whether the table currently carries the at-cursor column. */
  scrubbed?: boolean;
}) {
  // A whole-number source/process level renders as e.g. "3.0" — a magnitude cue
  // that reads it as a stock height, not a count of parts. Sinks keep humanize
  // (they're accumulated totals that can run large). Every row states its unit.
  const unit = unitLabel(l.unit);
  const showsMagnitude = l.category !== "product" && Number.isInteger(l.value);
  // #94: one-click accept — write the derived unit into the component's DECLARED
  // stock unit. Only for a real unit: `·Δt` is the kernel's own no-time-symbol
  // placeholder (an abstract step, not a unit), so it is never acceptable as a
  // declaration — declare the model's time unit first and re-run. Local state
  // flips the row to its declared rendering, matching what the next run reads.
  const [accepted, setAccepted] = useState(false);
  const derived = l.unit_derived && !accepted;
  const acceptable = derived && onAcceptUnit !== undefined && !l.unit.includes("Δt");
  return (
    <>
      <span className={`${CELL} text-sm`} style={{ ...CELL_STYLE, color: "var(--text-primary)" }}>
        {l.name}
      </span>
      {/* One numeral style across the numeric columns (audit #24, #37): the
          at-cursor value is ink, not the action colour. */}
      {scrubbed && (
        <span className={`${CELL} ${NUM} text-right`} style={{ ...CELL_STYLE, ...NUM_STYLE, color: "var(--text-primary)" }}>
          {atTickValue != null ? humanize(atTickValue) : "—"}
        </span>
      )}
      <span className={`${CELL} ${NUM} text-right`} style={{ ...CELL_STYLE, ...NUM_STYLE, color: "var(--text-secondary)" }}>
        {showsMagnitude ? l.value.toFixed(1) : humanize(l.value)}
      </span>
      <span className={`${CELL} text-right text-sm`} style={CELL_STYLE}>
        <span
          className={unit.abstract ? "italic" : undefined}
          style={{
            color: "var(--text-muted)",
            // #94: an undeclared stock's unit was inferred from its inflow over Δt,
            // not declared — a muted dotted underline + title discloses that
            // provenance without a heavy badge.
            ...(derived
              ? { borderBottom: "1px dotted var(--text-muted)", cursor: "help" }
              : {}),
          }}
          title={derived ? "derived from inflow × Δt" : undefined}
        >
          {unit.text}
        </span>
        {acceptable && (
          <Button
            size={28}
            variant="quiet"
            icon="check"
            onClick={() => {
              onAcceptUnit(l.name, l.unit);
              setAccepted(true);
            }}
            className="ml-2"
            title={`Declare ${l.unit} as ${l.name}'s stock unit`}
          >
            accept
          </Button>
        )}
        {accepted && (
          <span className="ml-2 inline-flex items-center gap-0.5 text-xs" style={{ color: "var(--verdict-ok)" }}>
            <Icon name="check" size={16} />
            declared
          </span>
        )}
      </span>
    </>
  );
}
