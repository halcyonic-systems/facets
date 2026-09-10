// SPIKE (uncommitted): a chat "sheet figure" — the kernel's compiled model drawn
// headlessly from the SAME geometry the canvas and Thumbnail use. No systems fact
// is decided here: positions, membrane, rims and edge paths all come from
// geometry.ts over a model `bert compile` produced. Usage:
//   npx vite-node scripts/spike/sheet-figure.ts <model.json> <out.svg>
import { readFileSync, writeFileSync } from "node:fs";
import { contentBounds, fitToBox, membraneRing, edgeGeometry, NODE_R } from "../src/canvas/geometry";
import { KIND_COLOR } from "../src/canvas/types";
import type { CanvasModel } from "../src/kernel/types";

const [, , inPath, outPath] = process.argv;
const model = JSON.parse(readFileSync(inPath, "utf8")) as CanvasModel;
const W = 760, H = 560;
const box = contentBounds(model)!;
const { pan, scale } = fitToBox(box, W, H, { pad: 44, minScale: 0.1, maxScale: 1 });
const to = (p: { x: number; y: number }) => ({ x: p.x * scale + pan.x, y: p.y * scale + pan.y });
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
// Kind colours in the app are CSS custom properties; a standalone figure needs paint.
const PAINT: Record<string, string> = { Energy: "#c2743a", Matter: "#4a6b8a", Field: "#7a5c9e", Informational: "#3a6e62", Unspecified: "#8a8f98" };
const paint = (k: string) => (KIND_COLOR[k as keyof typeof KIND_COLOR] || "").startsWith("var(") || !KIND_COLOR[k as keyof typeof KIND_COLOR] ? PAINT[k] ?? PAINT.Unspecified : KIND_COLOR[k as keyof typeof KIND_COLOR];

const ring = model.lens === "Mobus" ? membraneRing(model.things) : null;
const parts: string[] = [];
parts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" font-family="Inter, system-ui, sans-serif">`);
parts.push(`<defs>${Object.entries(PAINT).map(([k, c]) => `<marker id="arr-${k}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="${c}"/></marker>`).join("")}</defs>`);
parts.push(`<rect width="${W}" height="${H}" fill="#fbfaf7"/>`);
if (ring) {
  const c = to({ x: ring.cx, y: ring.cy });
  parts.push(`<ellipse cx="${c.x}" cy="${c.y}" rx="${ring.rx * scale}" ry="${ring.ry * scale}" fill="#f2f0ea" stroke="#9aa0a6" stroke-width="1" stroke-dasharray="4 3"/>`);
}
for (const r of model.relations) {
  const g = edgeGeometry(model, r, true);
  if (!g) continue;
  // The path is in model space; scale it with a transform rather than re-deriving it.
  parts.push(`<path d="${g.d}" transform="translate(${pan.x} ${pan.y}) scale(${scale})" fill="none" stroke="${paint(r.kind)}" stroke-width="${1.4 / scale}" stroke-opacity="0.85" marker-end="url(#arr-${r.kind in PAINT ? r.kind : "Unspecified"})"/>`);
  const l = to(g.labelAt);
  const label = (r.name || "").replace(/^F-[\d.]+\s+—\s+/, "");
  if (label) parts.push(`<text x="${l.x}" y="${l.y - 3}" font-size="9" fill="#5a5f66" text-anchor="middle">${esc(label)}</text>`);
}
for (const t of model.things) {
  const p = to(t);
  const r = NODE_R * scale;
  if (t.role === "Environment") {
    const s = r * 1.5;
    parts.push(`<rect x="${p.x - s / 2}" y="${p.y - s / 2}" width="${s}" height="${s}" fill="#fff" stroke="#6b7078" stroke-width="1.2"/>`);
    parts.push(`<text x="${p.x}" y="${p.y + s / 2 + 12}" font-size="10" fill="#3a3f45" text-anchor="middle">${esc(t.name)}</text>`);
    parts.push(`<text x="${p.x}" y="${p.y + 3}" font-size="8" fill="#8a8f98" text-anchor="middle">${t.env_kind === "Source" ? "src" : t.env_kind === "Sink" ? "sink" : ""}</text>`);
  } else {
    parts.push(`<circle cx="${p.x}" cy="${p.y}" r="${r}" fill="#fff" stroke="${t.interface ? "#3a6e62" : "#3a3f45"}" stroke-width="${t.interface ? 2 : 1.2}"/>`);
    parts.push(`<text x="${p.x}" y="${p.y + r + 12}" font-size="10" font-weight="600" fill="#1f2328" text-anchor="middle">${esc(t.name)}</text>`);
    if (t.primitive) parts.push(`<text x="${p.x}" y="${p.y + 3}" font-size="8" fill="#8a8f98" text-anchor="middle">${esc(String(t.primitive))}</text>`);
  }
}
parts.push(`<text x="12" y="${H - 10}" font-size="9" fill="#8a8f98">${esc(model.name || "")} · ${model.lens} · ${model.things.filter(t => t.role === "Component").length} components, ${model.relations.length} flows · compiled by the kernel</text>`);
parts.push("</svg>");
writeFileSync(outPath, parts.join("\n"));
console.log("wrote", outPath, "things", model.things.length, "relations", model.relations.length, "KIND_COLOR sample", KIND_COLOR.Energy);
