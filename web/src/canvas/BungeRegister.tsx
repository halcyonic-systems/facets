// The Bunge coupling-matrix register (#100 phase 2): Bunge's SECOND native
// notation. The coupling graph (the canvas, hull and all) stays the primary
// face — Bunge keeps the picture — but his structure is also quantitative,
// written as the coupling matrix M: who acts on whom, and by what KIND of
// action (his four-kind enum, verbatim). This panel is that matrix view,
// toggled with the graph exactly the way the Klir register toggles sets ⇄
// matrix — sibling grammar, each lens's own semantics. While it is up, the
// node-and-edge picture demotes to the same small locator the Klir register
// uses (the living picture stays a live secondary surface).
//
// Reading order is the register's quiet curriculum (F8): 𝒞 → ℰ → 𝒮 → ℳ —
// composition chosen first, environment and structure derived from it,
// mechanism last as the question this surface cannot yet answer. Layout as
// pedagogy; zero prescription.
//
// Every legality question still goes to the kernel (validate_connection);
// bond/mere, kind, and channel are kernel facts — this file typesets and
// forwards, it decides nothing.
import { useEffect, useRef, useState } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";
import type {
  CanvasModel,
  CanvasRole,
  EdgeFact,
  LensDescription,
  LensFacts,
  Relation,
  Thing,
} from "../kernel/types";
import { validateConnection } from "../kernel";
import { KIND_COLOR } from "./types";
import { InspectorRow as Row, InspectorTitle as Title, ToolButton as SmallButton } from "../ui";
import { DecomposeRows, type DecomposeAffordance } from "./NodeEditor";
import { BungeBody, FlowNameField } from "./EdgePopover";
import { CELL, confirmStripClass, confirmStripStyle, headerCellStyle } from "./registerChrome";
import {
  bungeCellRelations,
  matrixSlots,
  slotCellGlyph,
  slotCellRelations,
  slotIsEnv,
  type MatrixSlot,
} from "./bungeNotation";
import { nextIdOf, nextThingPosition } from "./klirNotation";

type BungeDesc = Extract<LensDescription, { lens: "Bunge" }>;

interface Props {
  model: CanvasModel;
  /** Kernel lens facts — the aggregate verdict and per-edge channel/kind. */
  facts: LensFacts | null;
  /** The kernel's Bunge formal object (verdict, mechanism note). */
  desc: BungeDesc | null;
  selectedThingId: number | null;
  selectedRelationId: number | null;
  onSelectThing: (id: number | null) => void;
  onSelectRelation: (id: number | null) => void;
  onUpdateThing: (t: Thing) => void;
  onUpdateRelation: (r: Relation) => void;
  onDeleteThing: (id: number) => void;
  onDeleteRelation: (id: number) => void;
  onModelChange: (m: CanvasModel) => void;
  onReject: (message: string) => void;
  /** The decomposition door, computed upstream off kernel facts (same function
   *  the NodePopover and Klir register read). */
  decomposeFor: (t: Thing) => DecomposeAffordance | null;
  /** #100 phase 0: the containing system's display name; editing writes
   *  CanvasModel.name (#116 semantics). */
  placeName: string | null;
  /** The toggle's other half — back to the coupling graph. */
  onViewGraph: () => void;
}

function Tex({ tex, block = false }: { tex: string; block?: boolean }) {
  const html = katex.renderToString(tex, { throwOnError: false, displayMode: block });
  return <span className={block ? "block" : undefined} dangerouslySetInnerHTML={{ __html: html }} />;
}

const mono = { fontFamily: "var(--font-mono)" } as const;

