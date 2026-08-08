// The workbench: the models currently being worked on, pinned by hand.
//
// A flat pin list, deliberately NOT the constellation instrument parked in
// docs/parked.md #105 — no graph, no derived grouping, no stored parentage.
// Pins are quick access and nothing more; losing one costs a click. They live
// in localStorage (the coauthor-history precedent) rather than growing
// ModelRecord, because a pin is a fact about this browser's current work, not
// about the model.
//
// A pin names its target the way the target's own surface does: an example by
// its Demo key, a corpus entry by its file, a saved model by its library name
// (App migrates the pin on rename). Resolution is derived at read time from
// the same indexes the gallery renders, so a pin whose referent is gone —
// deleted save, retired example — simply resolves to nothing and is not shown.

import { EXAMPLES } from "./examples";
import { CORPUS } from "./corpus";
import type { Demo } from "./demos";
import type { CorpusEntry } from "./corpus";

export interface Pin {
  kind: "example" | "corpus" | "library";
  /** Demo.key / CorpusEntry.file / saved-model name, by kind. */
  ref: string;
}

export interface WorkbenchEntry {
  pin: Pin;
  title: string;
  /** The one-line gloss the gallery shows for the same model; empty for saves. */
  detail: string;
}

const STORAGE_KEY = "bert-lenses.workbench.pins";

export function loadPins(): Pin[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (p): p is Pin =>
        typeof p === "object" &&
        p !== null &&
        ["example", "corpus", "library"].includes((p as Pin).kind) &&
        typeof (p as Pin).ref === "string",
    );
  } catch {
    return [];
  }
}

export function savePins(pins: Pin[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pins));
  } catch {
    // Private-mode storage failure: the pins still work for this session.
  }
}

export function samePin(a: Pin, b: Pin): boolean {
  return a.kind === b.kind && a.ref === b.ref;
}

export function togglePin(pins: Pin[], pin: Pin): Pin[] {
  return pins.some((p) => samePin(p, pin)) ? pins.filter((p) => !samePin(p, pin)) : [...pins, pin];
}

export function findExample(ref: string): Demo | undefined {
  return EXAMPLES.find((d) => d.key === ref);
}

export function findCorpus(ref: string): CorpusEntry | undefined {
  return CORPUS.find((e) => e.file === ref);
}

/** The pins that still resolve, in pin order, ready to render. */
export function resolvePins(pins: Pin[], libraryNames: string[]): WorkbenchEntry[] {
  const entries: WorkbenchEntry[] = [];
  for (const pin of pins) {
    if (pin.kind === "example") {
      const d = findExample(pin.ref);
      if (d) entries.push({ pin, title: d.title, detail: d.blurb });
    } else if (pin.kind === "corpus") {
      const e = findCorpus(pin.ref);
      if (e) entries.push({ pin, title: e.title, detail: e.citation });
    } else if (libraryNames.includes(pin.ref)) {
      entries.push({ pin, title: pin.ref, detail: "saved in this browser" });
    }
  }
  return entries;
}
