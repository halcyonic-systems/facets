// The metrics strip: the desktop shell's bottom panel — activity | storage |
// cumulative | conservation tabs over the recorded trace.
//
// No client-side accumulation: every render pulls the tail of the ENGINE's
// own history (`history_since`), so reset, topology clears, and the
// HISTORY_CAP truncation are all correct for free — the engine is the single
// truth and this strip is a window onto it. The pull is bounded (WINDOW rows)
// and happens only when the tick or shape changes.

import { useMemo, useState } from "react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Sandbox } from "../kernel";
import type { SandboxSnapshot } from "../kernel/types";

const WINDOW = 400;

type Tab = "activity" | "storage" | "cumulative" | "conservation";

/** Distinguishable series colors, cycled (matches the app's chart idiom of
 *  letting recharts carry the palette; kept explicit for theme stability). */
const SERIES = ["#0e7490", "#7c3aed", "#b45309", "#15803d", "#be123c", "#1d4ed8", "#a21caf", "#4d7c0f"];

export default function SandboxMetrics({
  session,
  snapshot,
}: {
  session: Sandbox | null;
  snapshot: SandboxSnapshot;
}) {
  const [tab, setTab] = useState<Tab>("activity");

  const nodeCount = snapshot.nodes.length;
  const conserved = snapshot.invariant === "conserved";

  const data = useMemo(() => {
    if (!session || snapshot.tick === 0) return [];
    const from = Math.max(0, snapshot.tick - WINDOW);
    const delta = session.historySince(from);
    const width = 1 + nodeCount * 3;
    if (tab === "conservation") {
      // ledger rows align with history rows; skip when the invariant is off.
      return delta.ledger.map((r, i) => ({
        tick: delta.rows[i]?.[0] ?? i,
        emitted: r[0],
        delivered: r[1],
        stored: r[2],
        dissipated: r[3],
      }));
    }
    const offset = tab === "activity" ? 1 : tab === "storage" ? 2 : 3;
    return delta.rows
      .filter((r) => r.length === width)
      .map((r) => {
        const point: Record<string, number> = { tick: r[0] };
        for (let n = 0; n < nodeCount; n++) point[`n${n}`] = r[1 + n * 3 + (offset - 1)];
        return point;
      });
  }, [session, snapshot.tick, nodeCount, tab]);

  const tabs: Tab[] = conserved
    ? ["activity", "storage", "cumulative", "conservation"]
    : ["activity", "storage", "cumulative"];

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
        <span className="ml-auto font-mono" style={{ color: "var(--text-muted)" }}>
          {snapshot.tick} ticks recorded
        </span>
      </div>
      {data.length > 1 ? (
        <div style={{ height: 110 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -12 }}>
              <XAxis dataKey="tick" tick={{ fontSize: 9 }} />
              <YAxis tick={{ fontSize: 9 }} width={40} />
              <Tooltip
                contentStyle={{ fontSize: 10 }}
                formatter={(v: number, name: string) => [Number(v).toFixed(2), name]}
              />
              {tab === "conservation"
                ? (["emitted", "delivered", "stored", "dissipated"] as const).map((k, i) => (
                    <Line key={k} dataKey={k} name={k} dot={false} isAnimationActive={false} stroke={SERIES[i]} strokeWidth={1.25} />
                  ))
                : snapshot.nodes.map((n, i) => (
                    <Line
                      key={i}
                      dataKey={`n${i}`}
                      name={n.name}
                      dot={false}
                      isAnimationActive={false}
                      stroke={SERIES[i % SERIES.length]}
                      strokeWidth={1.25}
                    />
                  ))}
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
