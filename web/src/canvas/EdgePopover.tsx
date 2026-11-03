// Per-lens edge editing — the palette doc's "click a flow → do things" verbs,
// each lens offering ITS author's operations and no other's:
//   Klir:  toggle neutral ⇄ directed (the observer's act), read the signature.
//   Bunge: set connection-kind, toggle bond ⇄ mere relation, reverse direction.
//   Mobus: name, endpoints, amount, substance, description. Driving a flow
//          with data is Data/Run-mode business (#336); since the 2026-11-02
//          walk a source's rate or a process outflow's weight is set here,
//          where the flow is clicked.
// Every edit flows through onModelChange → App re-runs validate_mode +
// lens_facts in Rust; the popover itself decides nothing about systemhood.
import { useEffect, useRef, useState } from "react";
import type { EdgeFact, FlowKind, FlowKnob, Kind, Lens, Manifest, ParamDecl, Relation } from "../kernel/types";
import { channelCopy } from "./lenses/bunge";
import { AmountField, ParamControl } from "../ParamControl";
import type { Pt } from "./geometry";
import { DescriptionField, GroundingField, InspectorRow as Row, InspectorTitle as Title, Select, ToolButton as SmallButton } from "../ui";
import { DockOrPopover, useDocked } from "./PopoverDialog";
import {
  FormalismLine,
  SUBSTANCES,
  bungeFormalism,
  klirFormalism,
  kindToSubstance,
  substanceToKind,
  type Substance,
} from "./lenses/glossary";

/** A flow's amount as the popover edits it: the kernel's `flow_knobs` row
 *  (what an undeclared flow runs at), whether it is a split weight rather
 *  than a rate, and the input path that re-runs. */
export interface FlowAmount {
  knob?: FlowKnob;
  weight: boolean;
  onEdit: (r: Relation) => void;
}

const KINDS: Kind[] = ["Unspecified", "Energy", "Matter", "Field", "Informational"];

