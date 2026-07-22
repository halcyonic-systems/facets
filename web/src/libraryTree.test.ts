import { describe, it, expect } from "vitest";

import { buildLibraryTree, flattenLibraryTree, type LibraryRecordLike } from "./libraryTree";

// Minimal WorldModel-shaped JSON: only the fields the grouping reads.
function modelJson(id: string | null, refs: string[] = []): string {
  return JSON.stringify({
    ...(id === null ? {} : { model_id: id }),
    systems: refs.map((r) => ({ child_model: r })),
  });
}

// The #140 neutral archive: elements keyed `things`, the child reference an
// object (label + id) rather than a bare string.
function archiveJson(id: string | null, refs: string[] = []): string {
  return JSON.stringify({
    format: "bert-lenses/canvas@1",
    ...(id === null ? {} : { model_id: id }),
    things: refs.map((r) => ({ child_model: { name: "child", id: r } })),
  });
}

function rec(
  name: string,
  savedAt: number,
  json: string,
  modelId?: string,
): LibraryRecordLike {
  return modelId === undefined ? { name, savedAt, json } : { name, savedAt, json, modelId };
}

describe("buildLibraryTree across storage generations (#140)", () => {
  it("nests a child referenced by an ARCHIVE parent", () => {
    const tree = buildLibraryTree([
      rec("parent", 2, archiveJson("P", ["C"])),
      rec("child", 1, archiveJson("C"), "C"),
    ]);
    expect(tree.map((n) => n.name)).toEqual(["parent"]);
    expect(tree[0].children.map((n) => n.name)).toEqual(["child"]);
  });

  // One library holds both generations during and after migration. Reading only
  // one shape would silently flatten the other's children into roots — a
  // listing that looks fine and is wrong.
  it("nests across generations in either direction", () => {
    const mixed = buildLibraryTree([
      rec("archive-parent", 4, archiveJson("AP", ["LC"])),
      rec("legacy-child", 3, modelJson("LC"), "LC"),
      rec("legacy-parent", 2, modelJson("LP", ["AC"])),
      rec("archive-child", 1, archiveJson("AC"), "AC"),
    ]);
    expect(mixed.map((n) => n.name)).toEqual(["archive-parent", "legacy-parent"]);
    expect(mixed[0].children.map((n) => n.name)).toEqual(["legacy-child"]);
    expect(mixed[1].children.map((n) => n.name)).toEqual(["archive-child"]);
  });

  it("counts a missing referent the same whichever generation names it", () => {
    const tree = buildLibraryTree([rec("parent", 1, archiveJson("P", ["gone"]))]);
    expect(tree[0].missingReferents).toBe(1);
  });
});

describe("buildLibraryTree", () => {
  it("lists unreferenced models as roots, newest first", () => {
    const tree = buildLibraryTree([
      rec("older", 1, modelJson(null)),
      rec("newer", 2, modelJson(null)),
    ]);
    expect(tree.map((n) => n.name)).toEqual(["newer", "older"]);
    expect(tree.every((n) => n.children.length === 0)).toBe(true);
  });

  it("nests a referenced child under its parent, not as a top-level peer", () => {
    const tree = buildLibraryTree([
      rec("house", 2, modelJson("idP", ["idC"]), "idP"),
      rec("boiler", 1, modelJson("idC"), "idC"),
    ]);
    expect(tree.map((n) => n.name)).toEqual(["house"]);
    expect(tree[0].children.map((n) => n.name)).toEqual(["boiler"]);
  });

  it("nests multi-level chains recursively", () => {
    const tree = buildLibraryTree([
      rec("house", 3, modelJson("idP", ["idC"]), "idP"),
      rec("boiler", 2, modelJson("idC", ["idG"]), "idC"),
      rec("burner", 1, modelJson("idG"), "idG"),
    ]);
    expect(tree.map((n) => n.name)).toEqual(["house"]);
    expect(tree[0].children[0].name).toBe("boiler");
    expect(tree[0].children[0].children[0].name).toBe("burner");
  });

  it("matches legacy records without a stamped modelId by decoding the JSON", () => {
    const tree = buildLibraryTree([
      rec("house", 2, modelJson("idP", ["idC"]), "idP"),
      rec("boiler", 1, modelJson("idC")), // no stamped modelId
    ]);
    expect(tree.map((n) => n.name)).toEqual(["house"]);
    expect(tree[0].children.map((n) => n.name)).toEqual(["boiler"]);
  });

  it("reads a child of a deleted parent as a root — no reference, no nesting", () => {
    const tree = buildLibraryTree([rec("boiler", 1, modelJson("idC"), "idC")]);
    expect(tree.map((n) => n.name)).toEqual(["boiler"]);
    expect(tree[0].children).toEqual([]);
  });

  it("counts a reference that resolves to no record as a missing referent", () => {
    const tree = buildLibraryTree([rec("house", 1, modelJson("idP", ["gone"]), "idP")]);
    expect(tree[0].missingReferents).toBe(1);
    expect(tree[0].children).toEqual([]);
  });

  it("places a child referenced by two parents once, under the newest parent", () => {
    const tree = buildLibraryTree([
      rec("newer-parent", 3, modelJson("idA", ["idC"]), "idA"),
      rec("older-parent", 2, modelJson("idB", ["idC"]), "idB"),
      rec("shared", 1, modelJson("idC"), "idC"),
    ]);
    expect(tree.map((n) => n.name)).toEqual(["newer-parent", "older-parent"]);
    expect(tree[0].children.map((n) => n.name)).toEqual(["shared"]);
    expect(tree[1].children).toEqual([]);
    expect(flattenLibraryTree(tree).filter((e) => e.name === "shared")).toHaveLength(1);
  });

  it("still lists every member of a reference cycle exactly once", () => {
    const tree = buildLibraryTree([
      rec("a", 2, modelJson("idA", ["idB"]), "idA"),
      rec("b", 1, modelJson("idB", ["idA"]), "idB"),
    ]);
    const flat = flattenLibraryTree(tree);
    expect(flat.map((e) => e.name).sort()).toEqual(["a", "b"]);
  });

  it("ignores a self-reference rather than nesting a model under itself", () => {
    const tree = buildLibraryTree([rec("loop", 1, modelJson("idA", ["idA"]), "idA")]);
    expect(tree.map((n) => n.name)).toEqual(["loop"]);
    expect(tree[0].children).toEqual([]);
  });

  it("reads a corrupt record as a plain root instead of breaking the listing", () => {
    const tree = buildLibraryTree([
      rec("broken", 2, "not json at all"),
      rec("fine", 1, modelJson(null)),
    ]);
    expect(tree.map((n) => n.name)).toEqual(["broken", "fine"]);
  });
});

describe("flattenLibraryTree", () => {
  it("emits list order with depth for indentation", () => {
    const tree = buildLibraryTree([
      rec("house", 3, modelJson("idP", ["idC"]), "idP"),
      rec("boiler", 2, modelJson("idC", ["idG"]), "idC"),
      rec("burner", 1, modelJson("idG"), "idG"),
      rec("garden", 4, modelJson(null)),
    ]);
    expect(flattenLibraryTree(tree)).toEqual([
      { name: "garden", savedAt: 4, depth: 0 },
      { name: "house", savedAt: 3, depth: 0 },
      { name: "boiler", savedAt: 2, depth: 1 },
      { name: "burner", savedAt: 1, depth: 2 },
    ]);
  });
});
