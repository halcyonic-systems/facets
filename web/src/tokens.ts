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
} as const;

// The reserved KIND channel: substance identity (Matter / Energy / Informational
// / Field). Contractual — means substance type, never decorative, and constant
// across lenses and themes. The hex mirrors --kind-* in index.css (kept in sync by
// check-tokens.mjs); literal here because these feed SVG stroke/fill style objects.
export const kind = {
  Matter: "#5a7a4f",
  Energy: "#b06a1f",
  Informational: "#8a5a9c",
  Field: "#3f6f8f",
  Unspecified: "var(--text-muted)",
} as const;
