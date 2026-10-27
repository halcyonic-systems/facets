// The formal face — the model as its formal object in the active lens's own
// notation, beside the diagram. This is where "one kernel, three faithful
// views" (K≅2) becomes visible: the counts hold, the words change. The whole
// LensDescription is computed by the kernel (`describe`); this panel only
// typesets it with KaTeX — the math is never assembled in JS.
import katex from "katex";
import "katex/dist/katex.min.css";
import { useState } from "react";
import type { LensDescription } from "./kernel/types";
import { Button, Card, Pill } from "./ui";
import { Icon } from "./icons";

/** KaTeX at the row size: its own 1.21em would set the math at 17px beside
 *  14px prose (readouts audit, the #399 rows), so the wrapper pins `.katex`
 *  to text-sm. The tuple headline keeps display size. */
function Tex({ tex, block = false }: { tex: string; block?: boolean }) {
  const html = katex.renderToString(tex, { throwOnError: false, displayMode: block });
  return (
    <span
      className={block ? "block [&_.katex]:text-base" : "[&_.katex]:text-sm"}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

/** One slot of the tuple as a compact row under a hairline: the symbol, then
 *  the reading on one line. A row given `items` (a set) shows its count and
 *  opens to list the members, instead of wrapping a brace of twelve names
 *  across four lines (#399). */
function Line({
  label,
  children,
  items,
  noun,
}: {
  label: React.ReactNode;
  children?: React.ReactNode;
  /** The members of a set; the row summarises and expands them. */
  items?: string[];
  /** What a member is called, for the summary ("3 components"). */
  noun?: string;
}) {
  const [open, setOpen] = useState(false);
  const canOpen = items !== undefined && items.length > 0;
  return (
    <div className="border-b py-1.5 text-sm" style={{ borderColor: "var(--hairline)" }}>
      <div className="flex items-center gap-3">
        <span className="w-24 shrink-0 text-right" style={{ color: "var(--text-muted)" }}>
          {label}
        </span>
        <span className="min-w-0 flex-1 leading-snug" style={{ color: "var(--text-primary)" }}>
          {items !== undefined ? (
            <>
              {items.length === 0 ? "∅" : `${items.length} ${noun ?? "member"}${items.length === 1 ? "" : "s"}`}
              {!open && items.length > 0 && (
                <span className="ml-1.5 truncate" style={{ color: "var(--text-muted)" }}>
                  {`{ ${items.join(", ")} }`}
                </span>
              )}
              {children && <span className="ml-1.5">{children}</span>}
            </>
          ) : (
            children
          )}
        </span>
        {canOpen && (
          <Button
            size={28}
            variant="quiet"
            icon={open ? "chevron-up" : "chevron-down"}
            aria-label={open ? "collapse the set" : "list the set"}
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
          />
        )}
      </div>
      {open && items && (
        <ul className="mt-1 grid gap-0.5 pl-[6.75rem] text-xs" style={{ color: "var(--text-secondary)" }}>
          {items.map((it, i) => (
            <li key={i}>{it}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

// UI feature-gate, NOT an ontology verdict. Was false while the palette could
// not author the boundary's P = ⟨porosity, perceptive_fuzziness⟩ — printing
// "porosity 0.00" for a value nobody set would have been phantom formalism.
// The gate's own condition is now met (#51 slice 3): the BoundaryPopover
// writes P onto CanvasModel.boundary and project() carries it to the root
// membrane, so the displayed values are authored facts. Kept as a named flag
// (rather than deleted) so the authoring surface can be gated off again
// without re-deriving the phantom-formalism argument.
const BOUNDARY_PROPS_AUTHORING = true;

export function FormalPanel({ desc }: { desc: LensDescription }) {
  return (
    <Card title="The formal object" source="facets-kernel · describe(model, lens) · wasm">
      {desc.lens === "Klir" && <KlirFace d={desc} />}
      {desc.lens === "Bunge" && <BungeFace d={desc} />}
      {desc.lens === "Mobus" && <MobusFace d={desc} />}
    </Card>
  );
}

function KlirFace({ d }: { d: Extract<LensDescription, { lens: "Klir" }> }) {
  return (
    <div className="grid">
      <div className="mb-2">
        <Tex block tex={`S = (T,\\; R), \\qquad R \\subseteq T \\times T`} />
      </div>
      <Line label={<Tex tex="|T|" />}>{d.things} things (thinghood — taken for granted)</Line>
      <Line label={<Tex tex="|R|" />}>
        {d.relations} relations (systemhood) · {d.neutral} neutral, {d.directed} directed
      </Line>
      <p className="mt-2 text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
        {d.note}.
      </p>
    </div>
  );
}

// Line order is load-bearing (#100 phase 2, F8): 𝒞 → 𝓔 → 𝒮 → (boundary,
// derived) → ℳ. Bunge's definitions are indexed to the chosen composition —
// 𝓔_A and 𝒮_A only exist relative to 𝒞_A — so the reading order silently
// embodies the C→E→S dependency, with M last as the question this surface
// cannot yet answer. Layout as pedagogy; zero prescription. Don't reorder.
function BungeFace({ d }: { d: Extract<LensDescription, { lens: "Bunge" }> }) {
  const isSystem = d.verdict === "system";
  return (
    <div className="grid">
      <div className="mb-1 flex flex-wrap items-baseline justify-between gap-3">
        {/* µ(σ) is the four-coordinate CESM object (Bunge 2004); bare σ is the
            1979 CES triple. Label the four-tuple µ(σ) (concordance row 1 / §14.1). */}
        <Tex block tex={`\\mu(\\sigma) = \\langle \\mathcal{C},\\; \\mathcal{E},\\; \\mathcal{S},\\; \\mathcal{M} \\rangle`} />
        {/* Systemhood is a verdict (Def 1.1): a chip coloured by meaning (rule 9d). */}
        <Pill tone={isSystem ? "ok" : "error"} icon={isSystem ? "check" : "warning"}>
          {isSystem ? "system — 𝔹 ≠ ∅ (Def 1.1)" : "aggregate — 𝔹 = ∅ (Def 1.1)"}
        </Pill>
      </div>
      <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
        µ(σ) is Bunge's 2004 four-coordinate object; bare σ names the 1979 ⟨C, E, S⟩ triple.
      </p>
      <Line label={<Tex tex="\mathcal{C}" />} items={d.composition} noun="component" />
      <Line label={<Tex tex="\mathcal{E}" />} items={d.environment} noun="environment thing" />
      <Line label={<Tex tex="\mathcal{S}" />}>
        {d.bondage} bonds ({d.endostructure} endo · {d.exostructure} exo) + {d.mere_relations} mere relation
        {d.mere_relations === 1 ? "" : "s"}
      </Line>
      <Line label="boundary (1992)" items={d.boundary_components} noun="boundary component">
        — directly coupled to 𝓔; computed, not drawn
      </Line>
      <p className="mt-2 text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
        {d.mechanism_note}
      </p>
    </div>
  );
}

function MobusFace({ d }: { d: Extract<LensDescription, { lens: "Mobus" }> }) {
  return (
    <div className="grid">
      <div className="mb-2">
        <Tex
          block
          tex={`S_{i,l} = \\langle C,\\; N,\\; E,\\; G,\\; B,\\; T,\\; H,\\; \\Delta t \\rangle`}
        />
        {/* Honest provenance (concordance row 1): the book prints the seven-tuple;
            E first-class is the Lean formalization's addition, credited as such. */}
        <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
          E is the Lean formalization's addition; Mobus's book prints the seven-tuple ⟨C, N, G, B, T, H, Δt⟩.
        </p>
      </div>
      <Line label={<Tex tex="C" />} items={d.c} noun="component" />
      <Line label={<Tex tex="N" />}>{d.n} internal flow{d.n === 1 ? "" : "s"} (the internal network)</Line>
      <Line label={<Tex tex="E = \langle O, M \rangle" />} items={d.e_objects} noun="environment object">
        · {d.milieu_note}
      </Line>
      <Line label={<Tex tex="G" />}>
        {d.g} external flow{d.g === 1 ? "" : "s"} — bipartite: environment object ↔ interface
      </Line>
      {/* The flow reading, stated once (#336): this line lived as a formalism
          strip in every flow popover, identical for every flow — model-level
          pedagogy, so it belongs on the formal face rather than at each click. */}
      <Line label={<Tex tex="k \to o" />}>
        each flow carries one substance (material · energy · message) from its source k to its sink o — direction
        inherent, never the observer&rsquo;s
      </Line>
      <Line label={<Tex tex="B = \langle P, I \rangle" />} items={d.b_interfaces} noun="interface">
        {BOUNDARY_PROPS_AUTHORING && (
          <>
            · porosity {d.porosity.toFixed(2)} · fuzziness {d.perceptive_fuzziness.toFixed(2)}
          </>
        )}
      </Line>
      <Line label={<Tex tex="T" />}>{d.t_note}</Line>
      <Line label={<Tex tex="H" />}>{d.h_note}</Line>
      <Line label={<Tex tex="\Delta t" />}>{d.dt_note}</Line>
      {d.self_loop_conflicts.length > 0 && (
        <p className="mt-2 flex items-start gap-1.5 text-xs leading-relaxed" style={{ color: "var(--verdict-error)" }}>
          <Icon name="error" size={16} className="mt-px shrink-0" />
          <span>
            no Mobus preimage (no_self_loops): {d.self_loop_conflicts.join(", ")} — a Bunge diagonal
            bond; represent feedback as a 2-cycle or internal H/T dynamics.
          </span>
        </p>
      )}
    </div>
  );
}
