import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import Canvas3D from "./Canvas3D";
import type { CanvasModel } from "../kernel/types";

const model: CanvasModel = {
  lens: "Mobus",
  boundary: { porosity: 0, perceptive_fuzziness: 0 },
  things: [{ id: 1, name: "A", x: 0, y: 0, role: "Component" }],
  relations: [],
};

describe("<Canvas3D>", () => {
  it("renders its frame and controls without touching WebGL", () => {
    const html = renderToStaticMarkup(
      createElement(Canvas3D, { model, lens: "Mobus", facts: null, sim: null, selectedThingId: null, onOpenFiles: () => {} }),
    );
    expect(html).toContain('data-testid="canvas-3d"');
    expect(html).toContain("Explode");
    expect(html).toContain("Shell");
    expect(html).toContain("Filter");
    expect(html).toContain('data-testid="open-3d"');
    expect(html).toContain("Loading the 3D view");
  });

  it("offers no shell dial under a lens with no container", () => {
    const html = renderToStaticMarkup(
      createElement(Canvas3D, { model: { ...model, lens: "Klir" }, lens: "Klir", facts: null, sim: null, selectedThingId: null }),
    );
    expect(html).not.toContain('data-testid="shape-3d"');
    expect(html).not.toContain('data-testid="open-3d"');
  });

  it("names three in exactly one file, the adapter, and only as a static import there", () => {
    const dir = import.meta.dirname;
    const files = readdirSync(dir).filter((f) => /\.(ts|tsx)$/.test(f) && !/\.test\./.test(f));
    const importers = files.filter((f) => /from\s+["']three["']/.test(readFileSync(join(dir, f), "utf8")));
    expect(importers).toEqual(["ThreeAdapter.ts"]);
    const wrapper = readFileSync(join(dir, "Canvas3D.tsx"), "utf8");
    expect(wrapper).toMatch(/import\("\.\/ThreeAdapter"\)/);
    expect(wrapper).not.toMatch(/^import (?!type\b).*ThreeAdapter"/m);
  });
});
