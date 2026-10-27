import { GROUNDING_GRADES } from "./kernel/types";
import type { Grounding, GroundingGrade } from "./kernel/types";
// Shared Halcyonic Frost primitives (web/DESIGN.md § Primitives). Presentation
// only: no systems logic. Tokens come from index.css via var(--x); every glyph
// is an <Icon> from icons.tsx; the sizes, radii and keyboard behaviour follow
// the makeover charter (docs/design/makeover-2026-10.md, rules 3, 5, 9d, 10,
// 11, 14, 15). The states inline styles cannot express (hover, placeholder)
// live under the `prim-*` classes in index.css.
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type {
  ComponentProps,
  CSSProperties,
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { Icon } from "./icons";
import type { IconName } from "./icons";

/** The 11/600 uppercase label (rule 5), as the two pieces a className cannot
 *  carry: Tailwind has no class for the tracking token. */
const LABEL_CLASS = "text-[11px] font-semibold uppercase whitespace-nowrap";
const LABEL_STYLE: CSSProperties = { letterSpacing: "var(--tracking-label)" };

/* ── Surfaces ─────────────────────────────────────────────────────────── */

/** A window or card (rule 3: 8px; rule 2: a hairline edge and no shadow).
 *  Panel is the bare surface; Card adds the header row. */
export function Panel({
  children,
  className = "",
  style,
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  as?: "div" | "section" | "aside";
}) {
  return (
    <Tag
      className={`rounded-md ${className}`}
      style={{ background: "var(--bg-secondary)", border: "1px solid var(--hairline)", ...style }}
    >
      {children}
    </Tag>
  );
}

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
    <Panel as="section" className="p-5">
      {(title || source || actions) && (
        <div className="mb-4 flex items-baseline justify-between gap-3">
          {title && (
            // A section name is a name of a thing: Cormorant 700 at d3 (rule 5).
            <h2
              className="font-bold leading-tight"
              style={{ color: "var(--text-primary)", fontFamily: "var(--font-display)", fontSize: "var(--t-d3)" }}
            >
              {title}
            </h2>
          )}
          <span className="flex items-baseline gap-3">
            {source && (
              // The stamp names a source, not an action, so it wears ink, not
              // the accent (readouts audit #19).
              <span className={LABEL_CLASS} style={{ ...LABEL_STYLE, color: "var(--text-muted)" }}>
                {source}
              </span>
            )}
            {actions}
          </span>
        </div>
      )}
      {children}
    </Panel>
  );
}

/* ── Chips and verdicts ───────────────────────────────────────────────── */

/** Chip meanings (rule 9d): the three verdicts, then the four marks the
 *  surfaces carry. Each is a word on a tinted chip; error is solid because it
 *  is urgent (rule 8). The hues are the verdict, accent and primitive tokens. */
export type Tone = "ok" | "warning" | "error" | "neutral" | "runs" | "drafted" | "with" | "bench";
const toneColor: Record<Tone, string> = {
  ok: "var(--verdict-ok)",
  warning: "var(--verdict-warning)",
  error: "var(--verdict-error)",
  neutral: "var(--text-muted)",
  runs: "var(--accent)",
  drafted: "var(--prim-modulating)",
  with: "var(--prim-combining)",
  bench: "var(--prim-buffering)",
};

/** A chip with a word. 4px radius, 20px tall, 12px Inter 500; the one true
 *  pill is the verdict chip in the status bar, which passes `pill` and so
 *  carries `data-pill` (rule 3). Colour is by meaning (rule 9d) and never the
 *  only carrier: the children are the word (rule 12). */
