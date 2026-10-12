// The format tag's dual reader through the real wasm (#541, phase 3). Files
// saved before the rename carry `bert-lenses/canvas@1`; the kernel now writes
// `facets/canvas@1`. Nothing on the face checks the tag (shape decides, in
// Rust), so the proof is that the face's own calls open an old-tag file: the
// Open… import (openModel, then writeArchive into the library), and the
// identity the library and the working folder key records by (modelIdentity).
// The fixtures are the shipped walkthrough archives, which keep the old tag
// until phase 5 re-mints them.
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { initSync } from "bert-lenses-kernel";
import { modelIdentity, openModel, writeArchive } from "./kernel";

initSync({
  module: fs.readFileSync(path.resolve(__dirname, "../../crates/facets-kernel/pkg/bert_lenses_kernel_bg.wasm")),
});

const OLD_TAG = "bert-lenses/canvas@1";
const NEW_TAG = "facets/canvas@1";

const FIXTURES = [
  "assets/walkthroughs/digital-computer/level-1.json",
  "assets/walkthroughs/llm-market/frontier-serving.json",
  "assets/walkthroughs/llm-market/open-weight-serving.json",
  "assets/walkthroughs/steel-plant/level-2.json",
];

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
