// The selected element's run readout (walkthrough #13): its trajectory at the
// scrubbed tick, and its primitive's rule folded beneath. The flow lists left
// in the 2026-11-02 walk (row 22). Read-only; editing stays in
// NodeEditorRows above. No systems fact is decided here — relations and
// trajectories arrive resolved from the canvas model and the kernel readout.
import { atFrame } from "./canvas/types";
import type { CanvasModel, RunResultRich, Thing } from "./kernel/types";
import { PRIMITIVES, PRIMITIVE_LAWS } from "./canvas/ProcessReference";
import { FALLBACK_SLOT, entitySlots, surfaceEntities, type SeriesSlot } from "./RunChart";

const primitiveLine = (p: Thing["primitive"]) =>
  PRIMITIVES.find(([name]) => name === p)?.[1] ?? null;

/** The node's trajectory as a sparkline in its entity's slot (the same stroke
 *  the run surfaces give it): a 2px line, a marker of r 4 with a 2px ring in
 *  the sheet colour so it reads where it sits on the line (dataviz marks). */
function Sparkline({ series, tick, slot, perStep }: { series: number[]; tick: number; slot: SeriesSlot; perStep: boolean }) {
  if (series.length < 2) return null;
  const min = Math.min(...series);
  const max = Math.max(...series);
  const w = 120;
  const h = 28;
  const pad = 5;
  const x = (i: number) => pad + (i / (series.length - 1)) * (w - 2 * pad);
  const y = (v: number) => (max > min ? h - pad - ((v - min) / (max - min)) * (h - 2 * pad) : h / 2);
  // Frame `tick`: a level's index tick, a per-step series' tick - 1 (none at
  // the start, canvas/types `atFrame`).
  const at = Math.min(perStep ? tick - 1 : tick, series.length - 1);
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
      {at >= 0 && <circle cx={x(at)} cy={y(series[at])} r={4} fill={slot.color} stroke="var(--bg-secondary)" strokeWidth={2} />}
    </svg>
  );
}

/** Read-only card under the element editor: what this node did over the run,
 *  and, folded, how the engine computes it. The flows in and out are not
 *  listed (2026-11-02 walk, row 22): the canvas draws them, and the amounts
 *  a thing sends are its settings, above. Renders nothing when there is
 *  nothing to say. */
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
  const traj = result?.trajectories.find((t) => t.name === thing.name) ?? null;
  const line = primitiveLine(thing.primitive);
  if (!line && !traj) return null;

  const at = traj ? atFrame(traj.series, tick, !traj.holds) : null;
  const slot = traj ? entitySlots(surfaceEntities(model, result)).get(thing.name) ?? FALLBACK_SLOT : FALLBACK_SLOT;
  return (
    <div className="mt-3 border-t pt-2" style={{ borderColor: "var(--hairline)" }}>
      {traj && at !== null && (
        // A readout, never a control (walk: a flat series drew as a line with
        // a dot and read as a slider). Labelled, and a value that never moves
        // is said in words instead of drawn.
        <div className="mb-2" data-testid="element-trajectory">
          <span className="block text-[11px]" style={{ color: "var(--text-muted)" }}>
            over the run
          </span>
          <div className="flex items-center gap-3">
            {Math.min(...traj.series) !== Math.max(...traj.series) && (
              <Sparkline series={traj.series} tick={tick} slot={slot} perStep={!traj.holds} />
            )}
            <span className="tabular font-semibold" style={{ fontSize: "var(--t-num)", color: "var(--text-secondary)" }}>
              {Number.isFinite(at) ? at.toLocaleString(undefined, { maximumFractionDigits: 1 }) : "—"}
              {traj.unit ? ` ${traj.unit}` : ""}{" "}
              <span style={{ color: "var(--text-muted)" }}>
                {Math.min(...traj.series) === Math.max(...traj.series)
                  ? "the same at every tick"
                  : `at tick ${tick}`}
              </span>
            </span>
          </div>
        </div>
      )}
      {line && thing.primitive && (
        /* The primitive's per-tick rule as the engine computes it
           (PRIMITIVE_LAWS, transcribed from circuit.rs), folded (walk row
           22): the honest answer to "what happens inside this box?", for
           whoever asks it. */
        <details data-testid="how-it-computes">
          <summary className="cursor-pointer text-xs" style={{ color: "var(--text-secondary)" }}>
            how it computes
          </summary>
          <div className="mt-1 text-xs" style={{ color: "var(--text-secondary)" }}>
            {thing.primitive}: {line}
            <div className="mt-1 font-mono text-[11px]" style={{ color: "var(--text-muted)" }}>
              {PRIMITIVE_LAWS[thing.primitive]}
            </div>
          </div>
        </details>
      )}
    </div>
  );
}
