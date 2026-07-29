// The selected element's MECHANISM readout (walkthrough #13): what this node
// does, said with what the model already knows — its primitive's one-liner,
// every flow touching it (direction, substance, declared magnitude), and its
// run trajectory at the scrubbed tick. Read-only; editing stays in
// NodeEditorRows above. No systems fact is decided here — relations and
// trajectories arrive resolved from the canvas model and the kernel readout.
import type { CanvasModel, RunResultRich, Thing } from "./kernel/types";
import { PRIMITIVES } from "./canvas/ProcessReference";

const primitiveLine = (p: Thing["primitive"]) =>
  PRIMITIVES.find(([name]) => name === p)?.[1] ?? null;

function Sparkline({ series, tick }: { series: number[]; tick: number }) {
  if (series.length < 2) return null;
  const min = Math.min(...series);
  const max = Math.max(...series);
  const w = 120;
  const h = 26;
  const x = (i: number) => (i / (series.length - 1)) * w;
  const y = (v: number) => (max > min ? h - ((v - min) / (max - min)) * (h - 4) - 2 : h / 2);
  const at = Math.min(tick, series.length - 1);
  return (
    <svg width={w} height={h} aria-hidden>
      <polyline
        points={series.map((v, i) => `${x(i)},${y(v)}`).join(" ")}
        fill="none"
        stroke="var(--accent)"
        strokeWidth={1.25}
      />
      <circle cx={x(at)} cy={y(series[at])} r={2.5} fill="var(--accent)" />
    </svg>
  );
}

function FlowRow({
  flowName,
  otherEnd,
  substance,
  amount,
  unit,
}: {
  flowName: string;
  otherEnd: string;
  substance?: string;
  amount?: string;
  unit?: string;
}) {
  // Legibility (#13 refinement): the counterparty and the number are the
  // content — text-primary; the flow's label and substance are context —
  // muted. Direction lives in the group header, not a per-row glyph.
  return (
    <div className="flex items-baseline gap-2 py-0.5 text-xs">
      <span className="min-w-0 flex-1 truncate" title={flowName}>
        <span style={{ color: "var(--text-primary)" }}>{otherEnd}</span>
        {flowName && <span style={{ color: "var(--text-muted)" }}> · {flowName}</span>}
      </span>
      <span className="shrink-0 font-mono text-[11px]">
        {substance && <span style={{ color: "var(--text-muted)" }}>{substance} · </span>}
        <span style={{ color: amount ? "var(--text-primary)" : "var(--text-muted)" }}>
          {amount ? `${amount}${unit ? ` ${unit}` : ""}` : "—"}
        </span>
      </span>
    </div>
  );
}

function FlowGroupHeader({ children }: { children: string }) {
  return (
    <div className="mb-0.5 mt-2 text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
      {children}
    </div>
  );
}

/** Read-only mechanism card under the element editor: flows in/out and the
 *  node's recorded trajectory. Renders nothing when there is nothing to say
 *  (an unconnected node with no run). */
export function ElementMechanism({
  thing,
  model,
  result,
  tick,
}: {
  thing: Thing;
  model: CanvasModel;
  result: RunResultRich | null;
  tick: number;
}) {
  const nameOf = (id: number) => model.things.find((t) => t.id === id)?.name ?? "?";
  const bonds = model.relations.filter((r) => r.is_bond && (r.a === thing.id || r.b === thing.id));
  const inflows = bonds.filter((r) => r.b === thing.id);
  const outflows = bonds.filter((r) => r.a === thing.id);
  const traj = result?.trajectories.find((t) => t.name === thing.name) ?? null;
  const line = primitiveLine(thing.primitive);
  if (!line && bonds.length === 0 && !traj) return null;

  const at = traj ? traj.series[Math.min(tick, traj.series.length - 1)] : null;
  return (
    <div className="mt-4 border-t pt-3" style={{ borderColor: "var(--hairline)" }}>
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
        mechanism
      </div>
      {line && thing.primitive && (
        <div className="mb-2 text-xs" style={{ color: "var(--text-secondary)" }}>
          {thing.primitive}: {line}
        </div>
      )}
      {inflows.length > 0 && (
        <>
          <FlowGroupHeader>flows in — from</FlowGroupHeader>
          {inflows.map((r) => (
            <FlowRow
              key={r.id}
              flowName={r.name}
              otherEnd={nameOf(r.a)}
              substance={r.substance}
              amount={r.amount}
              unit={r.unit}
            />
          ))}
        </>
      )}
      {outflows.length > 0 && (
        <>
          <FlowGroupHeader>flows out — to</FlowGroupHeader>
          {outflows.map((r) => (
            <FlowRow
              key={r.id}
              flowName={r.name}
              otherEnd={nameOf(r.b)}
              substance={r.substance}
              amount={r.amount}
              unit={r.unit}
            />
          ))}
        </>
      )}
      {traj && at !== null && (
        <div className="mt-2 flex items-center gap-3">
          <Sparkline series={traj.series} tick={tick} />
          <span className="font-mono text-[11px]" style={{ color: "var(--text-secondary)" }}>
            {Number.isFinite(at) ? at.toLocaleString(undefined, { maximumFractionDigits: 1 }) : "—"}
            {traj.unit ? ` ${traj.unit}` : ""} <span style={{ color: "var(--text-muted)" }}>at tick {Math.min(tick, traj.series.length - 1)}</span>
          </span>
        </div>
      )}
    </div>
  );
}
