// The bench run record (facets#463): everything needed to read a run without
// having watched it, and to run it again — the model as it ran (SL, and the
// CSV and manifest when a column was bound), Δt and T, the knobs turned and
// when, the readout, and the per-tick log. One shape for two doors: the dev
// server writes it to `runs/bench/latest.json` on every Run, Step and knob
// (vite.config.ts `benchRecorder`), and Export run downloads it anywhere.
import type { KnobEdit, RunResultRich, TickLog } from "./kernel/types";

export interface RunRecord {
  at: string;
  model: { name: string; sl: string | null };
  csv: string | null;
  manifest: unknown | null;
  dt: number;
  t: number;
  /** What the record is about: a run from the top, one step, or a knob. */
  event: "run" | "step" | "knob";
  edits: KnobEdit[];
  readout: RunResultRich;
  /** The kept baseline at the time, if any (#463 move 4), so a diff is in
   *  the file rather than in whoever reads it. */
  baseline?: RunResultRich | null;
  log: TickLog[];
}

export function buildRunRecord(args: Omit<RunRecord, "at">): RunRecord {
  return { at: new Date().toISOString(), ...args };
}

/** Dev server only: post the record to the recorder. Fire and forget; a
 *  missing recorder (the live site, a test) is not an error anyone sees. */
export function postRunRecord(record: RunRecord): void {
  if (!import.meta.env.DEV) return;
  try {
    void fetch("/__bench/record", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(record),
    }).catch(() => {});
  } catch {
    // no fetch (a static render): nothing to record
  }
}

export function runRecordFilename(record: RunRecord): string {
  const slug = record.model.name.replace(/[^a-z0-9_-]+/gi, "-").toLowerCase() || "model";
  return `facets-run-${slug}-${record.at.slice(0, 19).replace(/[:T]/g, "-")}.json`;
}
