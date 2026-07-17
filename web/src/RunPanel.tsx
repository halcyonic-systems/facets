// The run/results panel — legible, domain-named. Every label is the model's own
// name + unit; every number is the kernel's. The face renders, it does not judge.
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import type { Comparison, Level, RunResultRich } from "./kernel/types";
import { Card, Pill, Stat, Verdict, humanize } from "./ui";
import { unitLabel } from "./runViz";

// Label + subtitle per category. The subtitle states what the value IS —
// grounded in forcing.rs: a sink's value is the total delivered across the run,
// a source/process value is the level at run end. Not a new claim, a reading of
// what the kernel computed. Provisional wording (Mobus purpose categories).
const CATEGORY_HEADER: Record<Level["category"], { label: string; sub: (ticks: number) => string }> = {
  product: { label: "Outputs", sub: (t) => `total delivered over ${t} ticks` },
  resource: { label: "Inputs", sub: () => "level at run end" },
  internal: { label: "Inside", sub: () => "level at run end" },
};

export function RunPanel({ result }: { result: RunResultRich }) {
  // Lead with the sharpest MEANINGFUL divergence. A forced flow trivially
  // matches its own data (~0% off) — that's a tautology, not a finding, so it
  // never headlines; only a real gap (a responding stock, an unforced flow) does.
  const lead = result.comparisons
    .filter((c) => c.divergence_pct != null && (c.divergence_pct ?? 0) > 0.5)
    .sort((a, b) => (b.divergence_pct ?? 0) - (a.divergence_pct ?? 0))[0];

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
                {Math.round(lead.divergence_pct ?? 0)}% off reality
              </div>
              <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
                {lead.element} · simulated vs actual at the horizon
              </p>
            </>
          ) : (
            <Verdict tone={result.conserved ? "ok" : "warning"}>
              {result.conserved ? "Ran clean" : "Ran — conservation leak"} · {result.ticks} ticks
            </Verdict>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <Pill tone={result.conserved ? "ok" : "error"}>
            {result.conserved ? "✓ conserved" : "⚠ leak"}
          </Pill>
          <Stat
            label="conservation residual"
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
        <Levels levels={result.levels} ticks={result.ticks} />
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
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <div className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
          {c.element}
          <span className="ml-2 text-xs" style={{ color: "var(--text-muted)" }}>
            {c.unit}
          </span>
        </div>
        {c.divergence_pct != null && (
          <span className="text-xs tabular" style={{ color: "var(--accent-strong)" }}>
            {Math.round(c.divergence_pct)}% off
          </span>
        )}
      </div>
      <ResponsiveContainer width="100%" height={150}>
        <LineChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: -12 }}>
          <CartesianGrid stroke="var(--hairline)" vertical={false} />
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
        <LegendDot color="var(--accent)" label="executed (the run)" />
        <LegendDot color="var(--accent-indigo)" label="actual (your data)" />
        {c.declared && <LegendDot color="var(--text-muted)" label="declared mean" />}
      </div>
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

function Levels({ levels, ticks }: { levels: Level[]; ticks: number }) {
  const groups: Level["category"][] = ["product", "resource", "internal"];
  return (
    <div className="grid gap-4">
      {groups.map((cat) => {
        const rows = levels.filter((l) => l.category === cat);
        if (rows.length === 0) return null;
        const header = CATEGORY_HEADER[cat];
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
