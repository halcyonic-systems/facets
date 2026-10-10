// Per-lens node editing — the element inspector's form (harvest of the egui
// blind-pick's inspector organ, #5). Rename everywhere; the work-process row is
// Mobus-only and READ/EDIT (the rail's stamp is write-only by design — this is
// where a stamped primitive becomes editable/clearable). Every edit flows
// through onUpdateThing → App re-runs analyze_canvas in Rust; nothing here
// decides a systems fact. Work processes are Economy-side content — the row
// deliberately says "work process", not "agent" (Mobus ch. 10: agents are the
// decision ovals INSIDE process ovals; agent designation is future work).
//
// These are ROWS, not a popover (#122 ruling, 2026-07-22): the rows mount in
// whatever surface the active reading docks them in — the inspector dock on the
// canvas, the register's own inline editor in a register. Nothing anchored at
// the pointer, so the first click of a double-click can never flash a menu into
// the gesture that enters a child.
import type { AgentRule, Lens, ProcessPrimitive, Thing } from "../kernel/types";
import { PRIMITIVE_GLOSS, PRIMITIVE_WORD } from "./types";
import { DescriptionField, GroundingField, InspectorRow as Row, InspectorTitle as Title, ToolButton as SmallButton } from "../ui";
import { AGENT_RULE_DEFAULTS } from "./useCanvasGestures";

/** The decomposition door as the shell hands it to the inspector (#89 step 5b).
 *  Two cases: a component that has a child to enter, and one that does not yet.
 *  The third — the v1 refusal for a boundary component — is gone: SSF #43
 *  extended the contract to membrane crossings, so a component on the boundary
 *  decomposes like any other and the kernel says so in its own words if a
 *  particular seam does not hold. */
export type DecomposeAffordance =
  | { kind: "ready"; onDecompose: () => void }
  | { kind: "entered"; label: string; onEnter: () => void };

/** The closed rule set (facets#269, ADR 0008 D4) and each rule's numbers, in
 *  the order the agent line spells them; the bag keys are the words. A
 *  table's words are read off the bag (`under1`, `emit1`, … `else`), since
 *  its arity is the line's; the inspector edits the numbers and SL adds or
 *  removes a bin. */
const RULES: { rule: AgentRule; words: string[] | ((bag: Record<string, number>) => string[]); optional?: string[]; gloss: string }[] = [
  { rule: "proportional", words: ["target", "gain"], gloss: "emits gain · (target − level), floored at zero — Wiener's error correction; at gain 1 it is the comparator exactly" },
  {
    rule: "threshold",
    words: ["above", "below", "emit", "else"],
    // facets#517: the hysteresis band is optional; blank means no band, the
    // switch turning at one level as before.
    optional: ["below"],
    gloss: "emits `emit` at or above the level, `else` below it — the on–off thermostat; a square wave no primitive can make. With `below` set it holds its last command between the two levels: the relay's dead band, what stops it chattering",
  },
  {
    rule: "table",
    words: (bag) => {
      const words: string[] = [];
      for (let i = 1; bag[`under${i}`] !== undefined; i++) words.push(`under${i}`, `emit${i}`);
      return [...words, "else"];
    },
    gloss: "emits each bin's output: `emit1` under `under1`, `emit2` from there to under `under2`, … and `else` at or above the last bound — a program of response, contiguous bins under rising bounds, no memory. Adding or removing a bin is done in SL, not here",
  },
  {
    rule: "trace",
    words: ["window", "target", "gain"],
    gloss: "emits gain · (target − mean of its last `window` readings), floored at zero — the homeostatic mechanism over a memory; the window of readings is the engine's run state, and at window 1 it is the proportional rule exactly",
  },
];
const ruleWords = (rule: AgentRule, bag: Record<string, number>): string[] => {
  const r = RULES.find((x) => x.rule === rule);
  return typeof r?.words === "function" ? r.words(bag) : (r?.words ?? []);
};

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

