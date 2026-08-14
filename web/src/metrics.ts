// Declared-metric evaluation (#203) — the output twin of the param layer.
//
// A metric is a derived reading of kernel-executed values: the recorder ships
// per-flow executed series (`RunResultRich.flows`, the circuit's own
// `wire_history`), and this module does the arithmetic each declared verb
// names. Resolution goes decl → canvas referent → recorder flow by endpoint
// names; anything unresolvable comes back as a stated failure, never a silent
// zero series. No systems fact is decided here — the kernel executed every
// number this file touches.
import type { CanvasModel, FlowSeries, RunResultRich } from "./kernel/types";

export interface MetricReading {
  name: string;
  kind: "share" | "sum";
  /** The series' unit — "" for a share (a dimensionless fraction of the
   *  source's outflow). */
  unit: string;
  series: number[];
  /** A share's run-end value; a sum's run-total (Σ per-tick × Δt). */
  endpoint: number;
  /** Plain-words statement of what was computed, for the card's subtitle. */
  detail: string;
  /** The FAMILY this reading belongs to (#341): the same question asked of
   *  different entities. Shares family by their denominator (everything
   *  leaving one source); sums family by kind + unit. Readings sharing a
   *  key are one chart with a line per entity — the leaderboard, visual. */
  familyKey: string;
  /** The family's display name ("share of what leaves Clearing"). */
  family: string;
  /** The entity this reading answers for (the receiving/target thing). */
  entity: string;
}

export interface MetricFailure {
  name: string;
  reason: string;
}

export interface MetricReport {
  readings: MetricReading[];
  failures: MetricFailure[];
}

/** Recorder flows leaving `from` (the share denominator's family). */
const outOf = (flows: FlowSeries[], from: string) => flows.filter((f) => f.from === from);
/** Recorder flows arriving at `to` (the sum's family). */
const into = (flows: FlowSeries[], to: string) => flows.filter((f) => f.to === to);

export function evaluateMetrics(model: CanvasModel, result: RunResultRich): MetricReport {
  const readings: MetricReading[] = [];
  const failures: MetricFailure[] = [];
  const nameOf = (id: number) => model.things.find((t) => t.id === id)?.name;

  for (const m of model.metrics ?? []) {
    if ("ShareOfFlow" in m.expr) {
      const relId = m.expr.ShareOfFlow.relation;
      const rel = model.relations.find((r) => r.id === relId);
      const a = rel && nameOf(rel.a);
      const b = rel && nameOf(rel.b);
      if (!rel || !a || !b) {
        failures.push({ name: m.name, reason: "anchored flow no longer exists in the model" });
        continue;
      }
      const family = outOf(result.flows, a);
      // Endpoint names first; when several flows share the pair, the flow's
      // own label disambiguates — the same rule SL parsing applied.
      const pair = family.filter((f) => f.to === b);
      const flow = pair.length <= 1 ? pair[0] : pair.find((f) => f.name === rel.name);
      if (!flow) {
        failures.push({
          name: m.name,
          reason:
            pair.length > 1
              ? `several recorded flows run ${a} → ${b} and none carries the label "${rel.name}"`
              : `the run recorded no flow ${a} → ${b}`,
        });
        continue;
      }
      const series = flow.series.map((v, t) => {
        const den = family.reduce((acc, f) => acc + (f.series[t] ?? 0), 0);
        return den > 0 ? v / den : 0;
      });
      readings.push({
        name: m.name,
        kind: "share",
        unit: "",
        series,
        endpoint: series[series.length - 1] ?? 0,
        detail: `${a} → ${b} as a fraction of everything leaving ${a}`,
        familyKey: `share:${a}`,
        family: `share of what leaves ${a}`,
        entity: b,
      });
    } else {
      const target = nameOf(m.expr.SumInto.thing);
      if (!target) {
        failures.push({ name: m.name, reason: "anchored thing no longer exists in the model" });
        continue;
      }
      const family = into(result.flows, target);
      if (family.length === 0) {
        failures.push({ name: m.name, reason: `the run recorded no flow into ${target}` });
        continue;
      }
      const units = [...new Set(family.map((f) => f.unit).filter(Boolean))];
      if (units.length > 1) {
        failures.push({
          name: m.name,
          reason: `inflows to ${target} carry mixed units (${units.join(", ")}) — their sum names no quantity`,
        });
        continue;
      }
      const ticks = Math.max(...family.map((f) => f.series.length));
      const series = Array.from({ length: ticks }, (_, t) =>
        family.reduce((acc, f) => acc + (f.series[t] ?? 0), 0),
      );
      readings.push({
        name: m.name,
        kind: "sum",
        unit: units[0] ?? "",
        series,
        endpoint: series.reduce((acc, v) => acc + v, 0) * result.dt,
        detail: `everything arriving at ${target}, per tick`,
        familyKey: `sum:${units[0] ?? ""}`,
        family: units[0] ? `arrivals · ${units[0]}` : "arrivals",
        entity: target,
      });
    }
  }
  // Same-verb families read as a leaderboard: within each kind, order by
  // endpoint descending — the ranking view, delivered by the panel rather
  // than by a third grammar verb (ADR 0006).
  readings.sort((x, y) => (x.kind === y.kind ? y.endpoint - x.endpoint : x.kind < y.kind ? -1 : 1));
  return { readings, failures };
}
