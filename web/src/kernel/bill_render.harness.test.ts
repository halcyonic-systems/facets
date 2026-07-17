// WP4 LLM-leg harness — produce the EXACT context string the Analyst panel would
// send for bill-broken, from the real kernel output (crates/bert-canvas dumped
// bill-broken.canvas.json + bill-broken.analysis.json). renderContextForPrompt is
// pure; ./index is mocked only because the real module pulls the Vite-only wasm
// url import (same reason as context.test.ts). Writes bill-broken.context.txt.

import { describe, it, expect, vi } from "vitest";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

import type { CanvasModel, CanvasAnalysis } from "./types";
import type { ModelContext } from "./context";

vi.mock("./index", () => ({ analyzeCanvas: vi.fn(), project: vi.fn() }));

import { renderContextForPrompt } from "./context";

const FIX = resolve(__dirname, "../../fixtures");

describe("bill-broken rendered context (real kernel output)", () => {
  it("renders the faithful context string and writes it to disk", () => {
    const canvas: CanvasModel = JSON.parse(readFileSync(`${FIX}/bill-broken.canvas.json`, "utf8"));
    const analysis: CanvasAnalysis = JSON.parse(
      readFileSync(`${FIX}/bill-broken.analysis.json`, "utf8"),
    );

    const ctx: ModelContext = {
      lens: canvas.lens,
      canvas,
      world: null,
      analysis,
      provenance: { generated_at: "1970-01-01T00:00:00.000Z", source: "bert-lenses" },
    };

    const rendered = renderContextForPrompt(ctx);
    writeFileSync(`${FIX}/bill-broken.context.txt`, rendered, "utf8");

    // Sanity: the 7 kernel verdicts and their tokens are present.
    expect(rendered).toContain("[issue:0]");
    expect(rendered).toContain("[issue:6]");
    expect(rendered).toContain("duplicate edge");
    expect(rendered).toMatch(/\[thing:9\].*|.*'Vetoed'/);
    // Every relation carries a [relation:N] token.
    expect(rendered).toContain("## Elements");
    expect(rendered).toContain("## Kernel verdicts");
  });
});
