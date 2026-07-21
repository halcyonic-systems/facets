// The Klir canvas register (#100 phase 1): the incidence matrix IS the canvas.
// (T, R) is relational structure and Klir thinks in tables, so the T×T table is
// the modeling medium — things are the row/column headers, relations are filled
// cells, and every authoring act happens in the table: click an empty cell to
// relate, a filled cell to edit or unrelate, the + header to add a thing (one
// gesture, one new row AND column). The tuple listing rides alongside as a
// marginal readout of the same data; the node-and-edge picture demotes to a
// small locator margin (also the diagram-export subject, via .canvas-stage).
//
// Division of labor is unchanged from the diagram face: relating still asks the
// kernel (validateConnection) before an edge exists, analyze_canvas re-judges
// on every change, and nothing here derives a systems fact — the matrix only
// re-typesets the model the way Klir would write it down.
import { useState } from "react";
import type { CanvasModel, Relation, Thing } from "../kernel/types";
import { validateConnection } from "../kernel";
import { contentBounds, edgeGeometry, fitToBox, NODE_R } from "./geometry";
import { relationsAt, sigLabel, nextFreeId, mintThingPosition } from "./klirTable";
import type { PaletteTool } from "./lenses/registry";

interface Props {
  model: CanvasModel;
  onModelChange: (m: CanvasModel) => void;
  onReject: (message: string) => void;
  /** The rail's armed tool — a place-tool click on the register's empty space
   *  adds a thing, same act as the + header (repeat-stamp; Esc disarms). */
  armed?: PaletteTool | null;
  /** Double-click a row header — the decomposition walk's enter gesture. The
   *  register only reports it; whether the thing has a child is the shell's call. */
  onEnterThing?: (thing: Thing) => void;
  /** The containing system's name (#100 phase 0) — click to rename (#116). */
  placeName?: string | null;
}

const CELL = 34;

