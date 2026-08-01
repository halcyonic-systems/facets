// The run/results panel — legible, domain-named. Every label is the model's own
// name + unit; every number is the kernel's. The face renders, it does not judge.
import { useState } from "react";
import {
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import type { CanvasModel, Comparison, Level, MarkovRunResult, RunResultRich } from "./kernel/types";
import { Card, Pill, Stat, Verdict, humanize } from "./ui";
import { horizonOf, unitLabel } from "./runViz";
import { BungeStateSpace } from "./canvas/BungeStateSpace";

// Category labels are lens-faithful (K≅2 on the run panel): Klir and Bunge share
// input/output/internal (both authors' own words — Klir ch.2 "input, output, and
// internal states"; Bunge Vol.4 ch.1 input=receiver/output=donor vs environment);
// only Mobus adds purpose (products/waste, resources). The subtitle states what
// the value IS — a sink's total delivered vs a source/process level at run end.
const CATEGORY_SUB: Record<Level["category"], (ticks: number) => string> = {
  product: (t) => `total delivered over ${t} ticks`,
  resource: () => "level at run end",
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

export function RunPanel({
  result,
  ranEdited,
  lens,
  onAcceptUnit,
  tick,
}: {
  result: RunResultRich;
  /** ADR run-seam-canvas-document: true when this run executed the edited
   *  canvas's projection; false/absent = the shipped calibration artifact. */
  ranEdited?: boolean;
  lens: CanvasModel["lens"];
  /** #94: accept a derived stock unit as the component's DECLARED unit. The
   *  parent writes it into the authoring model; absent = no authoring surface
   *  to write into, so no affordance is shown. */
  onAcceptUnit?: (name: string, unit: string) => void;
  /** #154 P1: the SimScrubber's current tick, so the Bunge state-space readout
   *  marks where the system is on its path. Absent = no live marker. */
  tick?: number;
}) {
  // Lead with the sharpest MEANINGFUL divergence. A forced flow trivially
  // matches its own data (~0% off) — that's a tautology, not a finding, so it
  // never headlines; only a real gap (a responding stock, an unforced flow) does.
  // Divergence is scored in-sample: the fit is only meaningful where data exists,
  // never against a forecast tick past the horizon.
  const lead = result.comparisons
    .map((c) => ({ c, pct: c.divergence_pct }))
    .filter((r) => r.pct != null && r.pct > 0.5)
    .sort((a, b) => (b.pct ?? 0) - (a.pct ?? 0))[0];
  const forecastTicks = lead ? lead.c.simulated.length - lead.c.actual.length : 0;

  return (
    <div className="grid gap-5">
      <Card title="Result" source="bert-compose · wasm">
        <div className="mb-4">
          {lead ? (
            <>
              <div
                className="text-3xl font-semibold tabular"
                style={{ color: "var(--accent-strong)" }}
              >
                {Math.round(lead.pct ?? 0)}% off the data
              </div>
              <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
                {lead.c.element} · validated against {lead.c.actual.length} observations
                {forecastTicks > 0 &&
                  ` · projecting ${forecastTicks} ticks beyond the data`}
              </p>
            </>
          ) : (
            <Verdict tone={result.conserved ? "ok" : "warning"}>
              {result.conserved ? WORDING.ranClean : WORDING.ranLeak} · {result.ticks} ticks
            </Verdict>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-4">
          {/* Which model ran (ADR run-seam-canvas-document) — the kernel hash
              already knows; this is the plain-word version for the reader. */}
          <Pill tone={ranEdited ? "warning" : "neutral"}>
            {ranEdited ? "your edited model" : "shipped calibration"}
          </Pill>
          <Pill tone={result.conserved ? "ok" : "error"}>
            {result.conserved ? WORDING.conservedPill : WORDING.leakPill}
          </Pill>
          <Stat
            label={WORDING.residualLabel}
            value={result.residual.toExponential(1)}
            tone={result.conserved ? "ok" : "error"}
          />
          <Stat label="ticks" value={String(result.ticks)} />
          <Stat label="Δt" value={result.dt.toFixed(1)} />
        </div>
      </Card>

      {result.comparisons.length > 0 && (
        <Card title="Simulated vs actual" source="bert-compose · wasm">
          <div className="grid gap-6">
            {result.comparisons.map((c) => (
              <ComparisonChart key={c.element} c={c} tick={tick} />
            ))}
          </div>
        </Card>
      )}

      {/* #100 phase 5: in the Bunge lens, the run reads as a trajectory through
          state space — the coalgebra unfolding drawn in Bunge's register, beside
          the coupling matrix that carries its structure. */}
      {lens === "Bunge" && result.trajectories.length > 0 && (
        <Card title="State space" source="bert-compose · wasm">
          <BungeStateSpace result={result} tick={tick} />
        </Card>
      )}

      <Card title="Final levels" source="bert-core · wasm">
        <Levels
          levels={result.levels}
          ticks={result.ticks}
          lens={lens}
          onAcceptUnit={onAcceptUnit}
          trajectories={result.trajectories}
          tick={tick}
        />
      </Card>
    </div>
  );
}

function ComparisonChart({ c, tick }: { c: Comparison; tick?: number }) {
  const n = Math.max(c.simulated.length, c.actual.length, c.declared?.length ?? 0);
  const data = Array.from({ length: n }, (_, i) => ({
    t: i,
    executed: c.simulated[i] ?? null,
    actual: c.actual[i] ?? null,
    declared: c.declared ? (c.declared[i] ?? null) : null,
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
      <ResponsiveContainer width="100%" height={150}>
        <LineChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: -12 }}>
          <CartesianGrid stroke="var(--hairline)" vertical={false} />
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
          {/* One tick state everywhere (walkthrough #10): the scrubber's
              position draws on every chart, so playback moves the panel too. */}
          {tick !== undefined && tick > 0 && tick < n && (
            <ReferenceLine x={tick} stroke="var(--accent)" strokeOpacity={0.7} />
          )}
          <XAxis dataKey="t" tick={{ fontSize: 11, fill: "var(--text-muted)" }} stroke="var(--border)" />
          <YAxis tick={{ fontSize: 11, fill: "var(--text-muted)" }} stroke="var(--border)" width={44} />
          <Tooltip
            contentStyle={{
              background: "var(--bg-secondary)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              fontSize: 12,
            }}
          />
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
            dot={false}
            strokeWidth={STROKES.executed.width}
            isAnimationActive={false}
          />
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
        </LineChart>
      </ResponsiveContainer>
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

// The three series wear three strokes, not three shades (#283): executed
// solid, actual dashed, declared dotted. Declared here, drawn identically in
// the chart and in the legend swatches — the legend shows the line itself.
const STROKES = {
  executed: { dash: undefined as string | undefined, width: 2 },
  actual: { dash: "6 4" as string | undefined, width: 2 },
  declared: { dash: "1 4" as string | undefined, width: 1.5 },
};

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

export function DtmcPanel({
  run,
  tick,
}: {
  run: MarkovRunResult;
  tick?: number;
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
          <Stat label="steps" value={String(steps)} />
          <Stat label="states" value={String(run.states.length)} />
        </div>
      </Card>

      <Card title="State occupancy" source="bert-compose · wasm">
        <ResponsiveContainer width="100%" height={170}>
          <LineChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: -12 }}>
            <CartesianGrid stroke="var(--hairline)" vertical={false} />
            {tick !== undefined && tick > 0 && tick < steps && (
              <ReferenceLine x={tick} stroke="var(--accent)" strokeOpacity={0.7} />
            )}
            <XAxis
              dataKey="step"
              tick={{ fontSize: 11, fill: "var(--text-muted)" }}
              stroke="var(--border)"
            />
            <YAxis
              domain={[0, 1]}
              tick={{ fontSize: 11, fill: "var(--text-muted)" }}
              stroke="var(--border)"
              width={44}
            />
            <Tooltip
              contentStyle={{
                background: "var(--bg-secondary)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            {run.states.map((s, i) => (
              <Line
                key={s}
                type="monotone"
                dataKey={s}
                stroke={STATE_COLORS[i % STATE_COLORS.length]}
                dot={false}
                strokeWidth={2}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
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
            <div className="grid gap-1">
              {rows.map((l) => (
                // Keyed by name + unit so an accepted row's local state resets
                // when a different model/run puts a different unit on the name.
                <LevelRow
                  key={`${l.name}·${l.unit}`}
                  level={l}
                  onAcceptUnit={onAcceptUnit}
                  atTickValue={atTick(l.name)}
                  tick={tick}
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
  tick,
}: {
  level: Level;
  onAcceptUnit?: (name: string, unit: string) => void;
  /** The row's trajectory value at the scrubbed tick; null = not scrubbed or
   *  no matching trajectory (the final value stands alone). */
  atTickValue?: number | null;
  tick?: number;
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
    <div className="flex items-baseline justify-between text-sm">
      <span style={{ color: "var(--text-primary)" }}>{l.name}</span>
      <span className="tabular" style={{ color: "var(--text-secondary)" }}>
        {atTickValue != null && (
          <span className="mr-2 text-xs" style={{ color: "var(--accent)" }}>
            {humanize(atTickValue)} <span style={{ color: "var(--text-muted)" }}>at {tick}</span> ·
          </span>
        )}
        {showsMagnitude ? l.value.toFixed(1) : humanize(l.value)}
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
          {" "}
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
    </div>
  );
}
