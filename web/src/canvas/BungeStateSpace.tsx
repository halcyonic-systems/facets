// The Bunge state-space readout (#100 phase 5): a system's run made visible in
// Bunge's own register — not the coupling matrix (structure) but the TRAJECTORY
// through state space, which is what "the system changed" means in this lens.
//
// It presents the compose run's trajectories as a phase portrait: with two or
// more stocks, the path of stock-0 against stock-1 (a parametric curve in state
// space); with one stock, its value over the run. This is the coalgebra
// unfolding H of the run (dynamics-coalgebra-halfa.md) drawn in the Bunge lens —
// the deterministic/conservation kind the runtime actually steps today. It reads
// the kernel's already-computed trajectories; it never advances any dynamics.
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";
import type { RunResultRich } from "../kernel/types";

const AXIS_TICK = { fontSize: 11, fill: "var(--text-muted)" } as const;
const TOOLTIP_STYLE = {
  background: "var(--bg-secondary)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 12,
} as const;

function label(name: string, unit: string) {
  return unit ? `${name} (${unit})` : name;
}

/** Bunge's trajectory / state-space view of a run. Renders nothing without a
 *  run trajectory to show. Self-contained: `result` is the only input. */
export function BungeStateSpace({ result }: { result: RunResultRich }) {
  const traj = result.trajectories;
  if (traj.length === 0) return null;

  // Two or more stocks → a phase portrait (the state-space path). One stock →
  // its value over the run (no second axis to plot against).
  if (traj.length >= 2) {
    const [a, b] = traj;
    const n = Math.min(a.series.length, b.series.length);
    const points = Array.from({ length: n }, (_, i) => ({ x: a.series[i], y: b.series[i], t: i }));
    return (
      <Frame caption={`the run's path through state space — ${label(a.name, a.unit)} × ${label(b.name, b.unit)}`}>
        <ResponsiveContainer width="100%" height={200}>
          <ScatterChart margin={{ top: 8, right: 12, bottom: 4, left: -8 }}>
            <CartesianGrid stroke="var(--hairline)" />
            <XAxis type="number" dataKey="x" name={a.name} tick={AXIS_TICK} stroke="var(--border)" />
            <YAxis type="number" dataKey="y" name={b.name} tick={AXIS_TICK} stroke="var(--border)" width={44} />
            <ZAxis type="number" dataKey="t" range={[10, 10]} />
            <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ stroke: "var(--border)" }} />
            <Scatter
              data={points}
              line={{ stroke: "var(--accent)", strokeWidth: 1.5 }}
              fill="var(--accent)"
              isAnimationActive={false}
            />
          </ScatterChart>
        </ResponsiveContainer>
      </Frame>
    );
  }

  const only = traj[0];
  const data = only.series.map((v, t) => ({ t, v }));
  return (
    <Frame caption={`the run's one state variable over time — ${label(only.name, only.unit)}`}>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: -8 }}>
          <CartesianGrid stroke="var(--hairline)" vertical={false} />
          <XAxis dataKey="t" tick={AXIS_TICK} stroke="var(--border)" />
          <YAxis tick={AXIS_TICK} stroke="var(--border)" width={44} />
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          <Line type="monotone" dataKey="v" stroke="var(--accent)" dot={false} strokeWidth={2} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </Frame>
  );
}

function Frame({ caption, children }: { caption: string; children: React.ReactNode }) {
  return (
    <div>
      {children}
      <div className="mt-1 text-[11px] leading-snug" style={{ color: "var(--text-muted)" }}>
        {caption}
      </div>
    </div>
  );
}
