// Read's one sheet (#409 M3). The readings of the model in the order a reader
// wants them: the review first, then the formal object as count rows that
// open, then the analyst. A selected element narrows the sheet to it, with
// its details at the top and the notes about it alone; the whole model is one
// click back. Every value is the kernel's (verdict, describe) or a plain
// reading of the compiled model; the sheet decides nothing.
import { useState } from "react";
import { AnalystPanel } from "./AnalystPanel";
import type { CanvasModel, IssueTarget, LensDescription, ValidationResult } from "./kernel/types";
import { ReviewPanel } from "./ReviewPanel";
import { thingKind, thingStamps } from "./WriteMargin";
import { Card } from "./ui";
import { openExternal } from "./desktop";

export type FormalRow = { label: string; value: string; items?: string[] };

/** The formal object as count rows, one per slot of the lens's signature.
 *  A row with `items` opens to list them. The same facts FormalPanel typesets
 *  in full; this is the reading at a glance. */
export function formalRows(d: LensDescription): FormalRow[] {
  switch (d.lens) {
    case "Klir":
      return [
        { label: "T", value: `${d.things} thing${d.things === 1 ? "" : "s"}` },
        {
          label: "R",
          value: `${d.relations} relation${d.relations === 1 ? "" : "s"} · ${d.directed} directed, ${d.neutral} neutral`,
          items: d.dependencies,
        },
        ...(d.level ? [{ label: "level", value: d.level }] : []),
      ];
    case "Bunge":
      return [
        { label: "C", value: `${d.composition.length} in the composition`, items: d.composition },
        { label: "E", value: `${d.environment.length} in the environment`, items: d.environment },
        { label: "S", value: `${d.endostructure} endo · ${d.exostructure} exo · bondage ${d.bondage}`, items: [...d.endo_bonds, ...d.exo_bonds] },
        { label: "∂C", value: `${d.boundary_components.length} boundary component${d.boundary_components.length === 1 ? "" : "s"}`, items: d.boundary_components },
        { label: "M", value: d.mechanism_note },
      ];
    case "Mobus":
      return [
        { label: "C", value: `${d.c.length} component${d.c.length === 1 ? "" : "s"}`, items: d.c },
        { label: "N", value: `${d.n} internal flow${d.n === 1 ? "" : "s"}` },
        { label: "E", value: `${d.e_objects.length} environment object${d.e_objects.length === 1 ? "" : "s"} · ${d.milieu_note}`, items: d.e_objects },
        { label: "G", value: `${d.g} external flow${d.g === 1 ? "" : "s"}` },
        { label: "B", value: `${d.b_interfaces.length} interface${d.b_interfaces.length === 1 ? "" : "s"} · porosity ${d.porosity.toFixed(2)} · fuzziness ${d.perceptive_fuzziness.toFixed(2)}`, items: d.b_interfaces },
        { label: "T", value: d.t_note },
        { label: "H", value: d.h_note },
        { label: "Δt", value: d.dt_note },
      ];
  }
}

/** The review narrowed to one element: the issues whose target is it, with
 *  their targets kept aligned by index (ReviewPanel reads them in step). */
export function narrowReview(
  verdict: ValidationResult,
  targets: IssueTarget[],
  sel: { thing: number | null; relation: number | null },
): { verdict: ValidationResult; targets: IssueTarget[] } {
  const keep = verdict.issues
    .map((issue, i) => ({ issue, target: targets[i] }))
    .filter(({ target }) => {
      if (!target) return false;
      if (sel.thing !== null) return target.thing === sel.thing;
      if (sel.relation !== null) return target.relation === sel.relation;
      return true;
    });
  return { verdict: { ...verdict, issues: keep.map((k) => k.issue) }, targets: keep.map((k) => k.target) };
}

const PROVENANCE_URL = "https://math.systems";

