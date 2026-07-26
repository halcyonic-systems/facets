// The two failure modes, told apart (#233).
//
// API.md's error contract allows exactly one of them: a `JsError` naming the
// fault. The other — a Rust panic, which traps — is a kernel bug, and the face
// has to say so in different words. These tests mock the wasm package (the real
// one pulls a `?url` import, the same reason context.test.ts mocks ./index) and
// assert the classification `call()` performs on the way out.

import { describe, it, expect, vi } from "vitest";

// The wasm exports the boundary forwards to. Only the ones under test throw.
vi.mock("bert-lenses-kernel", () => ({
  default: () => Promise.resolve(),
  validate: () => {
    throw new WebAssembly.RuntimeError("unreachable");
  },
  open_model: () => {
    throw new Error("not a model file: invalid JSON: EOF while parsing an object");
  },
  ...Object.fromEntries(
    [
      "validate_operational",
      "run",
      "run_markov",
      "parse_csv",
      "model_targets",
      "mapping_status",
      "run_forced",
      "write_archive",
      "project",
      "validate_mode",
      "validate_connection",
      "lens_facts",
      "describe",
      "analyze_canvas",
      "compile_sl",
      "emit_sl",
      "model_identity",
      "check_decompositions",
      "decompose_component",
      "check_decompositions_canvas",
    ].map((name) => [name, () => undefined]),
  ),
}));

vi.mock("bert-lenses-kernel/bert_lenses_kernel_bg.wasm?url", () => ({ default: "test.wasm" }));

import { validate, openModel, isKernelError, isKernelTrap, KernelError, KernelTrap } from "./index";

describe("the boundary tells a refusal from a trap", () => {
  it("classifies a wasm trap as a KernelTrap, never as a verdict", () => {
    let caught: unknown;
    try {
      validate("{}");
    } catch (e) {
      caught = e;
    }

    expect(isKernelTrap(caught)).toBe(true);
    expect(isKernelError(caught)).toBe(false);
    expect(caught).toBeInstanceOf(KernelTrap);
    expect((caught as KernelTrap).fn).toBe("validate");
    // The user must not be shown `unreachable` as though it were a finding
    // about their model.
    expect((caught as KernelTrap).message).not.toBe("unreachable");
    expect((caught as KernelTrap).message).toMatch(/panic/i);
    expect((caught as KernelTrap).message).toMatch(/console/i);
  });

  it("still classifies a contractual JsError as a KernelError, message intact", () => {
    let caught: unknown;
    try {
      openModel("{");
    } catch (e) {
      caught = e;
    }

    expect(isKernelError(caught)).toBe(true);
    expect(isKernelTrap(caught)).toBe(false);
    expect(caught).toBeInstanceOf(KernelError);
    // The kernel's own sentence survives verbatim — the whole point of mode 1.
    expect((caught as KernelError).message).toMatch(/not a model file/);
  });
});
