// The Klir canvas register (#100): the formalism IS the stage. Klir left the
// diagram paradigm, so under this lens the literal set listings — T = {…},
// R = {…} (Facets Eq. 1.1) — are the primary reading surface, live against the
// model, with the |T|×|T| Relation Matrix as their toggle-twin; the
// node-and-edge picture demotes to a small locator (App composes it beside
// this panel). Reading AND writing happen in the text: elements select, an
// inline editor edits, the matrix's empty cells author new relations. Every
// legality question still goes to the kernel (validate_connection); this file
// typesets and forwards, it decides nothing.
import { useEffect, useRef, useState } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";
import type { CanvasModel, KlirLadder, Relation, Thing } from "../kernel/types";
import { validateConnection } from "../kernel";
import { InspectorRow as Row, InspectorTitle as Title, ToolButton as SmallButton } from "../ui";
import { DecomposeRows, type DecomposeAffordance } from "./NodePopover";
import { KlirLadderPanel, LadderChip } from "./KlirLadderPanel";
import { FormalismLine, klirFormalism } from "./lenses/glossary";
import { cellGlyph, cellRelations, nextIdOf, nextThingPosition, relationTuple } from "./klirNotation";
import { CELL, confirmStripClass, confirmStripStyle, headerCellStyle } from "./registerChrome";

interface Props {
  model: CanvasModel;
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
   *  the NodePopover reads). */
  decomposeFor: (t: Thing) => DecomposeAffordance | null;
  /** #100 phase 0: the containing system's display name (author SOI name, else
   *  the shell's label). Editing writes CanvasModel.name (#116 semantics). */
  placeName: string | null;
  /** The kernel's ladder verdict (describe → Klir.ladder), surfaced as an
   *  opt-in complement: a collapsed "position" chip that expands into an
   *  introduced Hasse panel (#100 harvest, from the ladder-first arm). */
  ladder: KlirLadder | null;
}

function Tex({ tex, block = false }: { tex: string; block?: boolean }) {
  const html = katex.renderToString(tex, { throwOnError: false, displayMode: block });
  return <span className={block ? "block" : undefined} dangerouslySetInnerHTML={{ __html: html }} />;
}

const mono = { fontFamily: "var(--font-mono)" } as const;

