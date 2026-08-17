// The param control (run-legibility ws3) — one declared, ranged parameter as
// a slider + number unit. ONE param behavior, wherever a param appears: the
// run rail's inputs card and the canvas EdgePopover mount this identically,
// and both commit through the same relation-update path (the edited document
// re-runs; ADR run-seam-canvas-document). No systems fact is decided here.
import { useEffect, useState } from "react";
import type { ParamDecl, Relation } from "./kernel/types";

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
    <input
      className="w-20 rounded border px-1.5 py-0.5 text-right font-mono text-xs"
      style={{ borderColor: "var(--border)", background: "var(--bg-primary)", color: "var(--text-primary)" }}
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

/** A range slider + number field over one flow-anchored param. The slider
 *  commits on release (not per-tick), routing through the same relation-update
 *  path as every other edit. */
export function ParamControl({
  param,
  relation,
  forcedBy,
  onEdit,
}: {
  param: ParamDecl;
  relation: Relation;
  forcedBy?: string;
  onEdit: (next: Relation) => void;
}) {
  const [drag, setDrag] = useState<number | null>(null);
  const min = Number(param.range?.min ?? 0);
  const max = Number(param.range?.max ?? 0);
  const value = drag ?? Number(relation.amount ?? 0);
  const commit = () => {
    if (drag !== null && String(drag) !== relation.amount) {
      onEdit({ ...relation, amount: String(drag) });
    }
    setDrag(null);
  };
  useCommitOnRelease(drag !== null, commit);
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
        ) : (
          <AmountField relation={relation} onEdit={onEdit} />
        )}
        <span className="w-16 shrink-0 text-[11px]" style={{ color: "var(--text-muted)" }}>
          {relation.unit ?? ""}
        </span>
      </div>
      {!forcedBy && param.range && (
        <input
          type="range"
          className="mt-0.5 block w-full"
          min={min}
          max={max}
          step={(max - min) / 200 || 1}
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
