// #10 — the resident co-author, folded into the SL pane as a MODE (locked
// 2026-07-24: not a dock tab). The pane's manual-authoring surface (textarea +
// Compile) is unchanged and always reachable; this mode is the second way to
// fill the SAME SL text — describe a system, the drafter proposes SL, the
// existing Compile/preview/accept flow takes over once the pane switches back
// to the SL view. One-shot per turn (no session memory across drafts,
// deliberately deferred); history persists across reloads (coauthor.ts,
// localStorage, no cap).
import { useEffect, useRef, useState } from "react";
import type { CoauthorTurn, DraftStage } from "./coauthor";
import { ReasonerGate } from "./ReasonerGate";
import { isLoopback, reasonerConfig, setReasonerConfig, subscribeReasoner } from "./reasoner";
import { DRAFTER_MODELS, drafterModel, drafterModelWhere, setDrafterModel, subscribeDrafterModel } from "./drafterModel";
import { Pill } from "./ui";

type Tone = "neutral" | "ok" | "warning" | "error";

// #218: name the stage instead of a static "Drafting…" — asking is the only
// place a model name is safe to state, since it is the one case the endpoint
// tells us the model without guessing (AnalystPanel's own "Local (gemma4)"
// labels the same "" = local-default convention). #229 narrowed the test from
// "not the hosted endpoint" to "on this machine": a reasoner the user runs
// elsewhere serves whatever they configured, so its model is NOT named here
// rather than invented.
export function stageLabel(stage: DraftStage | null, endpoint: string, requested = ""): string {
  if (!stage) return "Drafting…";
  switch (stage.kind) {
    case "asking":
      // A named choice is stated as an ASK, never as a fact about who answered:
      // which model answered is known only once the response is in hand, and
      // the two differ whenever the reasoner cannot reach the named one.
      if (requested) return `Asking the reasoner for ${requested}…`;
      return isLoopback(endpoint) ? "Asking the local reasoner (gemma4)…" : "Asking your reasoner…";
    case "compiling":
      return "Compiling the draft…";
    case "retrying":
      return `Draft did not compile, retrying (${stage.attempt} of ${stage.maxAttempts})…`;
  }
}

/** Who wrote this draft and how long it took, taken from the reasoner's own
 *  response. A turn that never reached a model has nothing to report; a
 *  response that named no model says so rather than borrowing the requested
 *  name; a reasoner that reported no time gets no time printed, since 0 s
 *  would be a lie about a call that took a minute.
 *
 *  The time is the TURN's total model time, so a retried turn's number is not
 *  read as one call — the label names the call count whenever it is above one.
 *  The elapsed clock beside the Draft button is wall time and disappears when
 *  the turn lands; this is what remains in the record. */
export function drafterLine(
  turn: Pick<CoauthorTurn, "model" | "modelMs" | "modelCalls">,
): string | null {
  if (turn.model === undefined) return null;
  const who = turn.model ? `Drafted by ${turn.model}` : "The reasoner did not name the model that answered";
  if (turn.modelMs === undefined) return `${who}.`;
  const secs = (turn.modelMs / 1000).toFixed(1);
  if ((turn.modelCalls ?? 1) > 1) return `${who} in ${secs}s of model time over ${turn.modelCalls} calls.`;
  return `${who} in ${secs}s.`;
}

/** The honesty gate. GSR takes its cloud path only when it holds a key for the
 *  model asked for; without one the request still succeeds, on a model it can
 *  run. Nothing errors, so nothing but this line tells the author that the
 *  model they picked is not the model that wrote the draft in front of them.
 *  "" as the requested model is the reasoner's own default, which is a request
 *  for whatever it serves, so there is no mismatch to report. */
export function drafterMismatch(turn: Pick<CoauthorTurn, "model" | "requestedModel">): string | null {
  const answered = turn.model;
  const requested = turn.requestedModel;
  if (!answered || !requested || answered === requested) return null;
  return (
    `Asked for ${requested}. Answered by ${answered}. ` +
    `The reasoner takes its cloud path only when it holds a key for the model asked for, ` +
    `so ${answered} wrote this draft.`
  );
}

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