export function KlirRegister({
  model,
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
  ladder,
}: Props) {
  const [view, setView] = useState<"sets" | "matrix">("sets");
  // The ladder is an opt-in complement: collapsed on every mount, never the
  // anchor — first contact is one quiet chip beside the headline.
  const [ladderOpen, setLadderOpen] = useState(false);
  // #100 harvest: an empty-cell click PROPOSES the pair instead of creating it
  // ("it immediately creates it… might just move that out, but the concept is
  // really cool") — the same click again, or the confirm strip, commits; the
  // kernel still judges at commit time. Two-step to match the sets view's own
  // deliberate pick-pair-then-add grammar.
  const [proposed, setProposed] = useState<{ a: number; b: number } | null>(null);
  const [thingDraft, setThingDraft] = useState("");
  const [relA, setRelA] = useState("");
  const [relB, setRelB] = useState("");

  // viewing: <name> — click-to-edit, #116 semantics (writes the model's
  // SELF-name; Enter/blur commits, Escape cancels, empty clears to unnamed).
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

  const nameOf = (id: number) => model.things.find((t) => t.id === id)?.name || `#${id}`;
  const selectedThing = model.things.find((t) => t.id === selectedThingId) ?? null;
  const selectedRelation = model.relations.find((r) => r.id === selectedRelationId) ?? null;

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

  function addThing() {
    const id = nextIdOf(model.things.map((t) => t.id));
    const name = thingDraft.trim() || `T${id}`;
    const at = nextThingPosition(model.things);
    onModelChange({
      ...model,
      things: [...model.things, { id, name, x: at.x, y: at.y, role: "Component" }],
    });
    setThingDraft("");
  }

  // Same candidate + kernel gate as the drag-to-connect gesture: neutral by
  // default (direction is the observer's later toggle).
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

  const sigOf = (r: Relation) => model.relations.indexOf(r);

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
          <span className="text-lg" style={{ color: "var(--text-primary)" }}>
            <Tex tex={"S = (T,\\; R), \\qquad R \\subseteq T \\times T"} />
          </span>
          <div className="flex items-center gap-1">
            {ladder && (
              <LadderChip ladder={ladder} open={ladderOpen} onToggle={() => setLadderOpen((o) => !o)} />
            )}
            <SmallButton
              active={view === "sets"}
              onClick={() => {
                setView("sets");
                setProposed(null); // a pending matrix proposal doesn't follow
              }}
              title="the set listings — Eq. 1.1 read literally"
            >
              sets
            </SmallButton>
            <SmallButton active={view === "matrix"} onClick={() => setView("matrix")} title="the |T|×|T| incidence matrix over the same R">
              matrix
            </SmallButton>
          </div>
        </div>

        {/* The ladder complement, expanded on demand: introduction first, then
            the model's position (#100 harvest — see KlirLadderPanel). */}
        {ladder && ladderOpen && <KlirLadderPanel ladder={ladder} onClose={() => setLadderOpen(false)} />}

        {/* ---- T — thinghood, taken for granted -------------------------------- */}
        <section className="mb-4">
          <div className="mb-1 flex items-baseline gap-3 text-sm" style={mono}>
            <span style={{ color: "var(--text-secondary)" }}>T =</span>
            <span style={{ color: "var(--text-muted)" }}>
              {"{"} <span className="text-[11px]">|T| = {model.things.length}</span> {"}"}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 pl-6">
            {model.things.map((t) => (
              <button
                key={t.id}
                onClick={() => onSelectThing(t.id === selectedThingId ? null : t.id)}
                className="rounded-md px-2 py-0.5 text-sm"
                style={{
                  ...mono,
                  color: "var(--text-primary)",
                  background: t.id === selectedThingId ? "color-mix(in srgb, var(--lens-accent) 18%, transparent)" : "var(--bg-secondary)",
                  border: `1px solid ${t.id === selectedThingId ? "var(--lens-accent)" : "var(--border)"}`,
                }}
                title={`t${t.id} ∈ T — click to edit`}
              >
                {t.name || `t${t.id}`}
                {t.child_model && <span style={{ color: "var(--text-muted)" }}> ▸</span>}
              </button>
            ))}
            <input
              value={thingDraft}
              onChange={(e) => setThingDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") addThing();
                if (e.key === "Escape") setThingDraft("");
              }}
              placeholder="+ thing…"
              title="Type a name and press Enter to add a member to T"
              className="w-24 rounded-md px-2 py-0.5 text-sm"
              style={{ ...mono, border: "1px dashed var(--border)", background: "transparent", color: "var(--text-primary)" }}
            />
          </div>
          {selectedThing && (
            <div ref={thingEdRef} className="mt-2 pl-6">
              <ThingEditor
                thing={selectedThing}
                decompose={decomposeFor(selectedThing)}
                onUpdate={onUpdateThing}
                onDelete={() => onDeleteThing(selectedThing.id)}
                onClose={() => onSelectThing(null)}
              />
            </div>
          )}
        </section>

        {/* ---- R — systemhood; the same data both ways ------------------------- */}
        <section>
          <div className="mb-1 flex items-baseline gap-3 text-sm" style={mono}>
            <span style={{ color: "var(--text-secondary)" }}>R =</span>
            <span style={{ color: "var(--text-muted)" }}>
              {"{"} <span className="text-[11px]">|R| = {model.relations.length}</span> {"}"}
            </span>
          </div>

          {view === "sets" ? (
            <div className="grid gap-1 pl-6">
              {model.relations.map((r, i) => (
                <button
                  key={r.id}
                  onClick={() => onSelectRelation(r.id === selectedRelationId ? null : r.id)}
                  className="w-fit rounded-md px-2 py-0.5 text-left text-sm"
                  style={{
                    ...mono,
                    color: "var(--text-primary)",
                    background: r.id === selectedRelationId ? "color-mix(in srgb, var(--lens-accent) 18%, transparent)" : "transparent",
                    border: `1px solid ${r.id === selectedRelationId ? "var(--lens-accent)" : "transparent"}`,
                  }}
                  title={`r${i + 1} ⊆ T×T — click to edit`}
                >
                  <span style={{ color: "var(--text-secondary)" }}>r{i + 1} = </span>
                  {relationTuple(r, nameOf)}
                  {r.name && (
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                      {"  "}· {r.name}
                    </span>
                  )}
                </button>
              ))}
              {model.things.length >= 1 && (
                <div className="mt-1 flex items-center gap-1.5 text-sm" style={{ ...mono, color: "var(--text-muted)" }}>
                  <span>+ (</span>
                  <PairSelect value={relA} onChange={setRelA} things={model.things} />
                  <span>,</span>
                  <PairSelect value={relB} onChange={setRelB} things={model.things} />
                  <span>)</span>
                  <SmallButton
                    disabled={relA === "" || relB === ""}
                    onClick={() => {
                      if (relA === "" || relB === "") return;
                      addRelation(Number(relA), Number(relB));
                    }}
                    title="Add this pair to R (neutral by default; the kernel judges legality)"
                  >
                    add
                  </SmallButton>
                </div>
              )}
            </div>
          ) : (
            <IncidenceMatrix
              model={model}
              selectedRelationId={selectedRelationId}
              proposed={proposed}
              onPickCell={(a, b) => {
                const rels = cellRelations(model, a, b);
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
          )}

          {selectedRelation && (
            <div ref={relationEdRef} className="mt-2 pl-6">
              <RelationEditor
                relation={selectedRelation}
                sigIndex={sigOf(selectedRelation)}
                tuple={relationTuple(selectedRelation, nameOf)}
                onUpdate={onUpdateRelation}
                onDelete={() => onDeleteRelation(selectedRelation.id)}
                onClose={() => onSelectRelation(null)}
              />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function PairSelect({
  value,
  onChange,
  things,
}: {
  value: string;
  onChange: (v: string) => void;
  things: Thing[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-md px-1.5 py-0.5 text-xs"
      style={{ border: "1px solid var(--border)", background: "var(--bg-primary)", color: "var(--text-primary)" }}
    >
      <option value="">…</option>
      {things.map((t) => (
        <option key={t.id} value={t.id}>
          {t.name || `t${t.id}`}
        </option>
      ))}
    </select>
  );
}

/** The Relation Matrix — |T|×|T| incidence over the same R the set listing
 *  shows. Cell (row, col) reads as the ordered pair (row, col): a directed
 *  relation marks its own order, a neutral one marks both. A marked cell
 *  selects its relation; an empty cell proposes the pair to the kernel.
 *
 *  Cell presentation grafted from the blind pick's matrix-centric arm (#100
 *  harvest): glyphs ● / → / ↺ (with a ×N stack count), hairline-gridded cells
 *  with a soft accent wash where R is inhabited, a faint diagonal tint, and
 *  hover tooltips reading each occupant as rN "name" = (row, col). The editing
 *  grammar stays this register's own. */

function IncidenceMatrix({
  model,
  selectedRelationId,
  proposed,
  onPickCell,
  onConfirm,
  onCancel,
}: {
  model: CanvasModel;
  selectedRelationId: number | null;
  /** The pair a first empty-cell click proposed — not yet in R (#100 harvest:
   *  click softened to propose-then-confirm). */
  proposed: { a: number; b: number } | null;
  onPickCell: (a: number, b: number) => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (model.things.length === 0) {
    return (
      <p className="pl-6 text-xs" style={{ color: "var(--text-muted)" }}>
        |T| = 0 — add a thing first; the matrix is T × T.
      </p>
    );
  }
  const short = (name: string) => (name.length > 12 ? `${name.slice(0, 11)}…` : name);
  const nameOf = (id: number) => model.things.find((t) => t.id === id)?.name || `t${id}`;
  // Each occupant read the way the set listing writes it: rN "name" = (a, b).
  const cellTitle = (rels: Relation[]): string =>
    rels
      .map(
        (r) =>
          `r${model.relations.indexOf(r) + 1}${r.name ? ` "${r.name}"` : ""} = (${nameOf(r.a)}, ${nameOf(r.b)})${r.klir_directed === true ? " directed" : ""}`,
      )
      .join(" · ");
  return (
    <div className="overflow-x-auto pl-6">
      <table className="border-separate" style={{ borderSpacing: 0 }}>
        <thead>
          <tr>
            <th className="px-2 text-left align-bottom text-[10px] font-normal" style={headerCellStyle}>
              row→col
            </th>
            {model.things.map((t) => (
              <th
                key={t.id}
                className="px-1 pb-1 align-bottom text-[10px] font-normal"
                style={{ ...headerCellStyle, minWidth: CELL, maxWidth: CELL }}
                title={t.name}
              >
                <span
                  className="inline-block max-h-24 overflow-hidden"
                  style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
                >
                  {short(t.name || `t${t.id}`)}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {model.things.map((a) => (
            <tr key={a.id}>
              <th
                className="max-w-28 truncate px-2 text-right text-[10px] font-normal"
                style={{ ...headerCellStyle, height: CELL }}
                title={a.name}
              >
                {short(a.name || `t${a.id}`)}
              </th>
              {model.things.map((b) => {
                const rels = cellRelations(model, a.id, b.id);
                const hit = rels.some((r) => r.id === selectedRelationId);
                const isProposed = proposed !== null && proposed.a === a.id && proposed.b === b.id;
                return (
                  <td key={b.id} className="p-0" style={{ borderBottom: "1px solid var(--hairline)", borderRight: "1px solid var(--hairline)" }}>
                    <button
                      onClick={() => onPickCell(a.id, b.id)}
                      className="block text-[11px] leading-none"
                      style={{
                        width: CELL,
                        height: CELL,
                        fontFamily: "var(--font-mono)",
                        color: rels.length ? "var(--text-primary)" : isProposed ? "var(--lens-accent)" : "var(--text-muted)",
                        background: hit
                          ? "color-mix(in srgb, var(--lens-accent) 30%, transparent)"
                          : rels.length
                            ? "color-mix(in srgb, var(--lens-accent) 14%, transparent)"
                            : a.id === b.id
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
                          : isProposed
                            ? `(${a.name}, ${b.name}) proposed — click again to add it to R`
                            : `(${a.name}, ${b.name}) ∉ R — click to propose`
                      }
                    >
                      {rels.length ? cellGlyph(a.id, b.id, rels) : isProposed ? "+" : ""}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {/* The confirm strip: a proposal is visible, revocable, and only becomes
          a member of R on an explicit second act (the cell again, or "add"). */}
      {proposed && (
        <div
          className={confirmStripClass}
          style={confirmStripStyle}
          onKeyDown={(e) => {
            if (e.key === "Escape") onCancel();
          }}
        >
          <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>
            add ({nameOf(proposed.a)}, {nameOf(proposed.b)}) to R?
          </span>
          <SmallButton active onClick={onConfirm} title="Add this pair to R (the kernel judges legality)">
            add
          </SmallButton>
          <SmallButton onClick={onCancel} title="Withdraw the proposal — nothing was created">
            cancel
          </SmallButton>
        </div>
      )}
      <p className="mt-1 text-[10px]" style={{ color: "var(--text-muted)" }}>
        ● neutral (marks both orders) · → directed, read row → col · ↺ self-relation
      </p>
    </div>
  );
}

const editorBox = {
  border: "1px solid var(--lens-accent)",
  background: "var(--bg-secondary)",
  borderRadius: "var(--radius-lg)",
  boxShadow: "var(--shadow-card-hover)",
} as const;

// Inline counterparts of the Klir popover bodies (NodePopover / EdgePopover's
// KlirBody): under this register the text is where things are edited, so the
// editors sit in the listing itself instead of floating over a picture. Same
// verbs, no new semantics.
function ThingEditor({
  thing,
  decompose,
  onUpdate,
  onDelete,
  onClose,
}: {
  thing: Thing;
  decompose: DecomposeAffordance | null;
  onUpdate: (t: Thing) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  return (
    <div className="w-64 rounded-xl p-3" style={editorBox}>
      <Title>
        thing&nbsp;&ldquo;{thing.name || "unnamed"}&rdquo;
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
  );
}

function RelationEditor({
  relation,
  sigIndex,
  tuple,
  onUpdate,
  onDelete,
  onClose,
}: {
  relation: Relation;
  sigIndex: number;
  tuple: string;
  onUpdate: (r: Relation) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const directed = relation.klir_directed === true;
  return (
    <div className="w-72 rounded-xl p-3" style={editorBox}>
      <Title>
        relation r{sigIndex + 1} <span style={{ fontFamily: "var(--font-mono)", fontWeight: 400 }}>= {tuple}</span>
      </Title>
      <FormalismLine parts={klirFormalism(sigIndex)} />
      <Row>
        <span style={{ color: "var(--text-secondary)" }}>name</span>
        <input
          value={relation.name}
          onChange={(e) => onUpdate({ ...relation, name: e.target.value })}
          placeholder="e.g. referral"
          className="w-32 rounded-md px-1.5 py-0.5 text-xs"
          style={{ border: "1px solid var(--border)", background: "var(--bg-primary)", color: "var(--text-primary)" }}
        />
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
      <div className="flex justify-between border-t pt-1" style={{ borderColor: "var(--hairline)" }}>
        <button onClick={onDelete} className="rounded-full px-3 py-1 text-xs" style={{ color: "var(--verdict-error)" }}>
          delete
        </button>
        <button onClick={onClose} className="rounded-full px-3 py-1 text-xs" style={{ color: "var(--text-muted)" }}>
          close
        </button>
      </div>
    </div>
  );
}