export default function KlirMatrix({
  model,
  onModelChange,
  onReject,
  armed = null,
  onEnterThing,
  placeName = null,
}: Props) {
  // Click-to-edit place label (#116): same contract as the diagram face —
  // writes the model's SELF-name (the SL `system "..."` declaration), Escape
  // cancels, Enter/blur commits, an empty commit clears to unnamed.
  const [nameDraft, setNameDraft] = useState<string | null>(null);
  // In-table rename draft for one thing's header.
  const [headerDraft, setHeaderDraft] = useState<{ id: number; value: string } | null>(null);
  // Draft name for the thing the + header is about to add.
  const [addDraft, setAddDraft] = useState<string | null>(null);
  // The open cell — its relations get the editor strip below the table.
  const [openCell, setOpenCell] = useState<{ row: number; col: number } | null>(null);

  const things = model.things;
  const openRelations = openCell ? relationsAt(model, openCell.row, openCell.col) : [];
  const byId = new Map(things.map((t) => [t.id, t]));
  const nameOf = (id: number) => byId.get(id)?.name ?? `#${id}`;

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

  const commitHeader = () => {
    if (!headerDraft) return;
    const name = headerDraft.value.trim();
    if (name)
      onModelChange({
        ...model,
        things: things.map((t) => (t.id === headerDraft.id ? { ...t, name } : t)),
      });
    setHeaderDraft(null);
  };

  // Adding a thing is one act with two appearances: the matrix grows a row AND
  // a column, because both are the same member of T.
  const addThing = (rawName: string) => {
    const id = nextFreeId(things.map((t) => t.id));
    const name = rawName.trim() || `T${id}`;
    const at = mintThingPosition(things);
    onModelChange({ ...model, things: [...things, { id, name, x: at.x, y: at.y, role: "Component" }] });
  };

  // Deleting a thing cascades to its relations — a cell can't reference a
  // header that no longer exists (same discipline as the shell's deleteThing).
  const deleteThing = (id: number) => {
    onModelChange({
      ...model,
      things: things.filter((t) => t.id !== id),
      relations: model.relations.filter((r) => r.a !== id && r.b !== id),
    });
    setOpenCell(null);
  };

  // Relating = clicking the empty cell. The candidate is neutral (Klir's
  // default; direction is the observer's later toggle) and the KERNEL judges it
  // before it exists — a rejection surfaces as a toast and adds nothing.
  const relate = (row: number, col: number) => {
    const candidate: Relation = {
      id: nextFreeId(model.relations.map((r) => r.id)),
      a: row,
      b: col,
      name: "",
      is_bond: true,
      kind: "Unspecified",
    };
    try {
      const verdict = validateConnection(model, candidate);
      if (verdict.issues.length === 0) {
        onModelChange({ ...model, relations: [...model.relations, candidate] });
        setOpenCell({ row, col });
      } else {
        onReject(verdict.issues[0].message);
      }
    } catch (err) {
      onReject(err instanceof Error ? err.message : String(err));
    }
  };

  const updateRelation = (next: Relation) =>
    onModelChange({ ...model, relations: model.relations.map((r) => (r.id === next.id ? next : r)) });

  const unrelate = (id: number) => {
    onModelChange({ ...model, relations: model.relations.filter((r) => r.id !== id) });
  };

  // What a cell shows: nothing (empty), ● (one neutral occupant), → (directed,
  // read row → col), ↺ (diagonal self-relation), with a ×N count when stacked.
  const cellGlyph = (row: number, col: number, rs: Relation[]): string => {
    if (rs.length === 0) return "";
    const head = row === col ? "↺" : rs.some((r) => r.klir_directed === true && r.a === row) ? "→" : "●";
    return rs.length > 1 ? `${head}×${rs.length}` : head;
  };

  const cellTitle = (rs: Relation[]): string =>
    rs
      .map((r) => `${sigLabel(model, r)}${r.name ? ` "${r.name}"` : ""} = (${nameOf(r.a)}, ${nameOf(r.b)})${r.klir_directed ? " directed" : ""}`)
      .join(" · ");

  const isOpen = (row: number, col: number) => openCell !== null && openCell.row === row && openCell.col === col;

  // The tuple listing — the marginal readout of the same data the table edits.
  const tupleR = model.relations.map(
    (r) =>
      `${sigLabel(model, r)}${r.name ? ` "${r.name}"` : ""} = (${nameOf(r.a)}, ${nameOf(r.b)})${r.klir_directed ? " →" : ""}`,
  );

  // The demoted node-and-edge picture: world-scale drawing under a fit
  // transform, so the thumbnail stays a thumbnail while diagram export (which
  // reads .canvas-stage, neutralizes the transform, and reframes on content
  // bounds) still yields a full-size picture.
  const box = contentBounds(model);
  const LOC_W = 216;
  const LOC_H = 140;
  const locFit = box ? fitToBox(box, LOC_W, LOC_H) : null;

  const headerCellStyle: React.CSSProperties = {
    background: "var(--bg-secondary)",
    color: "var(--text-secondary)",
    borderBottom: "1px solid var(--hairline)",
    borderRight: "1px solid var(--hairline)",
  };

  return (
    <div
      className="absolute inset-0 flex flex-col"
      style={{ background: "var(--bg-primary)" }}
      onPointerDown={(e) => {
        // A place-tool click on the register's own backdrop adds a thing —
        // the rail gesture and the + header are the same act here.
        if (armed?.verb === "place" && e.target === e.currentTarget) addThing("");
      }}
    >
      {/* The place label (#100 phase 0): copy does the you-are-here work. */}
      <div className="flex justify-center pt-2 pb-1">
        {nameDraft !== null ? (
          <input
            autoFocus
            className="w-40 rounded-md border px-2 py-1 text-xs font-body"
            style={{ borderColor: "var(--lens-accent)", background: "var(--bg-secondary)", color: "var(--text-primary)" }}
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
          placeName && (
            <button
              className="cursor-text font-mono text-[11px]"
              style={{ color: "var(--text-muted)" }}
              title="Click to rename this system (writes the SL system declaration)"
              onClick={() => setNameDraft(model.name ?? "")}
            >
              viewing: {placeName}
            </button>
          )
        )}
      </div>

      <div className="flex min-h-0 flex-1">
        {/* The matrix — the place where modeling happens. */}
        <div
          className="min-w-0 flex-1 overflow-auto p-4"
          onPointerDown={(e) => {
            if (armed?.verb === "place" && e.target === e.currentTarget) addThing("");
          }}
        >
          <table className="border-separate" style={{ borderSpacing: 0 }}>
            <thead>
              <tr>
                <th
                  className="sticky left-0 top-0 z-20 px-2 text-left align-bottom font-mono text-[10px] font-normal"
                  style={headerCellStyle}
                >
                  R ⊆ T×T
                </th>
                {things.map((t) => (
                  <th
                    key={t.id}
                    className="sticky top-0 z-10 px-1 pb-1 align-bottom font-mono text-[10px] font-normal"
                    style={{ ...headerCellStyle, maxWidth: CELL, minWidth: CELL }}
                    title={`${t.name} — rename in its row header`}
                  >
                    <span
                      className="inline-block overflow-hidden"
                      style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", maxHeight: 96 }}
                    >
                      {t.name}
                    </span>
                  </th>
                ))}
                {/* + column: the same act as the + row below — one new member of T. */}
                <th className="sticky top-0 z-10 px-1 align-bottom font-mono text-[10px] font-normal" style={headerCellStyle}>
                  <button
                    style={{ color: "var(--text-muted)" }}
                    title="add a thing — a new row and column of the matrix"
                    onClick={() => setAddDraft((d) => (d === null ? "" : d))}
                  >
                    +
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {things.map((rowT) => (
                <tr key={rowT.id}>
                  <th
                    className="group sticky left-0 z-10 whitespace-nowrap px-2 py-0 text-left font-mono text-[11px] font-normal"
                    style={{ ...headerCellStyle, height: CELL }}
                    onDoubleClick={() => onEnterThing?.(rowT)}
                    title={
                      rowT.child_model
                        ? `${rowT.name} — decomposes into "${rowT.child_model.name}"; double-click to enter`
                        : `${rowT.name} — click to rename`
                    }
                  >
                    {headerDraft?.id === rowT.id ? (
                      <input
                        autoFocus
                        className="w-24 rounded border px-1 text-[11px] font-mono"
                        style={{ borderColor: "var(--lens-accent)", background: "var(--bg-surface)", color: "var(--text-primary)" }}
                        value={headerDraft.value}
                        onChange={(e) => setHeaderDraft({ id: rowT.id, value: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commitHeader();
                          if (e.key === "Escape") setHeaderDraft(null);
                        }}
                        onBlur={commitHeader}
                      />
                    ) : (
                      <>
                        <button
                          className="cursor-text"
                          style={{ color: "var(--text-secondary)" }}
                          onClick={() => setHeaderDraft({ id: rowT.id, value: rowT.name })}
                        >
                          {rowT.name}
                          {rowT.child_model ? " ▸" : ""}
                        </button>
                        <button
                          className="ml-1 opacity-0 group-hover:opacity-100"
                          style={{ color: "var(--text-muted)" }}
                          title={`remove ${rowT.name} from T (its relations go with it)`}
                          onClick={() => deleteThing(rowT.id)}
                        >
                          ×
                        </button>
                      </>
                    )}
                  </th>
                  {things.map((colT) => {
                    const rs = relationsAt(model, rowT.id, colT.id);
                    const open = isOpen(rowT.id, colT.id);
                    return (
                      <td
                        key={colT.id}
                        className="cursor-pointer text-center font-mono text-[11px]"
                        style={{
                          width: CELL,
                          height: CELL,
                          borderBottom: "1px solid var(--hairline)",
                          borderRight: "1px solid var(--hairline)",
                          background: open
                            ? "var(--lens-accent-soft)"
                            : rowT.id === colT.id
                              ? "color-mix(in srgb, var(--lens-accent) 6%, transparent)"
                              : rs.length > 0
                                ? "color-mix(in srgb, var(--lens-accent) 14%, transparent)"
                                : "var(--bg-primary)",
                          color: "var(--text-secondary)",
                          outline: open ? "1.5px solid var(--lens-accent)" : undefined,
                          outlineOffset: -1.5,
                        }}
                        title={
                          rs.length > 0
                            ? `${cellTitle(rs)} — click to edit / unrelate`
                            : `relate (${rowT.name}, ${colT.name})`
                        }
                        onClick={() => (rs.length > 0 ? setOpenCell({ row: rowT.id, col: colT.id }) : relate(rowT.id, colT.id))}
                      >
                        {cellGlyph(rowT.id, colT.id, rs)}
                      </td>
                    );
                  })}
                  <td style={{ borderBottom: "1px solid var(--hairline)" }} />
                </tr>
              ))}
              {/* + row: adding a thing grows the matrix by one row and one column. */}
              <tr>
                <th
                  className="sticky left-0 z-10 whitespace-nowrap px-2 text-left font-mono text-[11px] font-normal"
                  style={{ ...headerCellStyle, height: CELL }}
                >
                  {addDraft !== null ? (
                    <input
                      autoFocus
                      className="w-24 rounded border px-1 text-[11px] font-mono"
                      style={{ borderColor: "var(--lens-accent)", background: "var(--bg-surface)", color: "var(--text-primary)" }}
                      value={addDraft}
                      placeholder="name…"
                      onChange={(e) => setAddDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          addThing(addDraft);
                          setAddDraft(null);
                        }
                        if (e.key === "Escape") setAddDraft(null);
                      }}
                      onBlur={() => setAddDraft(null)}
                    />
                  ) : (
                    <button
                      style={{ color: "var(--text-muted)" }}
                      title="add a thing — a new row and column of the matrix"
                      onClick={() => setAddDraft("")}
                    >
                      + thing
                    </button>
                  )}
                </th>
                {things.map((t) => (
                  <td key={t.id} style={{ borderRight: "1px solid var(--hairline)" }} />
                ))}
                <td />
              </tr>
            </tbody>
          </table>

          {/* The cell editor — docked under the table, not floated over it, so
              restructuring stays a table-shaped act: pick a cell, work its rows. */}
          {openCell && (
            <div
              className="mt-3 max-w-xl rounded-lg border px-3 py-2 text-xs"
              style={{ borderColor: "var(--lens-accent)", background: "var(--bg-secondary)" }}
            >
              <div className="mb-1 flex items-center justify-between font-mono" style={{ color: "var(--text-secondary)" }}>
                <span>
                  cell ({nameOf(openCell.row)}, {nameOf(openCell.col)})
                </span>
                <button style={{ color: "var(--text-muted)" }} onClick={() => setOpenCell(null)}>
                  close
                </button>
              </div>
              {openRelations.length === 0 ? (
                <div style={{ color: "var(--text-muted)" }}>now empty — click the cell again to relate</div>
              ) : (
                openRelations.map((r) => (
                  <div key={r.id} className="flex flex-wrap items-center gap-2 py-1">
                    <span className="font-mono" style={{ color: "var(--text-muted)" }}>
                      {sigLabel(model, r)}
                    </span>
                    <input
                      className="w-32 rounded border px-1.5 py-0.5"
                      style={{ borderColor: "var(--hairline)", background: "var(--bg-surface)", color: "var(--text-primary)" }}
                      value={r.name}
                      placeholder="name…"
                      onChange={(e) => updateRelation({ ...r, name: e.target.value })}
                    />
                    <label className="flex items-center gap-1" style={{ color: "var(--text-secondary)" }}>
                      <input
                        type="checkbox"
                        checked={r.klir_directed === true}
                        onChange={(e) => updateRelation({ ...r, klir_directed: e.target.checked })}
                      />
                      directed {nameOf(r.a)} → {nameOf(r.b)}
                    </label>
                    <button
                      style={{ color: "var(--verdict-error)" }}
                      title="remove this relation from R"
                      onClick={() => unrelate(r.id)}
                    >
                      unrelate
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* The margin: tuple listing (same data, set notation) over the demoted
            node-and-edge locator. Reading order matches Eq. 1.1 — T, then R. */}
        <aside
          className="w-64 shrink-0 overflow-y-auto border-l px-3 pb-3 pt-10 font-mono text-[11px]"
          style={{ borderColor: "var(--hairline)", background: "var(--bg-secondary)", color: "var(--text-secondary)" }}
        >
          <div className="mb-2">
            <span style={{ color: "var(--text-muted)" }}>T = </span>
            {"{ "}
            {things.map((t) => t.name).join(", ")}
            {" }"}
          </div>
          <div className="mb-3">
            <span style={{ color: "var(--text-muted)" }}>R = </span>
            {tupleR.length === 0 ? "∅" : "{"}
            {tupleR.map((line, i) => (
              <div key={i} className="pl-3">
                {line}
                {i < tupleR.length - 1 ? "," : ""}
              </div>
            ))}
            {tupleR.length > 0 && "}"}
          </div>
          {locFit && (
            <div>
              <div className="mb-1" style={{ color: "var(--text-muted)" }}>
                as a picture
              </div>
              <svg
                className="canvas-stage rounded border"
                width={LOC_W}
                height={LOC_H}
                style={{ borderColor: "var(--hairline)", background: "var(--bg-primary)" }}
                pointerEvents="none"
              >
                <g transform={`translate(${locFit.pan.x}, ${locFit.pan.y}) scale(${locFit.scale})`}>
                  {model.relations.map((r) => {
                    const geo = edgeGeometry(model, r, false);
                    return geo ? (
                      <path
                        key={r.id}
                        d={geo.d}
                        fill="none"
                        stroke="var(--text-secondary)"
                        strokeWidth={2}
                        opacity={0.6}
                      />
                    ) : null;
                  })}
                  {things.map((t) => (
                    <g key={t.id}>
                      <circle
                        cx={t.x}
                        cy={t.y}
                        r={NODE_R}
                        fill="var(--bg-surface)"
                        stroke="var(--lens-node-stroke)"
                        strokeWidth={2}
                      />
                      <text
                        x={t.x}
                        y={t.y}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fontSize={12}
                        fill="var(--text-secondary)"
                        className="font-mono"
                      >
                        {t.name}
                      </text>
                    </g>
                  ))}
                </g>
              </svg>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
