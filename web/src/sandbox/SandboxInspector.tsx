// The sandbox inspector — the desktop panel's grammar in React: name, the
// primitive's own knob (param_spec), the Buffering block (drain law: fixed
// rate vs smoothed τ; initial stock touchable mid-run; capacity with ∞;
// maintenance), Inverting's setpoint, Modulating's back-pressure, and the
// substance rule (a Sink absorbs; a pass-through inherits — "set it at the
// Source"; a signal primitive is locked to Message; everything else chooses).
// Below: the teaching card (engine-authored, progressive disclosure) and the
// Troncale provenance when the node came from a stamp.
//
// Everything here EDITS THE LIVE SESSION — no re-run, no reset; the running
// system responds next tick. All copy and all specs come from the kernel
// (`sandboxPalette()` metadata + the snapshot); this file decides nothing.

import { useMemo, useState } from "react";
import type { SandboxPaletteEntry, SandboxSnapshot } from "../kernel/types";
import type { Sandbox, SandboxNodeField } from "../kernel";
import type { CanvasSelection } from "./SandboxCanvas";

interface Props {
  snapshot: SandboxSnapshot;
  palette: SandboxPaletteEntry[];
  selected: CanvasSelection | null;
  mutate: (fn: (sb: Sandbox) => void) => void;
  onDelete: (sel: CanvasSelection) => void;
}

/** The curated substance dictionary (mirrors the engine's SUBSTANCES palette;
 *  names are for humans, dynamics run on the base kind). */
const SUBSTANCES: Array<[string, "Energy" | "Material" | "Message", string]> = [
  ["money", "Material", "$"],
  ["water", "Material", "L"],
  ["people", "Material", "people"],
  ["food", "Material", "kg"],
  ["goods", "Material", "units"],
  ["sunlight", "Energy", "W"],
  ["electricity", "Energy", "kWh"],
  ["fuel", "Energy", "J"],
  ["effort", "Energy", "hours"],
  ["votes", "Message", "votes"],
  ["news", "Message", "stories"],
  ["data", "Message", "bits"],
  ["orders", "Message", "orders"],
];

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="mb-2 block text-xs">
      <span className="mb-0.5 block" style={{ color: "var(--text-muted)" }}>
        {label}
      </span>
      {children}
    </label>
  );
}

function Knob({
  label,
  value,
  max,
  step = 0.1,
  format,
  onChange,
  title,
}: {
  label: string;
  value: number;
  max: number;
  step?: number;
  format?: (v: number) => string;
  onChange: (v: number) => void;
  title?: string;
}) {
  return (
    <Row label={label}>
      <span className="flex items-center gap-2" title={title}>
        <input
          type="range"
          min={0}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="flex-1"
        />
        <span className="w-12 text-right font-mono">{format ? format(value) : value.toFixed(1)}</span>
      </span>
    </Row>
  );
}

