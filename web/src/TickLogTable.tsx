// The tick log (facets#463, move 2): what every component did each tick, in
// the model's own names — delivered in, released on, the level after, and
// what was shed — and what every flow carried. The engine recorded these as
// it stepped (`node_flux_history`, `wire_history`); nothing here is
// re-derived. The cursor tick is the row the scrubber is on.
//
// Table chrome (makeover slice F, audit #25): 28px rows under a hairline,
// 13/600 tabular numerals in mono for the kernel's numbers, 11/600 labels for
// the heads, and a cursor row that changes surface only (a bold cursor row
// reflowed every column as the scrubber moved).
import { useEffect, useRef, type CSSProperties } from "react";
import type { TickLog } from "./kernel/types";

const num = (v: number | null | undefined) =>
  v === null || v === undefined || Number.isNaN(v) ? "·" : Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(2);

const LABEL = "text-[11px] font-semibold uppercase whitespace-nowrap";
const LABEL_STYLE: CSSProperties = { letterSpacing: "var(--tracking-label)", color: "var(--text-muted)" };
const ROW: CSSProperties = { borderBottom: "1px solid var(--hairline)" };
const NUM_CELL = "h-7 px-2 text-right tabular font-semibold";
const NUM_STYLE: CSSProperties = { fontSize: "var(--t-num)", color: "var(--text-primary)" };
const cursorStyle = (isCursor: boolean): CSSProperties =>
  isCursor ? { ...ROW, background: "var(--bg-surface)" } : ROW;

export function TickLogTable({ log, tick, timeUnit }: { log: TickLog[]; tick?: number; timeUnit?: string }) {
  const cursorRef = useRef<HTMLTableRowElement | null>(null);
  useEffect(() => {
    cursorRef.current?.scrollIntoView({ block: "nearest" });
  }, [tick]);
  if (log.length === 0) return <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Nothing stepped yet.</p>;
  const nodes = log[0].nodes.map((n) => n.name);
  const wires = log[0].wires;
  // The decisions column (ADR 0008): every agent's reading, what the policy
  // chose, and where it landed — the engine's own record, like the rest.
  const decided = log.some((row) => row.decisions.length > 0);
  // The cursor is a scrubber index (0-based); ticks are 1-based.
  const cursorTick = tick === undefined ? null : tick + 1;
  const tickCell = (isCursor: boolean): CSSProperties => ({
    position: "sticky",
    left: 0,
    background: isCursor ? "var(--bg-surface)" : "var(--bg-primary)",
    color: "var(--text-secondary)",
  });
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
              <th className={`sticky left-0 h-7 pr-3 text-left ${LABEL}`} style={{ ...LABEL_STYLE, background: "var(--bg-primary)" }}>
                tick
              </th>
              {nodes.map((n) => (
                <th
                  key={n}
                  colSpan={4}
                  className="h-7 px-2 text-left text-sm font-medium"
                  style={{ borderLeft: "1px solid var(--hairline)", color: "var(--text-primary)" }}
                >
                  {n}
                </th>
              ))}
            </tr>
            <tr style={ROW}>
              <th className="sticky left-0" style={{ background: "var(--bg-primary)" }} />
              {nodes.map((n) => (
                <>
                  <th key={`${n}-in`} className={`h-7 px-2 text-right ${LABEL}`} style={{ ...LABEL_STYLE, borderLeft: "1px solid var(--hairline)" }}>in</th>
                  <th key={`${n}-out`} className={`h-7 px-2 text-right ${LABEL}`} style={LABEL_STYLE}>out</th>
                  <th key={`${n}-lvl`} className={`h-7 px-2 text-right ${LABEL}`} style={LABEL_STYLE}>level</th>
                  <th key={`${n}-shed`} className={`h-7 px-2 text-right ${LABEL}`} style={LABEL_STYLE}>shed</th>
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
                  aria-current={isCursor ? "step" : undefined}
                  style={cursorStyle(isCursor)}
                >
                  <td className="h-7 pr-3 tabular" style={tickCell(isCursor)}>
                    {row.tick}
                  </td>
                  {row.nodes.map((n) => (
                    <>
                      <td key={`${n.name}-in`} className={NUM_CELL} style={{ ...NUM_STYLE, borderLeft: "1px solid var(--hairline)" }}>{num(n.delivered)}</td>
                      <td key={`${n.name}-out`} className={NUM_CELL} style={NUM_STYLE}>{num(n.released)}</td>
                      <td key={`${n.name}-lvl`} className={NUM_CELL} style={NUM_STYLE}>{num(n.level)}</td>
                      <td key={`${n.name}-shed`} className={NUM_CELL} style={NUM_STYLE}>{num(n.dissipated)}</td>
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
              <tr style={ROW}>
                <th className={`h-7 pr-3 text-left ${LABEL}`} style={LABEL_STYLE}>tick</th>
                {wires.map((w, k) => (
                  <th key={k} className="h-7 px-2 text-right text-sm font-medium" style={{ color: "var(--text-primary)" }} title={`${w.from} → ${w.to}`}>
                    {w.name || `${w.from} → ${w.to}`}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {log.map((row) => (
                <tr key={row.tick} data-tick={row.tick} style={cursorStyle(row.tick === cursorTick)}>
                  <td className="h-7 pr-3 tabular" style={{ color: "var(--text-secondary)" }}>{row.tick}</td>
                  {row.wires.map((w, k) => (
                    <td key={k} className={NUM_CELL} style={NUM_STYLE}>{num(w.delivered)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {decided && (
        <div className="overflow-x-auto" data-testid="tick-log-decisions">
          <p style={{ color: "var(--text-secondary)" }}>
            Decisions: what each agent <b>read</b>, what its policy <b>chose</b>, and where it <b>landed</b> — a knob written for the
            next tick, or a command wire this tick.
          </p>
          <table className="min-w-full border-collapse">
            <thead>
              <tr style={ROW}>
                <th className={`h-7 pr-3 text-left ${LABEL}`} style={LABEL_STYLE}>tick</th>
                <th className={`h-7 px-2 text-left ${LABEL}`} style={LABEL_STYLE}>agent</th>
                <th className={`h-7 px-2 text-right ${LABEL}`} style={LABEL_STYLE}>read</th>
                <th className={`h-7 px-2 text-right ${LABEL}`} style={LABEL_STYLE}>chose</th>
                <th className={`h-7 px-2 text-left ${LABEL}`} style={LABEL_STYLE}>landed on</th>
                <th className={`h-7 px-2 text-right ${LABEL}`} style={LABEL_STYLE}>written</th>
              </tr>
            </thead>
            <tbody>
              {log.flatMap((row) =>
                row.decisions.map((d, i) => (
                  <tr key={`${row.tick}-${i}`} data-tick={row.tick} style={cursorStyle(row.tick === cursorTick)}>
                    <td className="h-7 pr-3 tabular" style={{ color: "var(--text-secondary)" }}>{row.tick}</td>
                    <td className="h-7 px-2 text-sm" style={{ color: "var(--text-primary)" }}>{d.agent}</td>
                    <td className={NUM_CELL} style={NUM_STYLE}>{num(d.reading)}</td>
                    <td className={NUM_CELL} style={NUM_STYLE}>{num(d.output)}</td>
                    <td className="h-7 px-2 text-sm" style={{ color: "var(--text-primary)" }}>{d.knob}</td>
                    <td className={NUM_CELL} style={NUM_STYLE}>{num(d.written)}</td>
                  </tr>
                )),
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
