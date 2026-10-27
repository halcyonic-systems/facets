// The selected element's MECHANISM readout (walkthrough #13): what this node
// does, said with what the model already knows — its primitive's one-liner,
// every flow touching it (direction, substance, declared magnitude), and its
// run trajectory at the scrubbed tick. Read-only; editing stays in
// NodeEditorRows above. No systems fact is decided here — relations and
// trajectories arrive resolved from the canvas model and the kernel readout.
import type { CanvasModel, RunResultRich, Thing } from "./kernel/types";
import { PRIMITIVES, PRIMITIVE_LAWS } from "./canvas/ProcessReference";
import { FALLBACK_SLOT, entitySlots, surfaceEntities, type SeriesSlot } from "./RunChart";

const primitiveLine = (p: Thing["primitive"]) =>
  PRIMITIVES.find(([name]) => name === p)?.[1] ?? null;

/** The node's trajectory as a sparkline in its entity's slot (the same stroke
 *  the run surfaces give it): a 2px line, a marker of r 4 with a 2px ring in
 *  the sheet colour so it reads where it sits on the line (dataviz marks). */
function Sparkline({ series, tick, slot }: { series: number[]; tick: number; slot: SeriesSlot }) {
  if (series.length < 2) return null;
  const min = Math.min(...series);
  const max = Math.max(...series);
  const w = 120;
  const h = 28;
  const pad = 5;
  const x = (i: number) => pad + (i / (series.length - 1)) * (w - 2 * pad);
  const y = (v: number) => (max > min ? h - pad - ((v - min) / (max - min)) * (h - 2 * pad) : h / 2);
  const at = Math.min(tick, series.length - 1);
  return (
    <svg width={w} height={h} aria-hidden>
      <polyline
        points={series.map((v, i) => `${x(i)},${y(v)}`).join(" ")}
        fill="none"
        stroke={slot.color}
        strokeDasharray={slot.dash}
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx={x(at)} cy={y(series[at])} r={4} fill={slot.color} stroke="var(--bg-secondary)" strokeWidth={2} />
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
    <div className="mb-0.5 mt-2 text-[11px] font-semibold uppercase" style={{ letterSpacing: "var(--tracking-label)", color: "var(--text-muted)" }}>
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
  const slot = traj ? entitySlots(surfaceEntities(model, result)).get(thing.name) ?? FALLBACK_SLOT : FALLBACK_SLOT;
  return (
    <div className="mt-4 border-t pt-3" style={{ borderColor: "var(--hairline)" }}>
      <div className="mb-1 text-[11px] font-semibold uppercase" style={{ letterSpacing: "var(--tracking-label)", color: "var(--text-muted)" }}>
        mechanism
      </div>
      {line && thing.primitive && (
        <div className="mb-2 text-xs" style={{ color: "var(--text-secondary)" }}>
          {thing.primitive}: {line}
          {/* The primitive's actual per-tick rule, as the engine computes it
              (PRIMITIVE_LAWS, transcribed from circuit.rs) — the honest answer
              to "what happens to the flow inside this box?" */}
          <div className="mt-1 font-mono text-[11px]" style={{ color: "var(--text-muted)" }}>
            {PRIMITIVE_LAWS[thing.primitive]}
          </div>
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
          <Sparkline series={traj.series} tick={tick} slot={slot} />
          <span className="tabular font-semibold" style={{ fontSize: "var(--t-num)", color: "var(--text-secondary)" }}>
            {Number.isFinite(at) ? at.toLocaleString(undefined, { maximumFractionDigits: 1 }) : "—"}
            {traj.unit ? ` ${traj.unit}` : ""} <span style={{ color: "var(--text-muted)" }}>at tick {Math.min(tick, traj.series.length - 1)}</span>
          </span>
        </div>
      )}
    </div>
  );
}
