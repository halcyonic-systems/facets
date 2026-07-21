// Safe library-slot rename (#116 candidate 3), exercised against a REAL
// IndexedDB (fake-indexeddb: an in-memory, spec-faithful implementation — the
// put+delete transaction actually runs). ./kernel is mocked only because the
// real module pulls the Vite-only wasm url import (same reason as
// context.test.ts); the mock's modelIdentity reads the JSON's own `model_id`
// field, which is the same canonical base58 string the kernel would decode.
//
// The load-bearing claim: a rename moves the record to a new key with its
// content — above all its identity — untouched, so a parent's `decomposes @id`
// stamp still resolves afterwards (resolution is by id, never by name). This
// is exactly what save-as cannot provide: save-as clears the id BY DESIGN.

import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("./kernel", () => ({
  modelIdentity: (json: string) => {
    const id = (JSON.parse(json) as { model_id?: unknown }).model_id;
    if (typeof id !== "string") throw new Error("no model_id");
    return id;
  },
}));

import {
  saveModel,
  loadModel,
  loadModelByRef,
  listModelRecords,
  renameModel,
} from "./modelStore";
import { buildLibraryTree } from "./libraryTree";

const CHILD_ID = "3mJr7AoUXx2Wqd";
const PARENT_ID = "9wVAwv8pqPCVsK";

// The #116 field case: a component born "home" was decomposed (child minted
// into slot "home-2" by collision suffix), then renamed "living room" on the
// canvas — the slot kept the birth name.
const childJson = JSON.stringify({ model_id: CHILD_ID, name: "home", systems: [] });
const parentJson = JSON.stringify({
  model_id: PARENT_ID,
  name: "house",
  systems: [{ name: "living room", child_model: CHILD_ID }],
});

beforeEach(async () => {
  // A fresh in-memory database per test — no cross-test slot residue.
  globalThis.indexedDB = new IDBFactory();
  await saveModel("home", parentJson);
  await saveModel("home-2", childJson);
});

describe("renameModel", () => {
  it("moves the record to the new key with content and identity untouched", async () => {
    await renameModel("home-2", "living room");

    const records = await listModelRecords();
    const names = records.map((r) => r.name).sort();
    expect(names).toEqual(["home", "living room"]);

    const renamed = records.find((r) => r.name === "living room");
    expect(renamed?.json).toBe(childJson);
    expect(renamed?.modelId).toBe(CHILD_ID);
    await expect(loadModel("home-2")).rejects.toThrow(/no saved model/);
  });

  it("keeps the parent's decomposes stamp resolving — by id, rename-proof", async () => {
    expect(await loadModelByRef(CHILD_ID)).toBe(childJson);
    await renameModel("home-2", "living room");
    // The stamp in parentJson still names CHILD_ID; the slot key is irrelevant.
    expect(await loadModelByRef(CHILD_ID)).toBe(childJson);
    expect(await loadModelByRef(PARENT_ID)).toBe(parentJson);
  });

  it("refuses a taken target name and leaves both slots untouched", async () => {
    await expect(renameModel("home-2", "home")).rejects.toThrow(/already saved/);
    expect(await loadModel("home")).toBe(parentJson);
    expect(await loadModel("home-2")).toBe(childJson);
  });

  it("refuses a missing source slot", async () => {
    await expect(renameModel("nowhere", "somewhere")).rejects.toThrow(/no saved model/);
  });

  it("is a no-op when the name does not change", async () => {
    await renameModel("home-2", "home-2");
    expect(await loadModel("home-2")).toBe(childJson);
  });

  it("shows up in the grouped library reading: renamed child still nests under its parent", async () => {
    await renameModel("home-2", "living room");
    const tree = buildLibraryTree(await listModelRecords());
    const parent = tree.find((n) => n.name === "home");
    expect(parent?.children.map((c) => c.name)).toEqual(["living room"]);
    expect(parent?.missingReferents).toBe(0);
  });
});