function Row({ row }: { row: FormalRow }) {
  const [open, setOpen] = useState(false);
  const canOpen = row.items !== undefined && row.items.length > 0;
  return (
    <div className="border-b py-1.5 text-xs" style={{ borderColor: "var(--hairline)" }}>
      <button
        onClick={canOpen ? () => setOpen((o) => !o) : undefined}
        aria-expanded={canOpen ? open : undefined}
        className={`flex w-full items-baseline gap-3 text-left${canOpen ? "" : " cursor-default"}`}
      >
        <span className="w-8 shrink-0 font-mono" style={{ color: "var(--lens-accent)" }}>
          {row.label}
        </span>
        <span className="min-w-0 flex-1" style={{ color: "var(--text-secondary)" }}>
          {row.value}
        </span>
        {canOpen && (
          <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
            {open ? "▾" : "▸"}
          </span>
        )}
      </button>
      {open && row.items && (
        <ul className="mt-1 pl-11 text-[11px]" style={{ color: "var(--text-secondary)" }}>
          {row.items.map((it, i) => (
            <li key={i}>{it}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function ReadSheet({
  model,
  desc,
  verdict,
  issueTargets,
  analysisError,
  reviewedAt,
  onReview,
  onNavigate,
  onHover,
  selection,
  onClearSelection,
}: {
  model: CanvasModel;
  desc: LensDescription | null;
  verdict: ValidationResult | null;
  issueTargets: IssueTarget[];
  analysisError: string | null;
  reviewedAt: string | null;
  onReview: () => void;
  onNavigate: (target: IssueTarget) => void;
  onHover: (target: IssueTarget | null) => void;
  selection: { thing: number | null; relation: number | null };
  onClearSelection: () => void;
}) {
  const [provenance, setProvenance] = useState(false);
  const thing = selection.thing !== null ? model.things.find((t) => t.id === selection.thing) ?? null : null;
  const relation = selection.relation !== null ? model.relations.find((r) => r.id === selection.relation) ?? null : null;
  const narrowed = thing !== null || relation !== null;
  const review = verdict && narrowed ? narrowReview(verdict, issueTargets, selection) : { verdict, targets: issueTargets };
  const nameOf = (id: number) => model.things.find((t) => t.id === id)?.name ?? "?";

  return (
    <aside
      className="flex min-w-80 shrink basis-[32rem] flex-col gap-4 overflow-y-auto border-l p-4"
      style={{ borderColor: "var(--hairline)", background: "var(--lens-chrome)" }}
      data-testid="read-sheet"
    >
      {narrowed && (
        <Card
          title={thing ? thing.name : relation ? relation.name || "unlabeled flow" : ""}
          source={thing ? thingKind(thing) : "flow"}
          actions={
            <button onClick={onClearSelection} className="text-[11px] underline" style={{ color: "var(--text-muted)" }}>
              whole model
            </button>
          }
        >
          <div className="flex flex-col gap-1 text-xs" style={{ color: "var(--text-secondary)" }} data-testid="read-element">
            {thing && thingStamps(thing).length > 0 && <p style={{ color: "var(--text-muted)" }}>{thingStamps(thing).join(" · ")}</p>}
            {thing && thing.description && <p>{thing.description}</p>}
            {thing && (
              <>
                <p>
                  in:{" "}
                  {model.relations.filter((r) => r.b === thing.id).map((r) => `${nameOf(r.a)} (${r.name || "unlabeled"})`).join(", ") || "none"}
                </p>
                <p>
                  out:{" "}
                  {model.relations.filter((r) => r.a === thing.id).map((r) => `${nameOf(r.b)} (${r.name || "unlabeled"})`).join(", ") || "none"}
                </p>
              </>
            )}
            {relation && (
              <p>
                {nameOf(relation.a)} → {nameOf(relation.b)}
                {relation.usability ? ` · ${relation.usability.toLowerCase()}` : ""}
              </p>
            )}
            {relation && relation.description && <p>{relation.description}</p>}
          </div>
        </Card>
      )}

      {review.verdict && !analysisError ? (
        <ReviewPanel
          model={model}
          validation={review.verdict}
          targets={review.targets}
          reviewedAt={reviewedAt}
          onReview={onReview}
          onNavigate={onNavigate}
          onHover={onHover}
        />
      ) : (
        <Card title="Review">
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            {analysisError ?? "No verdict yet."}
          </p>
        </Card>
      )}

      <Card title="The formal object" source={desc ? `${desc.lens} · describe(model, lens)` : "no formal object yet"}>
        {desc && (
          <div data-testid="formal-rows">
            {formalRows(desc).map((row) => (
              <Row key={row.label} row={row} />
            ))}
            <button
              onClick={() => setProvenance((p) => !p)}
              aria-expanded={provenance}
              className="mt-2 text-[11px] underline"
              style={{ color: "var(--text-muted)" }}
            >
              where this comes from
            </button>
            {provenance && (
              <p className="mt-1 text-[11px] leading-snug" style={{ color: "var(--text-muted)" }}>
                The object is the kernel's describe(model, lens), in the browser as wasm. Under Mobus, E as a
                first-class slot is the Lean formalization's addition; the book prints the seven-tuple
                ⟨C, N, G, B, T, H, Δt⟩. The formal side, with what it does and does not establish:{" "}
                <a href={PROVENANCE_URL} target="_blank" rel="noreferrer" onClick={openExternal} className="underline">
                  math.systems ↗
                </a>
              </p>
            )}
          </div>
        )}
      </Card>

      <AnalystPanel canvasModel={model} onNavigate={onNavigate} />
    </aside>
  );
}
