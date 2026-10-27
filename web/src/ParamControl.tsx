// The param control (run-legibility ws3) — one declared, ranged parameter as
// a slider + number unit. ONE param behavior, wherever a param appears: the
// run rail's inputs card and the canvas EdgePopover mount this identically,
// and both commit through the same relation-update path (the edited document
// re-runs; ADR run-seam-canvas-document). No systems fact is decided here.
import { useEffect, useState } from "react";
import type { ParamDecl, Relation } from "./kernel/types";
import { Input } from "./ui";

/** While a slider drag preview is live, ANY pointer release commits it — the
 *  element's own events miss a release that lands outside it, and a missed
 *  commit leaves a phantom preview value on screen (several rows can then show
 *  impossible percentages at once, which is how this was caught). Re-registers
 *  every render so the handler always closes over the current drag value. */
export function useCommitOnRelease(active: boolean, commit: () => void) {
  useEffect(() => {
    if (!active) return;
    window.addEventListener("pointerup", commit);
    return () => window.removeEventListener("pointerup", commit);
  });
}

export function AmountField({
  relation,
  onEdit,
}: {
  relation: Relation;
  onEdit: (next: Relation) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const commit = () => {
    if (draft === null) return;
    const v = Number(draft);
    if (Number.isFinite(v) && v >= 0 && draft.trim() !== "" && String(v) !== relation.amount) {
      onEdit({ ...relation, amount: String(v) });
    }
    setDraft(null);
  };
  return (
    <Input
      className="w-24 text-right font-mono tabular"
      value={draft ?? relation.amount ?? ""}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        if (e.key === "Escape") setDraft(null);
      }}
      aria-label={`amount of ${relation.name}`}
    />
  );
}

/** The slider's step for a declared range: whole units when the range is
 *  declared in whole numbers and wide enough to drag by them (a release in
 *  litres a day reads as 30, not 30.2000007), otherwise 1/200 of the span.
 *  Commits are rounded to the step so a drag never leaves a float tail. */
export function sliderStep(min: number, max: number): number {
  const span = max - min;
  if (!(span > 0)) return 1;
  if (Number.isInteger(min) && Number.isInteger(max) && span >= 20) return 1;
  return span / 200;
}

export function snapToStep(v: number, step: number): number {
  const digits = Math.max(0, Math.ceil(-Math.log10(step)));
  return Number((Math.round(v / step) * step).toFixed(digits));
}

/** A range slider + number field over one flow-anchored param. The slider
 *  commits on release (not per-tick), routing through the same relation-update
 *  path as every other edit. */
/** The lock a knob an agent drives shows in place of its editor (ADR 0008
 *  D1): the same styling as a data-driven flow, because the same thing is
 *  true of it — a series, here the policy's, and not a scalar, is what runs. */
export function SetByAgent({ agent }: { agent: string }) {
  return (
    <span
      className="shrink-0 font-mono text-[11px]"
      style={{ color: "var(--text-muted)" }}
      title={`This knob is written by the agent “${agent}” at the end of every tick — the policy's command, not a scalar, is what runs. Edit the agent's rule instead.`}
      data-testid="set-by-agent"
    >
      set by “{agent}”
    </span>
  );
}

export function ParamControl({
  param,
  relation,
  forcedBy,
  setBy,
  onEdit,
}: {
  param: ParamDecl;
  relation: Relation;
  forcedBy?: string;
  /** The command-form agent writing this knob each tick, if one does. */
  setBy?: string;
  onEdit: (next: Relation) => void;
}) {
  const [drag, setDrag] = useState<number | null>(null);
  const min = Number(param.range?.min ?? 0);
  const max = Number(param.range?.max ?? 0);
  const step = sliderStep(min, max);
  const value = drag ?? Number(relation.amount ?? 0);
  const commit = () => {
    if (drag !== null) {
      const v = snapToStep(drag, step);
      if (String(v) !== relation.amount) onEdit({ ...relation, amount: String(v) });
    }
    setDrag(null);
  };
  useCommitOnRelease(drag !== null, commit);
  const locked = Boolean(forcedBy || setBy);
  return (
    <div className="py-0.5">
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="min-w-0 flex-1 truncate" style={{ color: "var(--text-primary)" }} title={relation.name}>
          {param.name}
        </span>
        {forcedBy ? (
          <span
            className="shrink-0 font-mono text-[11px]"
            style={{ color: "var(--text-muted)" }}
            title={`This flow is driven by the data column “${forcedBy}” — the series, not a scalar, is what runs.`}
          >
            driven by “{forcedBy}”
          </span>
        ) : setBy ? (
          <SetByAgent agent={setBy} />
        ) : (
          <AmountField relation={relation} onEdit={onEdit} />
        )}
        <span className="w-16 shrink-0 text-[11px]" style={{ color: "var(--text-muted)" }}>
          {relation.unit ?? ""}
        </span>
      </div>
      {!locked && param.range && (
        <input
          type="range"
          className="mt-0.5 block w-full"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => setDrag(Number(e.target.value))}
          onPointerUp={commit}
          onLostPointerCapture={commit}
          onBlur={commit}
          onKeyUp={commit}
          aria-label={param.name}
        />
      )}
    </div>
  );
}
