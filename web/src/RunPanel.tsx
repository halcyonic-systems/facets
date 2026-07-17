// The run/results panel — legible, domain-named. Every label is the model's own
// name + unit; every number is the kernel's. The face renders, it does not judge.
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
import type { CanvasModel, Comparison, Level, RunResultRich } from "./kernel/types";
import { Card, Pill, Stat, Verdict, humanize } from "./ui";
import { horizonOf, inSampleDivergencePct, unitLabel } from "./runViz";

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

export function RunPanel({ result, lens }: { result: RunResultRich; lens: CanvasModel["lens"] }) {
  // Lead with the sharpest MEANINGFUL divergence. A forced flow trivially
  // matches its own data (~0% off) — that's a tautology, not a finding, so it
  // never headlines; only a real gap (a responding stock, an unforced flow) does.
  // Divergence is scored in-sample: the fit is only meaningful where data exists,
  // never against a forecast tick past the horizon.
  const lead = result.comparisons
    .map((c) => ({ c, pct: inSampleDivergencePct(c) }))
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
              <ComparisonChart key={c.element} c={c} />
            ))}
          </div>
        </Card>
      )}

      <Card title="Final levels" source="bert-core · wasm">
        <Levels levels={result.levels} ticks={result.ticks} lens={lens} />
      </Card>
    </div>
  );
}

function ComparisonChart({ c }: { c: Comparison }) {
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
  const pct = inSampleDivergencePct(c);
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
              strokeDasharray="3 3"
              dot={false}
              strokeWidth={1}
              isAnimationActive={false}
            />
          )}
          <Line
            type="monotone"
            dataKey="executed"
            name="executed"
            stroke="var(--accent)"
            dot={false}
            strokeWidth={2}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="actual"
            name="actual"
            stroke="var(--accent-indigo)"
            dot={false}
            strokeWidth={2}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
      <div className="mt-1 flex gap-4 text-[11px]" style={{ color: "var(--text-muted)" }}>
        <LegendDot color="var(--accent)" label="executed (the run, model units)" />
        <LegendDot
          color="var(--accent-indigo)"
          label={`actual (your data${c.unit ? `, ${c.unit}` : ""})`}
        />
        {c.declared && <LegendDot color="var(--text-muted)" label="declared mean" />}
      </div>
      {forecastTicks > 0 && h != null && (
        <p className="mt-0.5 text-[11px] italic" style={{ color: "var(--text-muted)" }}>
          data ends at tick {h} — beyond it the model is forecasting, nothing to check against
        </p>
      )}
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="inline-block h-2 w-2 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}

function Levels({ levels, ticks, lens }: { levels: Level[]; ticks: number; lens: CanvasModel["lens"] }) {
  const groups: Level["category"][] = ["product", "resource", "internal"];
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
                <LevelRow key={l.name} level={l} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function LevelRow({ level: l }: { level: Level }) {
  // A whole-number source/process level renders as e.g. "3.0" — a magnitude cue
  // that reads it as a stock height, not a count of parts. Sinks keep humanize
  // (they're accumulated totals that can run large). Every row states its unit.
  const unit = unitLabel(l.unit);
  const showsMagnitude = l.category !== "product" && Number.isInteger(l.value);
  return (
    <div className="flex items-baseline justify-between text-sm">
      <span style={{ color: "var(--text-primary)" }}>{l.name}</span>
      <span className="tabular" style={{ color: "var(--text-secondary)" }}>
        {showsMagnitude ? l.value.toFixed(1) : humanize(l.value)}
        <span
          className={unit.abstract ? "italic" : undefined}
          style={{ color: "var(--text-muted)" }}
        >
          {" "}
          {unit.text}
        </span>
      </span>
    </div>
  );
}
