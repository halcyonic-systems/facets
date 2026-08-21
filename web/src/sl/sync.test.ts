import { describe, expect, it } from "vitest";
import { shouldReplaceDoc } from "./sync";

describe("shouldReplaceDoc", () => {
  it("replaces when the parent pushes genuinely new text (From canvas)", () => {
    expect(shouldReplaceDoc("component B\n", "component A\n", "component A\n")).toBe(true);
  });

  it("does not replace when the prop already equals the document", () => {
    expect(shouldReplaceDoc("component A\n", "component A\n", null)).toBe(false);
  });

  it("does not replace when the prop is the echo of the editor's own edit", () => {
    // Parent state can lag one render behind a keystroke: the doc has moved
    // on, the prop reflects the edit we just emitted. Replacing here would
    // clobber the cursor mid-word.
    expect(shouldReplaceDoc("component AB", "component ABC", "component AB")).toBe(false);
  });

  it("replaces on first mount when nothing has been emitted yet", () => {
    expect(shouldReplaceDoc("component A\n", "", null)).toBe(true);
  });
});
