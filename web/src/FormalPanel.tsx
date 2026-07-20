// The formal face — the model as its formal object in the active lens's own
// notation, beside the diagram. This is where "one kernel, three faithful
// views" (K≅2) becomes visible: the counts hold, the words change. The whole
// LensDescription is computed by the kernel (`describe`); this panel only
// typesets it with KaTeX — the math is never assembled in JS.
import katex from "katex";
import "katex/dist/katex.min.css";
import type { LensDescription } from "./kernel/types";
import { Card } from "./ui";

function Tex({ tex, block = false }: { tex: string; block?: boolean }) {
  const html = katex.renderToString(tex, { throwOnError: false, displayMode: block });
  return <span className={block ? "block" : undefined} dangerouslySetInnerHTML={{ __html: html }} />;
}

function Line({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-3 text-sm">
      <span className="w-28 shrink-0 text-right" style={{ color: "var(--text-muted)" }}>
        {label}
      </span>
      <span style={{ color: "var(--text-primary)" }}>{children}</span>
    </div>
  );
}

function names(xs: string[]): string {
  return xs.length ? `{ ${xs.join(", ")} }` : "∅";
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
    <Card title="The formal object" source="bert-lenses-kernel · describe(model, lens) · wasm">
      {desc.lens === "Klir" && <KlirFace d={desc} />}
      {desc.lens === "Bunge" && <BungeFace d={desc} />}
      {desc.lens === "Mobus" && <MobusFace d={desc} />}
    </Card>
  );
}

function KlirFace({ d }: { d: Extract<LensDescription, { lens: "Klir" }> }) {
  return (
    <div className="grid gap-2">
      <div className="mb-1">
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

function BungeFace({ d }: { d: Extract<LensDescription, { lens: "Bunge" }> }) {
  const isSystem = d.verdict === "system";
  return (
    <div className="grid gap-2">
      <div className="mb-1 flex items-baseline justify-between gap-3">
        {/* µ(σ) is the four-coordinate CESM object (Bunge 2004); bare σ is the
            1979 CES triple. Label the four-tuple µ(σ) (concordance row 1 / §14.1). */}
        <Tex block tex={`\\mu(\\sigma) = \\langle \\mathcal{C},\\; \\mathcal{E},\\; \\mathcal{S},\\; \\mathcal{M} \\rangle`} />
        <span
          className="rounded-full px-3 py-1 text-xs font-semibold"
          style={{
            background: isSystem ? "var(--accent-soft)" : "var(--verdict-error)",
            color: isSystem ? "var(--accent-strong)" : "#fff",
          }}
        >
          {isSystem ? "system — 𝔹 ≠ ∅ (Def 1.1)" : "aggregate — 𝔹 = ∅ (Def 1.1)"}
        </span>
      </div>
      <Line label={<Tex tex="\mathcal{C}" />}>{names(d.composition)}</Line>
      <Line label={<Tex tex="\mathcal{E}" />}>{names(d.environment)}</Line>
      <Line label={<Tex tex="\mathcal{S}" />}>
        {d.bondage} bonds ({d.endostructure} endo · {d.exostructure} exo) + {d.mere_relations} mere relation
        {d.mere_relations === 1 ? "" : "s"}
      </Line>
      <Line label="boundary (1992)">
        {names(d.boundary_components)} — the components directly coupled to 𝓔; computed, not drawn
      </Line>
      <p className="mt-2 text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
        {d.mechanism_note}
      </p>
    </div>
  );
}

function MobusFace({ d }: { d: Extract<LensDescription, { lens: "Mobus" }> }) {
  return (
    <div className="grid gap-2">
      <div className="mb-1">
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
      <Line label={<Tex tex="C" />}>{names(d.c)}</Line>
      <Line label={<Tex tex="N" />}>{d.n} internal flow{d.n === 1 ? "" : "s"} (the internal network)</Line>
      <Line label={<Tex tex="E = \langle O, M \rangle" />}>
        O = {names(d.e_objects)} · {d.milieu_note}
      </Line>
      <Line label={<Tex tex="G" />}>
        {d.g} external flow{d.g === 1 ? "" : "s"} — bipartite: environment object ↔ interface
      </Line>
      <Line label={<Tex tex="B = \langle P, I \rangle" />}>
        I = {names(d.b_interfaces)}
        {BOUNDARY_PROPS_AUTHORING && (
          <>
            {" "}· porosity {d.porosity.toFixed(2)} · fuzziness{" "}
            {d.perceptive_fuzziness.toFixed(2)}
          </>
        )}
      </Line>
      <Line label={<Tex tex="T" />}>{d.t_note}</Line>
      <Line label={<Tex tex="H" />}>{d.h_note}</Line>
      <Line label={<Tex tex="\Delta t" />}>{d.dt_note}</Line>
      {d.self_loop_conflicts.length > 0 && (
        <p className="mt-2 text-xs leading-relaxed" style={{ color: "var(--verdict-error)" }}>
          ⊘ no Mobus preimage (no_self_loops): {d.self_loop_conflicts.join(", ")} — a Bunge diagonal
          bond; represent feedback as a 2-cycle or internal H/T dynamics.
        </p>
      )}
    </div>
  );
}
