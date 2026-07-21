// The new-model first step (#77): asserting the model's kind IS the opening
// authoring act, so on "Start blank" we offer a gentle, skippable prompt for
// the SOI name (#84) + system type (#71) before the canvas. It writes only
// model.name and model.system_type — never structure. Deliberately zero-gate:
// Skip is a first-class button (we just removed file friction in #70), and
// every field stays editable later via the Type tab. Genus gating and the
// kingdom/genus/domain fields are the same SystemTypeEditor the Type tab uses.
import { useState } from "react";
import type { SystemType } from "./kernel/types";
import { SystemTypeEditor } from "./SystemTypeEditor";

const fieldStyle = {
  border: "1px solid var(--border)",
  background: "var(--bg-primary)",
  color: "var(--text-primary)",
} as const;

export function NewModelTypePrompt({
  onApply,
  onSkip,
}: {
  /** name and type as authored; empty/undefined fields are simply not set. */
  onApply: (name: string | undefined, systemType: SystemType | undefined) => void;
  onSkip: () => void;
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState<SystemType>({});

  function apply() {
    const trimmed = name.trim();
    const hasType = type.kingdom || type.genus || type.domain;
    onApply(trimmed || undefined, hasType ? type : undefined);
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-6"
      style={{ background: "color-mix(in srgb, var(--bg-primary) 70%, transparent)" }}
      onClick={onSkip}
    >
      <div
        className="w-full max-w-lg p-6"
        style={{
          background: "var(--bg-secondary)",
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow-card-hover)",
          borderRadius: "var(--radius-card)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-1 flex items-baseline justify-between">
          <h2 className="text-lg font-semibold" style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
            What are you modeling?
          </h2>
          <button onClick={onSkip} className="text-xs" style={{ color: "var(--text-muted)" }}>
            skip
          </button>
        </div>
        <p className="mb-4 text-xs" style={{ color: "var(--text-muted)" }}>
          Naming the system and its kind is the first authoring act. Optional — you can skip and set it
          later from the Type tab.
        </p>

        <div className="grid gap-4">
          <label className="grid gap-1 text-xs" style={{ color: "var(--text-secondary)" }}>
            System name (optional)
            <input
              value={name}
              autoFocus
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && apply()}
              placeholder="e.g. U.S. legislative process"
              className="rounded-md px-2 py-1 text-sm"
              style={fieldStyle}
            />
          </label>

          <SystemTypeEditor value={type} onChange={setType} />
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            onClick={onSkip}
            className="rounded-full px-4 py-1.5 text-sm font-body"
            style={{ background: "var(--bg-surface)", color: "var(--text-secondary)", border: "1px solid var(--hairline)" }}
          >
            Skip
          </button>
          <button
            onClick={apply}
            className="rounded-full px-5 py-1.5 text-sm font-semibold"
            style={{ background: "var(--accent)", color: "var(--text-on-accent)" }}
          >
            Start authoring
          </button>
        </div>
      </div>
    </div>
  );
}