export function EdgePopover({
  relation,
  lens,
  sigIndex,
  manifest,
  anchor,
  fact,
  paramName,
  param,
  paramForcedBy,
  onParamEdit,
  fromName,
  toName,
  onUpdateRelation,
  onDelete,
  onClose,
  amount,
  carried,
  carriedFrom,
  askKind,
}: {
  /** Bumped to put the cursor on the substance picker (the run strip's
   *  refusal opened this flow to answer it). */
  askKind?: number;
  /** The kernel's `flow_kinds` row (walk row 29): what an unwritten kind
   *  carries in the run, or that it cannot be worked out. */
  carried?: FlowKind;
  /** A flow's "A -> B" by id, to say where an inherited kind comes from. */
  carriedFrom?: (relation: number) => string;
  /** The flow's own amount, set where the flow was clicked (2026-11-02 walk,
   *  Shingai: click a thing and tune it there; this supersedes #336's "no
   *  quantity form in structure mode" for the amount alone). Absent = this
   *  flow has no amount worth setting here (it leaves an interface or an
   *  agent, or the model does not run). */
  amount?: FlowAmount;
  relation: Relation;
  lens: Lens;
  sigIndex: number;
  manifest: Manifest;
  /** Where it floats; absent = docked in the inspector. */
  anchor?: Pt;
  /** The kernel's edge-ladder reading — Bunge shows its coupling channel (F6). */
  fact?: EdgeFact;
  /** The declared parameter naming this flow's amount, when one does (#13) —
   *  resolved at the call site from `model.params`, shown for provenance. */
  paramName?: string;
  /** Run mode (ws5): the Flow-anchored param governing this relation, resolved
   *  through the SAME kernel/params.ts path the rail uses. With `onParamEdit`
   *  present, the popover carries the param's slider — the flow answers for
   *  itself where it was clicked. Structure mode passes neither (#336 stands:
   *  no data-driving forms there). */
  param?: ParamDecl;
  paramForcedBy?: string;
  /** The rail's exact commit path (applyInputEdit → commitInputModel): the
   *  edited document re-runs and auto-plays. One param behavior, two homes. */
  onParamEdit?: (r: Relation) => void;
  /** The endpoints' names, resolved at the call site — the flow's identity
   *  said in plain words ("from Vault → to Dealers", #336). */
  fromName?: string;
  toName?: string;
  onUpdateRelation: (r: Relation) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const paramSlider = param && onParamEdit ? (
    <div className="mb-1 border-b pb-1.5" style={{ borderColor: "var(--hairline)" }}>
      <ParamControl param={param} relation={relation} forcedBy={paramForcedBy} onEdit={onParamEdit} />
      <p className="mt-0.5 text-[10px] leading-snug" style={{ color: "var(--text-muted)" }}>
        drag re-runs the world
      </p>
    </div>
  ) : null;
  // Shared viewport-clamped Popover (walkthrough #16): a mid-canvas wire's
  // editor used to run past the canvas bottom with its fields unreachable.
  return (
    <DockOrPopover
      at={anchor}
      width={230}
      label={`Edit flow${relation.name ? ` ${relation.name}` : ""}`}
      title={`flow ${fromName ?? "?"} → ${toName ?? "?"}`}
      onClose={onClose}
    >
      {/* Flow name — shared across lenses. A flow's name is its identity (and the
          manifest key when tethered); an FSA transition IS a named trigger. */}
      <FlowNameField relation={relation} onUpdateRelation={onUpdateRelation} />
      {paramSlider}
      {lens === "Klir" && (
        <KlirBody relation={relation} sigIndex={sigIndex} onUpdate={onUpdateRelation} onClose={onClose} />
      )}
      {lens === "Bunge" && <BungeBody relation={relation} fact={fact} onUpdate={onUpdateRelation} onClose={onClose} />}
      {lens === "Mobus" && (
        <MobusBody
          relation={relation}
          manifest={manifest}
          paramName={paramName}
          sliderPresent={paramSlider !== null}
          fromName={fromName}
          toName={toName}
          onUpdate={onUpdateRelation}
          onClose={onClose}
          amount={amount}
          carried={carried}
          carriedFrom={carriedFrom}
          askKind={askKind}
        />
      )}
      <div className="mt-1 flex justify-start border-t pt-1" style={{ borderColor: "var(--hairline)" }}>
        <span style={{ color: "var(--verdict-error)" }}>
          <SmallButton onClick={onDelete}>delete flow</SmallButton>
        </span>
      </div>
    </DockOrPopover>
  );
}

// The name saves live on every keystroke (onUpdateRelation), but that's invisible —
// so a committed name reads as unsaved. Enter (or blurring the field) is the commit
// gesture; a brief ✓ confirms the save landed. Presentation only: no new save path.
// Exported for the Bunge register's inline coupling editor (#100 phase 2).
/** The author's prose about a flow (#326) — the edge twin of the node editor's
 *  field, and exported alongside `FlowNameField` for the same reason: the Bunge
 *  register edits couplings inline and must offer the identical affordance. */
export function FlowDescriptionField({
  relation,
  onUpdateRelation,
}: {
  relation: Relation;
  onUpdateRelation: (r: Relation) => void;
}) {
  return (
    <DescriptionField
      value={relation.description ?? ""}
      onChange={(description) => onUpdateRelation({ ...relation, description })}
      placeholder="what this flow is, in your own words"
      rows={2}
    />
  );
}

/** The flow's grounding (#411) — the edge twin of the node editor's field,
 *  exported for the Bunge register on the same terms as the description. */
export function FlowGroundingField({
  relation,
  onUpdateRelation,
}: {
  relation: Relation;
  onUpdateRelation: (r: Relation) => void;
}) {
  return (
    <GroundingField
      value={relation.grounding}
      onChange={(grounding) => onUpdateRelation({ ...relation, grounding })}
    />
  );
}

export function FlowNameField({
  relation,
  onUpdateRelation,
}: {
  relation: Relation;
  onUpdateRelation: (r: Relation) => void;
}) {
  const [focused, setFocused] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  function confirm() {
    if (!relation.name.trim()) return;
    setJustSaved(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setJustSaved(false), 1600);
  }

  const committed = !focused && relation.name.trim().length > 0;
  // Persistent ✓ once committed (it IS saved); brighter "saved" pulse right after a commit.
  const showCheck = justSaved || committed;

  return (
    <div className="mb-2 flex items-center justify-between gap-2 text-xs">
      <span style={{ color: "var(--text-secondary)" }}>name</span>
      <div className="relative w-32">
        <input
          value={relation.name}
          onChange={(e) => onUpdateRelation({ ...relation, name: e.target.value })}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            confirm();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
          placeholder="e.g. referral"
          title="press Enter to confirm"
          className="w-full rounded-md py-0.5 pl-1.5 pr-5 text-xs"
          style={{ border: "1px solid var(--border)", background: "var(--bg-primary)", color: "var(--text-primary)" }}
        />
        <span
          aria-hidden={!showCheck}
          className="pointer-events-none absolute inset-y-0 right-1.5 flex items-center text-xs transition-opacity duration-200"
          style={{
            color: "var(--verdict-ok)",
            opacity: showCheck ? (justSaved ? 1 : 0.55) : 0,
          }}
        >
          ✓
        </span>
      </div>
    </div>
  );
}

function CloseRow({ onClose }: { onClose: () => void }) {
  if (useDocked()) return null;
  return (
    <div className="flex justify-end">
      <SmallButton onClick={onClose}>close</SmallButton>
    </div>
  );
}

// ---- Klir: the relation is a construct; direction is the observer's toggle ----

function KlirBody({
  relation,
  sigIndex,
  onUpdate,
  onClose,
}: {
  relation: Relation;
  sigIndex: number;
  onUpdate: (r: Relation) => void;
  onClose: () => void;
}) {
  const directed = relation.klir_directed === true;
  return (
    <>
      <Title>relation r{sigIndex + 1}</Title>
      <FormalismLine parts={klirFormalism(sigIndex)} />
      <Row>
        <span style={{ color: "var(--text-secondary)" }}>orientation</span>
        <div className="flex gap-1">
          <SmallButton active={!directed} onClick={() => onUpdate({ ...relation, klir_directed: false })}>
            neutral
          </SmallButton>
          <SmallButton active={directed} onClick={() => onUpdate({ ...relation, klir_directed: true })}>
            directed
          </SmallButton>
        </div>
      </Row>
      <CloseRow onClose={onClose} />
    </>
  );
}

// ---- Bunge: kind-typed directed bonds; bond vs mere relation is the criterion ----

// Exported for the Bunge register (#100 phase 2): the matrix view edits a
// selected coupling inline with the SAME body the popover uses — one editor,
// two homes, no duplicated verbs.
export function BungeBody({
  relation,
  fact,
  onUpdate,
  onClose,
}: {
  relation: Relation;
  fact?: EdgeFact;
  onUpdate: (r: Relation) => void;
  onClose: () => void;
}) {
  return (
    <>
      <Title>{relation.is_bond ? "bond" : "mere relation"} &ldquo;{relation.name || "unnamed"}&rdquo;</Title>
      <FormalismLine parts={bungeFormalism(relation)} />
      {/* The kernel's channel verdict, in Bunge's own vocabulary (F6): where
          this action sits in his coupling matrix. Read-only — the channel is
          derived from the cut + direction, never authored directly. */}
      <p className="mb-1 text-[10px] leading-snug" style={{ color: "var(--text-muted)" }}>
        {channelCopy(fact, relation.is_bond)}
      </p>
      <FlowDescriptionField relation={relation} onUpdateRelation={onUpdate} />
      <FlowGroundingField relation={relation} onUpdateRelation={onUpdate} />
      <Row>
        <span style={{ color: "var(--text-secondary)" }}>connection kind</span>
        <select
          value={relation.kind}
          onChange={(e) => onUpdate({ ...relation, kind: e.target.value as Kind })}
          className="rounded-md px-1.5 py-0.5 text-xs"
          style={{ border: "1px solid var(--border)", background: "var(--bg-primary)", color: "var(--text-primary)" }}
        >
          {KINDS.map((k) => (
            <option key={k} value={k}>
              {k.toLowerCase()}
            </option>
          ))}
        </select>
      </Row>
      <Row>
        {/* Def 1.1: only an action that makes a difference bonds; "older than" doesn't. */}
        <span style={{ color: "var(--text-secondary)" }}>acts on its relata?</span>
        <div className="flex gap-1">
          <SmallButton active={relation.is_bond} onClick={() => onUpdate({ ...relation, is_bond: true })}>
            bond
          </SmallButton>
          <SmallButton active={!relation.is_bond} onClick={() => onUpdate({ ...relation, is_bond: false })}>
            mere
          </SmallButton>
        </div>
      </Row>
      <Row>
        <span style={{ color: "var(--text-secondary)" }}>direction</span>
        <SmallButton onClick={() => onUpdate({ ...relation, a: relation.b, b: relation.a })}>⇄ reverse</SmallButton>
      </Row>
      <CloseRow onClose={onClose} />
    </>
  );
}

// ---- Mobus: one job — name, endpoints, substance, description (#336) ----
//
// What is deliberately NOT here, and where it went:
//   - the formalism strip → the formal face (FormalPanel's Mobus card). It was
//     the same static line for every flow — model-level pedagogy, not per-flow
//     content — so it is stated once where reading lives.
//   - drive-with-data → DataMode IS the mapping surface (#304 M2, fork 2);
//     a second bind path here had different behavior and competed with delete
//     for the popover's bottom edge.
//   - the "declared: unauthored" row → an internal word pair with no verb. A
//     declared amount or a live binding shows below as one plain sentence,
//     only when true; nothing is said about a flow nobody has quantified.

// Exported for its test (#336): the popover shell portals into document.body,
// which the DOM-free suite cannot render — the body's contract is what the
// gate pins, so the body is what it renders.
export function MobusBody({
  relation,
  manifest,
  paramName,
  sliderPresent,
  fromName,
  toName,
  onUpdate,
  onClose,
  amount,
  carried,
  carriedFrom,
  askKind,
}: {
  askKind?: number;
  amount?: FlowAmount;
  carried?: FlowKind;
  carriedFrom?: (relation: number) => string;
  relation: Relation;
  manifest: Manifest;
  paramName?: string;
  /** ws5: the popover itself carries this param's slider (Run mode), so the
   *  "amount … adjust in Run · Inputs" residue would point away from a knob
   *  sitting right above it — it stands down; the other residues still hold. */
  sliderPresent?: boolean;
  fromName?: string;
  toName?: string;
  onUpdate: (r: Relation) => void;
  onClose: () => void;
}) {
  // FORCED bindings only (ws5 alignment with kernel/params.ts): a non-forcing
  // flow mapping is a comparison target, not a driver — calling it "driven"
  // contradicted the param slider sitting right above it.
  const driven = manifest.mapping.find(
    (m) => m.as === "flow" && m.force && m.element === relation.name,
  );
  // The one-sentence Run residue (#336): the first true statement wins, and an
  // unquantified, unbound flow says nothing at all.
  const residue = driven
    ? `driven by “${driven.column}” — adjust in Data`
    : relation.ample
      ? "ample — never binding"
      : relation.amount && !sliderPresent && !amount
        ? `amount ${relation.amount}${relation.unit ? ` ${relation.unit}` : ""}${
            paramName ? ` (“${paramName}”)` : ""
          }`
        : null;
  const amountRow =
    amount && !driven && !relation.ample && !sliderPresent ? (
      <div className="mb-2" data-testid="flow-amount">
        <Row>
          <span style={{ color: "var(--text-secondary)" }}>{amount.weight ? "weight" : "amount per tick"}</span>
          <span className="flex items-center gap-1">
            <AmountField
              relation={relation}
              onEdit={amount.onEdit}
              placeholder={
                relation.amount == null && amount.knob ? `${Number(amount.knob.value.toPrecision(4))} default` : undefined
              }
              withdrawable={!paramName}
            />
            {relation.unit && (
              <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                {relation.unit}
              </span>
            )}
          </span>
        </Row>
        <p className="text-[11px] leading-snug" style={{ color: "var(--text-muted)" }}>
          {amount.weight
            ? `${fromName ?? "The process"}'s output divides across its ways out by weight. Edits re-run.`
            : "What this flow brings in each tick. Edits re-run."}
        </p>
      </div>
    ) : null;

  // Walk row 29: a flow with no written kind runs as what comes into its
  // source when that is one kind; otherwise the run cannot tell and refuses.
  // The kernel decides which (`flow_kinds`); this only says it, and when the
  // run waits on it the question moves to the top of the popover.
  const unsaid = relation.kind === "Unspecified" && carried !== undefined && !carried.said;
  // Walk row 34 (ruling B): a gate passes on what comes in unchanged, so a
  // flow out of one that says another kind, or a gate given two kinds, is
  // asked about the same way.
  const clash = carried !== undefined && carried.gate_passes.length > 0;
  const unworked = (unsaid && carried.kind === null) || clash;
  const word = (k: Kind) => kindToSubstance(k);
  const kindHint = clash
    ? carried.gate_passes.length > 1
      ? `${fromName ?? "This gate"} takes in ${carried.gate_passes.map(word).join(" and ")}, but a gate passes on one kind unchanged. Make what flows into ${fromName ?? "it"} one kind; the run waits on it.`
      : `${fromName ?? "This gate"} is a gate: it passes on the ${word(carried.gate_passes[0])} it takes in unchanged, so this flow carries ${word(carried.gate_passes[0])}. Pick ${word(carried.gate_passes[0])}, or change what flows into ${fromName ?? "it"}; the run waits on it.`
    : !unsaid
    ? null
    : carried.kind
      ? `Not written: it carries ${word(carried.kind)}, as ${carried.from.map((id) => carriedFrom?.(id) ?? "").filter(Boolean).join(" and ") || "what comes in"} does. Pick one to write it in the SL.`
      : carried.mixed.length > 1
        ? `${fromName ?? "Its source"} takes in ${carried.mixed.map(word).join(" and ")}, so the run cannot tell which this flow carries. Say which; the run waits on it.`
        : carried.waits_on.length > 0
          ? `It waits on what comes into ${fromName ?? "its source"} (${carried.waits_on.map((id) => carriedFrom?.(id) ?? "").filter(Boolean).join(", ")}): say what that carries and this one follows, or say it here.`
          : `Nothing says what ${fromName ?? "its source"} sends, so the run cannot tell what this flow carries. Say it here, and the flows after it carry it on.`;
  // Walk, 2026-11-03 (Shingai): what a flow carries decides the run, so it
  // sits first and at full size, above the amount and the notes, and stays
  // there whether or not the run is waiting on it.
  const substanceRef = useRef<HTMLSelectElement>(null);
  useEffect(() => {
    if (askKind) substanceRef.current?.focus();
  }, [askKind]);
  const substanceRow = (
    <div className="mb-2" data-testid="flow-substance">
      {/* Mobus's substances are material · energy · message (concordance row 6);
          the model stores a Kind, so map both ways via kind_to_substance. An
          unwritten kind never reads as one: it shows what the run carries,
          or asks. */}
      <label
        htmlFor={`flow-substance-${relation.id}`}
        className="mb-1 block text-[11px] font-semibold uppercase whitespace-nowrap"
        style={{ color: unworked ? "var(--verdict-warning)" : "var(--text-secondary)" }}
      >
        {unworked ? "what does it carry?" : "substance"}
      </label>
      <Select
        ref={substanceRef}
        id={`flow-substance-${relation.id}`}
        value={relation.kind === "Unspecified" ? "" : kindToSubstance(relation.kind)}
        onChange={(e) => {
          if (e.target.value) onUpdate({ ...relation, kind: substanceToKind(e.target.value as Substance) });
        }}
        className="w-full text-xs"
        style={unworked ? { borderColor: "var(--verdict-warning)" } : undefined}
      >
        {relation.kind === "Unspecified" && (
          <option value="" disabled>
            {unsaid && carried.kind ? `${word(carried.kind)}, carried on` : unworked ? "choose" : "unspecified"}
          </option>
        )}
        {SUBSTANCES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </Select>
      {kindHint && (
        <p
          className="text-[11px] leading-snug"
          style={{ color: unworked ? "var(--verdict-warning)" : "var(--text-muted)" }}
          data-testid="flow-kind-hint"
        >
          {kindHint}
        </p>
      )}
    </div>
  );

  return (
    <>
      {fromName && toName && (
        <p className="mb-2 text-[11px]" style={{ color: "var(--text-secondary)" }}>
          from {fromName} → to {toName}
        </p>
      )}
      {substanceRow}
      {amountRow}
      <FlowDescriptionField relation={relation} onUpdateRelation={onUpdate} />
      <FlowGroundingField relation={relation} onUpdateRelation={onUpdate} />
      {residue && (
        <p className="mb-1 text-[11px] leading-snug" style={{ color: "var(--text-muted)" }}>
          {residue}
        </p>
      )}
      <CloseRow onClose={onClose} />
    </>
  );
}
