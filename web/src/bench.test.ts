// The bench shelf (#472): ten models that exist to test the instrument, each
// after a named literature model. The keep set is pinned like the examples';
// a file without the provenance line is not a bench model and does not ship.
import { describe, expect, it } from "vitest";
import { BENCH, parseBenchProvenance } from "./bench";
import { shelves, shippedModels } from "./home";

describe("the bench shelf", () => {
  it("ships the keep set, each after a named model", () => {
    expect(BENCH.map((b) => b.demo.title).sort()).toEqual([
      "Bank Run",
      "Bank Run (crowd)",
      "Enzyme Kinetics",
      "Glucose and Insulin",
      "Hospital Beds",
      "Hospital Beds (gatekeeper)",
      "Logistic Harvest",
      "Logistic Harvest (quota)",
      "Membrane Pump",
      "SIR Epidemic",
      "SIR Epidemic (public)",
      "Thermostat Room",
      "Thermostat Room (agent)",
      "Thermostat Room (relay)",
      "Traffic Bottleneck",
      "Two Tanks",
    ]);
    for (const b of BENCH) expect(b.after.length).toBeGreaterThan(8);
  });

  it("reads the provenance line and refuses a file without one", () => {
    expect(parseBenchProvenance("# x\n# bench · after Kermack & McKendrick 1927\nsystem \"S\" : Concrete/Social")).toBe("Kermack & McKendrick 1927");
    expect(parseBenchProvenance("system \"S\" : Concrete/Social\n# bench · after Y")).toBeNull();
  });

  it("is its own shelf, last, in both cuts, and on no domain or lens shelf", () => {
    for (const arrange of ["lens", "domain"] as const) {
      const all = shelves(shippedModels(), arrange);
      const last = all[all.length - 1];
      expect(last.kind).toBe("role");
      expect(last.models.length).toBe(BENCH.length);
      for (const sh of all.slice(0, -1)) {
        expect(sh.models.some((m) => m.after)).toBe(false);
      }
    }
  });
});
