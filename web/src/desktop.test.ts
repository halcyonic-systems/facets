import { describe, it, expect, vi, afterEach } from "vitest";
import type { MouseEvent } from "react";
import { isDesktop, openExternal } from "./desktop";

const DOCS = "https://github.com/halcyonic-systems/bert-lenses/tree/main/docs";

const click = () =>
  ({
    currentTarget: { href: DOCS },
    preventDefault: vi.fn(),
  }) as unknown as MouseEvent<HTMLAnchorElement>;

const globals = globalThis as unknown as Record<string, unknown>;

afterEach(() => {
  delete globals.__TAURI_INTERNALS__;
});

describe("external links", () => {
  it("leaves the anchor alone in a browser", () => {
    expect(isDesktop()).toBe(false);
    const e = click();
    openExternal(e);
    expect(e.preventDefault).not.toHaveBeenCalled();
  });

  it("hands the url to the opener plugin under Tauri", () => {
    const invoke = vi.fn().mockResolvedValue(undefined);
    globals.__TAURI_INTERNALS__ = { invoke };
    expect(isDesktop()).toBe(true);
    const e = click();
    openExternal(e);
    expect(e.preventDefault).toHaveBeenCalled();
    expect(invoke).toHaveBeenCalledWith("plugin:opener|open_url", { url: DOCS });
  });
});
