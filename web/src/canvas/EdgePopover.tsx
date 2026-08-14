// Per-lens edge editing — the palette doc's "click a flow → do things" verbs,
// each lens offering ITS author's operations and no other's:
//   Klir:  toggle neutral ⇄ directed (the observer's act), read the signature.
//   Bunge: set connection-kind, toggle bond ⇄ mere relation, reverse direction.
//   Mobus: name, endpoints, substance, description — ONE job (#336). Driving
//          a flow with data is Data/Run-mode business; structure mode shows at
//          most a one-sentence residue when a binding or declared amount
//          already exists, and never the form.
// Every edit flows through onModelChange → App re-runs validate_mode +
// lens_facts in Rust; the popover itself decides nothing about systemhood.
import { useEffect, useRef, useState } from "react";
import type { EdgeFact, Kind, Lens, Manifest, Relation } from "../kernel/types";
import { channelCopy } from "./lenses/bunge";
import type { Pt } from "./geometry";
import { DescriptionField, InspectorRow as Row, InspectorTitle as Title, Popover, ToolButton as SmallButton } from "../ui";
import {
  FormalismLine,
  SUBSTANCES,
  bungeFormalism,
  klirFormalism,
  kindToSubstance,
  substanceToKind,
  type Substance,
} from "./lenses/glossary";

const KINDS: Kind[] = ["Unspecified", "Energy", "Matter", "Field", "Informational"];

export function EdgePopover({
  relation,
  lens,
  sigIndex,
  manifest,
  anchor,
  fact,
  paramName,
  fromName,
  toName,
  onUpdateRelation,
  onDelete,
  onClose,
}: {
  relation: Relation;
  lens: Lens;
  sigIndex: number;
  manifest: Manifest;
  anchor: Pt;
  /** The kernel's edge-ladder reading — Bunge shows its coupling channel (F6). */
  fact?: EdgeFact;
  /** The declared parameter naming this flow's amount, when one does (#13) —
   *  resolved at the call site from `model.params`, shown for provenance. */
  paramName?: string;
  /** The endpoints' names, resolved at the call site — the flow's identity
   *  said in plain words ("from Vault → to Dealers", #336). */
  fromName?: string;
  toName?: string;
  onUpdateRelation: (r: Relation) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  // Shared viewport-clamped Popover (walkthrough #16): a mid-canvas wire's
  // editor used to run past the canvas bottom with its fields unreachable.
  return (
    <Popover x={anchor.x} y={anchor.y} width={230} accent>
      {/* Flow name — shared across lenses. A flow's name is its identity (and the
          manifest key when tethered); an FSA transition IS a named trigger. */}
      <FlowNameField relation={relation} onUpdateRelation={onUpdateRelation} />
      {lens === "Klir" && (
        <KlirBody relation={relation} sigIndex={sigIndex} onUpdate={onUpdateRelation} onClose={onClose} />
      )}
      {lens === "Bunge" && <BungeBody relation={relation} fact={fact} onUpdate={onUpdateRelation} onClose={onClose} />}
      {lens === "Mobus" && (
        <MobusBody
          relation={relation}
          manifest={manifest}
          paramName={paramName}
          fromName={fromName}
          toName={toName}
          onUpdate={onUpdateRelation}
          onClose={onClose}
        />
      )}
      <div className="mt-1 flex justify-start border-t pt-1" style={{ borderColor: "var(--hairline)" }}>
        <button onClick={onDelete} className="rounded-full px-3 py-1 text-xs" style={{ color: "var(--verdict-error)" }}>
          delete flow
        </button>
      </div>
    </Popover>
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
  return (
    <div className="flex justify-end">
      <button onClick={onClose} className="rounded-full px-3 py-1 text-xs" style={{ color: "var(--text-muted)" }}>
        close
      </button>
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
  fromName,
  toName,
  onUpdate,
  onClose,
}: {
  relation: Relation;
  manifest: Manifest;
  paramName?: string;
  fromName?: string;
  toName?: string;
  onUpdate: (r: Relation) => void;
  onClose: () => void;
}) {
  const driven = manifest.mapping.find((m) => m.as === "flow" && m.element === relation.name);
  // The one-sentence Run residue (#336): the first true statement wins, and an
  // unquantified, unbound flow says nothing at all.
  const residue = driven
    ? `driven by “${driven.column}” — adjust in Data`
    : relation.ample
      ? "ample — never binding"
      : relation.amount
        ? `amount ${relation.amount}${relation.unit ? ` ${relation.unit}` : ""}${
            paramName ? ` (“${paramName}”)` : ""
          } — adjust in Run · Inputs`
        : null;

  return (
    <>
      {fromName && toName && (
        <p className="mb-2 text-[11px]" style={{ color: "var(--text-secondary)" }}>
          from {fromName} → to {toName}
        </p>
      )}
      <FlowDescriptionField relation={relation} onUpdateRelation={onUpdate} />
      <Row>
        {/* Mobus's substances are material · energy · message (concordance row 6);
            the model stores a Kind, so map both ways via kind_to_substance. An
            unspecified kind shows as "unspecified" — the residue register counts
            it, so the picker never silently reads it as energy. */}
        <span style={{ color: "var(--text-secondary)" }}>substance</span>
        <select
          value={relation.kind === "Unspecified" ? "" : kindToSubstance(relation.kind)}
          onChange={(e) => {
            if (e.target.value) onUpdate({ ...relation, kind: substanceToKind(e.target.value as Substance) });
          }}
          className="rounded-md px-1.5 py-0.5 text-xs"
          style={{ border: "1px solid var(--border)", background: "var(--bg-primary)", color: "var(--text-primary)" }}
        >
          {relation.kind === "Unspecified" && (
            <option value="" disabled>
              unspecified
            </option>
          )}
          {SUBSTANCES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </Row>
      {residue && (
        <p className="mb-1 text-[11px] leading-snug" style={{ color: "var(--text-muted)" }}>
          {residue}
        </p>
      )}
      <CloseRow onClose={onClose} />
    </>
  );
}