export function Pill({
  tone = "neutral",
  pill = false,
  icon,
  children,
}: {
  tone?: Tone;
  /** The verdict chip only. */
  pill?: boolean;
  icon?: IconName;
  children: ReactNode;
}) {
  const color = toneColor[tone];
  const solid = tone === "error";
  const style: CSSProperties = solid
    ? { background: color, color: "var(--text-on-accent)" }
    : tone === "neutral"
      ? { background: "var(--bg-surface)", color: "var(--text-secondary)" }
      : { background: `color-mix(in srgb, ${color} 14%, var(--bg-secondary))`, color };
  return (
    <span
      data-pill={pill ? "" : undefined}
      data-tone={tone}
      className={`inline-flex h-5 items-center gap-1 whitespace-nowrap text-xs font-medium leading-none ${
        pill ? "rounded-full px-2.5" : "rounded-sm px-1.5"
      }`}
      style={style}
    >
      {icon && <Icon name={icon} size={16} />}
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

/* ── Buttons ──────────────────────────────────────────────────────────── */

export type ButtonSize = 28 | 32;
export type ButtonVariant = "primary" | "quiet" | "danger";

/** The button (rules 3, 5, 8, 10, 11): 28 or 32 tall, 4px radius, 14px Inter
 *  500, an optional 16px icon before the word. `primary` fills with the accent
 *  and `danger` with the error verdict, both under `--text-on-accent`; `quiet`
 *  is the sheet with a `--rule-strong` hairline. The focus ring is the global
 *  one (index.css :focus-visible); nothing here removes it. Disabled keeps
 *  readable ink (`--text-muted`, never half opacity). */
export function Button({
  size = 32,
  variant = "primary",
  icon,
  children,
  className = "",
  style,
  disabled,
  type = "button",
  ...rest
}: {
  size?: ButtonSize;
  variant?: ButtonVariant;
  icon?: IconName;
} & ComponentProps<"button">) {
  const iconOnly = children === undefined || children === null || children === false;
  const box = size === 28 ? (iconOnly ? "h-7 w-7" : "h-7 px-2.5") : iconOnly ? "h-8 w-8" : "h-8 px-3";
  const look: CSSProperties = disabled
    ? { background: "var(--bg-surface)", color: "var(--text-muted)", border: "1px solid var(--border)", cursor: "not-allowed" }
    : variant === "primary"
      ? { background: "var(--accent)", color: "var(--text-on-accent)", border: "1px solid var(--accent)" }
      : variant === "danger"
        ? { background: "var(--verdict-error)", color: "var(--text-on-accent)", border: "1px solid var(--verdict-error)" }
        : { background: "var(--bg-secondary)", color: "var(--text-primary)", border: "1px solid var(--rule-strong)" };
  return (
    <button
      type={type}
      disabled={disabled}
      data-prim="button"
      data-size={size}
      data-variant={variant}
      className={`prim-button ${variant === "quiet" ? "prim-quiet" : ""} inline-flex shrink-0 items-center justify-center gap-1.5 rounded-sm whitespace-nowrap text-sm font-medium ${box} ${className}`}
      style={{ transition: "background-color var(--motion-fast) ease-out", ...look, ...style }}
      {...rest}
    >
      {icon && <Icon name={icon} size={16} />}
      {children}
    </button>
  );
}

/** An armable tool / small toggle button: the palette dock, the popovers and
 *  the inspector all share this one control (rules 3, 11, 21). 32 tall and at
 *  least 32 wide, 4px radius; with `icon` and no children it is the 32x32
 *  square with a 20px glyph. Armed fills with the lens's own accent (the seam,
 *  rule 9c) and says so with `aria-pressed`; "one armed tool at a time" is the
 *  caller's rule. */
export function ToolButton({
  onClick,
  active = false,
  disabled = false,
  title,
  icon,
  "aria-label": ariaLabel,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title?: string;
  icon?: IconName;
  "aria-label"?: string;
  children?: ReactNode;
}) {
  const square = children === undefined || children === null || children === false;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={ariaLabel}
      aria-pressed={active}
      data-prim="tool"
      className={`prim-tool inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-sm whitespace-nowrap text-sm ${
        square ? "w-8" : "min-w-8 px-2"
      }`}
      style={{
        background: active ? "var(--lens-accent)" : "var(--bg-surface)",
        color: disabled ? "var(--text-muted)" : active ? "var(--text-on-accent)" : "var(--text-secondary)",
        border: `1px solid ${active ? "var(--lens-accent)" : "var(--border)"}`,
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "background-color var(--motion-fast) ease-out",
      }}
    >
      {icon && <Icon name={icon} size={20} />}
      {children}
    </button>
  );
}

/* ── Fields ───────────────────────────────────────────────────────────── */

/** The one field look (rule 3: 4px; rule 11: 32 tall): a `--rule-strong`
 *  edge on the ground, 14px Inter, the global focus ring, and a placeholder
 *  in `--text-muted` (4.5:1 and better on every ground; `.prim-field` in
 *  index.css). Input and Select are 32 tall; Textarea grows from 32. */
const FIELD_CLASS = "prim-field rounded-sm text-sm";
const FIELD_STYLE: CSSProperties = {
  border: "1px solid var(--rule-strong)",
  background: "var(--bg-primary)",
  color: "var(--text-primary)",
};

export function Input({ className = "", style, ...rest }: ComponentProps<"input">) {
  return <input className={`${FIELD_CLASS} h-8 px-2 ${className}`} style={{ ...FIELD_STYLE, ...style }} {...rest} />;
}

export function Select({ className = "", style, children, ...rest }: ComponentProps<"select">) {
  return (
    <select className={`${FIELD_CLASS} h-8 px-1.5 ${className}`} style={{ ...FIELD_STYLE, ...style }} {...rest}>
      {children}
    </select>
  );
}

export function Textarea({ className = "", style, ...rest }: ComponentProps<"textarea">) {
  return (
    <textarea
      className={`${FIELD_CLASS} min-h-8 px-2 py-1.5 leading-snug ${className}`}
      style={{ ...FIELD_STYLE, ...style }}
      {...rest}
    />
  );
}

/** The shared row vocabulary for edit surfaces: the EdgePopover bodies and the
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
 *  scrolling sideways through a 7rem input. The label is a `<label>` bound to
 *  the field (sl audit #33).
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
  const id = useId();
  return (
    <div className="mb-2">
      <label htmlFor={id} className={`mb-1 block ${LABEL_CLASS}`} style={{ ...LABEL_STYLE, color: "var(--text-secondary)" }}>
        {label}
      </label>
      <Textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full resize-y"
      />
    </div>
  );
}

/** The author's grounding for a thing or a flow (#411): a grade from the
 *  closed vocabulary, then the reference in their words. "unsaid" clears the
 *  clause, so an author can withdraw a claim as easily as make one. Shared by
 *  the node editor and both flow editors for the same reason `DescriptionField`
 *  is: one field, one affordance. */
export function GroundingField({
  value,
  onChange,
}: {
  value: Grounding | undefined;
  onChange: (next: Grounding | undefined) => void;
}) {
  return (
    <div className="mb-2">
      <div
        className={`mb-1 ${LABEL_CLASS}`}
        style={{ ...LABEL_STYLE, color: "var(--text-secondary)" }}
        title="whose word this rests on"
      >
        grounding
      </div>
      <div className="flex gap-1.5">
        <Select
          value={value?.grade ?? ""}
          onChange={(e) => {
            const grade = e.target.value as GroundingGrade | "";
            onChange(grade === "" ? undefined : { grade, reference: value?.reference });
          }}
          aria-label="grounding grade"
        >
          <option value="">unsaid</option>
          {[...GROUNDING_GRADES].reverse().map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </Select>
        <Input
          value={value?.reference ?? ""}
          disabled={!value}
          onChange={(e) => value && onChange({ grade: value.grade, reference: e.target.value || undefined })}
          placeholder={value ? "the reference: file:line, URL, endpoint and date, block" : ""}
          className="min-w-0 flex-1"
          aria-label="grounding reference"
        />
      </div>
    </div>
  );
}

/** Kernel-verdict announcement chrome (the aggregate/heap banner, palette
 *  legality feedback, gesture rejections). Presentation only: the message is
 *  always the kernel's. A drawn mark leads the word (rules 12, 14). Position
 *  via className at the call site. */
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
    <div className={`flex items-start gap-2 rounded-sm px-3 py-1.5 text-xs font-body ${className}`} style={style}>
      <Icon name={tone === "error" ? "error" : "info"} size={16} className="mt-px shrink-0" />
      <span className="min-w-0">{children}</span>
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

/* ── Popover ──────────────────────────────────────────────────────────── */

/** A viewport-clamped popover (walkthrough #5/#16). The chronic failure this
 *  replaces: a flyout absolutely positioned inside a clipping parent is
 *  invisible (the process reference died this way when the rail moved into an
 *  `overflow-y-auto` dock), and a canvas popover near an edge runs off screen
 *  with its fields unreachable. The primitive renders an invisible anchor at
 *  the given CONTAINER-space point, measures its viewport rect, and portals
 *  the content to <body>, clamped to the viewport: below the anchor by
 *  preference (flipping above when short), or beside it (`prefer="right"`).
 *  Presentation only: no dismiss logic, no focus theft; open/close stays the
 *  caller's seam, exactly as before. 8px radius, a hairline edge, no shadow. */
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
          className="fixed z-50 overflow-y-auto rounded-md p-3"
          style={{
            left: pos?.left ?? -9999,
            top: pos?.top ?? -9999,
            width,
            maxHeight: "calc(100vh - 1rem)",
            background: "var(--bg-secondary)",
            border: `1px solid ${accent ? "var(--lens-accent)" : "var(--hairline)"}`,
          }}
        >
          {children}
        </div>,
        document.body,
      )}
    </>
  );
}

