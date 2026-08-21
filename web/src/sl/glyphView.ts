// The glyph gutter: a fault mark when the kernel flagged the line, else the
// line's structural glyph (glyphs.ts). SVG shapes mirror the canvas
// palette's RoleChip / PasswayChip (PaletteRail.tsx) — same viewBox, same
// strokes — so the gutter speaks the visual grammar the canvas already
// taught, in miniature.
import { GutterMarker, gutter } from "@codemirror/view";
import type { LineGlyph } from "./glyphs";
import { lineGlyph } from "./glyphs";
import { errorLinesField } from "./faults";

const SVG_NS = "http://www.w3.org/2000/svg";

function shapeSvg(glyph: LineGlyph): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("width", "10");
  svg.setAttribute("height", "10");
  svg.setAttribute("viewBox", "-7.5 -7.5 15 15");
  svg.setAttribute("aria-hidden", "true");
  const g = document.createElementNS(SVG_NS, "g");
  g.setAttribute("fill", "none");
  g.setAttribute("stroke", "currentColor");
  g.setAttribute("stroke-width", "1.8");
  if (glyph.type === "component") {
    const c = document.createElementNS(SVG_NS, "circle");
    c.setAttribute("r", "5.2");
    g.appendChild(c);
  } else if (glyph.type === "environment") {
    const r = document.createElementNS(SVG_NS, "rect");
    r.setAttribute("x", "-5");
    r.setAttribute("y", "-5");
    r.setAttribute("width", "10");
    r.setAttribute("height", "10");
    r.setAttribute("rx", "1.5");
    g.appendChild(r);
  } else if (glyph.type === "passway") {
    for (const d of ["M0 -6.5 V -2.5", "M0 2.5 V 6.5"]) {
      const p = document.createElementNS(SVG_NS, "path");
      p.setAttribute("d", d);
      p.setAttribute("stroke-linecap", "round");
      g.appendChild(p);
    }
    const r = document.createElementNS(SVG_NS, "rect");
    r.setAttribute("x", "-2.2");
    r.setAttribute("y", "-2.5");
    r.setAttribute("width", "4.4");
    r.setAttribute("height", "5");
    r.setAttribute("rx", "1");
    g.appendChild(r);
  }
  svg.appendChild(g);
  return svg;
}

class GlyphMarker extends GutterMarker {
  constructor(readonly key: string, readonly glyph: LineGlyph | "error") {
    super();
  }
  override eq(other: GlyphMarker) {
    return other.key === this.key;
  }
  override toDOM() {
    const el = document.createElement("span");
    if (this.glyph === "error") {
      el.className = "sl-glyph sl-glyph-error";
      el.textContent = "!";
      return el;
    }
    if (this.glyph.type === "kind") {
      el.className = `sl-glyph sl-glyph-kind sl-glyph-kind-${this.glyph.kind}`;
      const dot = document.createElement("span");
      dot.className = "sl-glyph-dot";
      el.appendChild(dot);
      return el;
    }
    el.className = `sl-glyph sl-glyph-${this.glyph.type}`;
    el.appendChild(shapeSvg(this.glyph));
    return el;
  }
}

function markerKey(glyph: LineGlyph | "error"): string {
  if (glyph === "error") return "error";
  return glyph.type === "kind" ? `kind-${glyph.kind}` : glyph.type;
}

export const glyphGutter = gutter({
  class: "sl-glyph-gutter",
  lineMarker(view, block) {
    const line = view.state.doc.lineAt(block.from);
    const glyph = view.state.field(errorLinesField).has(line.number)
      ? ("error" as const)
      : lineGlyph(line.text);
    return glyph ? new GlyphMarker(markerKey(glyph), glyph) : null;
  },
  lineMarkerChange: (u) =>
    u.docChanged || u.state.field(errorLinesField) !== u.startState.field(errorLinesField),
});