export function NodeEditorRows({
  thing,
  lens,
  onUpdateThing,
  onDelete,
  onClose,
  decompose = null,
}: {
  thing: Thing;
  lens: Lens;
  onUpdateThing: (t: Thing) => void;
  onDelete: () => void;
  /** Clearing the selection. Null in a surface that has no "close" — the dock
   *  keeps the element face up whether or not anything is selected. */
  onClose: (() => void) | null;
  decompose?: DecomposeAffordance | null;
}) {
  const isComponent = thing.role === "Component";
  return (
    <div>
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
      {/* #326: prose about this thing, restored from the original BERT. It sits
          under the name because that is the reading order — what it is called,
          then what it is. No verdict reads it. */}
      <DescriptionField
        value={thing.description ?? ""}
        onChange={(description) => onUpdateThing({ ...thing, description })}
      />
      {/* #411: whose word this thing rests on. Beneath the description, as it
          emits — what it is called, what it is, then on whose word. */}
      <GroundingField
        value={thing.grounding}
        onChange={(grounding) => onUpdateThing({ ...thing, grounding })}
      />
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
        <>
        <Row>
          <span style={{ color: "var(--text-secondary)" }}>cut</span>
          <div className="flex gap-1" title={
            thing.child_model
              ? "this component decomposes into a child model — the reference class holds it in 𝒞"
              : "the C/E partition is relative to the reference class A (Def 1.2) — re-cut by moving this thing across it"
          }>
            <SmallButton
              active={isComponent}
              disabled={!!thing.child_model && !isComponent}
              onClick={() => !isComponent && onUpdateThing({ ...thing, role: "Component" })}
              title="re-cut: put this thing inside the cut (𝒞 — the composition)"
            >
              𝒞
            </SmallButton>
            <SmallButton
              active={!isComponent}
              disabled={!!thing.child_model && isComponent}
              onClick={() => isComponent && onUpdateThing({ ...thing, role: "Environment" })}
              title="re-cut: put this thing outside the cut (ℰ — the environment)"
            >
              ℰ
            </SmallButton>
          </div>
        </Row>
        <p className="mb-1 text-[10px] leading-snug" style={{ color: "var(--text-muted)" }}>
          re-cut — the cut is yours to draw; ℰ and 𝒮 follow from it
        </p>
        </>
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
              else {
                next.primitive = v;
                if (next.rule) {
                  delete next.rule;
                  delete next.cognitive_params;
                }
              }
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
      {lens === "Mobus" && isComponent && (
        /* facets#269: the decision rule. An agent is its own kind of thing, so
           choosing a rule clears the work process and choosing a work process
           clears the rule (the seam refuses the pair). The numbers live in
           the bag under the rule's own words, where the param layer and the
           run surface read them. */
        <Row>
          <span style={{ color: "var(--text-secondary)" }}>decision rule</span>
          <select
            value={thing.rule ?? ""}
            onChange={(e) => {
              const v = e.target.value as AgentRule | "";
              const next = { ...thing };
              if (v === "") {
                delete next.rule;
                delete next.cognitive_params;
              } else {
                next.rule = v;
                next.cognitive_params = { ...AGENT_RULE_DEFAULTS[v] };
                delete next.primitive;
              }
              onUpdateThing(next);
            }}
            className="rounded-md px-1.5 py-0.5 text-xs"
            style={{ border: "1px solid var(--border)", background: "var(--bg-primary)", color: "var(--text-primary)" }}
            data-testid="rule-select"
          >
            <option value="">none</option>
            {RULES.map((r) => (
              <option key={r.rule} value={r.rule}>
                {r.rule}
              </option>
            ))}
          </select>
        </Row>
      )}
      {lens === "Mobus" && isComponent && thing.rule && (
        <>
          {ruleWords(thing.rule, thing.cognitive_params ?? {}).map((w) => (
            <Row key={w}>
              <span style={{ color: "var(--text-secondary)" }}>{w}</span>
              <input
                type="number"
                step="any"
                value={thing.cognitive_params?.[w] ?? ""}
                placeholder={RULES.find((r) => r.rule === thing.rule)?.optional?.includes(w) ? "none" : undefined}
                onChange={(e) => {
                  const bag = { ...(thing.cognitive_params ?? {}) };
                  if (e.target.value === "" && RULES.find((r) => r.rule === thing.rule)?.optional?.includes(w)) {
                    delete bag[w];
                    onUpdateThing({ ...thing, cognitive_params: bag });
                    return;
                  }
                  const n = Number(e.target.value);
                  if (!Number.isFinite(n)) return;
                  onUpdateThing({ ...thing, cognitive_params: { ...bag, [w]: n } });
                }}
                className="w-20 rounded-md px-1.5 py-0.5 text-xs"
                style={{ border: "1px solid var(--border)", background: "var(--bg-primary)", color: "var(--text-primary)" }}
                data-testid={`rule-${w}`}
              />
            </Row>
          ))}
          <p className="mb-2 text-[10px] leading-snug" style={{ color: "var(--text-muted)" }} data-testid="rule-gloss">
            {RULES.find((r) => r.rule === thing.rule)?.gloss} · it watches a Buffering (a stock) over an informational flow in — its reading — and commands a Modulating (a valve), an Amplifying (an amplifier) or a Buffering's release over one out — its command, the heavy dashed line; the Review panel says when either is missing.
          </p>
        </>
      )}
      {lens === "Mobus" && isComponent && thing.primitive && (
        /* #418 item 4: what the stamped process IS, from the same table the
           rail's hover card reads. */
        <p className="mb-2 text-[10px] leading-snug" style={{ color: "var(--text-muted)" }} data-testid="primitive-gloss">
          {thing.primitive} · {PRIMITIVE_WORD[thing.primitive]} — {PRIMITIVE_GLOSS[thing.primitive]}
        </p>
      )}
      {decompose && <DecomposeRows decompose={decompose} />}
      <div className="flex justify-between">
        <button onClick={onDelete} className="rounded-full px-3 py-1 text-xs" style={{ color: "var(--verdict-error)" }}>
          delete
        </button>
        {onClose && (
          <button onClick={onClose} className="rounded-full px-3 py-1 text-xs" style={{ color: "var(--text-muted)" }}>
            deselect
          </button>
        )}
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
      {decompose.kind === "entered" && (
        <div className="flex items-center justify-between gap-2">
          <span className="min-w-0 truncate text-[11px]" style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)" }} title={decompose.label}>
            decomposes &ldquo;{decompose.label}&rdquo;
          </span>
          <button
            onClick={decompose.onEnter}
            className="shrink-0 rounded-full px-3 py-1 text-xs font-semibold"
            style={{ background: "var(--lens-accent)", color: "var(--text-on-accent)" }}
            title="Enter the child model (double-clicking the node also enters)"
          >
            enter →
          </button>
        </div>
      )}
    </div>
  );
}
