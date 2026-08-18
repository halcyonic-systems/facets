// The run/results panel — legible, domain-named. Every label is the model's own
// name + unit; every number is the kernel's. The face renders, it does not judge.
import { useState } from "react";
import { Line, ReferenceArea, ReferenceLine } from "recharts";
import type { CanvasModel, Comparison, Level, MarkovRunResult, RunResultRich } from "./kernel/types";
import { Card, Pill, Stat, Verdict, humanize } from "./ui";
import { horizonOf, unitLabel } from "./runViz";
import { BungeStateSpace } from "./canvas/BungeStateSpace";
import { evaluateMetrics, type MetricReading } from "./metrics";
import {
  CHART_SERIES,
  FUTURE_OPACITY,
  PAST,
  RunChart,
  STROKES,
  midRun,
  timeAxisLabel,
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
  conservedPill: "✓ nothing lost or created",
  leakPill: "⚠ quantity leaked",
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
}: {
  result: RunResultRich;
  model?: CanvasModel | null;
  tick?: number;
}) {
  const { head, headValue, internal, stockValue } = glanceFacts(result, model, tick);
  return (
    <div
      className="flex flex-wrap items-baseline gap-x-6 gap-y-1 px-4 py-2"
      style={{ borderBottom: "1px solid var(--hairline)" }}
    >
      {head && headValue && (
        <span className="inline-flex items-baseline gap-2" title={head.detail}>
          <span className="text-2xl font-semibold tabular" style={{ color: "var(--accent-strong)" }}>
            {headValue}
          </span>
          <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
            {head.name}
            <span style={{ color: "var(--text-muted)" }}>
              {head.kind === "sum" ? " · running total" : " · share"}
            </span>
          </span>
        </span>
      )}
      {internal && stockValue != null && (
        <span className="inline-flex items-baseline gap-1.5 text-sm">
          <span className="tabular font-medium" style={{ color: "var(--text-primary)" }}>
            {humanize(stockValue)}
          </span>
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            {internal.name} · level
            {internal.unit ? ` · ${unitLabel(internal.unit).text}` : ""}
          </span>
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
}: {
  result: RunResultRich;
  lens: CanvasModel["lens"];
  tick?: number;
  model?: CanvasModel | null;
}) {
  const metrics = model ? evaluateMetrics(model, result) : null;
  const CHART_H = 210;
  return (
    <div className="grid gap-5">
      {metrics && (metrics.readings.length > 0 || metrics.failures.length > 0) && (
        <div className="grid gap-x-8 gap-y-5 xl:grid-cols-2">
          {groupReadings(metrics.readings).map((g) =>
            g.length === 1 ? (
              <MetricRow key={g[0].name} r={g[0]} tick={tick} height={CHART_H} timeUnit={model?.time_unit} />
            ) : (
              <MetricFamilyChart key={g[0].familyKey} readings={g} tick={tick} height={CHART_H} timeUnit={model?.time_unit} />
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
export function RunFit({ result, tick, timeUnit }: { result: RunResultRich; tick?: number; timeUnit?: string | null }) {
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
            <ComparisonChart key={g[0].element} c={g[0]} tick={tick} height={230} timeUnit={timeUnit} />
          ) : (
            <ComparisonFamilyChart key={g[0].unit || "unitless"} comparisons={g} tick={tick} height={230} timeUnit={timeUnit} />
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
        <Stat
          label={WORDING.residualLabel}
          value={residualText(result.residual)}
          tone={result.conserved ? "ok" : "error"}
        />
        <Stat label="ticks" value={String(result.ticks)} />
        <Stat label="step size (Δt)" value={result.dt.toFixed(1)} />
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
    <div
      className="mb-2 text-[11px] font-semibold uppercase tracking-wide"
      style={{ color: "var(--text-muted)" }}
    >
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


function MetricFamilyChart({ readings, tick, height = 150, timeUnit }: { readings: MetricReading[]; tick?: number; height?: number; timeUnit?: string | null }) {
  const first = readings[0];
  const byEntity = [...readings].sort((a, b) => a.entity.localeCompare(b.entity));
  const colorOf = new Map(byEntity.map((r, i) => [r.entity, CHART_SERIES[i]]));
  const n = Math.max(...readings.map((r) => r.series.length));
  const mid = midRun(tick, n);
  const data = Array.from({ length: n }, (_, t) => {
    const row: Record<string, number | null> = { t };
    for (const r of readings) {
      row[r.entity] = r.series[t] ?? null;
      if (mid) row[PAST(r.entity)] = t <= tick! ? (r.series[t] ?? null) : null;
    }
    return row;
  });
  const endpointOf = (r: MetricReading) =>
    r.kind === "share"
      ? `${(r.endpoint * 100).toFixed(1)}%`
      : `${humanize(r.endpoint)}${r.unit ? ` ${r.unit}` : ""}`;
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
          {first.family}
        </div>
        {/* The leaderboard: endpoint-ranked (the readings arrive pre-sorted). */}
        <div className="flex flex-wrap justify-end gap-x-3 gap-y-0.5 text-[11px]">
          {readings.map((r) => (
            <span key={r.entity} className="inline-flex items-center gap-1">
              <span
                aria-hidden
                className="inline-block h-[2px] w-3"
                style={{ background: colorOf.get(r.entity) }}
              />
              <span style={{ color: "var(--text-secondary)" }}>{r.entity}</span>
              <span className="tabular font-medium" style={{ color: "var(--text-primary)" }}>
                {endpointOf(r)}
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
              stroke={colorOf.get(r.entity)}
              strokeOpacity={mid ? FUTURE_OPACITY : 1}
              dot={false}
              strokeWidth={2.5}
              isAnimationActive={false}
            />
          ))}
          {mid &&
            byEntity.map((r) => (
              <Line
                key={`${r.entity}-past`}
                type="monotone"
                dataKey={PAST(r.entity)}
                stroke={colorOf.get(r.entity)}
                dot={false}
                strokeWidth={2.5}
                isAnimationActive={false}
                tooltipType="none"
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
function ComparisonFamilyChart({ comparisons, tick, height = 150, timeUnit }: { comparisons: Comparison[]; tick?: number; height?: number; timeUnit?: string | null }) {
  const byFlow = [...comparisons].sort((a, b) => a.element.localeCompare(b.element));
  const colorOf = new Map(byFlow.map((c, i) => [c.element, CHART_SERIES[i]]));
  const n = Math.max(...comparisons.map((c) => Math.max(c.simulated.length, c.actual.length)));
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
              <span
                aria-hidden
                className="inline-block h-[2px] w-3"
                style={{ background: colorOf.get(c.element) }}
              />
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
              stroke={colorOf.get(c.element)}
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
                stroke={colorOf.get(c.element)}
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
              stroke={colorOf.get(c.element)}
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
export function MetricRow({ r, tick, height = 90, timeUnit }: { r: MetricReading; tick?: number; height?: number; timeUnit?: string | null }) {
  const n = r.series.length;
  const mid = midRun(tick, n);
  const data = r.series.map((v, t) => ({ t, v, past: mid && t <= tick! ? v : null }));
  const endpoint =
    r.kind === "share"
      ? `${(r.endpoint * 100).toFixed(1)}%`
      : `${humanize(r.endpoint)}${r.unit ? ` ${r.unit}` : ""}`;
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-3">
        <div>
          <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
            {r.name}
          </div>
          <div className="text-[11px]" style={{ color: "var(--text-muted)" }}>
            {r.detail}
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-semibold tabular" style={{ color: "var(--accent-strong)" }}>
            {endpoint}
          </div>
          <div className="text-[11px]" style={{ color: "var(--text-muted)" }}>
            {r.kind === "share"
              ? "at run end"
              : `over ${n} ticks · ≈${humanize(r.endpoint / Math.max(1, n))}/tick`}
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
            stroke="var(--accent)"
            strokeOpacity={mid ? FUTURE_OPACITY : 1}
            dot={false}
            strokeWidth={2.5}
            isAnimationActive={false}
          />
          {mid && (
            <Line
              type="monotone"
              dataKey="past"
              stroke="var(--accent)"
              dot={false}
              strokeWidth={2.5}
              isAnimationActive={false}
              tooltipType="none"
            />
          )}
      </RunChart>
    </div>
  );
}

function ComparisonChart({ c, tick, height = 150, timeUnit }: { c: Comparison; tick?: number; height?: number; timeUnit?: string | null }) {
  const n = Math.max(c.simulated.length, c.actual.length, c.declared?.length ?? 0);
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
          <span className="text-xs tabular" style={{ color: "var(--accent-strong)" }}>
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
          {/* The forecast region: past the data's horizon the executed line is
              a forecast with nothing to check against (fit is in-sample only). */}
          {forecastTicks > 0 && h != null && (
            <ReferenceArea
              x1={h}
              x2={n - 1}
              fill="var(--text-muted)"
              fillOpacity={0.06}
              ifOverflow="extendDomain"
            />
          )}
          {forecastTicks > 0 && h != null && (
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
            stroke="var(--accent)"
            strokeOpacity={mid ? FUTURE_OPACITY : 1}
            dot={false}
            strokeWidth={STROKES.executed.width}
            isAnimationActive={false}
          />
          {mid && (
            <Line
              type="monotone"
              dataKey="pastExecuted"
              stroke="var(--accent)"
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
            stroke="var(--accent-indigo)"
            strokeDasharray={STROKES.actual.dash}
            dot={false}
            strokeWidth={STROKES.actual.width}
            isAnimationActive={false}
          />
      </RunChart>
      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[11px]" style={{ color: "var(--text-muted)" }}>
        <LegendSwatch stroke={STROKES.executed} color="var(--accent)" label="executed (the run, model units)" />
        <LegendSwatch
          stroke={STROKES.actual}
          color="var(--accent-indigo)"
          label={`actual (your data${c.unit ? `, ${c.unit}` : ""})`}
        />
        {c.declared && (
          <LegendSwatch stroke={STROKES.declared} color="var(--text-muted)" label="declared mean" />
        )}
      </div>
      {forecastTicks > 0 && h != null && (
        <p className="mt-0.5 text-[11px] italic" style={{ color: "var(--text-muted)" }}>
          data ends at tick {h} — beyond it the model is forecasting, nothing to check against
        </p>
      )}
    </div>
  );
}


// #282: the Klir deck — a DTMC run wears DTMC semantics. Steps, states, and
// occupancy; no Δt, no conservation chrome (probability is the only mass here,
// and MarkovReadout's rule holds: no conservation pill on a distribution run).
const STATE_COLORS = [
  "var(--accent)",
  "var(--accent-indigo)",
  "var(--accent-strong)",
  "var(--accent-slate)",
  "var(--verdict-warning)",
  "var(--verdict-error)",
];

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
  return (
    <div className="grid gap-5">
      <Card title="Result" source="bert-compose · wasm">
        <div className="mb-4">
          <Verdict tone="ok">Ran the state machine as a Markov chain</Verdict>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <Pill tone="neutral">Markov chain · probability over states</Pill>
          {weights && <Pill tone={WEIGHT_PILL[weights].tone}>{WEIGHT_PILL[weights].text}</Pill>}
          <Stat label="steps" value={String(steps)} />
          <Stat label="states" value={String(run.states.length)} />
        </div>
      </Card>

      <Card title="State occupancy" source="bert-compose · wasm">
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
            {run.states.map((s, i) => (
              <Line
                key={s}
                type="monotone"
                dataKey={s}
                stroke={STATE_COLORS[i % STATE_COLORS.length]}
                dot={false}
                strokeWidth={2.5}
                isAnimationActive={false}
              />
            ))}
      </RunChart>
        <div
          className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-[11px]"
          style={{ color: "var(--text-muted)" }}
        >
          {run.states.map((s, i) => (
            <LegendSwatch
              key={s}
              stroke={STROKES.executed}
              color={STATE_COLORS[i % STATE_COLORS.length]}
              label={s}
            />
          ))}
        </div>
      </Card>

      <Card title={at === steps - 1 ? "Final distribution" : `Distribution at step ${at}`} source="bert-compose · wasm">
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
}: {
  trajectories: NonNullable<RunResultRich["trajectories"]>;
  levels: Level[];
  tick?: number;
  height?: number;
  timeUnit?: string | null;
}) {
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
        const colorOf = new Map(byName.map((t, i) => [t.name, CHART_SERIES[i % CHART_SERIES.length]]));
        const n = Math.max(...fam.map((t) => t.series.length));
        const mid = midRun(tick, n);
        const data = Array.from({ length: n }, (_, i) => {
          const row: Record<string, number | null> = { t: i };
          for (const tr of fam) {
            row[tr.name] = tr.series[i] ?? null;
            if (mid) row[PAST(tr.name)] = i <= tick! ? (tr.series[i] ?? null) : null;
          }
          return row;
        });
        return (
          <div key={unit}>
            <div className="mb-1 flex items-baseline justify-between gap-3">
              <div className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>
                {unitLabel(unit).text}
              </div>
              <div className="flex flex-wrap justify-end gap-x-3 gap-y-0.5 text-[11px]">
                {byName.map((t) => (
                  <span key={t.name} className="inline-flex items-center gap-1">
                    <span
                      aria-hidden
                      className="inline-block h-[2px] w-3"
                      style={{ background: colorOf.get(t.name) }}
                    />
                    <span style={{ color: "var(--text-secondary)" }}>{t.name}</span>
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
                    stroke={colorOf.get(t.name)}
                    strokeOpacity={mid ? FUTURE_OPACITY : 1}
                    dot={false}
                    strokeWidth={2.5}
                    isAnimationActive={false}
                  />
                ))}
                {mid &&
                  byName.map((t) => (
                    <Line
                      key={`${t.name}-past`}
                      type="monotone"
                      dataKey={PAST(t.name)}
                      stroke={colorOf.get(t.name)}
                      dot={false}
                      strokeWidth={2.5}
                      isAnimationActive={false}
                      tooltipType="none"
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
            <div
              className="mb-1 text-[11px] font-semibold uppercase tracking-wide"
              style={{ color: "var(--text-muted)" }}
            >
              {header.label}
              <span className="ml-1.5 font-normal normal-case tracking-normal">
                · {header.sub(ticks)}
              </span>
            </div>
            {/* A real table, not a list of name/number pairs (fresh-eyes pass,
                2026-08-18): fixed columns so the eye reads DOWN a column
                instead of re-parsing each row. The at-cursor column exists
                only mid-scrub — absent, not blank. */}
            <div
              className="grid items-baseline gap-x-6 gap-y-1"
              style={{
                gridTemplateColumns: scrubbed
                  ? "minmax(0,1fr) auto auto auto"
                  : "minmax(0,1fr) auto auto",
              }}
            >
              <span />
              {scrubbed && (
                <span className="text-right text-[10px] uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
                  at t={tick}
                </span>
              )}
              <span className="text-right text-[10px] uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
                final
              </span>
              <span className="text-right text-[10px] uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
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
      <span className="text-sm" style={{ color: "var(--text-primary)" }}>
        {l.name}
      </span>
      {scrubbed && (
        <span className="tabular text-right text-xs" style={{ color: "var(--accent)" }}>
          {atTickValue != null ? humanize(atTickValue) : "—"}
        </span>
      )}
      <span className="tabular text-right text-sm" style={{ color: "var(--text-secondary)" }}>
        {showsMagnitude ? l.value.toFixed(1) : humanize(l.value)}
      </span>
      <span className="text-right text-sm">
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
          <button
            onClick={() => {
              onAcceptUnit(l.name, l.unit);
              setAccepted(true);
            }}
            className="ml-2 rounded border px-1.5 py-0.5 text-[10px]"
            style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
            title={`Declare ${l.unit} as ${l.name}'s stock unit`}
          >
            accept
          </button>
        )}
        {accepted && (
          <span className="ml-2 text-[10px]" style={{ color: "var(--verdict-ok)" }}>
            declared ✓
          </span>
        )}
      </span>
    </>
  );
}
