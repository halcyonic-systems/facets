// The start surface over a new blank canvas: two ways in, nothing else
// (Shingai, 2026-11-02: "give them 2-3 options max ... with nice clean
// icons"). Build it lands on the canvas in Build; Describe it opens a field
// whose words go to the SL pane's co-author tab, which drafts them if the
// reasoner is on and otherwise shows its gate with the words kept (#199: this
// surface never turns the reasoner on). "Wire processes and run" is gone: it
// opened the same canvas with a notice, so it was Build under another name.
// Open an example stays as a quiet link, not a third card. Zero-gate: Escape,
// a click outside, or skip all land on the blank canvas.
//
// A dialog in name as well as in shape (charter rule 15): `role="dialog"`,
// `aria-modal`, labelled by its heading, focus on the first way in when it
// opens and back on the opener when it closes, Tab held inside. Panel
// geometry (8px, a hairline, no shadow; rules 2, 3); the two cards are the
// Home doors' outlined twin with the drawn door icons in a tinted well
// (rules 9c, 14).
import { useEffect, useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { isHosted, reasonerConfig, subscribeReasoner } from "./reasoner";
import { Button, Textarea } from "./ui";
import { Icon, type IconName } from "./icons";

const FOCUSABLE = 'button:not([disabled]), textarea, input, select, a[href], [tabindex]:not([tabindex="-1"])';

export function StartSurface({
  onDescribe,
  onSkip,
  onBuild,
  onOpenLibrary,
  initialStep = "choose",
}: {
  /** Open the co-author tab on this description. */
  onDescribe: (description: string) => void;
  /** Leave for the blank canvas. */
  onSkip: () => void;
  /** Go to the canvas to build by hand. Absent, Build it falls back to skip. */
  onBuild?: () => void;
  onOpenLibrary?: () => void;
  /** Open on the describe field instead of the two cards (tests, and any
   *  door that has already chosen to describe). */
  initialStep?: "choose" | "describe";
}) {
  const [step, setStep] = useState<"choose" | "describe">(initialStep);
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

  // Focus in on open (the first card, or the field, carries autoFocus), back to the opener on
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
        <p id={descId} className="mb-4 text-sm leading-5" style={{ color: "var(--text-secondary)" }}>
          {step === "choose"
            ? "Build it on the canvas, or describe it in plain words and get a first draft to check."
            : "Say what the system is in plain words. You get a first draft to check, edit, and accept."}
        </p>
        {step === "choose" ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <WayIn
              icon="draw"
              title="Build it"
              line="Name the system, place its parts, draw the flows."
              autoFocus
              onClick={() => (onBuild ? onBuild() : onSkip())}
            />
            <WayIn
              icon="describe"
              title="Describe it"
              line="Write what it is; the co-author drafts the model."
              onClick={() => setStep("describe")}
            />
          </div>
        ) : (
          <>
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
              <Button size={28} variant="quiet" onClick={() => setStep("choose")}>
                back
              </Button>
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                {reasoner.enabled
                  ? `Drafts with ${isHosted(reasoner.endpoint) ? "the facets reasoner" : "your reasoner"}.`
                  : "The co-author is off. You choose where it runs before anything is sent."}
              </span>
            </div>
          </>
        )}
        {onOpenLibrary && step === "choose" && (
          <div className="mt-4 text-xs" style={{ color: "var(--text-muted)" }}>
            <Button size={28} variant="quiet" onClick={onOpenLibrary}>
              or open an example
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

/** One way in: an outlined card with the drawn door icon in a tinted well,
 *  a name, and one line on what happens next. */
function WayIn({
  icon,
  title,
  line,
  onClick,
  autoFocus,
}: {
  icon: IconName;
  title: string;
  line: string;
  onClick: () => void;
  autoFocus?: boolean;
}) {
  return (
    <button
      type="button"
      autoFocus={autoFocus}
      onClick={onClick}
      className="home-door home-door-secondary flex min-h-24 flex-col items-start gap-2 rounded-sm p-4 text-left"
    >
      <span
        className="inline-flex h-10 w-10 items-center justify-center rounded-sm"
        style={{ background: "var(--accent-soft)", color: "var(--accent)", border: "1px solid var(--accent)" }}
        aria-hidden="true"
      >
        <Icon name={icon} size={24} />
      </span>
      <span className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
        {title}
      </span>
      <span className="text-xs leading-snug" style={{ color: "var(--text-secondary)" }}>
        {line}
      </span>
    </button>
  );
}
