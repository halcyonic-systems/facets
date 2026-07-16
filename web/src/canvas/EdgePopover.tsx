// Per-lens edge editing — the palette doc's "click a flow → do things" verbs,
// each lens offering ITS author's operations and no other's:
//   Klir:  toggle neutral ⇄ directed (the observer's act), read the signature.
//   Bunge: set connection-kind, toggle bond ⇄ mere relation, reverse direction.
//   Mobus: set substance type + drive with data (the tether).
// Every edit flows through onModelChange → App re-runs validate_mode +
// lens_facts in Rust; the popover itself decides nothing about systemhood.
import { useState } from "react";
import type { ColumnMapping, Kind, Lens, Manifest, Relation } from "../kernel/types";
import type { Pt } from "./geometry";
import { InspectorRow as Row, InspectorTitle as Title, ToolButton as SmallButton } from "../ui";

const KINDS: Kind[] = ["Unspecified", "Energy", "Matter", "Field", "Informational"];

export function EdgePopover({
  relation,
  lens,
  sigIndex,
  headers,
  manifest,
  anchor,
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
  onApplyManifest: (m: Manifest) => void;
  onUpdateRelation: (r: Relation) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  return (
    <div
      className="absolute z-10 -translate-x-1/2 rounded-xl p-3"
      style={{
        left: anchor.x,
        top: anchor.y + 20,
        width: 230,
        background: "var(--bg-secondary)",
        border: "1px solid var(--lens-accent)",
        boxShadow: "var(--shadow-card-hover)",
        borderRadius: "var(--radius-lg)",
      }}
    >
      {/* Flow name — shared across lenses. A flow's name is its identity (and the
          manifest key when tethered); an FSA transition IS a named trigger. */}
      <div className="mb-2 flex items-center justify-between gap-2 text-xs">
        <span style={{ color: "var(--text-secondary)" }}>name</span>
        <input
          value={relation.name}
          onChange={(e) => onUpdateRelation({ ...relation, name: e.target.value })}
          placeholder="e.g. referral"
          className="w-32 rounded-md px-1.5 py-0.5 text-xs"
          style={{ border: "1px solid var(--border)", background: "var(--bg-primary)", color: "var(--text-primary)" }}
        />
      </div>
      {lens === "Klir" && (
        <KlirBody relation={relation} sigIndex={sigIndex} onUpdate={onUpdateRelation} onClose={onClose} />
      )}
      {lens === "Bunge" && <BungeBody relation={relation} onUpdate={onUpdateRelation} onClose={onClose} />}
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
      <Row>
        <span className="font-mono" style={{ color: "var(--text-muted)" }}>
          r{sigIndex + 1} ⊆ T×T · binary
        </span>
      </Row>
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

function BungeBody({
  relation,
  onUpdate,
  onClose,
}: {
  relation: Relation;
  onUpdate: (r: Relation) => void;
  onClose: () => void;
}) {
  return (
    <>
      <Title>{relation.is_bond ? "bond" : "mere relation"} &ldquo;{relation.name || "unnamed"}&rdquo;</Title>
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
      <Row>
        <span style={{ color: "var(--text-secondary)" }}>substance</span>
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
            color: column ? "#fff" : "var(--text-muted)",
            cursor: column ? "pointer" : "not-allowed",
          }}
        >
          drive it
        </button>
      </div>
    </>
  );
}
