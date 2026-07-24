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
import type { CanvasModel, KlirLadder, KlirVarKind, Relation, RunResultRich, ScaleType, Thing } from "../kernel/types";
import { validateConnection } from "../kernel";
import { InspectorRow as Row, InspectorTitle as Title, ToolButton as SmallButton } from "../ui";
import { DecomposeRows, type DecomposeAffordance } from "./NodeEditor";
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
  /** #154 P3: the compose run + the scrubber's tick, for the behavior-function
   *  (mask) readout. The same result/tick the InspectorDock's RunPanel reads;
   *  null/absent leaves the mask view in its honest empty state. */
  result?: RunResultRich | null;
  tick?: number;
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
  result,
  tick,
}: Props) {
  const [view, setView] = useState<"sets" | "matrix" | "table" | "mask">("sets");
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
            <SmallButton
              active={view === "table"}
              onClick={() => {
                setView("table");
                setProposed(null);
              }}
              title="Klir's source-system register (Table 4.1) — per variable, its role, scale, and state set"
            >
              table
            </SmallButton>
            <SmallButton
              active={view === "mask"}
              onClick={() => {
                setView("mask");
                setProposed(null);
              }}
              title="Klir's behavior function (Fig. 4.3 / Table 4.3) — the f: Ḡ → G mask read off the run's trajectory"
            >
              mask
            </SmallButton>
          </div>
        </div>

        {/* The ladder complement, expanded on demand: introduction first, then
            the model's position (#100 harvest — see KlirLadderPanel). */}
        {ladder && ladderOpen && <KlirLadderPanel ladder={ladder} onClose={() => setLadderOpen(false)} />}

        {/* ---- Table 4.1 — the source-system register (#154) ------------------- */}
        {view === "table" && (
          <SourceSystemTable
            model={model}
            selectedThingId={selectedThingId}
            onSelectThing={onSelectThing}
            onUpdateThing={onUpdateThing}
          />
        )}

        {/* ---- Fig. 4.3 / Table 4.3 — the behavior-function / mask readout (#154 P3) */}
        {view === "mask" && <MaskTable result={result ?? null} tick={tick} />}

        {(view === "sets" || view === "matrix") && (
          <>
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
          </>
        )}
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

const SCALES: ScaleType[] = ["Nominal", "Ordinal", "Interval", "Ratio"];
const VAR_KINDS: KlirVarKind[] = ["Basic", "Support"];

/** Klir's Table 4.1, the source-system register: one row per variable in T. The
 *  input/output role is DERIVED from R (directed coupling = Klir input=
 *  independent / output=dependent); basic-vs-supporting, the measurement scale,
 *  and the state set are AUTHORED inline. Support-hood is a semantic role (does
 *  this variable index the support set, or is it an observed quantity?), NOT a
 *  reading of R — an isolated variable is not thereby a support, a coupled one
 *  not thereby basic (read-klir.md). Every authored column is editable on
 *  ENVIRONMENT variables too (#154 revision): Table 4.1 most wants the input
 *  variables characterized, and those are frequently the environmental drivers. */
function sourceIo(model: CanvasModel, id: number): string {
  const dirOut = model.relations.some((r) => r.a === id && r.klir_directed === true);
  const dirIn = model.relations.some((r) => r.b === id && r.klir_directed === true);
  const coupled = model.relations.some((r) => r.a === id || r.b === id);
  // a → b reads as a drives b (the matrix's row → col): a variable that only
  // drives is an input, only driven an output, both an in/out coupler.
  return dirOut && dirIn ? "in/out" : dirOut ? "input" : dirIn ? "output" : coupled ? "internal" : "—";
}

export function SourceSystemTable({
  model,
  selectedThingId,
  onSelectThing,
  onUpdateThing,
}: {
  model: CanvasModel;
  selectedThingId: number | null;
  onSelectThing: (id: number | null) => void;
  onUpdateThing: (t: Thing) => void;
}) {
  if (model.things.length === 0) {
    return (
      <p className="pl-6 text-xs" style={{ color: "var(--text-muted)" }}>
        |T| = 0 — add a variable to T first; the source system registers each one.
      </p>
    );
  }
  const th = "px-2 py-1 text-left text-[10px] font-normal";
  return (
    <section className="mb-4">
      <div className="mb-1 text-xs" style={{ ...mono, color: "var(--text-secondary)" }}>
        source system — Table 4.1
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-separate" style={{ borderSpacing: 0 }}>
          <thead>
            <tr>
              <th className={th} style={headerCellStyle}>variable</th>
              <th className={th} style={headerCellStyle} title="Klir's basic-vs-supporting standing — authored (a semantic role, not read off R); basic = observed quantity, support = indexes the support set (time/space/pop)">basic/support</th>
              <th className={th} style={headerCellStyle} title="derived from directed relations (a → b): drives = input, driven = output">in/out</th>
              <th className={th} style={headerCellStyle} title="Klir's measurement scale — authored">scale</th>
              <th className={th} style={headerCellStyle} title="the values the variable can take — authored">state set</th>
            </tr>
          </thead>
          <tbody>
            {model.things.map((t) => {
              const io = sourceIo(model, t.id);
              const selected = t.id === selectedThingId;
              return (
                <tr key={t.id} style={{ background: selected ? "color-mix(in srgb, var(--lens-accent) 12%, transparent)" : undefined }}>
                  <td className="px-2 py-1 text-sm" style={{ ...mono, borderBottom: "1px solid var(--hairline)" }}>
                    <button
                      onClick={() => onSelectThing(selected ? null : t.id)}
                      style={{ color: "var(--text-primary)" }}
                      title="click to select this variable"
                    >
                      {t.name || `t${t.id}`}
                    </button>
                  </td>
                  <td className="px-2 py-1" style={{ borderBottom: "1px solid var(--hairline)" }}>
                    <select
                      value={t.variable_kind ?? "Basic"}
                      onChange={(e) =>
                        // Basic is the default — clear to None rather than store it.
                        onUpdateThing({ ...t, variable_kind: e.target.value === "Support" ? "Support" : undefined })
                      }
                      className="rounded-md px-1 py-0.5 text-xs"
                      style={{ border: "1px solid var(--border)", background: "var(--bg-primary)", color: "var(--text-primary)" }}
                    >
                      {VAR_KINDS.map((k) => (
                        <option key={k} value={k}>{k}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-1 text-xs" style={{ ...mono, color: "var(--text-muted)", borderBottom: "1px solid var(--hairline)" }}>
                    {io}
                  </td>
                  <td className="px-2 py-1" style={{ borderBottom: "1px solid var(--hairline)" }}>
                    <select
                      value={t.scale ?? ""}
                      onChange={(e) =>
                        onUpdateThing({ ...t, scale: (e.target.value || undefined) as ScaleType | undefined })
                      }
                      className="rounded-md px-1 py-0.5 text-xs"
                      style={{ border: "1px solid var(--border)", background: "var(--bg-primary)", color: "var(--text-primary)" }}
                    >
                      <option value="">—</option>
                      {SCALES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-1" style={{ borderBottom: "1px solid var(--hairline)" }}>
                    <StatesInput
                      value={t.states}
                      onCommit={(labels) => onUpdateThing({ ...t, states: labels })}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-1 text-[10px]" style={{ color: "var(--text-muted)" }}>
        in/out is read off R; basic/support, scale, and the state set are authored (on environment variables too).
      </p>
    </section>
  );
}

/** The state-set cell editor — enumerated value labels as a comma-separated
 *  list (`Green, Yellow, Red`), the Klir set literal minus the braces. Commits
 *  on Enter/blur; an empty field clears the declaration. */
function StatesInput({
  value,
  onCommit,
}: {
  value: string[] | undefined;
  onCommit: (labels: string[] | undefined) => void;
}) {
  const [draft, setDraft] = useState((value ?? []).join(", "));
  useEffect(() => setDraft((value ?? []).join(", ")), [value]);
  const commit = () => {
    const labels = draft
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    onCommit(labels.length ? labels : undefined);
  };
  return (
    <input
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        if (e.key === "Escape") {
          setDraft((value ?? []).join(", "));
          (e.target as HTMLInputElement).blur();
        }
      }}
      placeholder="e.g. Green, Yellow, Red"
      className="w-40 rounded-md px-1.5 py-0.5 text-xs"
      style={{ ...mono, border: "1px solid var(--border)", background: "var(--bg-primary)", color: "var(--text-primary)" }}
    />
  );
}

// #154 P3: the current mask row — the step whose Ḡ sits at the scrubber tick.
// Mirrors P1's BungeStateSpace.markerIndex clamp so the live highlight never
// points past the last step (the final tick has no successor, hence no Ḡ→G row).
export function maskRowIndex(tick: number | undefined, rows: number): number | null {
  if (tick == null || rows === 0) return null;
  return Math.max(0, Math.min(rows - 1, Math.round(tick)));
}

function fmtState(v: number | undefined): string {
  if (v == null || !Number.isFinite(v)) return "—";
  return String(Math.round(v * 1000) / 1000);
}

/** The mask panel's standing caveat — the condition the P3 scope rests on. */
function MaskCaption() {
  return (
    <p className="mt-1 text-[10px] leading-snug" style={{ color: "var(--text-muted)" }}>
      f: Ḡ → G read off a <strong>Mobus conservation run</strong>'s recorded trajectory — the
      coalgebra step T (dynamics-coalgebra-halfa.md), the first-order deterministic step (support
      window = the current tick alone). Whether this is Klir's mask on Klir-native data is{" "}
      <strong>deferred</strong> to a runnable Klir model (#67); richer declared-support windows and
      the Transition descriptor are future work.
    </p>
  );
}

/** Klir's behavior function / mask (Fig. 4.3, Table 4.3), the f: Ḡ → G table,
 *  presented in the Klir register. Per tick t, one row: Ḡ = the state vector at
 *  t → G = the state vector at t+1, sourced from the compose run's per-tick
 *  trajectories. This is the coalgebra structure map T read in Klir's register
 *  (dynamics-coalgebra-halfa.md), the same object the Bunge trajectory unfolds.
 *  It reads a run; it steps nothing. No run → an honest empty state. */
export function MaskTable({ result, tick }: { result: RunResultRich | null; tick?: number }) {
  const traj = result?.trajectories ?? [];
  const n = traj.length === 0 ? 0 : Math.min(...traj.map((t) => t.series.length));
  // Each row is a step t → t+1, so the final sampled tick yields no row.
  const rows = Math.max(0, n - 1);
  const hi = maskRowIndex(tick, rows);

  if (rows === 0) {
    return (
      <section className="mb-4">
        <div className="mb-1 text-xs" style={{ ...mono, color: "var(--text-secondary)" }}>
          behavior function — Fig. 4.3 / Table 4.3
        </div>
        <p className="pl-6 text-xs" style={{ color: "var(--text-muted)" }}>
          No run to read — the mask f: Ḡ → G is a reading of a recorded trajectory. Run a demo
          bundle (model + CSV + mapping) with ≥2 sampled ticks to populate it.
        </p>
        <MaskCaption />
      </section>
    );
  }

  const th = "px-2 py-1 text-left text-[10px] font-normal";
  return (
    <section className="mb-4">
      <div className="mb-1 text-xs" style={{ ...mono, color: "var(--text-secondary)" }}>
        behavior function — Fig. 4.3 / Table 4.3 · f: Ḡ → G
      </div>
      <div className="overflow-x-auto">
        <table className="w-full border-separate" style={{ borderSpacing: 0 }}>
          <thead>
            <tr>
              <th className={th} style={headerCellStyle}>t</th>
              {traj.map((tr, i) => (
                <th key={`g-${i}`} className={th} style={headerCellStyle} title={`Ḡ — ${tr.name} at tick t`}>
                  Ḡ:{tr.name}
                </th>
              ))}
              {traj.map((tr, i) => (
                <th key={`gg-${i}`} className={th} style={headerCellStyle} title={`G — ${tr.name} at tick t+1`}>
                  G:{tr.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }, (_, t) => {
              const current = t === hi;
              return (
                <tr
                  key={t}
                  aria-current={current ? "step" : undefined}
                  style={{ background: current ? "color-mix(in srgb, var(--lens-accent) 18%, transparent)" : undefined }}
                >
                  <td className="px-2 py-1 text-xs" style={{ ...mono, color: "var(--text-muted)", borderBottom: "1px solid var(--hairline)" }}>
                    {t}{current ? " ◂" : ""}
                  </td>
                  {traj.map((tr, i) => (
                    <td key={`g-${i}`} className="px-2 py-1 text-sm tabular" style={{ ...mono, color: "var(--text-primary)", borderBottom: "1px solid var(--hairline)" }}>
                      {fmtState(tr.series[t])}
                    </td>
                  ))}
                  {traj.map((tr, i) => (
                    <td key={`gg-${i}`} className="px-2 py-1 text-sm tabular" style={{ ...mono, color: "var(--text-secondary)", borderBottom: "1px solid var(--hairline)" }}>
                      {fmtState(tr.series[t + 1])}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <MaskCaption />
    </section>
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
