// Shared Halcyonic Frost primitives (web/DESIGN.md). Presentation only — no
// systems logic. Tokens come from index.css via var(--x).
import type { ReactNode } from "react";

export function Card({
  title,
  source,
  actions,
  children,
}: {
  title?: string;
  source?: string;
  /** Quiet header-right controls (after the source stamp), e.g. the run
   *  deck's expand-to-focus affordance (#283). */
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      className="p-5"
      style={{
        background: "var(--bg-secondary)",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow-card)",
        borderRadius: "var(--radius-md)",
      }}
    >
      {(title || source || actions) && (
        <div className="mb-4 flex items-baseline justify-between gap-3">
          {title && (
            <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
              {title}
            </h2>
          )}
          <span className="flex items-baseline gap-3">
            {source && (
              <span className="text-[11px] font-medium tabular" style={{ color: "var(--accent-strong)" }}>
                {source}
              </span>
            )}
            {actions}
          </span>
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

/** An armable tool / small toggle button — the palette dock, the popovers, and
 *  the inspector all share this one control. Armed/active fills with the lens's
 *  own accent (the seam); "one armed tool at a time" is the caller's rule. */
export function ToolButton({
  onClick,
  active = false,
  disabled = false,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title?: string;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="rounded-full px-2.5 py-1 text-xs"
      style={{
        background: active ? "var(--lens-accent)" : "var(--bg-surface)",
        color: active ? "var(--text-on-accent)" : "var(--text-secondary)",
        border: "1px solid var(--border)",
        opacity: disabled ? 0.45 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      {children}
    </button>
  );
}

/** The shared row vocabulary for edit surfaces — the EdgePopover bodies and the
 *  docked inspector speak in these, so element editing feels like ONE surface
 *  wherever it happens. */
export function InspectorTitle({ children }: { children: ReactNode }) {
  return (
    <div className="mb-2 text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
      {children}
    </div>
  );
}

export function InspectorRow({ children }: { children: ReactNode }) {
  return <div className="mb-2 flex items-center justify-between gap-2 text-xs">{children}</div>;
}

/** The author's prose about a thing, a flow, or the system of interest (#326).
 *
 *  A row of its own rather than an `InspectorRow`, because every other row is a
 *  label beside a short value and this one is a paragraph: the label sits above
 *  and the field takes the full measure, so a sentence is readable instead of
 *  scrolling sideways through a 7rem input.
 *
 *  Shared by the node editor, both flow editors, and the model page, so the
 *  three surfaces cannot drift into three different affordances for one field. */
export function DescriptionField({
  value,
  onChange,
  label = "description",
  placeholder = "what this is, in your own words",
  rows = 3,
}: {
  value: string;
  onChange: (next: string) => void;
  label?: string;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <div className="mb-2 text-xs">
      <div className="mb-1" style={{ color: "var(--text-secondary)" }}>
        {label}
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full resize-y rounded-md px-1.5 py-1 text-xs leading-snug"
        style={{
          border: "1px solid var(--border)",
          background: "var(--bg-primary)",
          color: "var(--text-primary)",
        }}
      />
    </div>
  );
}

/** Kernel-verdict announcement chrome (the aggregate/heap banner, palette
 *  legality feedback, gesture rejections). Presentation only — the message is
 *  always the kernel's. Position via className at the call site. */
export function Banner({
  tone,
  className = "",
  children,
}: {
  tone: "error" | "soft";
  className?: string;
  children: ReactNode;
}) {
  const style =
    tone === "error"
      ? { background: "var(--verdict-error)", color: "var(--text-on-accent)" }
      : {
          background: "var(--lens-accent-soft)",
          color: "var(--lens-accent)",
          border: "1px solid var(--border)",
        };
  return (
    <div className={`rounded-md px-3 py-1.5 text-xs font-body ${className}`} style={style}>
      {children}
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

/** A viewport-clamped popover (walkthrough #5/#16). The chronic failure this
 *  replaces: a flyout absolutely positioned inside a clipping parent is
 *  invisible (the process reference died this way when the rail moved into an
 *  `overflow-y-auto` dock), and a canvas popover near an edge runs off screen
 *  with its fields unreachable. The primitive renders an invisible anchor at
 *  the given CONTAINER-space point, measures its viewport rect, and portals
 *  the content to <body>, clamped to the viewport — below the anchor by
 *  preference (flipping above when short), or beside it (`prefer="right"`).
 *  Presentation only: no dismiss logic, no focus theft — open/close stays the
 *  caller's seam, exactly as before. */
import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export function Popover({
  x,
  y,
  width,
  prefer = "below",
  accent = false,
  children,
}: {
  /** Anchor point, in the coordinate space of the nearest positioned ancestor. */
  x: number;
  y: number;
  width: number;
  /** "below": centered under the anchor, flip above when short. "right": beside
   *  the anchor, top-aligned, flip left when short. */
  prefer?: "below" | "right";
  /** Lens-accent border (edge/boundary editors) vs plain border (reference). */
  accent?: boolean;
  children: ReactNode;
}) {
  const anchorRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  useLayoutEffect(() => {
    const a = anchorRef.current;
    const c = contentRef.current;
    if (!a || !c) return;
    const ar = a.getBoundingClientRect();
    const cw = c.offsetWidth;
    const ch = c.offsetHeight;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let left: number;
    let top: number;
    if (prefer === "right") {
      left = ar.left + 8;
      if (left + cw > vw - 8) left = Math.max(8, ar.left - cw - 8);
      top = ar.top;
    } else {
      left = ar.left - cw / 2;
      top = ar.top + 20;
      if (top + ch > vh - 8) top = ar.top - ch - 8;
    }
    left = Math.max(8, Math.min(left, vw - cw - 8));
    top = Math.max(8, Math.min(top, vh - ch - 8));
    setPos({ left, top });
  }, [x, y, prefer, children]);

  return (
    <>
      <div ref={anchorRef} className="pointer-events-none absolute h-0 w-0" style={{ left: x, top: y }} />
      {createPortal(
        <div
          ref={contentRef}
          className="fixed z-50 overflow-y-auto p-3"
          style={{
            left: pos?.left ?? -9999,
            top: pos?.top ?? -9999,
            width,
            maxHeight: "calc(100vh - 1rem)",
            background: "var(--bg-secondary)",
            border: `1px solid ${accent ? "var(--lens-accent)" : "var(--border)"}`,
            boxShadow: accent ? "var(--shadow-card-hover)" : "var(--shadow-card)",
            borderRadius: "var(--radius-md)",
          }}
        >
          {children}
        </div>,
        document.body,
      )}
    </>
  );
}

/** An in-app confirm — the styled, automation-friendly replacement for
 *  `window.confirm`, which cannot be themed and blocks every browser-automation
 *  event loop cold (the dialog is invisible to screenshots and unclickable by
 *  CDP — found the hard way, 2026-07-29). Presentation only: the caller owns
 *  the pending action; this just asks and resolves. Escape and the backdrop
 *  cancel; the destructive verb is the explicit button. */
export function ConfirmDialog({
  message,
  confirmLabel,
  onResolve,
  alt,
}: {
  message: string;
  /** The destructive verb ("Discard"), never "OK". */
  confirmLabel: string;
  onResolve: (ok: boolean) => void;
  /** An optional non-destructive third way out ("Save & continue") — rendered
   *  as the emphasized action, because when it exists it is almost always what
   *  the user wants over discarding. The caller settles its own resolver. */
  alt?: { label: string; onPick: () => void };
}) {
  useLayoutEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onResolve(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });
  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center"
      style={{ background: "color-mix(in srgb, var(--bg-primary) 55%, transparent)" }}
      onPointerDown={() => onResolve(false)}
    >
      <div
        className="w-80 p-5"
        role="alertdialog"
        aria-modal="true"
        onPointerDown={(e) => e.stopPropagation()}
        style={{
          background: "var(--bg-secondary)",
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow-card-hover)",
          borderRadius: "var(--radius-md)",
        }}
      >
        <p className="mb-4 text-sm" style={{ color: "var(--text-primary)" }}>
          {message}
        </p>
        <div className="flex justify-end gap-2">
          <button
            autoFocus
            onClick={() => onResolve(false)}
            className="rounded-full px-4 py-1.5 text-sm"
            style={{ color: "var(--text-secondary)", border: "1px solid var(--border)" }}
          >
            Cancel
          </button>
          <button
            onClick={() => onResolve(true)}
            className="rounded-full px-4 py-1.5 text-sm font-semibold"
            style={{ background: "var(--verdict-error)", color: "var(--text-on-accent)" }}
          >
            {confirmLabel}
          </button>
          {alt && (
            <button
              onClick={alt.onPick}
              className="rounded-full px-4 py-1.5 text-sm font-semibold"
              style={{ background: "var(--lens-accent)", color: "var(--text-on-accent)" }}
            >
              {alt.label}
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

/** The shared tab strip (run-legibility ws3): one way to draw tabs anywhere —
 *  the InspectorDock's ELEMENT/FORMAL/REVIEW/ANALYST strip and the run dock's
 *  Story/Fit/Table are the same primitive. Two cells, and the split is
 *  load-bearing (harvested from the dock): the tab list scrolls under
 *  pressure, `controls` stays pinned at the right edge. Selection state lives
 *  with the caller; this only draws it. */
export function Tabs({
  tabs,
  active,
  onSelect,
  controls,
}: {
  tabs: { key: string; label: string; badge?: number }[];
  active: string;
  onSelect: (key: string) => void;
  controls?: ReactNode;
}) {
  return (
    <div className="flex items-stretch border-b" style={{ borderColor: "var(--hairline)" }}>
      <div className="flex min-w-0 flex-1 items-stretch overflow-x-auto">
        {tabs.map((t) => (
          <TabButton
            key={t.key}
            label={t.label}
            active={active === t.key}
            onClick={() => onSelect(t.key)}
            badge={t.badge}
          />
        ))}
      </div>
      {controls && <div className="flex shrink-0 items-stretch">{controls}</div>}
    </div>
  );
}

function TabButton({
  label,
  active,
  onClick,
  badge,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      className="flex shrink-0 items-center gap-1.5 px-2.5 py-2.5 text-xs font-semibold uppercase tracking-wide transition-colors"
      style={{
        color: active ? "var(--text-primary)" : "var(--text-muted)",
        borderBottom: `2px solid ${active ? "var(--lens-accent)" : "transparent"}`,
        marginBottom: "-1px",
        transition: "var(--transition-base)",
      }}
    >
      {label}
      {badge !== undefined && (
        <span
          className="inline-flex min-w-[1.1rem] items-center justify-center rounded-full px-1 text-[10px] font-medium tabular"
          style={{ background: "var(--verdict-warning)", color: "var(--text-on-accent)" }}
        >
          {badge}
        </span>
      )}
    </button>
  );
}