export function BungeRegister({
  model,
  facts,
  desc,
  selectedThingId,
  selectedRelationId,
  onSelectThing,
  onSelectRelation,
  onUpdateThing,
  onUpdateRelation,
  onDeleteThing,
  onDeleteRelation,
  onModelChange,
  onReject,
  decomposeFor,
  placeName,
  onViewGraph,
}: Props) {
  // Propose-then-confirm on empty cells — the Klir register's commit grammar
  // (#100 harvest), unchanged: first click proposes, the same cell again or
  // the confirm strip commits, the kernel judges at commit time.
  const [proposed, setProposed] = useState<{ a: number; b: number } | null>(null);
  // How M reads the environment. En bloc is Bunge's OWN (1979 §2.1, pp. 18–19):
  // for an open system he forms an (m+1)×(m+1) matrix "letting 0 stand for the
  // environment en bloc", so the inputs are row 0 and the outputs column 0 —
  // and Def 1.2's worked example lumps the same way in prose. Itemizing ℰ is
  // ours: more information, less his notation. His reading is the default;
  // ours is the escape hatch when you need to address one env thing.
  const [enBloc, setEnBloc] = useState(true);
  const [compDraft, setCompDraft] = useState("");
  const [envDraft, setEnvDraft] = useState("");

  // viewing: <name> — click-to-edit, #116 semantics (same as the Klir register).
  const [nameDraft, setNameDraft] = useState<string | null>(null);
  const commitName = () => {
    if (nameDraft === null) return;
    const name = nameDraft.trim();
    if (name !== (model.name ?? "")) {
      const next = { ...model };
      if (name) next.name = name;
      else delete next.name;
      onModelChange(next);
    }
    setNameDraft(null);
  };

  const selectedThing = model.things.find((t) => t.id === selectedThingId) ?? null;
  const selectedRelation = model.relations.find((r) => r.id === selectedRelationId) ?? null;
  const edgeFacts = new Map<number, EdgeFact>((facts?.edges ?? []).map((e) => [e.id, e]));

  // Keep the inline editors in view when a selection arrives from the locator.
  const thingEdRef = useRef<HTMLDivElement | null>(null);
  const relationEdRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (selectedThingId !== null) thingEdRef.current?.scrollIntoView({ block: "nearest" });
  }, [selectedThingId]);
  useEffect(() => {
    if (selectedRelationId !== null) relationEdRef.current?.scrollIntoView({ block: "nearest" });
  }, [selectedRelationId]);

  // A proposal can't outlive its endpoints (a deleted thing withdraws it).
  useEffect(() => {
    if (
      proposed &&
      (!model.things.some((t) => t.id === proposed.a) || !model.things.some((t) => t.id === proposed.b))
    )
      setProposed(null);
  }, [model, proposed]);

  function addThing(role: CanvasRole, draft: string, clear: () => void) {
    const id = nextIdOf(model.things.map((t) => t.id));
    const name = draft.trim() || (role === "Component" ? `C${id}` : `E${id}`);
    const at = nextThingPosition(model.things);
    onModelChange({ ...model, things: [...model.things, { id, name, x: at.x, y: at.y, role }] });
    clear();
  }

  // Same candidate + kernel gate as the drag-to-connect gesture: a coupling is
  // born a bond of unstated kind (the residue register counts the unstated
  // kind; the editor below states it).
  function addRelation(a: number, b: number) {
    const candidate: Relation = {
      id: nextIdOf(model.relations.map((r) => r.id)),
      a,
      b,
      name: "",
      is_bond: true,
      kind: "Unspecified",
    };
    try {
      const verdict = validateConnection(model, candidate);
      if (verdict.issues.length === 0) {
        onModelChange({ ...model, relations: [...model.relations, candidate] });
        onSelectRelation(candidate.id);
      } else {
        onReject(verdict.issues[0].message);
      }
    } catch (err) {
      onReject(err instanceof Error ? err.message : String(err));
    }
    setProposed(null);
  }

  const aggregate = facts?.aggregate ?? false;

  return (
    <div className="absolute inset-0 overflow-y-auto p-6 pb-56">
      <div className="max-w-2xl">
        {/* the place line (#100 phase 0 / #116) — where you are, click to rename */}
        {nameDraft !== null ? (
          <input
            autoFocus
            className="mb-1 w-48 rounded-md border px-2 py-1 text-xs"
            style={{ ...mono, borderColor: "var(--lens-accent)", background: "var(--bg-secondary)", color: "var(--text-primary)" }}
            value={nameDraft}
            placeholder="name this system…"
            onChange={(e) => setNameDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitName();
              if (e.key === "Escape") setNameDraft(null);
            }}
            onBlur={commitName}
          />
        ) : (
          <button
            className="mb-1 cursor-text text-xs"
            style={{ ...mono, color: "var(--text-muted)" }}
            onClick={() => setNameDraft(model.name ?? "")}
            title="Click to rename this system (writes the SL system declaration)"
          >
            viewing: {placeName ?? "untitled"}
          </button>
        )}

        <div className="mb-3 flex items-baseline justify-between gap-3">
          <span className="flex items-baseline gap-3 text-lg" style={{ color: "var(--text-primary)" }}>
            <Tex tex={"\\mu(\\sigma) = \\langle \\mathcal{C},\\; \\mathcal{E},\\; \\mathcal{S},\\; \\mathcal{M} \\rangle"} />
            {/* Systemhood is EARNED (Def 1.1) — the kernel's verdict, announced. */}
            <span
              className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
              style={{
                background: aggregate ? "var(--verdict-error)" : "var(--accent-soft)",
                color: aggregate ? "var(--text-on-accent)" : "var(--accent-strong)",
              }}
            >
              {aggregate ? "aggregate — 𝔹 = ∅" : "system — 𝔹 ≠ ∅"}
            </span>
          </span>
          <div className="flex items-center gap-1">
            <SmallButton onClick={onViewGraph} title="the coupling graph — things, bonds, and the hull (the observer's cut)">
              graph
            </SmallButton>
            <SmallButton active onClick={() => {}} title="Bunge's coupling matrix M — who acts on whom, by what kind of action">
              matrix
            </SmallButton>
          </div>
        </div>

        {/* ---- 𝒞 — the composition: the cut's chosen side (F8: first) -------- */}
        <ThingSection
          label="𝒞"
          hint="composition — the reference class A's chosen side of the cut"
          things={model.things.filter((t) => t.role === "Component")}
          selectedThingId={selectedThingId}
          onSelectThing={onSelectThing}
          draft={compDraft}
          setDraft={setCompDraft}
          placeholder="+ component…"
          draftTip="Type a name and press Enter to add a component to 𝒞"
          onAdd={() => addThing("Component", compDraft, () => setCompDraft(""))}
        />
        {selectedThing && selectedThing.role === "Component" && (
          <InlineThingEditor
            refEl={thingEdRef}
            thing={selectedThing}
            decompose={decomposeFor(selectedThing)}
            onUpdate={onUpdateThing}
            onDelete={() => onDeleteThing(selectedThing.id)}
            onClose={() => onSelectThing(null)}
          />
        )}

        {/* ---- ℰ — derived from the cut: what acts on 𝒞 from outside --------- */}
        <ThingSection
          label="ℰ"
          hint="environment — same kind of thing, the other side of the cut (Def 1.2 ii)"
          things={model.things.filter((t) => t.role === "Environment")}
          selectedThingId={selectedThingId}
          onSelectThing={onSelectThing}
          draft={envDraft}
          setDraft={setEnvDraft}
          placeholder="+ env thing…"
          draftTip="Type a name and press Enter to add an environment thing (in ℰ once bonded)"
          onAdd={() => addThing("Environment", envDraft, () => setEnvDraft(""))}
        />
        {selectedThing && selectedThing.role === "Environment" && (
          <InlineThingEditor
            refEl={thingEdRef}
            thing={selectedThing}
            decompose={decomposeFor(selectedThing)}
            onUpdate={onUpdateThing}
            onDelete={() => onDeleteThing(selectedThing.id)}
            onClose={() => onSelectThing(null)}
          />
        )}

        {/* ---- 𝒮 — structure, as Bunge's coupling matrix M -------------------- */}
        <section className="mt-4">
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm" style={mono}>
            <span className="flex items-baseline gap-3">
              <span style={{ color: "var(--text-secondary)" }}>𝒮 = M</span>
              <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                row acts on column — the kind of action is what makes a bond a bond
              </span>
            </span>
            <span className="flex shrink-0 items-center gap-1">
              <SmallButton
                active={enBloc}
                onClick={() => {
                  setEnBloc(true);
                  setProposed(null);
                }}
                title="ℰ en bloc — Bunge's own (m+1)×(m+1): index 0 stands for the environment, row 0 the inputs M₀ᵣ, column 0 the outputs Mₛ₀ (1979 §2.1)"
              >
                ℰ = 0
              </SmallButton>
              <SmallButton
                active={!enBloc}
                onClick={() => {
                  setEnBloc(false);
                  setProposed(null);
                }}
                title="ℰ itemized — one row per environment thing (ours, not his: more information, less his notation)"
              >
                ℰ itemized
              </SmallButton>
            </span>
          </div>
          <CouplingMatrix
            model={model}
            edgeFacts={edgeFacts}
            selectedRelationId={selectedRelationId}
            proposed={proposed}
            enBloc={enBloc}
            onSelectFirst={(rels) =>
              onSelectRelation(rels[0].id === selectedRelationId ? null : rels[0].id)
            }
            onPickCell={(a, b) => {
              const rels = bungeCellRelations(model, a, b);
              if (rels.length > 0) {
                onSelectRelation(rels[0].id === selectedRelationId ? null : rels[0].id);
                setProposed(null);
              } else if (proposed && proposed.a === a && proposed.b === b) {
                addRelation(a, b); // the second click commits
              } else {
                setProposed({ a, b }); // the first click only proposes
              }
            }}
            onConfirm={() => proposed && addRelation(proposed.a, proposed.b)}
            onCancel={() => setProposed(null)}
          />
          {selectedRelation && (
            <div ref={relationEdRef} className="mt-2 pl-6">
              <div className="w-72 rounded-md p-3" style={editorBox}>
                {/* The SAME editor the graph's popover uses (one set of verbs):
                    name, kind, bond ⇄ mere, reverse — plus the kernel's
                    channel line. */}
                <FlowNameField relation={selectedRelation} onUpdateRelation={onUpdateRelation} />
                <BungeBody
                  relation={selectedRelation}
                  fact={edgeFacts.get(selectedRelation.id)}
                  onUpdate={onUpdateRelation}
                  onClose={() => onSelectRelation(null)}
                />
                <div className="flex justify-start border-t pt-1" style={{ borderColor: "var(--hairline)" }}>
                  <button
                    onClick={() => onDeleteRelation(selectedRelation.id)}
                    className="rounded-full px-3 py-1 text-xs"
                    style={{ color: "var(--verdict-error)" }}
                  >
                    delete
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* ---- ℳ — last, and honestly absent (F2/F8) -------------------------- */}
        {desc && (
          <p className="mt-4 max-w-xl text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
            {desc.mechanism_note}
          </p>
        )}
      </div>
    </div>
  );
}

