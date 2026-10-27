// The icon set keeps one grammar (makeover charter rule 14, 18; Arcadia
// DESIGN.md "Icons"): every name draws, on a 24 grid, 2px stroke, square caps,
// mitre joins, no text standing in for a drawing; a titled icon is an image
// with a name, an untitled one is decorative. The ten primitive icons track the
// registry's primitive list, and the lenses' ±6 box renders the same drawing.
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  CANVAS_ICONS,
  DOOR_ICONS,
  ICON_NAMES,
  ICONS,
  Icon,
  PRIMITIVE_ICON,
  UI_ICONS,
  mapPath,
} from "./icons";
import { primitiveGlyph } from "./canvas/lenses/primitive-glyphs";
import { LensPalette } from "./canvas/lenses/registry";
import type { ProcessPrimitive } from "./kernel/types";

const markup = (name: (typeof ICON_NAMES)[number], title?: string) =>
  renderToStaticMarkup(<Icon name={name} title={title} />);

describe("Icon", () => {
  it("renders every name as an inline SVG on the 24 grid", () => {
    expect(ICON_NAMES.length).toBeGreaterThan(0);
    expect(new Set(ICON_NAMES).size).toBe(UI_ICONS.length + CANVAS_ICONS.length + DOOR_ICONS.length);
    for (const name of ICON_NAMES) {
      const m = markup(name);
      expect(m, name).toContain('viewBox="0 0 24 24"');
      expect(m, name).toContain(`data-icon="${name}"`);
      // something is drawn
      expect(m, name).toMatch(/<(path|circle|rect|ellipse)\b/);
    }
  });

  it("carries the grammar on the root: stroke 2, square caps, mitre joins, currentColor, no fill", () => {
    for (const name of ICON_NAMES) {
      const m = markup(name);
      expect(m, name).toContain('stroke="currentColor"');
      expect(m, name).toContain('stroke-width="2"');
      expect(m, name).toContain('stroke-linecap="square"');
      expect(m, name).toContain('stroke-linejoin="miter"');
      expect(m, name).toMatch(/^<svg[^>]*\sfill="none"/);
      // no shape overrides the stroke grammar; a solid may only drop its stroke
      const shapes = m.match(/<(path|circle|rect|ellipse)\b[^>]*>/g) ?? [];
      for (const s of shapes) {
        expect(s, `${name}: ${s}`).not.toMatch(/stroke-width=/);
        expect(s, `${name}: ${s}`).not.toMatch(/stroke-linecap=/);
        expect(s, `${name}: ${s}`).not.toMatch(/stroke-linejoin=/);
        const stroke = s.match(/\sstroke="([^"]*)"/);
        if (stroke) expect(stroke[1], `${name}: ${s}`).toBe("none");
        if (stroke) expect(s, `${name}: a solid is filled with ink`).toContain('fill="currentColor"');
      }
    }
  });

  it("draws, never writes: no <text> and no raw colour", () => {
    for (const name of ICON_NAMES) {
      const m = markup(name);
      expect(m, name).not.toContain("<text");
      expect(m, name).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
      expect(m, name).not.toMatch(/rgba?\(/);
    }
  });

  it("is decorative without a title and an image with one", () => {
    const bare = markup("close");
    expect(bare).toContain('aria-hidden="true"');
    expect(bare).not.toContain("role=");
    expect(bare).not.toContain("<title");
    const named = markup("close", "Close");
    expect(named).toContain('role="img"');
    expect(named).toContain("<title>Close</title>");
    expect(named).not.toContain("aria-hidden");
  });

  it("draws the File menu's save and download as their own silhouettes", () => {
    for (const name of ["save", "download"] as const) expect(UI_ICONS, name).toContain(name);
    expect(markup("save")).not.toBe(markup("file"));
    expect(markup("download")).not.toBe(markup("external"));
  });

  it("sizes 16, 20, 24 and 32 on the same viewBox", () => {
    for (const size of [16, 20, 24, 32] as const) {
      const m = renderToStaticMarkup(<Icon name="play" size={size} />);
      expect(m).toContain(`width="${size}"`);
      expect(m).toContain(`height="${size}"`);
      expect(m).toContain('viewBox="0 0 24 24"');
    }
  });

  it("keeps every drawing inside the grid", () => {
    // every coordinate on the grid lies in 0..24; the art area is 3..21 but
    // a stroke's half-width is what the margin is for, so the test is the grid
    for (const name of ICON_NAMES) {
      const m = markup(name);
      const nums = (m.match(/\sd="([^"]*)"/g) ?? [])
        .flatMap((d) => d.match(/-?\d*\.?\d+/g) ?? [])
        .map(Number);
      for (const n of nums) {
        expect(n, `${name}: ${n}`).toBeGreaterThanOrEqual(0);
        expect(n, `${name}: ${n}`).toBeLessThanOrEqual(24);
      }
    }
  });
});

describe("the primitive icons", () => {
  const registryPrimitives = LensPalette.Mobus.designate
    .flatMap((t) => (t.verb === "designate" && t.designation.type === "primitive" ? [t.designation.primitive] : []))
    .sort();

  it("match the registry's ten primitives, one icon each", () => {
    const keys = (Object.keys(PRIMITIVE_ICON) as ProcessPrimitive[]).sort();
    expect(keys).toEqual(registryPrimitives);
    expect(keys).toHaveLength(10);
    const names = Object.values(PRIMITIVE_ICON);
    expect(new Set(names).size).toBe(10);
    for (const n of names) expect(CANVAS_ICONS, n).toContain(n);
  });

  it("are distinct silhouettes: no two primitives share a drawing", () => {
    const seen = new Map<string, string>();
    for (const [p, n] of Object.entries(PRIMITIVE_ICON)) {
      const m = markup(n).replace(/data-icon="[^"]*"/, "");
      expect(seen.has(m), `${p} draws the same as ${seen.get(m)}`).toBe(false);
      seen.set(m, p);
    }
  });

  it("render in the lenses' ±6 box from the same drawing", () => {
    for (const p of registryPrimitives) {
      const body = renderToStaticMarkup(
        <svg>
          <g>{primitiveGlyph(p)}</g>
        </svg>,
      );
      expect(body, p).toMatch(/<(path|circle|rect|ellipse)\b/);
      expect(body, p).not.toContain("<text");
      const nums = (body.match(/\s(?:d|cx|cy|x|y|r|rx|ry|width|height)="([^"]*)"/g) ?? [])
        .flatMap((a) => a.match(/-?\d*\.?\d+/g) ?? [])
        .map(Number);
      for (const n of nums) {
        expect(n, `${p}: ${n}`).toBeGreaterThanOrEqual(-6);
        expect(n, `${p}: ${n}`).toBeLessThanOrEqual(6);
      }
    }
  });

  it("map a 24-grid path into the box: coordinates centre and halve, arc flags stay", () => {
    const box = { origin: 0, scale: 0.5, paper: "none" };
    expect(mapPath("M4 12 H20", box)).toBe("M -4 0 H 4");
    expect(mapPath("M10 8.54 A4 4 0 0 1 10 15.46", box)).toBe("M -1 -1.73 A 2 2 0 0 1 -1 1.73");
    expect(ICONS.copying.some((s) => s.fill === "paper")).toBe(true);
  });
});
