// The start surface over a new blank canvas. The shortest route to a working
// model is to say what the system is, so that is the one thing asked here: the
// description goes to the SL pane's co-author tab, which drafts it if the
// reasoner is on and otherwise shows its gate with the words kept (#199: this
// surface never turns the reasoner on). It replaced #77's name/type prompt; an
// SL header carries both of those fields, and the name's type panel edits them
// afterwards. Zero-gate like the prompt was: Escape, a click outside, or skip
// all land on the blank canvas.
//
// Makeover slice C (2026-10-26): it is a dialog in name as well as in shape
// (rule 15): `role="dialog"`, `aria-modal`, labelled by its heading, focus on
// the textarea when it opens and back on the opener when it closes, Tab held
// inside. The window is the Panel geometry (8px, a hairline, no shadow; rules
// 2, 3), the field is the Textarea primitive and the three ways out are
// Buttons at the 24px floor (rules 10, 11, 14).
import { useEffect, useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { isHosted, reasonerConfig, subscribeReasoner } from "./reasoner";
import { Button, Textarea } from "./ui";

const FOCUSABLE = 'button:not([disabled]), textarea, input, select, a[href], [tabindex]:not([tabindex="-1"])';

export function StartSurface({
  onDescribe,
  onSkip,
  onBuild,
  onOpenLibrary,
}: {
  /** Open the co-author tab on this description. */
  onDescribe: (description: string) => void;
  /** Leave for the blank canvas. */
  onSkip: () => void;
  /** Go to the canvas to build by hand (one-surface.md): "draw" for
   *  components and flows, "wire" for dropping process primitives and
   *  pressing Run. Absent, "Draw it by hand" falls back to skip. */
  onBuild?: (how: "draw" | "wire") => void;
  onOpenLibrary?: () => void;
}) {
  const [description, setDescription] = useState("");
  const [reasoner, setReasoner] = useState(reasonerConfig);
  useEffect(() => subscribeReasoner(setReasoner), []);
  const titleId = useId();
  const descId = useId();
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onSkip();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onSkip]);

  // Focus in on open (the textarea carries autoFocus), back to the opener on
  // close, the way ConfirmDialog does it.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
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

  const ready = description.trim() !== "";
  function describe() {
    if (ready) onDescribe(description.trim());
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-6"
      style={{ background: "color-mix(in srgb, var(--bg-primary) 70%, transparent)" }}
      onClick={onSkip}
      data-testid="start-surface"
    >
      <div
        ref={boxRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className="w-full max-w-lg rounded-md p-6"
        style={{ background: "var(--bg-secondary)", border: "1px solid var(--hairline)" }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={trapTab}
      >
        <div className="mb-2 flex items-center justify-between gap-4">
          {/* The name of the thing asked: Cormorant 700 at d3 (rule 5). */}
          <h2
            id={titleId}
            className="font-bold leading-tight"
            style={{ fontFamily: "var(--font-display)", fontSize: "var(--t-d3)", color: "var(--text-primary)" }}
          >
            Start your model
          </h2>
          <Button size={28} variant="quiet" onClick={onSkip}>
            skip
          </Button>
        </div>
        <p id={descId} className="mb-3 text-sm leading-5" style={{ color: "var(--text-secondary)" }}>
          Describe it in plain language and get a first draft to check, edit, and accept. Or build it on the canvas.
        </p>
        <Textarea
          value={description}
          autoFocus
          onChange={(e) => setDescription(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
              e.preventDefault();
              describe();
            }
          }}
          spellCheck
          rows={4}
          aria-label="Describe a system"
          className="w-full resize-none"
          placeholder="e.g. a home thermostat with a sensor, a controller, and a furnace"
        />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button onClick={describe} disabled={!ready} title="Draft a model from the description (⌘⏎)">
            Draft
          </Button>
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
            {reasoner.enabled
              ? `Drafts with ${isHosted(reasoner.endpoint) ? "the facets reasoner" : "your reasoner"}.`
              : "The co-author is off. You choose where it runs before anything is sent."}
          </span>
        </div>

        <div
          className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 border-t pt-3 text-xs"
          style={{ borderColor: "var(--hairline)", color: "var(--text-muted)" }}
        >
          <span>or</span>
          <Button size={28} variant="quiet" onClick={() => (onBuild ? onBuild("draw") : onSkip())}>
            Draw it by hand
          </Button>
          {onBuild && (
            <Button
              size={28}
              variant="quiet"
              onClick={() => onBuild("wire")}
              title="Drop process primitives from the rail, wire them, press Run"
            >
              Wire processes and run
            </Button>
          )}
          {onOpenLibrary && (
            <Button size={28} variant="quiet" onClick={onOpenLibrary}>
              Open an example
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