// ---- the C / E listings -----------------------------------------------------

function ThingSection({
  label,
  hint,
  things,
  selectedThingId,
  onSelectThing,
  draft,
  setDraft,
  placeholder,
  draftTip,
  onAdd,
}: {
  label: string;
  hint: string;
  things: Thing[];
  selectedThingId: number | null;
  onSelectThing: (id: number | null) => void;
  draft: string;
  setDraft: (v: string) => void;
  placeholder: string;
  draftTip: string;
  onAdd: () => void;
}) {
  return (
    <section className="mb-3">
      <div className="mb-1 flex items-baseline gap-3 text-sm" style={mono}>
        <span style={{ color: "var(--text-secondary)" }}>{label} =</span>
        <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
          {hint}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-1.5 pl-6">
        {things.map((t) => (
          <button
            key={t.id}
            onClick={() => onSelectThing(t.id === selectedThingId ? null : t.id)}
            className="rounded-md px-2 py-0.5 text-sm"
            style={{
              ...mono,
              color: "var(--text-primary)",
              background:
                t.id === selectedThingId ? "color-mix(in srgb, var(--lens-accent) 18%, transparent)" : "var(--bg-secondary)",
              border: `1px solid ${t.id === selectedThingId ? "var(--lens-accent)" : "var(--border)"}`,
            }}
            title={`${t.name || `#${t.id}`} ∈ ${label} — click to edit (the cut is re-drawable)`}
          >
            {t.name || `#${t.id}`}
            {t.child_model && <span style={{ color: "var(--text-muted)" }}> ▸</span>}
          </button>
        ))}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onAdd();
            if (e.key === "Escape") setDraft("");
          }}
          placeholder={placeholder}
          title={draftTip}
          className="w-28 rounded-md px-2 py-0.5 text-sm"
          style={{ ...mono, border: "1px dashed var(--border)", background: "transparent", color: "var(--text-primary)" }}
        />
      </div>
    </section>
  );
}

