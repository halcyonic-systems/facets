// The model-level "about" (walkthrough #15) — the inspector's home slot when
// nothing is selected. Clicking away from every element answers "what am I
// looking at": name and asserted kind, the domain sentence, the bundle's
// blurb, composition read off the canvas model, and data provenance read off
// the manifest. Everything is DERIVED from what is already loaded — no new
// state, no kernel calls, works for every model including a blank one.
import type { CanvasModel, Manifest } from "./kernel/types";
import { InspectorTitle as Title } from "./ui";

function Line({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-1.5 flex gap-2 text-xs">
      <span className="w-20 shrink-0" style={{ color: "var(--text-muted)" }}>
        {label}
      </span>
      <span className="min-w-0" style={{ color: "var(--text-primary)" }}>
        {children}
      </span>
    </div>
  );
}

export function ModelAbout({
  model,
  manifest,
  blurb,
}: {
  model: CanvasModel;
  manifest: Manifest | null;
  /** The demo bundle's one-paragraph description, when the model came from one. */
  blurb?: string;
}) {
  const components = model.things.filter((t) => t.role === "Component");
  const env = model.things.filter((t) => t.role === "Environment");
  const sources = env.filter((t) => t.env_kind === "Source").length;
  const sinks = env.filter((t) => t.env_kind === "Sink").length;
  const neutral = env.length - sources - sinks;
  const bonds = model.relations.filter((r) => r.is_bond).length;
  const mere = model.relations.length - bonds;
  const params = model.params?.length ?? 0;

  const kind = [model.system_type?.kingdom, model.system_type?.genus].filter(Boolean).join(" / ");
  const forced = manifest?.mapping.filter((m) => m.as === "flow" && m.force) ?? [];

  // Bondhood is named in the lens's own vocabulary (#320): Mobus counts FLOWS
  // (a bond is a flow is transport), Bunge counts BONDS (couplings, which need
  // carry nothing), and Klir counts RELATIONS — `(T, R)` draws no bond/non-bond
  // line, so reporting a split there would import a construct it does not own.
  const klir = model.lens === "Klir";
  const bondWord = model.lens === "Bunge" ? "bond" : "flow";
  const composition = [
    `${components.length} component${components.length === 1 ? "" : "s"}`,
    sources > 0 && `${sources} source${sources === 1 ? "" : "s"}`,
    sinks > 0 && `${sinks} sink${sinks === 1 ? "" : "s"}`,
    neutral > 0 && `${neutral} neutral environment thing${neutral === 1 ? "" : "s"}`,
    klir
      ? `${model.relations.length} relation${model.relations.length === 1 ? "" : "s"}`
      : `${bonds} ${bondWord}${bonds === 1 ? "" : "s"}`,
    !klir && mere > 0 && `${mere} mere relation${mere === 1 ? "" : "s"} (no bond)`,
    params > 0 && `${params} declared parameter${params === 1 ? "" : "s"}`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div>
      <Title>{model.name ?? "untitled model"}</Title>
      {kind && (
        <div className="mb-2 text-[11px] font-medium" style={{ color: "var(--lens-accent)" }}>
          {kind}
        </div>
      )}
      {model.system_type?.domain && (
        <p className="mb-3 text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          {model.system_type.domain}
        </p>
      )}
      {blurb && (
        <p className="mb-3 text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          {blurb}
        </p>
      )}
      <Line label="composition">{composition}</Line>
      {model.time_unit && <Line label="time unit">{model.time_unit}</Line>}
      {manifest && forced.length > 0 && (
        <Line label="data">
          {`${manifest.data ? `driven by “${manifest.data}”` : "data-driven"} — ${forced.map((m) => `${m.column} → ${m.element}`).join(", ")} · horizon ${manifest.t} ${model.time_unit ?? "steps"}`}
        </Line>
      )}
      <p className="mt-3 text-[11px] leading-snug" style={{ color: "var(--text-muted)" }}>
        Click a component, environment thing, or flow to inspect it here.
      </p>
    </div>
  );
}
