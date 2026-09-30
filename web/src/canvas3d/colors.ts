// Three wants numbers; the design system speaks var(--x). Resolve each token
// through a probe element's computed style (the same route exportDiagram takes
// for a snapshot) so the 3D view follows the theme and the lens seam without a
// single literal here. No colour is spelled in this file — check-tokens.mjs
// scans for exactly that.

import { kind as kindTokens } from "../tokens";
import type { Kind } from "../kernel/types";

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

export interface SceneColors {
  paper: Rgb;
  ink: Rgb;
  muted: Rgb;
  hairline: Rgb;
  accent: Rgb;
  lensAccent: Rgb;
  lensSoft: Rgb;
  kind: Record<Kind, Rgb>;
}

const TOKENS = {
  paper: "var(--bg-primary)",
  ink: "var(--text-primary)",
  muted: "var(--text-muted)",
  hairline: "var(--hairline)",
  accent: "var(--accent)",
  lensAccent: "var(--lens-accent)",
  lensSoft: "var(--lens-accent-soft)",
} as const;

function parseTriple(text: string): Rgb {
  const m = /(\d+(?:\.\d+)?)\D+(\d+(?:\.\d+)?)\D+(\d+(?:\.\d+)?)/.exec(text);
  if (!m) return { r: 128, g: 128, b: 128 };
  return { r: Number(m[1]), g: Number(m[2]), b: Number(m[3]) };
}

/** Resolve every scene colour against `host`, which must be inside the
 *  data-lens scope so the lens seam applies. */
export function resolveSceneColors(host: HTMLElement): SceneColors {
  const probe = host.ownerDocument.createElement("span");
  probe.style.position = "absolute";
  probe.style.visibility = "hidden";
  probe.style.pointerEvents = "none";
  host.appendChild(probe);
  const read = (token: string): Rgb => {
    probe.style.color = token;
    return parseTriple(getComputedStyle(probe).color);
  };
  const out: SceneColors = {
    paper: read(TOKENS.paper),
    ink: read(TOKENS.ink),
    muted: read(TOKENS.muted),
    hairline: read(TOKENS.hairline),
    accent: read(TOKENS.accent),
    lensAccent: read(TOKENS.lensAccent),
    lensSoft: read(TOKENS.lensSoft),
    kind: {
      Matter: read(kindTokens.Matter),
      Energy: read(kindTokens.Energy),
      Informational: read(kindTokens.Informational),
      Field: read(kindTokens.Field),
      Unspecified: read(kindTokens.Unspecified),
    },
  };
  probe.remove();
  return out;
}
