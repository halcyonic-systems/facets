// The library round trip against the REAL kernel (#457). The pure suite
// (libraryExport.test.ts) pins the glue with a stand-in emitter; this one pins
// the claim the feature rests on: that the kernel's own emitter writes a
// library file which, read back the way Open… reads it (split, stamp, compile
// each paragraph), gives records with the same tree, under the same slot
// names, whose seam the kernel still accepts.
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  initSync,
  check_decompositions_canvas,
  compile_sl,
  emit_sl,
  mint_model_id,
  open_model,
  write_archive,
} from "bert-lenses-kernel";
import { libraryWalk, slotName } from "./libraryExport";
import { buildLibraryTree, type LibraryRecordLike } from "./libraryTree";
import { splitWalk, stampWalk } from "./walk";

initSync({
  module: fs.readFileSync(path.resolve(__dirname, "../../crates/bert-lenses-kernel/pkg/bert_lenses_kernel_bg.wasm")),
});

type Outcome = { ok: { model_id?: string }; lens_explicit: boolean } | { errors: { line: number; message: string }[] };

function archiveOf(sl: string, id?: string): string {
  const out = compile_sl(sl) as Outcome;
  if ("errors" in out) throw new Error(`${out.errors[0].line}: ${out.errors[0].message}`);
  const model = id ? { ...out.ok, model_id: id } : out.ok;
  return write_archive(JSON.stringify(model));
}

const CHILD = `system "Boiler" : Concrete/Technical
environment Grid
environment Town
component "Burner" interface
component "Drum" interface
flow Grid -> "Burner" : energy "power"
flow "Burner" -> "Drum" : energy "heat"
flow "Drum" -> Town : matter "steam"
`;

const parentOf = (childId: string) => `system "Plant" : Concrete/Technical
source Grid
sink Town
component "Boiler" interface decomposes "Boiler" @${childId}
flow Grid -> "Boiler" : energy "power"
flow "Boiler" -> Town : matter "steam"
`;

const STANDALONE = `system "Tub" : Concrete/Technical
source Tap
sink Drain
component "Basin" primitive Buffering interface
flow Tap -> "Basin" : matter "water"
flow "Basin" -> Drain : matter "water"
`;

const shape = (records: LibraryRecordLike[]) => {
  const node = (n: ReturnType<typeof buildLibraryTree>[number]): unknown => ({
    name: n.name,
    missing: n.missingReferents,
    children: n.children.map(node),
  });
  return buildLibraryTree(records).map(node);
};

describe("library export through the kernel", () => {
  it("writes, reads back, and the seam still holds", () => {
    const childId = mint_model_id();
    const records: LibraryRecordLike[] = [
      { name: "plant (mine)", savedAt: 3, json: archiveOf(parentOf(childId)) },
      { name: "Boiler", savedAt: 2, json: archiveOf(CHILD, childId), modelId: childId },
      { name: "tub", savedAt: 1, json: archiveOf(STANDALONE) },
    ];
    const emit = (json: string) => emit_sl(JSON.stringify(open_model(json)));
    const { text, count, skipped } = libraryWalk(records, emit, new Date("2026-10-06T00:00:00Z"));
    expect(count).toBe(3);
    expect(skipped).toEqual([]);
    expect(text).not.toContain(childId);

    const walk = stampWalk(splitWalk(text), mint_model_id);
    expect(walk.unresolved).toEqual([]);
    const restored: LibraryRecordLike[] = walk.paragraphs.map((p, i) => {
      const id = walk.ids.get(i);
      return { name: slotName(p.text) ?? p.name, savedAt: 10 - i, json: archiveOf(p.text, id), ...(id ? { modelId: id } : {}) };
    });
    expect(restored.map((r) => r.name)).toEqual(["plant (mine)", "Boiler", "tub"]);
    expect(shape(restored)).toEqual(shape(records));

    // The restored parent still decomposes into the restored child under the
    // kernel's boundary contract, by the freshly minted id.
    const parent = JSON.parse(restored[0].json) as { things: { child_model?: { id: string } }[] };
    const ref = parent.things.find((t) => t.child_model)!.child_model!.id;
    expect(restored[1].modelId).toBe(ref);
    const seam = check_decompositions_canvas(restored[0].json, JSON.stringify({ [ref]: restored[1].json })) as { issues: unknown[] };
    expect(seam.issues).toEqual([]);
  });
});
