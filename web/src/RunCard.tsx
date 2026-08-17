// The run card — the bench's right hand (#345). NetLogo grammar: the WORLD is
// the biggest thing, and beside it sit the knobs and one plot. This card is
// the run's in-the-moment answer on the Model surface: the declared param
// sliders, the time slice, the glance facts at the cursor, and the ONE
// headline chart. Everything deeper lives in the Readouts expansion (⤢).
// Collapsible to a sliver — a viewing posture, so the state lives here.
// No systems fact is decided in this file; every number is the kernel's and
// every edit routes through the same commit path as every other surface.
import { useState } from "react";
import type { CanvasModel, Manifest, Relation, RunResultRich } from "./kernel/types";
import { forcedByColumn, resolveParamRows } from "./kernel/params";
import { ParamControl } from "./ParamControl";
import { glanceFacts } from "./RunPanel";
import { FUTURE_OPACITY, RunChart, midRun, timeAxisLabel } from "./RunChart";
import { Line } from "recharts";
import { TimeRow } from "./Readouts";
import { evaluateMetrics } from "./metrics";
import { humanize } from "./ui";
import { unitLabel } from "./runViz";

export function RunCard({
  model,
  manifest,
  result,
  tick,
  time,
  onInputEdit,
  onResetInputs,
  onOpenReadouts,
}: {
  model: CanvasModel;
  manifest: Manifest | null;
  result: RunResultRich | null;
  tick?: number;
  time: { dt: number; t: number; klir: boolean; onCommit: (dt: number, t: number) => void };
  onInputEdit: (next: Relation) => void;
  onResetInputs?: () => void;
  onOpenReadouts: () => void;
}) {
  const [collapsed, setCollapsed] = useState(false);

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        title="Expand the run card"
        className="absolute right-3 top-3 z-10 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide"
        style={{
          background: "var(--bg-secondary)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-sm)",
          color: "var(--text-secondary)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        ◂ Run
      </button>
    );
  }

  const paramRows = resolveParamRows(model).filter((row) => row.relation);
  const facts = result ? glanceFacts(result, model, tick) : null;
  const headReading = result ? (evaluateMetrics(model, result)?.readings[0] ?? null) : null;

  return (
    <div
      className="absolute right-3 top-3 z-10 flex max-h-[calc(100%-1.5rem)] w-72 flex-col overflow-y-auto p-3"
      style={{
        background: "var(--bg-secondary)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-sm)",
        boxShadow: "var(--shadow-card)",
      }}
    >
      <div className="mb-2 flex items-center gap-2">
        <span
          className="text-xs font-semibold uppercase tracking-wide"
          style={{ color: "var(--text-primary)" }}
        >
          Run
        </span>
        <span className="min-w-0 flex-1" />
        <button
          onClick={onOpenReadouts}
          title="Open Readouts — every chart, full page"
          className="px-1.5 text-xs"
          style={{ color: "var(--text-muted)" }}
        >
          ⤢ readouts
        </button>
        <button
          onClick={() => setCollapsed(true)}
          title="Collapse the run card"
          className="px-1 text-xs"
          style={{ color: "var(--text-muted)" }}
        >
          ▸
        </button>
      </div>

      {/* Glance facts — the cursor's answer, stacked for the card's width.
          The headline is the AT-CURSOR value, so it ticks up while the trace
          plays — the living number is the card's whole point. */}
      {facts && (
        <div className="mb-2 grid gap-1">
          {facts.head && facts.headValue && (
            <div className="flex items-baseline justify-between gap-2" title={facts.head.detail}>
              <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                {facts.head.name}
              </span>
              <span
                className="text-xl font-semibold tabular"
                style={{ color: "var(--accent-strong)" }}
              >
                {facts.headValue}
              </span>
            </div>
          )}
          {facts.internal && facts.stockValue != null && (
            <div className="flex items-baseline justify-between gap-2 text-xs">
              <span style={{ color: "var(--text-muted)" }}>{facts.internal.name}</span>
              <span className="tabular" style={{ color: "var(--text-primary)" }}>
                {humanize(facts.stockValue)}
                {facts.internal.unit ? ` ${unitLabel(facts.internal.unit).text}` : ""}
              </span>
            </div>
          )}
        </div>
      )}

      {/* The ONE headline chart — the declared metric's running total, drawn
          bare (the glance row above is its header; repeating name and number
          here would say the same fact twice in one card). */}
      {result && headReading && (
        <div className="mb-2">
          <RunChart
            data={headReading.series.map((v, i) => ({
              t: i,
              v,
              past: midRun(tick, headReading.series.length) && i <= (tick ?? 0) ? v : null,
            }))}
            n={headReading.series.length}
            tick={tick}
            height={120}
            xLabel={timeAxisLabel(model.time_unit)}
            yLabel={headReading.kind === "share" ? "share" : headReading.unit || undefined}
            yDomain={headReading.kind === "share" ? [0, 1] : undefined}
          >
            <Line
              type="monotone"
              dataKey="v"
              stroke="var(--accent)"
              strokeOpacity={midRun(tick, headReading.series.length) ? FUTURE_OPACITY : 1}
              dot={false}
              strokeWidth={2.5}
              isAnimationActive={false}
            />
            {midRun(tick, headReading.series.length) && (
              <Line
                type="monotone"
                dataKey="past"
                stroke="var(--accent)"
                dot={false}
                strokeWidth={2.5}
                isAnimationActive={false}
              />
            )}
          </RunChart>
        </div>
      )}

      {/* The declared knobs (Flow-anchored; % splits keep their group surface
          in Readouts' rail). Same control, same commit path as everywhere. */}
      {paramRows.length > 0 && (
        <div className="mb-1">
          {paramRows.map(({ param, relation }) => (
            <ParamControl
              key={param.name}
              param={param}
              relation={relation!}
              forcedBy={forcedByColumn(manifest, relation!)}
              onEdit={onInputEdit}
            />
          ))}
          {onResetInputs && (
            <button
              onClick={onResetInputs}
              className="mt-0.5 text-[11px]"
              style={{ color: "var(--text-muted)" }}
              title="Restore every amount to what the model declares"
            >
              ↺ reset to declared
            </button>
          )}
        </div>
      )}

      <div
        className="mt-1 border-t pt-2"
        style={{ borderColor: "var(--hairline)" }}
        title="the run's time slice — edits re-run"
      >
        <TimeRow time={time} frame={false} />
      </div>
    </div>
  );
}
