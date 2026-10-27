// The run card — the bench's right hand (#345). NetLogo grammar: the WORLD is
// the biggest thing, and beside it sit the knobs and one plot. This card is
// the run's in-the-moment answer on the Model surface: the declared param
// sliders, the time slice, the glance facts at the cursor, and the ONE
// headline chart. Everything deeper lives in the Readouts expansion (⤢).
// Collapsible to a sliver — a viewing posture, so the state lives here.
// The knob and the curve it bends stay on one surface: nothing here collapses
// or hides behind disclosure, and the sections are divided by hairlines rather
// than by gaps, so the whole run reads in one downward pass.
// No systems fact is decided in this file; every number is the kernel's and
// every edit routes through the same commit path as every other surface.
import { useState } from "react";
import type { CanvasModel, Manifest, Relation, RunResultRich, Thing } from "./kernel/types";
import { forcedByColumn, resolveParamRows } from "./kernel/params";
import { ParamControl } from "./ParamControl";
import { FieldControl } from "./RunInputs";
import { glanceFacts } from "./RunPanel";
import { FUTURE_OPACITY, RunChart, midRun, timeAxisLabel } from "./RunChart";
import { Line } from "recharts";
import { TimeRow } from "./Readouts";
import { evaluateMetrics } from "./metrics";
import { Button, Panel, humanize } from "./ui";
import { unitLabel } from "./runViz";

/** The 11/600 uppercase label (rule 5). */
const LABEL = "text-[11px] font-semibold uppercase";
const LABEL_STYLE = { letterSpacing: "var(--tracking-label)" } as const;

/** One band of the stack. The rule rides the TOP of every band but the first,
 *  so the divisions are the card's own structure and not decoration hung on
 *  each section. */
function Band({
  first,
  className = "",
  title,
  children,
}: {
  first?: boolean;
  className?: string;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`px-3 ${className}`}
      title={title}
      style={first ? undefined : { borderTop: "1px solid var(--hairline)" }}
    >
      {children}
    </div>
  );
}

