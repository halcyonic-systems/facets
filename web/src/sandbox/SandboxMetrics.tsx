// The metrics strip: the desktop shell's bottom panel — activity | storage |
// cumulative | conservation | structure tabs over the recorded trace.
//
// No client-side accumulation: every render pulls the tail of the ENGINE's
// own history (`history_since`), so reset and the HISTORY_CAP truncation are
// correct for free — the engine is the single truth and this strip is a
// window onto it. Rows are decoded by THEIR epoch's column map (#389), never
// by the live node count: a node keeps its line across a structural change
// by id, a departed node's line ends at the break, and every break is drawn
// where it happened and named by what changed. A forked baseline, when one
// is kept, overlays dashed — "without the change" beside "with it".

import { useMemo, useState } from "react";
import { Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Sandbox } from "../kernel";
import type { SandboxSnapshot } from "../kernel/types";
import { decode, describeEpoch, namesById, type Column, type Series } from "./epochs";

const WINDOW = 400;

type Tab = Column | "conservation" | "structure";

/** The house chart series tokens (index.css is the source of truth), cycled
 *  by node id so a node keeps its colour across a break. */
const SERIES = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)"];
const colour = (id: number) => SERIES[(id - 1) % SERIES.length];

export default function SandboxMetrics({
  session,
  snapshot,
  fork,
}: {
  session: Sandbox | null;
  snapshot: SandboxSnapshot;
  /** A kept baseline stepping on the same clock, or null. */
  fork: Sandbox | null;
}) {
  const [tab, setTab] = useState<Tab>("activity");

  const conserved = snapshot.invariant === "conserved";
  const nodeCount = snapshot.nodes.length;

  const view = useMemo(() => {
    if (!session || snapshot.tick === 0) return null;
    const from = Math.max(0, snapshot.tick - WINDOW);
    const delta = session.historySince(from);
    if (tab === "structure") {
      const names = namesById(delta.epochs, snapshot);
      return { kind: "structure" as const, epochs: delta.epochs, names };
    }
    if (tab === "conservation") {
      // ledger rows align with history rows; skip when the invariant is off.
      const points = delta.ledger.map((r, i) => ({
        tick: delta.rows[i]?.[0] ?? i,
        emitted: r[0],
        delivered: r[1],
        stored: r[2],
        dissipated: r[3],
      }));
      return { kind: "ledger" as const, points };
    }
    const main = decode(delta, tab, snapshot);
    let points = main.points;
    let baseline: Series[] = [];
    if (fork) {
      const fd = decode(fork.historySince(from), tab, fork.snapshot());
      baseline = fd.series;
      const byTick = new Map(fd.points.map((p) => [p.tick, p]));
      points = main.points.map((p) => {
        const b = byTick.get(p.tick);
        if (!b) return p;
        const merged: Record<string, number> = { ...p };
        for (const [k, v] of Object.entries(b)) if (k !== "tick") merged[`b_${k}`] = v;
        return merged;
      });
    }
    return { kind: "series" as const, points, series: main.series, breaks: main.breaks, baseline };
    // nodeCount is a proxy for "the structure changed" — the pull re-runs then.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, fork, snapshot.tick, nodeCount, tab]);

  const tabs: Tab[] = conserved
    ? ["activity", "storage", "cumulative", "conservation", "structure"]
    : ["activity", "storage", "cumulative", "structure"];

  const epochCount = view?.kind === "structure" ? view.epochs.length : null;

  return (
    <div className="border-t px-4 py-2">
      <div className="mb-1 flex items-center gap-3 text-[10px]">
        <span className="font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
          Metrics
        </span>
        {tabs.map((t) => (
          <button
            key={t}
            className="rounded px-1.5 py-0.5"
            style={
              tab === t
                ? { background: "var(--accent)", color: "var(--text-on-accent)" }
                : { color: "var(--text-muted)" }
            }
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
        {fork && (
          <span style={{ color: "var(--text-muted)" }} title="the kept baseline draws dashed">
            baseline ┄ overlaid
          </span>
        )}
        <span className="ml-auto font-mono" style={{ color: "var(--text-muted)" }}>
          {snapshot.tick} ticks recorded
          {epochCount !== null && epochCount > 1 ? ` · ${epochCount} structures` : ""}
        </span>
      </div>
      {view?.kind === "structure" ? (
        <ol className="max-h-28 overflow-y-auto font-mono text-[11px]" style={{ color: "var(--text-primary)" }}>
          {view.epochs.map((e, i) => (
            <li key={`${e.start_tick}-${i}`} className="flex gap-3 py-0.5">
              <span className="w-14 shrink-0 text-right" style={{ color: "var(--text-muted)" }}>
                t = {e.start_tick}
              </span>
              <span className="w-28 shrink-0" style={{ color: "var(--text-muted)" }}>
                {e.node_ids.length} comp · {e.wire_ids.length} bond
              </span>
              <span>{describeEpoch(e, view.names)}</span>
            </li>
          ))}
        </ol>
      ) : view && view.points.length > 1 ? (
        <div style={{ height: 110 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={view.points} margin={{ top: 4, right: 8, bottom: 0, left: -12 }}>
              <XAxis dataKey="tick" tick={{ fontSize: 9 }} />
              <YAxis tick={{ fontSize: 9 }} width={40} />
              <Tooltip
                contentStyle={{ fontSize: 10 }}
                formatter={(v: number, name: string) => [Number(v).toFixed(2), name]}
              />
              {view.kind === "ledger"
                ? (["emitted", "delivered", "stored", "dissipated"] as const).map((k, i) => (
                    <Line key={k} dataKey={k} name={k} dot={false} isAnimationActive={false} stroke={SERIES[i]} strokeWidth={1.25} />
                  ))
                : [
                    ...view.baseline.map((s) => (
                      <Line
                        key={`b_${s.id}`}
                        dataKey={`b_id${s.id}`}
                        name={`${s.name} (baseline)`}
                        dot={false}
                        isAnimationActive={false}
                        stroke={colour(s.id)}
                        strokeWidth={1}
                        strokeDasharray="3 3"
                        strokeOpacity={0.7}
                        connectNulls={false}
                      />
                    )),
                    ...view.series.map((s) => (
                      <Line
                        key={s.id}
                        dataKey={`id${s.id}`}
                        name={s.live ? s.name : `${s.name} (departed)`}
                        dot={false}
                        isAnimationActive={false}
                        stroke={colour(s.id)}
                        strokeWidth={1.25}
                        connectNulls={false}
                      />
                    )),
                    ...view.breaks.map((b) => (
                      <ReferenceLine
                        key={`brk-${b.tick}`}
                        x={b.tick}
                        stroke="var(--text-muted)"
                        strokeDasharray="2 2"
                        label={{ value: b.label, position: "insideTopLeft", fontSize: 9, fill: "var(--text-muted)" }}
                      />
                    )),
                  ]}
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="py-4 text-center text-xs italic" style={{ color: "var(--text-muted)" }}>
          press Run or Step — lines plot here as the system flows
        </p>
      )}
    </div>
  );
}
