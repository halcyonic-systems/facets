// The library round trip, pure (#457): records → one walk file → the importer's
// split-and-stamp → records again, with the same tree and every reference
// resolving. The emitter is a stand-in that writes the one line the walk
// module reads, so this pins the glue (order, header, slot names, id
// stripping and re-minting), not the kernel's SL.
import { describe, expect, it } from "vitest";
import { isLibraryFile, libraryFilename, libraryWalk, slotName } from "./libraryExport";
import { buildLibraryTree, type LibraryRecordLike } from "./libraryTree";
import { splitWalk, stampWalk } from "./walk";

interface Fake {
  model_id?: string;
  name: string;
  things: { name: string; child_model?: { label: string; id: string } }[];
}

const record = (name: string, savedAt: number, model: Fake): LibraryRecordLike => ({
  name,
  savedAt,
  json: JSON.stringify(model),
  ...(model.model_id ? { modelId: model.model_id } : {}),
});

// A stand-in emitter: `system "Name"` then one `component` line per thing,
// stamped `decomposes "Label" @id` where the record decomposes.
const emit = (json: string): string => {
  const m = JSON.parse(json) as Fake;
  const lines = [`system "${m.name}" : Concrete/Technical`];
  for (const t of m.things) {
    lines.push(
      t.child_model ? `component "${t.name}" interface decomposes "${t.child_model.label}" @${t.child_model.id}` : `component "${t.name}"`,
    );
  }
  return lines.join("\n") + "\n";
};

// A stand-in compiler: the inverse of `emit`, reading stamped references back
// into the archive shape libraryTree reads.
const compile = (text: string, id: string | undefined): Fake => {
  const name = /^system "([^"]*)"/m.exec(text)![1];
  const things = [...text.matchAll(/^component "([^"]*)"(?: interface decomposes "([^"]*)" @(\S+))?/gm)].map((m) =>
    m[2] ? { name: m[1], child_model: { label: m[2], id: m[3] } } : { name: m[1] },
  );
  return { ...(id ? { model_id: id } : {}), name, things };
};

const shape = (records: LibraryRecordLike[]) => {
  const node = (n: ReturnType<typeof buildLibraryTree>[number]): unknown => ({
    name: n.name,
    missing: n.missingReferents,
    children: n.children.map(node),
  });
  return buildLibraryTree(records).map(node);
};

describe("libraryWalk", () => {
  // Two roots; one decomposed two levels deep; one slot renamed away from its
  // system name; one child shared by name with its parent (the seam rule).
  const records: LibraryRecordLike[] = [
    record("venice (my copy)", 30, { model_id: "A1", name: "Venice", things: [{ name: "Venice", child_model: { label: "Venice", id: "B2" } }] }),
    record("Venice", 20, { model_id: "B2", name: "Venice", things: [{ name: "Token contracts", child_model: { label: "Token contracts", id: "C3" } }] }),
    record("Token contracts", 10, { model_id: "C3", name: "Token contracts", things: [{ name: "VVV" }] }),
    record("bathtub", 5, { model_id: "D4", name: "Bathtub", things: [{ name: "Tub" }] }),
  ];

  it("writes a dated header, parent before child, and strips every id", () => {
    const { text, count, skipped } = libraryWalk(records, emit, new Date("2026-10-06T12:00:00Z"));
    expect(count).toBe(4);
    expect(skipped).toEqual([]);
    expect(isLibraryFile(text)).toBe(true);
    expect(text.startsWith("# facets library · exported 2026-10-06 · 4 models")).toBe(true);
    expect(text).not.toMatch(/@[A-Za-z0-9]+/);
    const order = [...text.matchAll(/^# saved as "([^"]*)"/gm)].map((m) => m[1]);
    expect(order).toEqual(["venice (my copy)", "Venice", "Token contracts", "bathtub"]);
  });

  it("comes back as the same tree under the same slot names", () => {
    const { text } = libraryWalk(records, emit, new Date("2026-10-06T12:00:00Z"));
    // The importer's path: split, stamp with fresh ids, compile each paragraph.
    let n = 0;
    const walk = stampWalk(splitWalk(text), () => `M${++n}`);
    expect(walk.unresolved).toEqual([]);
    const restored: LibraryRecordLike[] = walk.paragraphs.map((p, i) => {
      const model = compile(p.text, walk.ids.get(i));
      return record(slotName(p.text) ?? p.name, 100 - i, model);
    });
    expect(shape(restored)).toEqual(shape(records));
    expect(restored.map((r) => r.name)).toEqual(["venice (my copy)", "Venice", "Token contracts", "bathtub"]);
  });

  it("escapes a quoted slot name and reads it back", () => {
    const quoted = [record('say "hi"', 1, { model_id: "Q1", name: "Quoted", things: [] })];
    const { text } = libraryWalk(quoted, emit, new Date(0));
    expect(slotName(splitWalk(text).paragraphs[0].text)).toBe('say "hi"');
  });

  it("names a record the emitter refuses instead of dropping it silently", () => {
    const bad = [record("broken", 1, { model_id: "X", name: "Broken", things: [] })];
    const { count, skipped } = libraryWalk(bad, () => { throw new Error("no"); }, new Date(0));
    expect(count).toBe(0);
    expect(skipped).toEqual(["broken"]);
  });

  it("is not a library file without the header", () => {
    expect(isLibraryFile('system "A" : Concrete/Technical\n')).toBe(false);
    expect(libraryFilename(new Date("2026-10-06T23:59:00Z"))).toBe("facets-library-2026-10-06.sl");
  });
});
