import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { FIELD, parseFieldModel, parseProvenance } from "./field";

const DIR = join(import.meta.dirname, "../../assets/field");

describe("the field shelf", () => {
  it("reads the provenance line and nothing else from the header", () => {
    expect(parseProvenance("# field · with Luke · 2026-10-01\n# more\nsystem \"X\" : Concrete/Social")).toEqual({
      with: "Luke",
      date: "2026-10-01",
    });
    expect(parseProvenance("# just a comment\nsystem \"X\" : Concrete/Social")).toBeNull();
    expect(parseProvenance("system \"X\" : Concrete/Social\n# field · with Luke · 2026-10-01")).toBeNull();
  });

  it("refuses a file without provenance and keys a shipped one as field:", () => {
    expect(parseFieldModel("../../assets/field/x.sl", "system \"X\" : Concrete/Social\n")).toBeNull();
    const m = parseFieldModel("../../assets/field/x.sl", "# field · with A · 2026-01-02\nsystem \"X\" : Concrete/Social\ndomain \"d\"\n");
    expect(m?.demo.key).toBe("field:x");
    expect(m?.demo.genus).toBe("Social");
    expect(m?.demo.blurb).toBe("d");
  });

  it("ships every file in assets/field, each with provenance, a genus and a blurb", () => {
    const files = readdirSync(DIR).filter((f) => f.endsWith(".sl"));
    expect(files.length).toBeGreaterThan(0);
    expect(FIELD).toHaveLength(files.length);
    for (const f of files) {
      const text = readFileSync(join(DIR, f), "utf8");
      expect(parseProvenance(text), f).not.toBeNull();
    }
    for (const m of FIELD) {
      expect(m.demo.title).not.toBe("");
      expect(m.demo.genus).not.toBe("");
      expect(m.demo.blurb).not.toBe(m.demo.title);
      expect(m.with).not.toBe("");
    }
  });
});
