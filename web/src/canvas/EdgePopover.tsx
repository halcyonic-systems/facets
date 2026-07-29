// Per-lens edge editing — the palette doc's "click a flow → do things" verbs,
// each lens offering ITS author's operations and no other's:
//   Klir:  toggle neutral ⇄ directed (the observer's act), read the signature.
//   Bunge: set connection-kind, toggle bond ⇄ mere relation, reverse direction.
//   Mobus: set substance type + drive with data (the tether).
// Every edit flows through onModelChange → App re-runs validate_mode +
// lens_facts in Rust; the popover itself decides nothing about systemhood.
import { useEffect, useRef, useState } from "react";
import type { ColumnMapping, EdgeFact, Kind, Lens, Manifest, Relation } from "../kernel/types";
import { channelCopy } from "./lenses/bunge";
import type { Pt } from "./geometry";
import { InspectorRow as Row, InspectorTitle as Title, Popover, ToolButton as SmallButton } from "../ui";
import {
  FormalismLine,
  SUBSTANCES,
  bungeFormalism,
  klirFormalism,
  kindToSubstance,
  mobusFormalism,
  substanceToKind,
  type Substance,
} from "./lenses/glossary";

const KINDS: Kind[] = ["Unspecified", "Energy", "Matter", "Field", "Informational"];

export function EdgePopover({
  relation,
  lens,
  sigIndex,
  headers,
  manifest,
  anchor,
  fact,
  onApplyManifest,
  onUpdateRelation,
  onDelete,
  onClose,
}: {
  relation: Relation;
  lens: Lens;
  sigIndex: number;
  headers: string[];
  manifest: Manifest;
  anchor: Pt;
  /** The kernel's edge-ladder reading — Bunge shows its coupling channel (F6). */
  fact?: EdgeFact;
  onApplyManifest: (m: Manifest) => void;
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
          headers={headers}
          manifest={manifest}
          onApplyManifest={onApplyManifest}
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

// ---- Mobus: substance-typed flow + drive it with data (the tether) ----

function MobusBody({
  relation,
  headers,
  manifest,
  onApplyManifest,
  onUpdate,
  onClose,
}: {
  relation: Relation;
  headers: string[];
  manifest: Manifest;
  onApplyManifest: (m: Manifest) => void;
  onUpdate: (r: Relation) => void;
  onClose: () => void;
}) {
  const current = manifest.mapping.find((m) => m.as === "flow" && m.element === relation.name);
  const [column, setColumn] = useState(current?.column ?? "");
  const [unit, setUnit] = useState(current?.unit ?? "");

  function drive() {
    if (!column) return;
    // The time column must stay mapped — only this relation's flow entry moves.
    const rest = manifest.mapping.filter((m) => !(m.as === "flow" && m.element === relation.name));
    const entry: ColumnMapping = { column, as: "flow", element: relation.name, unit, force: true };
    onApplyManifest({ ...manifest, mapping: [...rest, entry] });
  }

  return (
    <>
      <Title>flow &ldquo;{relation.name || "unnamed"}&rdquo;</Title>
      <FormalismLine parts={mobusFormalism()} />
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
      <div className="mb-1 text-[11px]" style={{ color: "var(--text-muted)" }}>
        drive with data
      </div>
      <select
        value={column}
        onChange={(e) => setColumn(e.target.value)}
        className="mb-2 w-full rounded-md px-2 py-1 text-sm"
        style={{ border: "1px solid var(--border)", background: "var(--bg-primary)", color: "var(--text-primary)" }}
      >
        <option value="">choose column…</option>
        {headers.map((h) => (
          <option key={h} value={h}>
            {h}
          </option>
        ))}
      </select>
      <input
        value={unit}
        onChange={(e) => setUnit(e.target.value)}
        placeholder="unit"
        className="mb-3 w-full rounded-md px-2 py-1 text-sm"
        style={{ border: "1px solid var(--border)", background: "var(--bg-primary)", color: "var(--text-primary)" }}
      />
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="rounded-full px-3 py-1 text-xs" style={{ color: "var(--text-muted)" }}>
          cancel
        </button>
        <button
          onClick={drive}
          disabled={!column}
          className="rounded-full px-3 py-1 text-xs font-semibold"
          style={{
            background: column ? "var(--accent)" : "var(--bg-surface)",
            color: column ? "var(--text-on-accent)" : "var(--text-muted)",
            cursor: column ? "pointer" : "not-allowed",
          }}
        >
          drive it
        </button>
      </div>
    </>
  );
}