const editorBox = {
  border: "1px solid var(--lens-accent)",
  background: "var(--bg-secondary)",
  borderRadius: "var(--radius-md)",
  boxShadow: "var(--shadow-card-hover)",
} as const;

// Inline counterpart of the Bunge NodePopover (the Klir register's
// ThingEditor pattern): name, the re-cut (𝒞 ⇄ ℰ — the same affordance the
// graph's popover carries), the decomposition door, delete. Same verbs, no
// new semantics; the App narrates a re-cut the moment it lands.
function InlineThingEditor({
  refEl,
  thing,
  decompose,
  onUpdate,
  onDelete,
  onClose,
}: {
  refEl: React.RefObject<HTMLDivElement | null>;
  thing: Thing;
  decompose: DecomposeAffordance | null;
  onUpdate: (t: Thing) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const isComponent = thing.role === "Component";
  return (
    <div ref={refEl} className="mb-2 mt-1 pl-6">
      <div className="w-72 rounded-md p-3" style={editorBox}>
        <Title>
          {isComponent ? "component" : "environment thing"}&nbsp;&ldquo;{thing.name || "unnamed"}&rdquo;
        </Title>
        <Row>
          <span style={{ color: "var(--text-secondary)" }}>name</span>
          <input
            value={thing.name}
            onChange={(e) => onUpdate({ ...thing, name: e.target.value })}
            className="w-28 rounded-md px-1.5 py-0.5 text-xs"
            style={{ border: "1px solid var(--border)", background: "var(--bg-primary)", color: "var(--text-primary)" }}
          />
        </Row>
        <Row>
          <span style={{ color: "var(--text-secondary)" }}>cut</span>
          <div
            className="flex gap-1"
            title={
              thing.child_model
                ? "this component decomposes into a child model — the reference class holds it in 𝒞"
                : "the C/E partition is relative to the reference class A (Def 1.2) — re-cut by moving this thing across it"
            }
          >
            <SmallButton
              active={isComponent}
              disabled={!!thing.child_model && !isComponent}
              onClick={() => !isComponent && onUpdate({ ...thing, role: "Component" })}
              title="re-cut: put this thing inside the cut (𝒞 — the composition)"
            >
              𝒞
            </SmallButton>
            <SmallButton
              active={!isComponent}
              disabled={!!thing.child_model && isComponent}
              onClick={() => isComponent && onUpdate({ ...thing, role: "Environment" })}
              title="re-cut: put this thing outside the cut (ℰ — the environment)"
            >
              ℰ
            </SmallButton>
          </div>
        </Row>
        <p className="mb-1 text-[10px] leading-snug" style={{ color: "var(--text-muted)" }}>
          re-cut — the cut is yours to draw; ℰ and 𝒮 follow from it
        </p>
        {decompose && <DecomposeRows decompose={decompose} />}
        <div className="flex justify-between">
          <button onClick={onDelete} className="rounded-full px-3 py-1 text-xs" style={{ color: "var(--verdict-error)" }}>
            delete
          </button>
          <button onClick={onClose} className="rounded-full px-3 py-1 text-xs" style={{ color: "var(--text-muted)" }}>
            close
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- the coupling matrix M --------------------------------------------------

/** Bunge's M over the model's things — composition rows/cols first, then
 *  environment, so his own blocks fall out of the ordering: the ℰ-row × 𝒞-col
 *  block is M₀ᵣ (inputs), the 𝒞-row × ℰ-col block Mₛ₀ (outputs), the 𝒞 × 𝒞
 *  interior Mᵣₛ (internuncial). Cell (row, col) reads "row acts on col"; the
 *  glyph is the KIND of the acting bond (Bunge's four-kind enum — what makes
 *  a bond a bond, made visible), ∼ a mere relation that holds without acting.
 *  Table scaffolding and commit grammar mirror the Klir register's incidence
 *  matrix (the siblings share a face); the semantics here are Bunge's own. */

function CouplingMatrix({
  model,
  edgeFacts,
  selectedRelationId,
  proposed,
  enBloc,
  onPickCell,
  onSelectFirst,
  onConfirm,
  onCancel,
}: {
  model: CanvasModel;
  edgeFacts: Map<number, EdgeFact>;
  selectedRelationId: number | null;
  proposed: { a: number; b: number } | null;
  /** Bunge's own (m+1)×(m+1) reading: the environment as index 0. */
  enBloc: boolean;
  onPickCell: (a: number, b: number) => void;
  /** Selection for cells no pair of things addresses (the en-bloc env row/col):
   *  there is nothing to propose, but its occupants are still editable. */
  onSelectFirst: (rels: Relation[]) => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const slots = matrixSlots(model, enBloc);
  if (slots.length === 0) {
    return (
      <p className="pl-6 text-xs" style={{ color: "var(--text-muted)" }}>
        no things yet — place a component first; M is over 𝒞 ∪ ℰ.
      </p>
    );
  }
  // Where the cut's rule falls: en bloc it is the single line after index 0
  // (Bunge prints 0 first); itemized it is where the composition ends.
  const cutAt = enBloc ? (slots[0].kind === "env" ? 1 : slots.length) : slots.filter((s) => !slotIsEnv(s)).length;
  const short = (name: string) => (name.length > 12 ? `${name.slice(0, 11)}…` : name);
  const slotKey = (s: MatrixSlot) => (s.kind === "env" ? "env" : s.thing.id);
  const slotLabel = (s: MatrixSlot) => (s.kind === "env" ? "0" : short(s.thing.name || `#${s.thing.id}`));
  const slotTitle = (s: MatrixSlot) =>
    s.kind === "env"
      ? "0 — the environment en bloc (Bunge 1979 §2.1): row 0 is the input M₀ᵣ, column 0 the output Mₛ₀"
      : `${s.thing.name} ∈ ${s.thing.role === "Component" ? "𝒞" : "ℰ"}`;
  const nameOf = (id: number) => model.things.find((t) => t.id === id)?.name || `#${id}`;
  const channelWord = (r: Relation): string => {
    if (!r.is_bond) return "mere — holds, does not act";
    switch (edgeFacts.get(r.id)?.channel) {
      case "Input":
        return "input (M₀ᵣ — ℰ acts on 𝒞)";
      case "Output":
        return "output (Mₛ₀ — 𝒞 acts on ℰ)";
      case "Internuncial":
        return "internuncial (Mᵣₛ)";
      default:
        return "outside 𝒮";
    }
  };
  // Each occupant read the way Bunge writes it: who acts on whom, by what kind.
  const cellTitle = (rels: Relation[]): string =>
    rels
      .map(
        (r) =>
          `${r.is_bond ? "bond" : "mere relation"}${r.name ? ` "${r.name}"` : ""}: ${nameOf(r.a)} ${
            r.is_bond ? "▷" : "∼"
          } ${nameOf(r.b)} — ${r.kind === "Unspecified" ? "kind unstated" : `${r.kind.toLowerCase()} action`} · ${channelWord(r)}`,
      )
      .join(" · ");
  // The cut, visible inside the matrix: a stronger rule where 𝒞 ends and ℰ
  // begins — the same partition the hull draws on the graph.
  const cutBorder = "2px solid color-mix(in srgb, var(--lens-accent) 45%, var(--hairline))";
  const ruled = cutAt > 0 && cutAt < slots.length;
  const cutLeft = (i: number) => (ruled && i === cutAt ? { borderLeft: cutBorder } : {});
  const cutTop = (i: number) => (ruled && i === cutAt ? { borderTop: cutBorder } : {});
  return (
    <div className="overflow-x-auto pl-6">
      <table className="border-separate" style={{ borderSpacing: 0 }}>
        <thead>
          <tr>
            <th className="px-2 text-left align-bottom text-[10px] font-normal" style={headerCellStyle}>
              r acts on s
            </th>
            {slots.map((s, i) => (
              <th
                key={slotKey(s)}
                className="px-1 pb-1 align-bottom text-[10px] font-normal"
                style={{ ...headerCellStyle, minWidth: CELL, maxWidth: CELL, ...cutLeft(i) }}
                title={slotTitle(s)}
              >
                <span
                  className="inline-block max-h-24 overflow-hidden"
                  style={{
                    // Index 0 reads upright: it is a numeral, not a name, and
                    // the vertical run makes it look like a dropped glyph.
                    ...(s.kind === "env" ? {} : { writingMode: "vertical-rl", transform: "rotate(180deg)" }),
                    ...(slotIsEnv(s) ? { color: "var(--text-muted)" } : {}),
                  }}
                >
                  {slotLabel(s)}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {slots.map((a, ai) => (
            <tr key={slotKey(a)}>
              <th
                className="max-w-28 truncate px-2 text-right text-[10px] font-normal"
                style={{
                  ...headerCellStyle,
                  height: CELL,
                  ...cutTop(ai),
                  ...(slotIsEnv(a) ? { color: "var(--text-muted)" } : {}),
                }}
                title={slotTitle(a)}
              >
                {slotLabel(a)}
              </th>
              {slots.map((b, bi) => {
                const rels = slotCellRelations(model, a, b);
                const bond = rels.find((r) => r.is_bond);
                const hit = rels.some((r) => r.id === selectedRelationId);
                // A proposal names two THINGS; index 0 names none of them, so
                // the en-bloc environment row/column is read-only — an action
                // is added from the graph, or with the environment itemized.
                const addressable = a.kind === "thing" && b.kind === "thing";
                const isProposed =
                  addressable && proposed !== null && proposed.a === a.thing.id && proposed.b === b.thing.id;
                const selfCell = a.kind === "thing" && b.kind === "thing" && a.thing.id === b.thing.id;
                return (
                  <td
                    key={slotKey(b)}
                    className="p-0"
                    style={{
                      borderBottom: "1px solid var(--hairline)",
                      borderRight: "1px solid var(--hairline)",
                      ...cutLeft(bi),
                      ...cutTop(ai),
                    }}
                  >
                    <button
                      onClick={() => {
                        if (addressable) onPickCell(a.thing.id, b.thing.id);
                        else if (rels.length) onSelectFirst(rels);
                      }}
                      className="block text-[11px] leading-none"
                      style={{
                        width: CELL,
                        height: CELL,
                        fontFamily: "var(--font-mono)",
                        // The glyph wears the KIND's reserved color channel —
                        // substance identity, constant across lenses.
                        color: bond
                          ? KIND_COLOR[bond.kind]
                          : rels.length
                            ? "var(--text-muted)"
                            : isProposed
                              ? "var(--lens-accent)"
                              : "var(--text-muted)",
                        background: hit
                          ? "color-mix(in srgb, var(--lens-accent) 30%, transparent)"
                          : rels.length
                            ? "color-mix(in srgb, var(--lens-accent) 14%, transparent)"
                            : selfCell
                              ? "color-mix(in srgb, var(--lens-accent) 6%, transparent)"
                              : "var(--bg-primary)",
                        outline: hit
                          ? "1.5px solid var(--lens-accent)"
                          : isProposed
                            ? "1.5px dashed var(--lens-accent)"
                            : undefined,
                        outlineOffset: -1.5,
                      }}
                      title={
                        rels.length
                          ? `${cellTitle(rels)} — click to edit`
                          : !addressable
                            ? "index 0 is the environment en bloc — add an action from the graph, or itemize ℰ to address one thing"
                            : isProposed
                              ? `${a.thing.name} ▷ ${b.thing.name} proposed — click again to add the bond`
                              : `no action ${a.thing.name} → ${b.thing.name} — click to propose a bond`
                      }
                    >
                      {rels.length ? slotCellGlyph(a, b, rels) : isProposed ? "+" : ""}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {/* The confirm strip: a proposal is visible, revocable, and only becomes
          a member of 𝒮 on an explicit second act (the cell again, or "add"). */}
      {proposed && (
        <div
          className={confirmStripClass}
          style={confirmStripStyle}
          onKeyDown={(e) => {
            if (e.key === "Escape") onCancel();
          }}
        >
          <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>
            add bond {nameOf(proposed.a)} ▷ {nameOf(proposed.b)}?
          </span>
          <SmallButton active onClick={onConfirm} title="Add this action to 𝒮 (the kernel judges legality)">
            add
          </SmallButton>
          <SmallButton onClick={onCancel} title="Withdraw the proposal — nothing was created">
            cancel
          </SmallButton>
        </div>
      )}
      <p className="mt-1 text-[10px]" style={{ color: "var(--text-muted)" }}>
        {enBloc
          ? "0 is the environment en bloc; the heavier rule after it is the cut. kind of action: "
          : "the heavier rule is the cut — 𝒞 before it, ℰ after (re-cut from any thing's editor). kind of action: "}
        e energy · m matter · f field · i informational · &middot; unstated · ∼ mere relation
        (holds, does not act) · ↺ self-action — blocks:{" "}
        {enBloc
          ? "row 0 = inputs (M₀ᵣ), column 0 = outputs (Mₛ₀), the interior = internuncial (Mᵣₛ)"
          : "ℰ-row × 𝒞-col = inputs (M₀ᵣ), 𝒞-row × ℰ-col = outputs (Mₛ₀), 𝒞 × 𝒞 = internuncial (Mᵣₛ)"}
      </p>
    </div>
  );
}