/* ── Dialog ───────────────────────────────────────────────────────────── */

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** An in-app confirm: the styled, automation-friendly replacement for
 *  `window.confirm`, which cannot be themed and blocks every browser-automation
 *  event loop cold (the dialog is invisible to screenshots and unclickable by
 *  CDP; found the hard way, 2026-07-29). Presentation only: the caller owns
 *  the pending action; this just asks and resolves. Escape and the backdrop
 *  cancel; the destructive verb is the explicit button.
 *
 *  Semantics (rule 15): `role="dialog"`, `aria-modal`, labelled by its
 *  message; focus moves to Cancel on open, Tab cycles inside, and focus
 *  returns to the opener on close. 8px radius, a hairline edge, no shadow. */
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
  /** An optional non-destructive third way out ("Save & continue"), rendered
   *  as the emphasized action, because when it exists it is almost always what
   *  the user wants over discarding. The caller settles its own resolver. */
  alt?: { label: string; onPick: () => void };
}) {
  const titleId = useId();
  const boxRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onResolve(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });
  // Focus in on open, back to the opener on close.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    boxRef.current?.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    return () => {
      if (opener && document.contains(opener)) opener.focus();
    };
  }, []);
  const trapTab = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "Tab" || !boxRef.current) return;
    const items = Array.from(boxRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };
  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center"
      style={{ background: "color-mix(in srgb, var(--bg-primary) 55%, transparent)" }}
      onPointerDown={() => onResolve(false)}
    >
      <div
        ref={boxRef}
        className="w-80 rounded-md p-5"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onPointerDown={(e) => e.stopPropagation()}
        onKeyDown={trapTab}
        style={{ background: "var(--bg-secondary)", border: "1px solid var(--hairline)" }}
      >
        <p id={titleId} className="mb-4 text-sm" style={{ color: "var(--text-primary)" }}>
          {message}
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="quiet" data-autofocus onClick={() => onResolve(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={() => onResolve(true)}>
            {confirmLabel}
          </Button>
          {alt && (
            <Button variant="primary" onClick={alt.onPick}>
              {alt.label}
            </Button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

/* ── Tabs ─────────────────────────────────────────────────────────────── */

/** Where a key moves focus in a horizontal tab list of `count` tabs, from the
 *  tab at `index`; null when the key is not one of ours. Exported so the
 *  keyboard contract is testable without a DOM. */
export function tabKeyTarget(key: string, index: number, count: number): number | null {
  if (count === 0) return null;
  switch (key) {
    case "ArrowRight":
      return (index + 1) % count;
    case "ArrowLeft":
      return (index - 1 + count) % count;
    case "Home":
      return 0;
    case "End":
      return count - 1;
    default:
      return null;
  }
}

/** The shared tab strip (run-legibility ws3): one way to draw tabs anywhere;
 *  the InspectorDock's ELEMENT/FORMAL/REVIEW/ANALYST strip and the run dock's
 *  Story/Fit/Table are the same primitive. Two cells, and the split is
 *  load-bearing (harvested from the dock): the tab list scrolls under
 *  pressure, `controls` stays pinned at the right edge. Selection state lives
 *  with the caller; this only draws it.
 *
 *  Semantics (rules 5, 10, 15): `role="tablist"` of `role="tab"` buttons, 32
 *  tall, 11/600 uppercase labels, the active tab underlined 2px in the lens
 *  accent and the only one in the tab order; ArrowLeft/Right, Home and End
 *  select and focus (automatic activation, as the caller's `onSelect` is the
 *  one seam). The global focus ring is never removed. */
export function Tabs({
  tabs,
  active,
  onSelect,
  controls,
  label,
}: {
  tabs: { key: string; label: string; badge?: number }[];
  active: string;
  onSelect: (key: string) => void;
  controls?: ReactNode;
  /** An accessible name for the list, when the surface has more than one. */
  label?: string;
}) {
  const onKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    const i = tabs.findIndex((t) => t.key === active);
    const n = tabKeyTarget(e.key, i, tabs.length);
    if (n === null) return;
    e.preventDefault();
    onSelect(tabs[n].key);
    e.currentTarget.querySelectorAll<HTMLElement>('[role="tab"]')[n]?.focus();
  };
  return (
    <div className="flex items-stretch border-b" style={{ borderColor: "var(--hairline)" }}>
      {/* Scrolls under width pressure but never draws the bar (field report
          2026-08-17: a visible scrollbar on a three-tab strip read as clutter). */}
      <div
        role="tablist"
        aria-label={label}
        onKeyDown={onKeyDown}
        className="flex min-w-0 flex-1 items-stretch overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
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
      type="button"
      role="tab"
      aria-selected={active}
      tabIndex={active ? 0 : -1}
      onClick={onClick}
      className={`prim-tab flex h-8 shrink-0 items-center gap-1.5 px-2.5 ${LABEL_CLASS}`}
      style={{
        ...LABEL_STYLE,
        color: active ? "var(--text-primary)" : "var(--text-muted)",
        borderBottom: `2px solid ${active ? "var(--lens-accent)" : "transparent"}`,
        marginBottom: "-1px",
        transition: "color var(--motion-fast) ease-out",
      }}
    >
      {label}
      {badge !== undefined && (
        <span
          className="inline-flex h-4 min-w-4 items-center justify-center rounded-sm px-1 text-[11px] font-semibold"
          style={{
            background: "var(--verdict-warning)",
            color: "var(--text-on-accent)",
            letterSpacing: 0,
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

/* ── Menu ─────────────────────────────────────────────────────────────── */

/** Where a key moves focus in a vertical menu of `count` items, from the item
 *  at `index` (-1 when none has focus); null when the key is not one of ours. */
export function menuKeyTarget(key: string, index: number, count: number): number | null {
  if (count === 0) return null;
  switch (key) {
    case "ArrowDown":
      return (index + 1) % count;
    case "ArrowUp":
      return index < 0 ? count - 1 : (index - 1 + count) % count;
    case "Home":
      return 0;
    case "End":
      return count - 1;
    default:
      return null;
  }
}

const MenuContext = createContext<{ close: () => void } | null>(null);

const ITEM_SELECTOR = '[role^="menuitem"]:not([aria-disabled="true"])';

/** The menu button (APG menu button pattern; rules 2, 3, 5, 10, 15). The
 *  trigger is a Button carrying `aria-haspopup="menu"` and `aria-expanded`;
 *  the panel is `role="menu"`, 8px radius, a `--rule-strong` edge and no
 *  shadow, holding MenuItem / MenuSection / MenuSeparator children.
 *
 *  Keyboard: Enter, Space and ArrowDown open and focus the first item,
 *  ArrowUp opens on the last; inside, ArrowDown/ArrowUp rove (wrapping),
 *  Home/End jump, Escape closes and returns focus to the trigger, Tab closes
 *  and moves on. A pointer click outside closes. Picking an item closes.
 *  Open state is the Menu's own unless `open`/`onOpenChange` are given, so a
 *  surface that already holds the state can keep it. */
export function Menu({
  label,
  icon,
  children,
  align = "start",
  open: openProp,
  onOpenChange,
  size = 28,
  variant = "quiet",
  width,
  triggerClassName = "",
  triggerStyle,
  "aria-label": ariaLabel,
  title,
  disabled,
}: {
  label?: ReactNode;
  icon?: IconName;
  children: ReactNode;
  /** Which edge of the trigger the panel lines up with. */
  align?: "start" | "end";
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  size?: ButtonSize;
  variant?: ButtonVariant;
  /** Panel width in CSS px; defaults to the content, at least 10rem. */
  width?: number;
  triggerClassName?: string;
  triggerStyle?: CSSProperties;
  "aria-label"?: string;
  title?: string;
  disabled?: boolean;
}) {
  const [ownOpen, setOwnOpen] = useState(false);
  const open = openProp ?? ownOpen;
  const setOpen = useCallback(
    (next: boolean) => {
      if (openProp === undefined) setOwnOpen(next);
      onOpenChange?.(next);
    },
    [openProp, onOpenChange],
  );
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const pendingFocus = useRef<"first" | "last" | null>(null);
  const id = useId();
  const triggerId = `${id}-trigger`;
  const panelId = `${id}-menu`;

  const items = () => Array.from(panelRef.current?.querySelectorAll<HTMLElement>(ITEM_SELECTOR) ?? []);
  const focusItem = (i: number) => {
    const list = items();
    if (list.length === 0) return;
    list[((i % list.length) + list.length) % list.length].focus();
  };
  const close = useCallback(
    (returnFocus: boolean) => {
      setOpen(false);
      if (returnFocus) triggerRef.current?.focus();
    },
    [setOpen],
  );

  // The first item takes focus once the panel exists (keyboard opens only).
  useEffect(() => {
    if (!open || !pendingFocus.current) return;
    focusItem(pendingFocus.current === "first" ? 0 : -1);
    pendingFocus.current = null;
  }, [open]);

  // A pointer down outside the trigger and the panel closes it.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (panelRef.current?.contains(t) || triggerRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open, setOpen]);

  const onTriggerClick = (e: ReactMouseEvent<HTMLButtonElement>) => {
    if (open) {
      setOpen(false);
      return;
    }
    // detail 0 is a keyboard activation (Enter / Space): APG moves focus in.
    if (e.detail === 0) pendingFocus.current = "first";
    setOpen(true);
  };
  const onTriggerKeyDown = (e: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      pendingFocus.current = e.key === "ArrowDown" ? "first" : "last";
      if (open) focusItem(e.key === "ArrowDown" ? 0 : -1);
      else setOpen(true);
    } else if (e.key === "Escape" && open) {
      e.preventDefault();
      close(true);
    }
  };
  const onPanelKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      close(true);
      return;
    }
    if (e.key === "Tab") {
      setOpen(false);
      return;
    }
    const list = items();
    const n = menuKeyTarget(e.key, list.indexOf(document.activeElement as HTMLElement), list.length);
    if (n === null) return;
    e.preventDefault();
    list[n]?.focus();
  };

  return (
    <div className="relative inline-block">
      <Button
        ref={triggerRef}
        id={triggerId}
        size={size}
        variant={variant}
        icon={icon}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-label={ariaLabel}
        title={title}
        disabled={disabled}
        onClick={onTriggerClick}
        onKeyDown={onTriggerKeyDown}
        className={triggerClassName}
        style={triggerStyle}
      >
        {label}
        {label !== undefined && <Icon name={open ? "chevron-up" : "chevron-down"} size={16} />}
      </Button>
      {open && (
        <MenuContext.Provider value={{ close: () => close(true) }}>
          <div
            ref={panelRef}
            id={panelId}
            role="menu"
            aria-labelledby={triggerId}
            onKeyDown={onPanelKeyDown}
            className={`absolute top-full z-20 mt-1 min-w-40 rounded-md py-1 ${align === "end" ? "right-0" : "left-0"}`}
            style={{ width, background: "var(--bg-secondary)", border: "1px solid var(--rule-strong)" }}
          >
            {children}
          </div>
        </MenuContext.Provider>
      )}
    </div>
  );
}

/** One menu row: 32 tall, 14px Inter, a 16px slot for an icon or the check
 *  of a checked `menuitemcheckbox` / `menuitemradio`, and a right slot for the
 *  shortcut in the label style. Hover and focus share one highlight
 *  (`.prim-menu-item` in index.css). Disabled keeps readable ink and says so
 *  with `aria-disabled`. Picking it runs `onSelect` and closes the menu. */
export function MenuItem({
  children,
  onSelect,
  disabled = false,
  icon,
  shortcut,
  role = "menuitem",
  checked,
  title,
}: {
  children: ReactNode;
  onSelect?: () => void;
  disabled?: boolean;
  icon?: IconName;
  shortcut?: ReactNode;
  role?: "menuitem" | "menuitemcheckbox" | "menuitemradio";
  checked?: boolean;
  title?: string;
}) {
  const menu = useContext(MenuContext);
  return (
    <button
      type="button"
      role={role}
      aria-checked={role === "menuitem" ? undefined : !!checked}
      aria-disabled={disabled || undefined}
      tabIndex={-1}
      title={title}
      className="prim-menu-item flex h-8 w-full items-center gap-2 px-3 text-left text-sm whitespace-nowrap"
      style={{ color: disabled ? "var(--text-muted)" : "var(--text-primary)", cursor: disabled ? "not-allowed" : "pointer" }}
      onClick={() => {
        if (disabled) return;
        onSelect?.();
        menu?.close();
      }}
    >
      <span className="flex w-4 shrink-0 items-center justify-center">
        {icon ? <Icon name={icon} size={16} /> : checked ? <Icon name="check" size={16} /> : null}
      </span>
      <span className="min-w-0 flex-1">{children}</span>
      {shortcut !== undefined && (
        <span className={LABEL_CLASS} style={{ ...LABEL_STYLE, color: "var(--text-muted)" }}>
          {shortcut}
        </span>
      )}
    </button>
  );
}

/** A titled group of items: `role="group"` named by its 11px heading. */
export function MenuSection({ title, children }: { title: string; children: ReactNode }) {
  const id = useId();
  return (
    <div role="group" aria-labelledby={id}>
      <div id={id} className={`px-3 pt-2 pb-1 ${LABEL_CLASS}`} style={{ ...LABEL_STYLE, color: "var(--text-muted)" }}>
        {title}
      </div>
      {children}
    </div>
  );
}

export function MenuSeparator() {
  return <div role="separator" className="my-1 border-t" style={{ borderColor: "var(--hairline)" }} />;
}
