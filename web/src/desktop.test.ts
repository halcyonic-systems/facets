import { describe, it, expect, vi, afterEach } from "vitest";
import type { MouseEvent } from "react";
import { isDesktop, openExternal } from "./desktop";

const click = () =>
  ({
    currentTarget: { href: "https://github.com/halcyonic-systems/bert-lenses/tree/main/docs" },
    preventDefault: vi.fn(),
  }) as unknown as MouseEvent<HTMLAnchorElement>;

afterEach(() => {
  delete (globalThis as unknown as Record<string, unknown>).__TAURI_INTERNALS__;
});

describe("external links", () => {
  it("leaves the anchor alone in a browser", () => {
    expect(isDesktop()).toBe(false);
    const e = click();
    openExternal(e);
    expect(e.preventDefault).not.toHaveBeenCalled();
  });

  it("takes the click when the Tauri runtime is present", () => {
    (globalThis as unknown as Record<string, unknown>).__TAURI_INTERNALS__ = {};
    expect(isDesktop()).toBe(true);
    const e = click();
    openExternal(e);
    expect(e.preventDefault).toHaveBeenCalled();
  });
});
