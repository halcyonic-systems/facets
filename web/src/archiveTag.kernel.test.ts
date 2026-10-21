// The format tag's dual reader through the real wasm (#541, phase 3). Files
// saved before the rename carry `bert-lenses/canvas@1`; the kernel now writes
// `facets/canvas@1`. Nothing on the face checks the tag (shape decides, in
// Rust), so the proof is that the face's own calls open an old-tag file: the
// Open… import (openModel, then writeArchive into the library), and the
// identity the library and the working folder key records by (modelIdentity).
// The fixture is the steel plant's level 2 as stored before phase 5 re-minted
// the walkthrough archives under the new tag.
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { initSync } from "facets-kernel";
import { modelIdentity, openModel, writeArchive } from "./kernel";

initSync({
  module: fs.readFileSync(path.resolve(__dirname, "../../crates/facets-kernel/pkg/facets_kernel_bg.wasm")),
});

const OLD_TAG = "bert-lenses/canvas@1";
const NEW_TAG = "facets/canvas@1";

const FIXTURES = ["fixtures/format-tag/steel-plant-level-2.json"];

const read = (rel: string) => fs.readFileSync(path.resolve(__dirname, "../..", rel), "utf8");

describe("an old-tag archive imports", () => {
  for (const rel of FIXTURES) {
    it(rel, () => {
      const text = read(rel);
      expect((JSON.parse(text) as { format?: string }).format).toBe(OLD_TAG);

      const model = openModel(text);
      expect(model.things.length).toBeGreaterThan(0);
      expect(modelIdentity(text)).toBe((JSON.parse(text) as { model_id: string }).model_id);

      const saved = writeArchive(model);
      expect((JSON.parse(saved) as { format?: string }).format).toBe(NEW_TAG);
      expect(saved).not.toContain(OLD_TAG);
      expect(modelIdentity(saved)).toBe(modelIdentity(text));
    });
  }
});
