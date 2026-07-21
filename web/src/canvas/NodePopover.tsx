// Per-lens node editing — the element inspector's popover form (harvest of the
// egui blind-pick's inspector organ, #5). Rename everywhere; the work-process
// row is Mobus-only and READ/EDIT (the rail's stamp is write-only by design —
// this is where a stamped primitive becomes editable/clearable). Every edit
// flows through onUpdateThing → App re-runs analyze_canvas in Rust; nothing
// here decides a systems fact. Work processes are Economy-side content — the
// row deliberately says "work process", not "agent" (Mobus ch. 10: agents are
// the decision ovals INSIDE process ovals; agent designation is future work).
import type { Lens, ProcessPrimitive, Thing } from "../kernel/types";
import type { Pt } from "./geometry";
import { InspectorRow as Row, InspectorTitle as Title, ToolButton as SmallButton } from "../ui";

/** The decomposition door as the shell hands it to the inspector (#89 step 5b).
 *  Which case applies is decided upstream off KERNEL facts (boundary membership
 *  = lens_facts.boundary_thing_ids); the popover only renders the affordance. */
export type DecomposeAffordance =
  | { kind: "ready"; onDecompose: () => void }
  | { kind: "interface" }
  | { kind: "entered"; label: string; onEnter: () => void };

const PRIMITIVES: ProcessPrimitive[] = [
  "Combining",
  "Splitting",
  "Buffering",
  "Impeding",
  "Propelling",
  "Copying",
  "Sensing",
  "Modulating",
  "Amplifying",
  "Inverting",
];

export function NodePopover({
  thing,
  lens,
  anchor,
  onUpdateThing,
  onDelete,
  onClose,
  decompose = null,
}: {
  thing: Thing;
  lens: Lens;
  anchor: Pt;
  onUpdateThing: (t: Thing) => void;
  onDelete: () => void;
  onClose: () => void;
  decompose?: DecomposeAffordance | null;
}) {
  const isComponent = thing.role === "Component";
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
      <Title>
        {lens === "Klir" ? "thing" : isComponent ? "component" : lens === "Mobus" ? "environment object" : "environment thing"}
        &nbsp;&ldquo;{thing.name || "unnamed"}&rdquo;
      </Title>
      <Row>
        <span style={{ color: "var(--text-secondary)" }}>name</span>
        <input
          value={thing.name}
          onChange={(e) => onUpdateThing({ ...thing, name: e.target.value })}
          className="w-28 rounded-md px-1.5 py-0.5 text-xs"
          style={{ border: "1px solid var(--border)", background: "var(--bg-primary)", color: "var(--text-primary)" }}
        />
      </Row>
      {/* The re-cut (#100 phase 2, ratified scope + F8): Bunge's C/E split is
          indexed to a chosen reference class A — 𝒞_A, 𝓔_A, 𝒮_A — so which
          side of the cut a thing sits on is the OBSERVER'S choice, re-drawable
          at will. Moving a thing across the partition IS choosing A anew; the
          kernel re-derives ℰ, 𝒮, and the hull from the new 𝒞 (the App
          narrates that dependency at the moment it is enacted). Bunge-only:
          under Mobus a source/sink is a different glyph vocabulary, not a
          re-cuttable cut. A decomposed component stays put — its child model
          is anchored to its being in 𝒞. */}
      {lens === "Bunge" && (
        <Row>
          <span style={{ color: "var(--text-secondary)" }}>side of the cut</span>
          <div className="flex gap-1" title={
            thing.child_model
              ? "this component decomposes into a child model — the reference class holds it in 𝒞"
              : "the C/E partition is relative to the reference class A (Def 1.2) — re-cut by moving this thing across it"
          }>
            <SmallButton
              active={isComponent}
              disabled={!!thing.child_model && !isComponent}
              onClick={() => !isComponent && onUpdateThing({ ...thing, role: "Component" })}
            >
              𝒞
            </SmallButton>
            <SmallButton
              active={!isComponent}
              disabled={!!thing.child_model && isComponent}
              onClick={() => isComponent && onUpdateThing({ ...thing, role: "Environment" })}
            >
              ℰ
            </SmallButton>
          </div>
        </Row>
      )}
      {lens === "Mobus" && isComponent && (
        <Row>
          <span style={{ color: "var(--text-secondary)" }}>work process</span>
          <select
            value={thing.primitive ?? ""}
            onChange={(e) => {
              const v = e.target.value as ProcessPrimitive | "";
              const next = { ...thing };
              if (v === "") delete next.primitive;
              else next.primitive = v;
              onUpdateThing(next);
            }}
            className="rounded-md px-1.5 py-0.5 text-xs"
            style={{ border: "1px solid var(--border)", background: "var(--bg-primary)", color: "var(--text-primary)" }}
          >
            <option value="">none</option>
            {PRIMITIVES.map((p) => (
              <option key={p} value={p}>
                {p.toLowerCase()}
              </option>
            ))}
          </select>
        </Row>
      )}
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

/** The decomposition door's three faces, shared with the Klir register (#100)
 *  — same affordance, wherever the thing editor happens to live. */
export function DecomposeRows({ decompose }: { decompose: DecomposeAffordance }) {
  return (
    <div className="mb-1 mt-1 border-t pt-2" style={{ borderColor: "var(--hairline)" }}>
      {decompose.kind === "ready" && (
        <button
          onClick={decompose.onDecompose}
          className="w-full rounded-md px-2 py-1 text-left text-xs font-semibold"
          style={{ color: "var(--lens-accent)", border: "1px dashed var(--border)" }}
          title="Derive a child model from this component's flows and open it for authoring"
        >
          decompose this component
        </button>
      )}
      {decompose.kind === "interface" && (
        <>
          <button
            disabled
            className="w-full rounded-md px-2 py-1 text-left text-xs"
            style={{ color: "var(--text-muted)", border: "1px dashed var(--border)", opacity: 0.6, cursor: "not-allowed" }}
          >
            decompose this component
          </button>
          <p className="mt-1 text-[10px] leading-snug" style={{ color: "var(--text-muted)" }}>
            v1 can't decompose an interface component — its membrane-crossing
            flows aren't in the checked boundary contract yet. Decompose an
            interior component instead.
          </p>
        </>
      )}
      {decompose.kind === "entered" && (
        <div className="flex items-center justify-between gap-2">
          <span className="min-w-0 truncate text-[11px]" style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)" }} title={decompose.label}>
            decomposes &ldquo;{decompose.label}&rdquo;
          </span>
          <button
            onClick={decompose.onEnter}
            className="shrink-0 rounded-full px-3 py-1 text-xs font-semibold"
            style={{ background: "var(--lens-accent)", color: "#fff" }}
            title="Enter the child model (double-clicking the node also enters)"
          >
            enter →
          </button>
        </div>
      )}
    </div>
  );
}
