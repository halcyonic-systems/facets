// JS mirror of the CSS custom properties in index.css, for numeric / SVG props
// that can't read var(--x). Keep in sync with index.css and web/DESIGN.md.
// (Phase 0 uses var(--x) directly almost everywhere; this grows with the app.)
export const color = {
  accent: "var(--accent)",
  accentStrong: "var(--accent-strong)",
  verdictOk: "var(--verdict-ok)",
  verdictWarning: "var(--verdict-warning)",
  verdictError: "var(--verdict-error)",
  textPrimary: "var(--text-primary)",
  textMuted: "var(--text-muted)",
  textOnAccent: "var(--text-on-accent)",
  // the per-lens seam — redefined by data-lens on the workspace root
  lensAccent: "var(--lens-accent)",
  lensAccentSoft: "var(--lens-accent-soft)",
  lensNodeStroke: "var(--lens-node-stroke)",
} as const;

// The reserved KIND channel: substance identity (Matter / Energy / Informational
// / Field). Contractual — means substance type, never decorative, and constant
// across lenses and themes. The hex mirrors --kind-* in index.css (kept in sync by
// check-tokens.mjs); literal here because these feed SVG stroke/fill style objects.
export const kind = {
  Matter: "#667a3f",
  Energy: "#b8641c",
  Informational: "#7b4a86",
  Field: "#3d6280",
  Unspecified: "var(--text-muted)",
} as const;

// Export-time fallback: exportDiagram resolves --bg-primary from computed style
// at snapshot time; when that comes back empty (detached document, tests) the
// exported SVG still needs a concrete page color. Literal here because tokens.ts
// is the one sanctioned home for raw color values (check-tokens.mjs enforces).
export const exportBgFallback = "#ffffff";
