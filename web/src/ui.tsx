// Shared Halcyonic Frost primitives (web/DESIGN.md). Presentation only — no
// systems logic. Tokens come from index.css via var(--x).
import type { ReactNode } from "react";

export function Card({
  title,
  source,
  children,
}: {
  title?: string;
  source?: string;
  children: ReactNode;
}) {
  return (
    <section
      className="rounded-2xl p-6"
      style={{
        background: "var(--bg-secondary)",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow-card)",
        borderRadius: "var(--radius-card)",
      }}
    >
      {(title || source) && (
        <div className="mb-4 flex items-baseline justify-between gap-3">
          {title && (
            <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
              {title}
            </h2>
          )}
          {source && (
            <span className="text-[11px] font-medium tabular" style={{ color: "var(--accent-strong)" }}>
              {source}
            </span>
          )}
        </div>
      )}
      {children}
    </section>
  );
}

type Tone = "ok" | "warning" | "error" | "neutral";
const toneColor: Record<Tone, string> = {
  ok: "var(--verdict-ok)",
  warning: "var(--verdict-warning)",
  error: "var(--verdict-error)",
  neutral: "var(--text-muted)",
};

export function Pill({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  const color = toneColor[tone];
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium"
      style={{ color, border: `1px solid ${color}`, background: "transparent" }}
    >
      {children}
    </span>
  );
}

export function Verdict({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <p className="text-sm font-medium" style={{ color: toneColor[tone] }}>
      {children}
    </p>
  );
}

export function Stat({
  label,
  value,
  unit,
  tone = "neutral",
}: {
  label: string;
  value: string;
  unit?: string;
  tone?: Tone;
}) {
  const color = tone === "neutral" ? "var(--text-primary)" : toneColor[tone];
  return (
    <div>
      <div className="text-2xl font-semibold tabular" style={{ color }}>
        {value}
        {unit && (
          <span className="ml-1 text-sm font-normal" style={{ color: "var(--text-muted)" }}>
            {unit}
          </span>
        )}
      </div>
      <div className="mt-0.5 text-xs" style={{ color: "var(--text-muted)" }}>
        {label}
      </div>
    </div>
  );
}

/** Humanize a number for domain-legible display (no raw f32 noise). */
export function humanize(v: number): string {
  if (!isFinite(v)) return "—";
  const a = Math.abs(v);
  if (a === 0) return "0";
  if (a >= 1000) return v.toLocaleString(undefined, { maximumFractionDigits: 0 });
  if (a >= 1) return v.toLocaleString(undefined, { maximumFractionDigits: 1 });
  return v.toPrecision(2);
}