export function CoAuthorMode({
  turns,
  onDraft,
  onLoad,
}: {
  turns: CoauthorTurn[];
  /** Description -> draft -> compile -> preview, recorded as a new turn.
   *  Owned by the parent so accept/discard (fired from the canvas banner)
   *  can update the SAME turn's status. `onStage` (#218) reports the drafter
   *  loop's real progress — asking / compiling / retrying — as it happens. */
  onDraft: (description: string, onStage?: (stage: DraftStage) => void) => Promise<void>;
  /** Load a past turn's SL back into the pane's text (manual editing, or
   *  retrying an old draft) — switches the pane back to the SL view. */
  onLoad: (sl: string) => void;
}) {
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState<DraftStage | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const startedAtRef = useRef(0);
  // Off by default (#199). The gate below is the only enable point, and
  // enabling is the same act as choosing the endpoint.
  const [reasoner, setReasoner] = useState(reasonerConfig);
  useEffect(() => subscribeReasoner(setReasoner), []);
  // The drafting model is a stored preference (drafterModel.ts), not pane
  // state: App reads the same value when it fires the draft, so the pane and
  // the request cannot disagree about what was asked for.
  const [model, setModel] = useState(drafterModel);
  useEffect(() => subscribeDrafterModel(setModel), []);

  // Ticks once a second only while a draft call is in flight — a bounded
  // "38s" reads as progress, an unmoving label reads as a hang (#218 item 3).
  useEffect(() => {
    if (!busy) return;
    const id = setInterval(() => setElapsedMs(Date.now() - startedAtRef.current), 1000);
    return () => clearInterval(id);
  }, [busy]);

  async function draft() {
    if (!description.trim() || busy) return;
    startedAtRef.current = Date.now();
    setElapsedMs(0);
    setStage(null);
    setBusy(true);
    setError(null);
    try {
      await onDraft(description.trim(), setStage);
      setDescription("");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
      setStage(null);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b p-3" style={{ borderColor: "var(--hairline)" }}>
        <ReasonerGate
          config={reasoner}
          onChange={(next) => {
            setError(null);
            void setReasonerConfig(next);
          }}
        />
        {reasoner.enabled && (
          <>
            <p className="mb-2 text-[11px]" style={{ color: "var(--text-muted)" }}>
              Describe a system in plain language. The drafter writes SL into this
              pane's text; Compile/preview/accept is the same as hand-authoring.
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
              <div className="mt-1 text-xs" style={{ color: "var(--verdict-error)" }}>
                {error}
              </div>
            )}
            <label className="mt-2 flex flex-wrap items-center gap-2 text-[11px]" style={{ color: "var(--text-muted)" }}>
              <span>Drafts with</span>
              <select
                value={model}
                onChange={(e) => setDrafterModel(e.target.value)}
                disabled={busy}
                className="rounded px-1 py-0.5 text-[11px]"
                style={{ background: "var(--bg-primary)", color: "var(--text-secondary)", border: "1px solid var(--hairline)" }}
              >
                {DRAFTER_MODELS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <span>{drafterModelWhere(model) ?? ""}</span>
            </label>
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
              <span className="text-[11px]" style={{ color: "var(--text-muted)" }} data-testid="coauthor-stage">
                {busy
                  ? `${stageLabel(stage, reasoner.endpoint, model)} (${Math.floor(elapsedMs / 1000)}s)`
                  : "LLM proposes · kernel checks · you accept"}
              </span>
            </div>
          </>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        <h3 className="mb-2 text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
          History
        </h3>
        {turns.length === 0 ? (
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            No drafts yet — history persists across reloads.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {turns.map((t) => (
              <li
                key={t.id}
                className="rounded p-2 text-xs"
                style={{ background: "var(--bg-primary)", border: "1px solid var(--hairline)" }}
              >
                <div className="mb-1 flex items-center justify-between gap-2">
                  <Pill tone={statusTone(t.status)}>{statusLabel(t.status)}</Pill>
                  <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                    {new Date(t.at).toLocaleTimeString()}
                  </span>
                </div>
                <p className="mb-1" style={{ color: "var(--text-secondary)" }}>
                  {t.description}
                </p>
                {/* The answering model, never the requested one. When they
                    differ the turn says so in full: the request succeeded, so
                    this line is the only thing standing between the author and
                    believing a model that never ran wrote this. */}
                {drafterMismatch(t) && (
                  <p
                    className="mb-1 p-1 text-[10px]"
                    style={{ color: "var(--verdict-warning)", border: "1px solid var(--verdict-warning)" }}
                  >
                    {drafterMismatch(t)}
                  </p>
                )}
                {drafterLine(t) && (
                  <p className="mb-1 text-[10px]" style={{ color: "var(--text-muted)" }}>
                    {drafterLine(t)}
                  </p>
                )}
                {t.errorText && (
                  <pre
                    className="mb-1 whitespace-pre-wrap p-1 text-[10px]"
                    style={{ background: "var(--bg-secondary)", color: "var(--verdict-error)" }}
                  >
                    {t.errorText}
                  </pre>
                )}
                {t.sl && (
                  <>
                    <pre
                      className="mb-1 max-h-20 overflow-y-auto whitespace-pre-wrap p-1 font-mono text-[10px]"
                      style={{ background: "var(--bg-secondary)", color: "var(--text-secondary)" }}
                    >
                      {t.sl}
                    </pre>
                    <button
                      onClick={() => onLoad(t.sl)}
                      className="rounded-full px-2 py-0.5 text-[10px]"
                      style={{ border: "1px solid var(--hairline)", color: "var(--text-secondary)" }}
                      title="Load this draft's SL into the pane"
                    >
                      Load
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
