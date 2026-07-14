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
