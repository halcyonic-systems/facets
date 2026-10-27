// The bottom bar (#409 M1): standing status, the same in every mode. What the
// kernel says under the current lens, how big the model is, where the text
// stands, the Focus toggle, and what this build is. Nothing here is a layout
// choice except Focus, which is the one such choice the frame keeps.
//
// Makeover slice D (rules 3, 9d, 11, 12, 14, 16): one row of 32px at every
// width. The verdict chip is the one true Pill with its mark in the icon slot;
// the toggles are quiet Buttons with aria-pressed; below the narrow
// breakpoint (the host passes `secondary` only there) the toggles fold into
// one Menu so nothing wraps or clips at 390.
import { Button, Menu, MenuItem, Pill } from "./ui";
import { Icon } from "./icons";
import { MODE_BY_LENS } from "./review";
import type { CanvasModel, ValidationResult } from "./kernel/types";

/** docs/language/spec.md's title line carries the language version. */
export const SL_VERSION = "1.7";

export function StatusBar({
  model,
  verdict,
  faults,
  previewing,
  focus,
  onToggleFocus,
  grounding = false,
  onToggleGrounding,
  opaque = false,
  onToggleOpaque,
  secondary,
  onToggleSecondary,
  onVerdict,
  kernelLoaded,
}: {
  model: CanvasModel | null;
  verdict: ValidationResult | null;
  /** Parse faults in the SL text as of its last compile. */
  faults: number;
  previewing: boolean;
  focus: boolean;
  onToggleFocus: () => void;
  /** #411: the grounding overlay — the canvas recoloured by whose word each
   *  element rests on. A reading, not a layout choice, so it sits beside
   *  Focus rather than in the mode row. Absent handler hides the toggle. */
  grounding?: boolean;
  onToggleGrounding?: () => void;
  /** #308/#462: the opaque reading — the model seen from outside, interior
   *  hidden. Offered only when the host says the gesture applies (Mobus,
   *  structure mode, 2D); the zoom-out past the membrane is the feature. */
  opaque?: boolean;
  onToggleOpaque?: () => void;
  /** #427: at narrow widths the mode's secondary pane is a sheet on demand;
   *  this is the one control that opens and closes it. Absent above the
   *  breakpoint. */
  secondary?: { label: string; open: boolean };
  onToggleSecondary?: () => void;
  /** The verdict chip opens Read, where the review lives. */
  onVerdict: () => void;
  kernelLoaded: boolean;
}) {
  const clean = verdict !== null && verdict.issues.length === 0;
  const compileState =
    faults > 0 ? `${faults} SL fault${faults === 1 ? "" : "s"}` : previewing ? "previewing a draft" : "compiled";
  // The host hands over the sheet toggle only below the narrow breakpoint, so
  // its presence is the width signal (no second media query to disagree).
  const narrow = secondary !== undefined;
  const toggles: {
    key: string;
    label: string;
    pressed: boolean;
    onToggle: () => void;
    title: string;
    testId?: string;
    icon?: "close" | "chevron-right";
  }[] = [];
  if (secondary && onToggleSecondary && model)
    toggles.push({
      key: "secondary",
      label: secondary.label,
      pressed: secondary.open,
      onToggle: onToggleSecondary,
      title: secondary.open ? `Close the ${secondary.label} sheet` : `Open ${secondary.label} as a sheet over this mode's surface`,
      testId: "secondary-toggle",
      icon: secondary.open ? "close" : "chevron-right",
    });
  if (onToggleGrounding && model)
    toggles.push({
      key: "grounding",
      label: "Grounding",
      pressed: grounding,
      onToggle: onToggleGrounding,
      title: grounding ? "Hide the grounding overlay" : "Grounding: colour every thing and flow by whose word it rests on",
      testId: "grounding-toggle",
    });
  if (onToggleOpaque && model)
    toggles.push({
      key: "opaque",
      label: "Opaque",
      pressed: opaque,
      onToggle: onToggleOpaque,
      title:
        "Opaque: the model seen from outside — membrane, interfaces, crossings; interior hidden. Zoom out past the membrane to enter, zoom in to leave (⌃⌥O)",
      testId: "view-opaque-toggle",
    });
  toggles.push({
    key: "focus",
    label: "Focus",
    pressed: focus,
    onToggle: onToggleFocus,
    title: focus ? "Exit Focus (Esc)" : "Focus: the primary surface fills the window (⌃⌥F)",
  });
  return (
    <div
      className="relative z-50 flex h-8 shrink-0 items-center gap-3 border-t px-3 text-[11px] whitespace-nowrap"
      style={{ borderColor: "var(--hairline)", background: "var(--bg-secondary)", color: "var(--text-muted)" }}
      data-testid="status-bar"
    >
      {model && (
        <>
          <button
            type="button"
            onClick={onVerdict}
            className="flex h-7 shrink-0 items-center rounded-sm"
            title={`The kernel's verdict at ${MODE_BY_LENS[model.lens]} mode under ${model.lens}. Opens Read.`}
            data-testid="verdict-chip"
          >
            <Pill
              pill
              tone={verdict === null ? "neutral" : clean ? "ok" : "warning"}
              icon={verdict === null ? undefined : clean ? "ok" : "warning"}
            >
              {verdict === null
                ? "…"
                : clean
                  ? "clean"
                  : `${verdict.issues.length} issue${verdict.issues.length === 1 ? "" : "s"}`}
            </Pill>
          </button>
          <span className="min-w-0 truncate">
            {model.things.length} thing{model.things.length === 1 ? "" : "s"} · {model.relations.length} relation
            {model.relations.length === 1 ? "" : "s"}
          </span>
          <span className="shrink-0" style={{ color: faults > 0 ? "var(--verdict-error)" : undefined }}>
            {compileState}
          </span>
        </>
      )}
      <span className="ml-auto flex shrink-0 items-center gap-2">
        {narrow ? (
          <Menu icon="menu" aria-label="View options" title="Sheet, overlays and Focus" align="end" size={28}>
            {toggles.map((t) => (
              <MenuItem key={t.key} role="menuitemcheckbox" checked={t.pressed} icon={t.icon} onSelect={t.onToggle} title={t.title}>
                {t.key === "secondary" ? `${t.label} sheet` : t.label}
              </MenuItem>
            ))}
          </Menu>
        ) : (
          toggles.map((t) => (
            <Button
              key={t.key}
              size={28}
              variant="quiet"
              className="chrome-toggle"
              onClick={t.onToggle}
              aria-pressed={t.pressed}
              title={t.title}
              data-testid={t.testId}
            >
              {t.label}
            </Button>
          ))
        )}
        {!narrow && (
          <span
            className="ml-1 inline-flex items-center gap-1.5"
            style={{ fontFamily: "var(--font-mono)" }}
            title="crates/ = truth · web/ = face"
          >
            {kernelLoaded && <Icon name="ok" size={16} style={{ color: "var(--accent)" }} />}
            {kernelLoaded ? "kernel · wasm" : "loading…"} · SL v{SL_VERSION}
          </span>
        )}
      </span>
    </div>
  );
}
