// Diagram export (#78). The canvas is already SVG, so a deliverable diagram is
// nearly free: serialize the live stage, frame it on the model's CONTENT extent
// (not the pan/zoomed viewport), resolve the CSS-custom-property colors to
// concrete values so it renders with no stylesheet, and drop the interactive-only
// overlays. Presentation only — no kernel, no systems meaning here.
import { contentBounds } from "./geometry";
import type { CanvasModel } from "../kernel/types";

const PAD = 48;

// Computed properties baked onto the export so it stands alone: every color here
// is a `var(--…)` in the live DOM, resolved out of :root / theme; the fonts come
// from Tailwind utility classes that won't ship with the file.
const BAKED_PROPS = [
  "fill",
  "fill-opacity",
  "stroke",
  "stroke-opacity",
  "stroke-width",
  "stroke-dasharray",
  "stroke-linecap",
  "stroke-linejoin",
  "opacity",
  "color",
  "filter",
  // filter-primitive paint (the energy-glow feDropShadow flood is a var(--…))
  "flood-color",
  "flood-opacity",
  "marker-start",
  "marker-mid",
  "marker-end",
  "font-family",
  "font-size",
  "font-weight",
  "font-style",
  "text-anchor",
] as const;

/** A filesystem-safe stem from the author's SOI name (#84), else the demo/file
 *  label, else "model". */
export function diagramFilename(model: CanvasModel, label: string | null): string {
  const raw = model.name?.trim() || label?.trim() || "model";
  const slug = raw
    .replace(/[^a-z0-9_-]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  return slug || "model";
}

interface Serialized {
  svg: string;
  width: number;
  height: number;
}

/** Clone the live canvas SVG into a standalone, content-framed string. Returns
 *  null for an empty model (nothing to frame). */
function serializeDiagram(live: SVGSVGElement, model: CanvasModel): Serialized | null {
  const box = contentBounds(model);
  if (!box) return null;

  const clone = live.cloneNode(true) as SVGSVGElement;

  // Bake computed paint/text styles. cloneNode preserves structure exactly, so
  // the live and cloned trees zip 1:1 — do this BEFORE removing any node so the
  // two walks stay aligned. Inline style beats the source's `var(--…)` attribute,
  // so the resolved color wins even where the attribute can't resolve standalone.
  const liveEls = [live, ...live.querySelectorAll<SVGElement>("*")];
  const cloneEls = [clone, ...clone.querySelectorAll<SVGElement>("*")];
  for (let i = 0; i < liveEls.length; i++) {
    const cs = getComputedStyle(liveEls[i]);
    const dst = cloneEls[i];
    for (const prop of BAKED_PROPS) {
      const val = cs.getPropertyValue(prop);
      if (val && val !== "none" && val !== "normal") dst.style.setProperty(prop, val);
    }
  }

  // Drop interactive-only chrome: elements the source marks with
  // data-export-ignore (invisible hit paths, hover/selection outlines) and any
  // foreignObject (the in-canvas name-draft input) — none belong in a diagram.
  clone.querySelectorAll("[data-export-ignore], foreignObject").forEach((el) => el.remove());

  // Reframe on content, not viewport: viewBox = content extent + padding, and
  // neutralize the stage group's pan/scale so world coords map straight through.
  const width = box.maxX - box.minX + 2 * PAD;
  const height = box.maxY - box.minY + 2 * PAD;
  const vbX = box.minX - PAD;
  const vbY = box.minY - PAD;
  clone.setAttribute("viewBox", `${vbX} ${vbY} ${width} ${height}`);
  clone.setAttribute("width", String(Math.round(width)));
  clone.setAttribute("height", String(Math.round(height)));
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  // The grid backdrop rides on the stage's class/inline style; drop both and lay
  // down a solid theme-colored backdrop instead.
  clone.removeAttribute("class");
  clone.removeAttribute("style");
  clone.removeAttribute("data-grid");
  const stage = clone.querySelector(":scope > g");
  stage?.setAttribute("transform", "translate(0,0) scale(1)");

  // The Klir place label is screen-space copy (outside the pan group, x="50%"
  // of the live viewport) — re-anchor it to the exported frame's top center so
  // the diagram keeps its you-are-here. The containers (Mobus membrane, Bunge
  // hull) are world-space and need nothing.
  const place = clone.querySelector("[data-place-label]");
  if (place) {
    place.setAttribute("x", String(vbX + width / 2));
    place.setAttribute("y", String(vbY + 20));
  }

  const bg =
    getComputedStyle(document.documentElement).getPropertyValue("--bg-primary").trim() || "#ffffff";
  const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  rect.setAttribute("x", String(vbX));
  rect.setAttribute("y", String(vbY));
  rect.setAttribute("width", String(width));
  rect.setAttribute("height", String(height));
  rect.setAttribute("fill", bg);
  clone.insertBefore(rect, clone.firstChild);

  const svg = new XMLSerializer().serializeToString(clone);
  return { svg: `<?xml version="1.0" encoding="UTF-8"?>\n${svg}`, width, height };
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Export the live canvas as a standalone SVG file. Returns false if the model
 *  is empty (caller surfaces "nothing to export"). */
export function exportDiagramSvg(live: SVGSVGElement, model: CanvasModel, filename: string): boolean {
  const out = serializeDiagram(live, model);
  if (!out) return false;
  triggerDownload(new Blob([out.svg], { type: "image/svg+xml;charset=utf-8" }), `${filename}.svg`);
  return true;
}

/** Export the live canvas as a PNG by rasterizing the standalone SVG onto a
 *  canvas at `scale`× for crispness. Async (image decode). */
export async function exportDiagramPng(
  live: SVGSVGElement,
  model: CanvasModel,
  filename: string,
  scale = 2,
): Promise<boolean> {
  const out = serializeDiagram(live, model);
  if (!out) return false;
  const url = URL.createObjectURL(new Blob([out.svg], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const img = new Image();
    img.decoding = "async";
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("could not rasterize diagram"));
      img.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(out.width * scale);
    canvas.height = Math.round(out.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no 2D context for PNG export");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const png = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!png) throw new Error("could not encode PNG");
    triggerDownload(png, `${filename}.png`);
    return true;
  } finally {
    URL.revokeObjectURL(url);
  }
}
