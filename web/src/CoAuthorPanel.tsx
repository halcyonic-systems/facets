// #10 — the resident co-author window. Docked as an InspectorDock tab (so it
// gets the existing collapse/focus chrome for free), it stays mounted for the
// life of the loaded model — unlike the SL pane's inline "Draft" box (#9/#10
// spike), which is local state that disappears when the SL pane closes. The
// window's job is history + framing around the SAME draft→preview→accept loop
// SlPane already drives: it does not compile, preview, or judge legality
// itself — `App`'s `onSlCompiled` (Rung 0) and the global preview banner own
// that, so accept/discard here and in the SL pane are literally one gate.
//
// FLAGGED FOR SHINGAI (see PR description "Product decisions" — not finalized
// here): whether this dock tab is the window's permanent shape vs a standalone
// panel/modal; whether it's conversational (multi-turn context) or one-shot
// commands re-run each time (current: one-shot, no memory of prior turns
// beyond the visible history); how much history to keep / whether to persist
// it across reloads; whether it replaces the SL pane's inline Draft box or the
// two coexist.
import { useState } from "react";
import type { CoauthorTurn } from "./coauthor";
import { Card, Pill } from "./ui";

type Tone = "neutral" | "ok" | "warning" | "error";

function statusTone(status: CoauthorTurn["status"]): Tone {
  switch (status) {
    case "accepted":
      return "ok";
    case "discarded":
      return "neutral";
    case "previewing":
      return "warning";
    default:
      return "error";
  }
}

function statusLabel(status: CoauthorTurn["status"]): string {
  switch (status) {
    case "previewing":
      return "previewing";
    case "accepted":
      return "accepted";
    case "discarded":
      return "discarded";
    case "compile-error":
      return "kernel rejected";
    case "network-error":
      return "drafter unreachable";
  }
}

export function CoAuthorPanel({
  turns,
  onDraft,
  onReopenInSlPane,
}: {
  turns: CoauthorTurn[];
  /** Description -> draft -> compile -> preview, recorded as a new turn.
   *  Owned by the parent so accept/discard (fired from the canvas banner)
   *  can update the SAME turn's status. */
  onDraft: (description: string) => Promise<void>;
  /** Hand a past turn's SL to the SL pane for manual editing before
   *  re-compiling — the escape hatch when a draft is close but not quite. */
  onReopenInSlPane: (sl: string) => void;
}) {
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function draft() {
    if (!description.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      await onDraft(description.trim());
      setDescription("");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card title="Co-author" source="GSR · author-sl">
        <p className="mb-3 text-xs" style={{ color: "var(--text-muted)" }}>
          Describe a system in plain language. The drafter writes SL, the
          kernel compiles it to a preview on the canvas, and you accept or
          discard — same gate as the SL pane's Draft button, resident here so
          the history of what you tried survives switching tabs.
        </p>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
              e.preventDefault();
              draft();
            }
          }}
          disabled={busy}
          spellCheck
          rows={3}
          className="w-full resize-none rounded p-2 text-xs outline-none"
          style={{ background: "var(--bg-primary)", color: "var(--text-secondary)", border: "1px solid var(--hairline)" }}
          placeholder="e.g. a home thermostat with a sensor, a controller, and a furnace"
        />
        {error && (
          <div className="mt-2 text-xs" style={{ color: "var(--verdict-error)" }}>
            {error}
          </div>
        )}
        <div className="mt-2 flex items-center gap-2">
          <button
            onClick={draft}
            disabled={busy || !description.trim()}
            className="rounded-full px-3 py-1 text-xs font-semibold"
            style={{
              background: "var(--accent)",
              color: "var(--text-on-accent)",
              opacity: busy || !description.trim() ? 0.5 : 1,
              cursor: busy || !description.trim() ? "not-allowed" : "pointer",
            }}
            title="Draft SL from the description (⌘⏎)"
          >
            {busy ? "Drafting…" : "Draft"}
          </button>
          <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
            LLM proposes · kernel checks · you accept
          </span>
        </div>
      </Card>

      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
          History
        </h3>
        {turns.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            No drafts yet this session.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {turns.map((t) => (
              <li key={t.id}>
                <Card>
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <Pill tone={statusTone(t.status)}>{statusLabel(t.status)}</Pill>
                    <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                      {new Date(t.at).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="mb-2 text-sm" style={{ color: "var(--text-secondary)" }}>
                    {t.description}
                  </p>
                  {t.errorText && (
                    <pre
                      className="mb-2 whitespace-pre-wrap p-2 text-[11px]"
                      style={{ background: "var(--bg-primary)", color: "var(--verdict-error)", borderRadius: "var(--radius-card)" }}
                    >
                      {t.errorText}
                    </pre>
                  )}
                  {t.sl && (
                    <>
                      <pre
                        className="mb-2 max-h-32 overflow-y-auto whitespace-pre-wrap p-2 font-mono text-[11px]"
                        style={{ background: "var(--bg-primary)", color: "var(--text-secondary)", borderRadius: "var(--radius-card)" }}
                      >
                        {t.sl}
                      </pre>
                      <button
                        onClick={() => onReopenInSlPane(t.sl)}
                        className="rounded-full px-3 py-1 text-[11px]"
                        style={{ border: "1px solid var(--hairline)", color: "var(--text-secondary)" }}
                        title="Open this draft's SL in the SL pane for manual editing"
                      >
                        Reopen in SL pane
                      </button>
                    </>
                  )}
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
