import { describe, it, expect } from "vitest";

import { isRunnable, type Demo } from "./demos";
import { EXAMPLES, groupedExamples, parseExample } from "./examples";
import { groupedCorpus } from "./corpus";

describe("parseExample", () => {
  it("reads title, genus (the part after Kingdom/), and blurb from domain", () => {
    const sl = [
      "# a header comment",
      'system "Home Thermostat System" : Concrete/Technical',
      'domain "Residential climate control"',
      "component Furnace primitive Combining",
    ].join("\n");
    const ex = parseExample("../../assets/examples/thermostat.sl", sl);
    expect(ex.title).toBe("Home Thermostat System");
    expect(ex.genus).toBe("Technical");
    expect(ex.blurb).toBe("Residential climate control");
    expect(ex.sl).toBe(sl); // structural: carries its SL
  });

  it("falls back to the first prose comment when there is no domain", () => {
    const sl = ["# ──────────────", "#", "# The real blurb here", 'system "X" : Conceptual/Social'].join("\n");
    const ex = parseExample("a/b/x.sl", sl);
    expect(ex.blurb).toBe("The real blurb here");
    expect(ex.genus).toBe("Social");
  });

  it("produces no run bundle — a structural entry opens as a diagram, never runs", () => {
    const ex = parseExample("a/b/x.sl", 'system "X" : Concrete/Biological\ndomain "cells"');
    expect(isRunnable(ex)).toBe(false);
    expect(ex.csv).toBeUndefined();
    expect(ex.manifest).toBeUndefined();
    expect(ex.t).toBeUndefined();
    expect(ex.modelJson).toBeUndefined();
  });
});

describe("groupedExamples", () => {
  const mk = (title: string, genus: string): Demo => ({ key: title, title, blurb: "", genus, sl: "x" });

  it("groups by genus in Bunge's canonical order, dropping empty genera", () => {
    const list = [mk("a", "Technical"), mk("b", "Biological"), mk("c", "Technical")];
    const groups = groupedExamples(list);
    expect(groups.map((g) => g.genus)).toEqual(["Biological", "Technical"]);
    expect(groups.find((g) => g.genus === "Technical")!.entries.map((e) => e.title)).toEqual(["a", "c"]);
  });

  it("appends a genus outside the five after the canonical ones", () => {
    const groups = groupedExamples([mk("a", "Physical"), mk("z", "Zeta")]);
    expect(groups.map((g) => g.genus)).toEqual(["Physical", "Zeta"]);
  });
});

describe("the shipped library", () => {
  it("merges runnable demos and structural examples, every entry carrying a genus", () => {
    expect(EXAMPLES.length).toBeGreaterThan(0);
    for (const ex of EXAMPLES) expect(ex.genus).not.toBe("");
    expect(EXAMPLES.some((e) => isRunnable(e))).toBe(true); // the demos
    expect(EXAMPLES.some((e) => !isRunnable(e) && e.sl)).toBe(true); // the structural examples
  });

  // The keep set after the #318 consolidation, named one by one so a regression
  // says which file stopped self-sorting. The claim is unchanged — genus comes
  // from each file's own `system "…" : Kingdom/Genus` line and nothing else —
  // and it still spans three genera and both kingdoms, which is what makes the
  // assertion capable of failing rather than a restatement of one case.
  it("sorts the shipped examples into the expected genera", () => {
    const genusOf = (title: string) => EXAMPLES.find((e) => e.title === title)?.genus;
    expect(genusOf("Predator-Prey Ecosystem")).toBe("Biological");
    expect(genusOf("LLM Market")).toBe("Social");
    expect(genusOf("Federal Reserve")).toBe("Social");
    expect(genusOf("Bitcoin")).toBe("Social");
    expect(genusOf("Jungian Cognitive Function Stack")).toBe("Social"); // Conceptual/
    expect(genusOf("hal")).toBe("Technical");
  });

  // The consolidation is load-bearing, so it is asserted rather than assumed:
  // the gallery shows the keep set and nothing that was archived out of it.
  // The three pre-SL demos (`Allocation`, `Homeostat`, `Reservoir`) retired to
  // assets/archive/demos/ in the August 2026 curation — they predate the
  // language and cannot be ported (see docs/authoring-models.md, "The three
  // pre-SL demos"), and their run-bundle gates now hold them in the archive.
  it("ships the keep set, and nothing that was archived", () => {
    expect(EXAMPLES.map((e) => e.title).sort()).toEqual([
      "Bitcoin",
      "Federal Reserve",
      "Jungian Cognitive Function Stack",
      "LLM Market",
      "Predator-Prey Ecosystem",
      "Ribosome",
      "U.S. Federal Economic Policy",
      "hal",
    ]);
  });
});

describe("the corpus grouping is unchanged by #148", () => {
  it("still groups by tradition with sibling-sets, and no longer carries the relocated parity automaton", () => {
    const groups = groupedCorpus();
    const klir = groups.find((g) => g.tradition === "klir")!;
    expect(klir.sets.some((s) => s.name === "Goal-oriented paradigms")).toBe(true);
    const bunge = groups.find((g) => g.tradition === "bunge")!;
    expect(bunge.sets.some((s) => s.name === "Two-thing structures")).toBe(true);
    const allTitles = groups.flatMap((g) => [...g.sets.flatMap((s) => s.entries), ...g.loose]).map((e) => e.title);
    expect(allTitles).not.toContain("The parity automaton");
  });
});
