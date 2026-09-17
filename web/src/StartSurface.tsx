// The start surface over a new blank canvas. The shortest route to a working
// model is to say what the system is, so that is the one thing asked here: the
// description goes to the SL pane's co-author tab, which drafts it if the
// reasoner is on and otherwise shows its gate with the words kept (#199: this
// surface never turns the reasoner on). It replaced #77's name/type prompt; an
// SL header carries both of those fields, and the name's type panel edits them
// afterwards. Zero-gate like the prompt was: Escape, a click outside, or skip
// all land on the blank canvas.
import { useEffect, useState } from "react";
import { isHosted, reasonerConfig, subscribeReasoner } from "./reasoner";

export function StartSurface({
  onDescribe,
  onSkip,
  onStartFromData,
  onOpenLibrary,
}: {
  /** Open the co-author tab on this description. */
  onDescribe: (description: string) => void;
  /** Leave for the blank canvas. */
  onSkip: () => void;
  onStartFromData?: () => void;
  onOpenLibrary?: () => void;
}) {
  const [description, setDescription] = useState("");
  const [reasoner, setReasoner] = useState(reasonerConfig);
  useEffect(() => subscribeReasoner(setReasoner), []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onSkip();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onSkip]);

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
        className="w-full max-w-lg p-6"
        style={{
          background: "var(--bg-secondary)",
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow-card-hover)",
          borderRadius: "var(--radius-md)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 flex items-baseline justify-between">
          <h2 className="text-lg font-semibold" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
            Describe a system
          </h2>
          <button onClick={onSkip} className="text-xs" style={{ color: "var(--text-muted)" }}>
            skip
          </button>
        </div>
        <p className="mb-3 text-xs" style={{ color: "var(--text-secondary)" }}>
          Say what it is in plain language. You get a first draft to check, edit, and accept.
        </p>
        <textarea
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
          className="w-full resize-none rounded-md p-2 text-sm outline-none"
          style={{ border: "1px solid var(--border)", background: "var(--bg-primary)", color: "var(--text-primary)" }}
          placeholder="e.g. a home thermostat with a sensor, a controller, and a furnace"
        />
        <div className="mt-3 flex items-center gap-3">
          <button
            onClick={describe}
            disabled={!ready}
            className="rounded-full px-5 py-1.5 text-sm font-semibold"
            style={{
              background: "var(--accent)",
              color: "var(--text-on-accent)",
              opacity: ready ? 1 : 0.5,
              cursor: ready ? "pointer" : "not-allowed",
            }}
            title="Draft a model from the description (⌘⏎)"
          >
            Draft
          </button>
          <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
            {reasoner.enabled
              ? `Drafts with ${isHosted(reasoner.endpoint) ? "the facets reasoner" : "your reasoner"}.`
              : "The co-author is off. You choose where it runs before anything is sent."}
          </span>
        </div>

        <div
          className="mt-5 flex flex-wrap items-baseline gap-x-4 gap-y-1 border-t pt-3 text-xs"
          style={{ borderColor: "var(--hairline)", color: "var(--text-muted)" }}
        >
          <span>or</span>
          <button onClick={onSkip} className="underline" style={{ color: "var(--text-secondary)" }}>
            Draw it by hand
          </button>
          {onStartFromData && (
            <button onClick={onStartFromData} className="underline" style={{ color: "var(--text-secondary)" }}>
              Build from data
            </button>
          )}
          {onOpenLibrary && (
            <button onClick={onOpenLibrary} className="underline" style={{ color: "var(--text-secondary)" }}>
              Open an example
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
