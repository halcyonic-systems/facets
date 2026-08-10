// #309 M1: the data-first front door — guesses are proposals (numeric reads
// Ratio, a t-shaped header reads Support), serialization round-trips commas
// and quotes, and the gate offers both acquisition paths.
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("./kernel", () => ({
  parseCsv: (text: string) => {
    const [head, ...rest] = text.trim().split("\n");
    return { headers: head.split(","), rows: rest.map((r) => r.split(",")) };
  },
}));

import { StartFromData, guessCfg, guessSupport, toCsvText } from "./StartFromData";

const grid = {
  headers: ["week", "loan_amount", "county"],
  rows: [
    ["2024-01-01", "215000", "Norfolk"],
    ["2024-01-08", "180000", "Norfolk"],
    ["2024-01-15", "440000", "Virginia Beach"],
  ],
};

describe("column guesses are proposals with the right defaults", () => {
  it("reads a mostly-numeric column as Ratio and text as Nominal", () => {
    const cfg = guessCfg(grid);
    expect(cfg[1].scale).toBe("Ratio");
    expect(cfg[2].scale).toBe("Nominal");
  });

  it("reads a support-shaped header as Support and picks it as the support column", () => {
    const cfg = guessCfg(grid);
    expect(cfg[0].kind).toBe("Support");
    expect(guessSupport(grid)).toBe(0);
  });

  it("falls back to column 0 when no header is support-shaped", () => {
    expect(guessSupport({ headers: ["a", "b"], rows: [] })).toBe(0);
  });
});

describe("CSV serialization", () => {
  it("round-trips commas and quotes per RFC quoting", () => {
    const text = toCsvText({
      headers: ["name", "note"],
      rows: [["a, inc", 'said "hi"']],
    });
    expect(text).toBe('name,note\n"a, inc","said ""hi"""\n');
  });
});

describe("the gate", () => {
  it("offers both acquisition paths and states the two rungs", () => {
    const html = renderToStaticMarkup(
      <StartFromData onCommit={() => {}} onCancel={() => {}} />,
    );
    expect(html).toContain("ingest a CSV");
    expect(html).toContain("enter by hand");
    expect(html).toContain("source system");
    expect(html).toContain("data system");
  });
});
