// The tick log (facets#463, move 2): what every component did each tick, in
// the model's own names — delivered in, released on, the level after, and
// what was shed — and what every flow carried. The engine recorded these as
// it stepped (`node_flux_history`, `wire_history`); nothing here is
// re-derived. The cursor tick is the row the scrubber is on.
import { useEffect, useRef } from "react";
import type { TickLog } from "./kernel/types";

const num = (v: number | null | undefined) =>
  v === null || v === undefined || Number.isNaN(v) ? "·" : Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(2);

export function TickLogTable({ log, tick, timeUnit }: { log: TickLog[]; tick?: number; timeUnit?: string }) {
  const cursorRef = useRef<HTMLTableRowElement | null>(null);
  useEffect(() => {
    cursorRef.current?.scrollIntoView({ block: "nearest" });
  }, [tick]);
  if (log.length === 0) return <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Nothing stepped yet.</p>;
  const nodes = log[0].nodes.map((n) => n.name);
  const wires = log[0].wires;
  // The cursor is a scrubber index (0-based); ticks are 1-based.
  const cursorTick = tick === undefined ? null : tick + 1;
  return (
    <div className="grid gap-4 text-xs" data-testid="tick-log">
      <p style={{ color: "var(--text-secondary)" }}>
        Per tick{timeUnit ? ` (${timeUnit})` : ""}: what each component was <b>handed</b>, what it <b>sent on</b>, its{" "}
        <b>level</b> after, and what it <b>shed</b>. The engine wrote these as it stepped.
      </p>
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead>
            <tr>
              <th className="sticky left-0 pr-3 text-left" style={{ background: "var(--bg-primary)" }}>tick</th>
              {nodes.map((n) => (
                <th key={n} colSpan={4} className="px-2 text-left" style={{ borderLeft: "1px solid var(--border)" }}>
                  {n}
                </th>
              ))}
            </tr>
            <tr style={{ color: "var(--text-secondary)" }}>
              <th />
              {nodes.map((n) => (
                <>
                  <th key={`${n}-in`} className="px-1 text-right" style={{ borderLeft: "1px solid var(--border)" }}>in</th>
                  <th key={`${n}-out`} className="px-1 text-right">out</th>
                  <th key={`${n}-lvl`} className="px-1 text-right">level</th>
                  <th key={`${n}-shed`} className="px-1 text-right">shed</th>
                </>
              ))}
            </tr>
          </thead>
          <tbody>
            {log.map((row) => {
              const isCursor = row.tick === cursorTick;
              return (
                <tr
                  key={row.tick}
                  ref={isCursor ? cursorRef : undefined}
                  data-tick={row.tick}
                  data-cursor={isCursor ? "true" : undefined}
                  style={isCursor ? { background: "var(--bg-surface)", fontWeight: 600 } : undefined}
                >
                  <td className="sticky left-0 pr-3" style={{ background: isCursor ? "var(--bg-surface)" : "var(--bg-primary)" }}>
                    {row.tick}
                  </td>
                  {row.nodes.map((n) => (
                    <>
                      <td key={`${n.name}-in`} className="px-1 text-right" style={{ borderLeft: "1px solid var(--border)" }}>{num(n.delivered)}</td>
                      <td key={`${n.name}-out`} className="px-1 text-right">{num(n.released)}</td>
                      <td key={`${n.name}-lvl`} className="px-1 text-right">{num(n.level)}</td>
                      <td key={`${n.name}-shed`} className="px-1 text-right">{num(n.dissipated)}</td>
                    </>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {wires.length > 0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead>
              <tr>
                <th className="pr-3 text-left">tick</th>
                {wires.map((w, k) => (
                  <th key={k} className="px-2 text-right" title={`${w.from} → ${w.to}`}>
                    {w.name || `${w.from} → ${w.to}`}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {log.map((row) => (
                <tr key={row.tick} data-tick={row.tick} style={row.tick === cursorTick ? { background: "var(--bg-surface)", fontWeight: 600 } : undefined}>
                  <td className="pr-3">{row.tick}</td>
                  {row.wires.map((w, k) => (
                    <td key={k} className="px-2 text-right">{num(w.delivered)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