export default function SandboxInspector({ snapshot, palette, selected, mutate, onDelete }: Props) {
  const [cardOpen, setCardOpen] = useState(false);

  const byKind = useMemo(() => new Map(palette.map((p) => [p.kind, p])), [palette]);

  if (!selected) {
    return (
      <p className="text-xs italic" style={{ color: "var(--text-muted)" }}>
        select a component
      </p>
    );
  }

  if (selected.kind === "wire") {
    const w = snapshot.wires[selected.index];
    if (!w) return null;
    const k = selected.index;
    return (
      <div className="text-sm">
        <p className="mb-2 font-mono text-xs">
          {snapshot.nodes[w.from]?.name} → {snapshot.nodes[w.to]?.name}
        </p>
        <p className="mb-2 text-xs" style={{ color: "var(--text-muted)" }}>
          {w.mode === "gradient"
            ? "gradient flow — a generalized flow down a potential difference (a field is a flow mode, not a node)"
            : "pushed flow — the sender emits at its own rate"}
        </p>
        {w.mode === "gradient" && (
          <Knob
            label="conductance k (rate = k · Δlevel)"
            value={w.conductance}
            max={1}
            step={0.01}
            format={(v) => v.toFixed(2)}
            onChange={(v) => mutate((sb) => sb.setWireParam(k, "conductance", v))}
          />
        )}
        {w.mode === "pushed" && snapshot.nodes[w.from]?.kind === "Source" && (
          <Row label="declared rate / tick (this wire)">
            <span
              className="flex items-center gap-2"
              title="rate is an edge attribute in Mobus's formalism (Eq. 4.5) — a source with several outflows carries one rate PER FLOW (bert#111). Empty = share the source's own rate across its undeclared outwires."
            >
              <input
                type="number"
                min={0}
                step={0.1}
                className="w-20 rounded border px-1 py-0.5"
                value={w.rate ?? ""}
                placeholder="shared"
                onChange={(e) =>
                  mutate((sb) =>
                    sb.setWireParam(k, "rate", e.target.value === "" ? -1 : Math.max(0, Number(e.target.value))),
                  )
                }
              />
              <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                {w.rate == null ? "sharing the source's rate" : "declared on this flow"}
              </span>
            </span>
          </Row>
        )}
        <p className="mb-2 font-mono text-xs" style={{ color: "var(--text-muted)" }}>
          delivered this tick: {w.last_amount.toFixed(2)}
        </p>
        <button className="text-xs" style={{ color: "var(--verdict-error)" }} onClick={() => onDelete(selected)}>
          ⌫ delete bond
        </button>
      </div>
    );
  }

  const i = selected.index;
  const n = snapshot.nodes[i];
  if (!n) return null;
  const meta = byKind.get(n.kind);
  const isBuffer = n.kind === "Buffering";
  const isInverting = n.kind === "Inverting";
  const isModulating = n.kind === "Modulating";
  const isSink = n.kind === "Sink";
  const fixedDrain = n.time_constant <= 0;
  const set = (field: SandboxNodeField, v: number) => mutate((sb) => sb.setNodeParam(i, field, v));

  return (
    <div className="text-sm">
      <input
        className="mb-2 w-full rounded border px-2 py-1 text-sm"
        value={n.name}
        onChange={(e) => mutate((sb) => sb.setNodeName(i, e.target.value))}
      />

      {meta?.param_spec && (
        <Knob label={meta.param_spec[0]} value={n.param} max={meta.param_spec[1]} onChange={(v) => set("param", v)} />
      )}

      {isInverting && (
        <Knob
          label="setpoint"
          value={n.setpoint}
          max={10}
          title="the reference the controller aims for: output = (setpoint − signal). Raise it to hold a higher regulated level. Mobus Fig 4.12 (reference − measured)."
          onChange={(v) => set("setpoint", v)}
        />
      )}

      {isModulating && (
        <Row label="back-pressure">
          <span
            className="flex items-center gap-2"
            title="ON: a throttled valve backs the flow UP — the source produces only what passes, a feeding stock holds the rest. OFF: the blocked flow is dissipated (the push-model default). Mobus: Impeding backs up."
          >
            <input
              type="checkbox"
              checked={n.back_pressure}
              onChange={(e) => set("back_pressure", e.target.checked ? 1 : 0)}
            />
            <span className="text-xs">throttle upstream instead of shedding</span>
          </span>
        </Row>
      )}

      {isBuffer && (
        <>
          <Row label="drain">
            <span className="flex gap-1">
              <button
                className="rounded border px-2 py-0.5 text-xs"
                style={fixedDrain ? { background: "var(--accent)", color: "var(--text-on-accent)" } : undefined}
                title="a fixed amount per tick (zeroth-order)"
                onClick={() => set("time_constant", 0)}
              >
                rate
              </button>
              <button
                className="rounded border px-2 py-0.5 text-xs"
                style={!fixedDrain ? { background: "var(--accent)", color: "var(--text-on-accent)" } : undefined}
                title="first-order: ≈ stock/τ per tick — the stock decays exponentially and the outflow smooths the inflow over ~τ ticks. Mobus: Buffering smooths flow over time."
                onClick={() => fixedDrain && set("time_constant", 5)}
              >
                smoothed τ
              </button>
            </span>
          </Row>
          {fixedDrain ? (
            <Knob label="release / tick" value={n.release_rate} max={10} onChange={(v) => set("release_rate", v)} />
          ) : (
            <Knob label="time constant τ" value={n.time_constant} max={30} step={1} onChange={(v) => set("time_constant", Math.max(1, v))} />
          )}
          <Knob
            label="initial stock"
            value={n.initial_storage}
            max={50}
            title="writes the live stock too — touchable mid-run; Reset re-baselines"
            onChange={(v) => set("initial_storage", v)}
          />
          <Knob
            label="capacity"
            value={n.capacity}
            max={50}
            step={1}
            format={(v) => (v < 0.5 ? "∞" : v.toFixed(0))}
            title="the tank's ceiling — above it the stock overflows (excess dissipated). 0 = unbounded. Mobus: containers have a capacity."
            onChange={(v) => set("capacity", v)}
          />
          <Knob
            label="maintenance / tick"
            value={n.maintenance}
            max={5}
            title="upkeep: the stock loses this much per tick to waste, whether or not it's used (self-discharge, spoilage, basal metabolism). Dissipated, never delivered. Odum depreciation / Mobus Fig 3.17."
            onChange={(v) => set("maintenance", v)}
          />
        </>
      )}

      {/* substance: a choice only where it is a degree of freedom */}
      {isSink ? (
        <p className="mb-2 text-xs italic" style={{ color: "var(--text-muted)" }}>
          absorbs everything
        </p>
      ) : meta?.inherits_substance ? (
        <div className="mb-2 text-xs">
          <span style={{ color: "var(--text-muted)" }}>carries </span>
          <span>{n.substance}</span>
          <p className="italic" style={{ color: "var(--text-muted)" }}>
            inherited from inflow — set it at the Source
          </p>
        </div>
      ) : meta?.emits_signal ? (
        <div className="mb-2 text-xs">
          <span style={{ color: "var(--text-muted)" }}>emits </span>
          <span>signal (Message)</span>
          <p className="italic" style={{ color: "var(--text-muted)" }}>
            fixed by this process — a control signal
          </p>
        </div>
      ) : (
        <Row label="emits">
          <select
            className="w-full rounded border px-1 py-0.5 text-xs"
            value={n.substance}
            onChange={(e) => {
              const v = e.target.value;
              mutate((sb) => {
                if (v === "Energy" || v === "Material" || v === "Message") {
                  sb.setSubstance(i, "", v, "");
                } else {
                  const hit = SUBSTANCES.find(([name, base]) => `${name} (${base})` === v);
                  if (hit) sb.setSubstance(i, hit[0], hit[1], hit[2]);
                }
              });
            }}
          >
            {["Energy", "Material", "Message"].map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
            {SUBSTANCES.map(([name, base]) => (
              <option key={name} value={`${name} (${base})`}>
                {name} · {base}
              </option>
            ))}
          </select>
        </Row>
      )}

      <p className="mb-2 font-mono text-xs" style={{ color: "var(--text-muted)" }}>
        activity {n.activity.toFixed(2)} · stored {n.storage.toFixed(2)}
      </p>

      {/* the transfer function, instantiated live — engine-authored, updates
          as sliders move and the sim runs */}
      <p
        className="mb-2 rounded border px-2 py-1 font-mono text-[11px]"
        style={{ borderColor: "var(--hairline, var(--border, #e5e7eb))" }}
        title="this node's transfer function with its current values substituted — computed by the kernel, faithful to the step rule"
      >
        {n.equation}
      </p>

      {/* Troncale provenance: this node is part of a stamped process */}
      {n.process && (
        <p className="mb-2 rounded border px-2 py-1 text-xs" style={{ color: "var(--text-muted)" }}>
          part of a <strong>{n.process}</strong> process — stamped from primitives, editable freely
        </p>
      )}

      {/* teaching card, progressive disclosure */}
      {meta && (
        <div className="mb-2 text-xs">
          <p className="mb-1">{meta.card.plain}</p>
          <p className="mb-1 italic" style={{ color: "var(--text-muted)" }}>
            e.g. {meta.card.everyday}
          </p>
          <button className="underline" style={{ color: "var(--text-muted)" }} onClick={() => setCardOpen(!cardOpen)}>
            {cardOpen ? "less" : "how it works"}
          </button>
          {cardOpen && (
            <dl className="mt-1 grid gap-1">
              <dt style={{ color: "var(--text-muted)" }}>math</dt>
              <dd className="font-mono">{meta.card.math}</dd>
              <dt style={{ color: "var(--text-muted)" }}>substance</dt>
              <dd>{meta.card.substance}</dd>
              <dt style={{ color: "var(--text-muted)" }}>theory</dt>
              <dd>{meta.card.theory}</dd>
              <dt style={{ color: "var(--text-muted)" }}>code</dt>
              <dd className="whitespace-pre-wrap font-mono">{meta.card.code}</dd>
            </dl>
          )}
        </div>
      )}

      <button className="text-xs" style={{ color: "var(--verdict-error)" }} onClick={() => onDelete(selected)}>
        ⌫ delete component
      </button>
    </div>
  );
}
