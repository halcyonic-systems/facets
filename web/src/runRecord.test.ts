// The run record (#463): the shape the dev server writes and Export run
// downloads. Pinned: it carries what is needed to read a run cold and to run
// it again, and the filename names the model and the moment.
import { describe, expect, it } from "vitest";
import { buildRunRecord, runRecordFilename } from "./runRecord";

describe("the bench run record", () => {
  it("carries the model as run, the knobs, the readout and the log", () => {
    const rec = buildRunRecord({
      model: { name: "Bathtub", sl: 'system "Bathtub"' },
      csv: null,
      manifest: null,
      dt: 1,
      t: 6,
      event: "knob",
      edits: [{ tick: 3, target: "Faucet -> Tub : inflow", field: "amount", value: 4 }],
      readout: { ticks: 6, dt: 1, residual: 0, conserved: true, levels: [], comparisons: [], trajectories: [], flows: [] },
      log: [],
    });
    expect(rec.at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(rec.edits[0].tick).toBe(3);
    expect(runRecordFilename(rec)).toMatch(/^facets-run-bathtub-\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}\.json$/);
  });
});
