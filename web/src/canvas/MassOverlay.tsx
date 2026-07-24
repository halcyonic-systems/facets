// Probability mass on the state-transition diagram (#67 J9). A Klir/Markov run
// evolves a distribution over states (vₙ₊₁ = vₙ P); this rides that distribution
// on the diagram the Klir lens already draws — each node carries a disc whose
// AREA and opacity scale with P(state) at the scrubbed tick. Structure stays
// primary (the nodes and edges), mass is the overlay. It reads a precomputed
// {state-name → probability} frame and computes no dynamics.
import type { Thing } from "../kernel/types";
import { NODE_R } from "./geometry";

/** The disc radius for a probability `p` (0…1): area (∝ r²) tracks p, so the
 *  disc reads as the *amount* of mass, with a floor so a near-zero state stays
 *  visible as a faint dot rather than vanishing. */
function massRadius(p: number): number {
  return NODE_R * (0.4 + 1.25 * Math.sqrt(p));
}

export function MassOverlay({ things, mass }: { things: Thing[]; mass: Record<string, number> }) {
  return (
    <g data-mass-overlay pointerEvents="none">
      {things.map((t) => {
        const raw = mass[t.name];
        if (raw == null) return null;
        const p = Math.max(0, Math.min(1, raw));
        const r = massRadius(p);
        return (
          <g key={t.id} data-mass-node={t.name} data-mass-p={p} transform={`translate(${t.x}, ${t.y})`}>
            <circle r={r} fill="var(--accent)" opacity={0.12 + 0.62 * p} />
            <text
              y={-r - 5}
              textAnchor="middle"
              fontSize={11}
              fill="var(--accent-strong)"
              className="font-mono tabular"
            >
              {(p * 100).toFixed(0)}%
            </text>
          </g>
        );
      })}
    </g>
  );
}