export function RunCard({
  model,
  manifest,
  result,
  tick,
  time,
  onInputEdit,
  onThingEdit,
  onResetInputs,
  onOpenReadouts,
}: {
  model: CanvasModel;
  manifest: Manifest | null;
  result: RunResultRich | null;
  tick?: number;
  time: { dt: number; t: number; klir: boolean; onCommit: (dt: number, t: number) => void };
  onInputEdit: (next: Relation) => void;
  /** #343: a field-anchored param edits its component's engine parameter. */
  onThingEdit?: (next: Thing) => void;
  onResetInputs?: () => void;
  onOpenReadouts: () => void;
}) {
  const [collapsed, setCollapsed] = useState(false);

  if (collapsed) {
    return (
      <Button
        size={28}
        variant="quiet"
        icon="chevron-left"
        onClick={() => setCollapsed(false)}
        title="Expand the run card"
        aria-expanded={false}
        className="absolute right-3 top-3 z-10"
      >
        Run
      </Button>
    );
  }

  const paramRows = resolveParamRows(model).filter((row) => row.relation || row.field);
  const facts = result ? glanceFacts(result, model, tick) : null;
  const headReading = result ? (evaluateMetrics(model, result)?.readings[0] ?? null) : null;

  return (
    <Panel
      as="aside"
      className="absolute right-3 top-3 z-10 flex max-h-[calc(100%-1.5rem)] w-72 flex-col overflow-y-auto"
    >
      <Band first className="flex items-center gap-2 py-1.5">
        <span className={LABEL} style={{ ...LABEL_STYLE, color: "var(--text-primary)" }}>
          Run
        </span>
        <span className="min-w-0 flex-1" />
        <Button size={28} variant="quiet" icon="expand" onClick={onOpenReadouts} title="Open Readouts: every chart, full page">
          readouts
        </Button>
        <Button
          size={28}
          variant="quiet"
          icon="chevron-right"
          onClick={() => setCollapsed(true)}
          title="Collapse the run card"
          aria-label="Collapse the run card"
          aria-expanded
        />
      </Band>

      {/* Beat one — the reading. The headline is the AT-CURSOR value, so it
          ticks while the trace plays; the key stock rides under it at the
          weight of a supporting fact, not a second headline. */}
      {facts && (facts.headValue || facts.stockValue != null) && (
        <Band className="py-1.5">
          {facts.head && facts.headValue && (
            <div className="flex items-baseline justify-between gap-2" title={facts.head.detail}>
              <span className="min-w-0 truncate text-xs" style={{ color: "var(--text-secondary)" }}>
                {facts.head.name}
                <span style={{ color: "var(--text-muted)" }}>
                  {facts.head.kind === "sum" ? " · running total" : " · share"}
                </span>
              </span>
              {/* The card's one hero figure: proportional figures at display
                  size (dataviz), ink not the action colour (audit #37). */}
              <span
                className="shrink-0 text-2xl font-semibold leading-none"
                style={{ color: "var(--text-primary)" }}
                data-testid="run-card-head"
              >
                {facts.headValue}
              </span>
            </div>
          )}
          {facts.internal && facts.stockValue != null && (
            <div className="mt-1 flex items-baseline justify-between gap-2 text-xs">
              <span className="min-w-0 truncate" style={{ color: "var(--text-muted)" }}>
                {facts.internal.name} · level
              </span>
              <span className="shrink-0 tabular font-semibold" style={{ color: "var(--text-primary)", fontSize: "var(--t-num)" }}>
                {humanize(facts.stockValue)}
                {facts.internal.unit ? ` ${unitLabel(facts.internal.unit).text}` : ""}
              </span>
            </div>
          )}
        </Band>
      )}

      {/* Beat two — the shape. The ONE headline chart, drawn bare (the reading
          above is its header) and given the height at which a curve's turn is
          actually legible rather than merely present. */}
      {result && headReading && (
        <Band className="pb-1 pt-2">
          <RunChart
            data={headReading.series.map((v, i) => ({
              t: i,
              v,
              past: midRun(tick, headReading.series.length) && i <= (tick ?? 0) ? v : null,
            }))}
            n={headReading.series.length}
            tick={tick}
            height={140}
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
        </Band>
      )}

      {/* Beat three — the knobs. The declared params (Flow-anchored; % splits
          keep their group surface in Readouts' rail). Same control, same commit
          path as everywhere, sitting a rule away from the curve they move. */}
      {paramRows.length > 0 && (
        <Band className="py-1">
          {paramRows.map(({ param, relation, thing, field }) =>
            relation ? (
              <ParamControl
                key={param.name}
                param={param}
                relation={relation}
                forcedBy={forcedByColumn(manifest, relation)}
                onEdit={onInputEdit}
              />
            ) : thing && field && onThingEdit ? (
              <FieldControl key={param.name} param={param} thing={thing} field={field} onEdit={onThingEdit} />
            ) : null,
          )}
          {onResetInputs && (
            <Button
              size={28}
              variant="quiet"
              icon="reset"
              onClick={onResetInputs}
              className="mt-1"
              title="Restore every amount to what the model declares"
            >
              reset to declared
            </Button>
          )}
          {/* The honest boundary of the knobs, where the knobs live: transforms
              pass their matched substance and dissipate the rest, so a
              co-substrate knob moves the energy ledger, not the output. Stating
              it here is the instrument owning its grain (the same fact a
              Combining processor's law line carries). */}
          <p
            className="mb-1 mt-1.5 text-xs leading-snug"
            style={{ color: "var(--text-muted)" }}
            title="Transforms produce their matched substance; other inflows drive the work and dissipate. Coupling output to the scarcest input (Liebig's law of the minimum) is named, open engine research."
          >
            not every knob binds output yet — limiting-factor coupling is open
            research
          </p>
        </Band>
      )}

      <Band className="py-1.5" title="the run's time slice — edits re-run">
        <TimeRow time={time} frame={false} />
      </Band>
    </Panel>
  );
}
