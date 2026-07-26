// #229 — the About surface exists so a person holding the binary can trace a
// verdict to the proofs behind it. These tests pin the two properties that make
// it worth having: it names the SSF pin, and it never invents a fact.
//
// The values themselves are injected by vite.config.ts, which vitest does not
// load, so every field here reads "unknown" — which is exactly the case worth
// testing. A build that could not determine its own commit must say so; the
// failure mode this guards against is a fallback that looks like a real answer.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { buildInfo, provenanceLines, shortHash } from "./buildInfo";

describe("build provenance", () => {
  it("degrades to 'unknown' rather than a plausible-looking fact", () => {
    for (const [field, value] of Object.entries(buildInfo)) {
      expect(value, field).toBe("unknown");
    }
  });

  it("shows the SSF pin, the commit, and a hash the holder can recompute", () => {
    const labels = provenanceLines().map((l) => l.label);
    expect(labels).toContain("Proof base");
    expect(labels).toContain("Built from");
    expect(labels).toContain("Kernel wasm SHA-256");
  });

  it("tells the reader how to check the wasm hash instead of only printing it", () => {
    const line = provenanceLines().find((l) => l.label === "Kernel wasm SHA-256");
    expect(line?.note).toMatch(/shasum -a 256/);
  });

  it("names the proof base as a commit in systems-science-foundations", () => {
    const line = provenanceLines().find((l) => l.label === "Proof base");
    expect(line?.note).toMatch(/systems-science-foundations/);
  });

  it("abbreviates a hash for the eye without pretending it is the whole one", () => {
    const full = "a".repeat(64);
    expect(shortHash(full)).toBe(`${"a".repeat(12)}…`);
    expect(shortHash("unknown")).toBe("unknown");
  });

  // The pin the About pane reports is read out of the doc at build time rather
  // than typed in. This asserts the doc still carries the shape that read
  // expects, so a reformat of lean-provenance.md cannot silently turn the
  // shipped pin into "unknown".
  it("can still find the pin in docs/lean-provenance.md", () => {
    const doc = readFileSync(new URL("../../docs/lean-provenance.md", import.meta.url), "utf8");
    const pin = doc.match(/pinned-commit:\s*([0-9a-f]{7,40})/)?.[1];
    expect(pin).toBeDefined();
    expect(pin).toHaveLength(40);
  });
});
