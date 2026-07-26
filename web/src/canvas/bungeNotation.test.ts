// The Bunge register's TYPOGRAPHY, which is all that is left here after #233.
//
// The matrix assertions this file used to hold — composition-before-environment
// ordering, index 0 first under en bloc, index 0 gathering every environment
// thing at once, M₀₀ = 0, bond-vs-mere directionality — moved with the rules
// themselves into `crates/bert-canvas/src/notation.rs`
// (`en_bloc_puts_index_zero_first_and_keeps_only_components`,
// `index_zero_gathers_every_environment_thing_at_once`,
// `m00_is_empty_and_names_its_own_rule`, and their siblings), and cross the wasm
// edge under the `bunge_coupling_*` contract fixtures. What is tested below is
// Bunge's four-kind glyph alphabet and the character a kernel-decided mark
// prints as.
import { describe, expect, it } from "vitest";
import type { BungeCoupling } from "../kernel/types";
import { bungeGlyph, couplingIndex, kindGlyph, slotIsEnv } from "./bungeNotation";

describe("kindGlyph", () => {
  it("speaks Bunge's four-kind enum, · for unstated", () => {
    expect(kindGlyph("Energy")).toBe("e");
    expect(kindGlyph("Matter")).toBe("m");
    expect(kindGlyph("Field")).toBe("f");
    expect(kindGlyph("Informational")).toBe("i");
    expect(kindGlyph("Unspecified")).toBe("·");
  });
});

describe("bungeGlyph", () => {
  it("is empty for an unoccupied cell, whatever the mark says", () => {
    expect(bungeGlyph({ mark: "empty" }, 0)).toBe("");
    expect(bungeGlyph({ mark: "mere" }, 0)).toBe("");
  });
  it("shows the acting bond's kind; ∼ when only a mere relation holds", () => {
    expect(bungeGlyph({ mark: "bond", kind: "Energy" }, 1)).toBe("e");
    expect(bungeGlyph({ mark: "bond", kind: "Unspecified" }, 1)).toBe("·");
    expect(bungeGlyph({ mark: "mere" }, 1)).toBe("∼");
  });
  it("marks the diagonal ↺ and counts stacked relations", () => {
    expect(bungeGlyph({ mark: "self_loop" }, 1)).toBe("↺");
    expect(bungeGlyph({ mark: "bond", kind: "Matter" }, 2)).toBe("m×2");
  });
});

describe("slotIsEnv — which side of the cut a slot stands on", () => {
  it("is true for index 0 and for an itemized environment thing", () => {
    expect(slotIsEnv({ kind: "env" })).toBe(true);
    expect(slotIsEnv({ kind: "thing", id: 3, env: true })).toBe(true);
    expect(slotIsEnv({ kind: "thing", id: 1, env: false })).toBe(false);
  });
});

describe("couplingIndex — addressing the kernel's cells by slot index", () => {
  const coupling: BungeCoupling = {
    slots: [{ kind: "env" }, { kind: "thing", id: 1, env: false }],
    cut_at: 1,
    cells: [
      {
        row: 0,
        col: 0,
        relations: [],
        mark: { mark: "empty" },
        status: { status: "forbidden", reason: "M₀₀ = 0 — …" },
      },
      { row: 0, col: 1, relations: [10], mark: { mark: "bond", kind: "Energy" }, status: { status: "occupied" } },
    ],
  };
  it("keys on (row, col) slot index, not thing id", () => {
    expect(couplingIndex(coupling).get("0,1")?.relations).toEqual([10]);
  });
  it("carries the kernel's refusal reason through to the face", () => {
    const cell = couplingIndex(coupling).get("0,0");
    expect(cell?.status.status).toBe("forbidden");
    expect(cell?.status.status === "forbidden" && cell.status.reason).toContain("M₀₀");
  });
});
