import { useEffect, useMemo, useState } from "react";
import {
  ready,
  validate,
  validateOperational,
  run,
} from "./kernel";
import type { ValidationResult, RunResult } from "./kernel/types";

// Sample models, imported as raw text and handed to the kernel verbatim. The
// generics/thermostat are recent, canonical, STRUCTURAL models (they carry
// issues by design); runnable-sample is executable (minted from the compose
// engine). The face never inspects them — it forwards the text to Rust.
import thermostat from "../../assets/thermostat.json?raw";
import mobusGeneric from "../../assets/mobus-generic.json?raw";
import runnableSample from "../../assets/models/runnable-sample.json?raw";

interface Sample {
  key: string;
  label: string;
  note: string;
  json: string;
}

const SAMPLES: Sample[] = [
  { key: "runnable", label: "flows (runnable)", note: "executable — projects + simulates", json: runnableSample },
  { key: "thermostat", label: "thermostat", note: "structural — a canonical authored model", json: thermostat },
  { key: "mobus", label: "mobus-generic", note: "structural — the 8-tuple framework model", json: mobusGeneric },
];

export default function App() {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Sample>(SAMPLES[0]);

  useEffect(() => {
    ready()
      .then(() => setLoaded(true))
      .catch((e) => setError(String(e)));
  }, []);

  return (
    <div className="mx-auto max-w-3xl px-6 py-14">
      <Header loaded={loaded} />
      {error && <ErrorBanner message={error} />}
      {loaded && (
        <>
          <ModelPicker selected={selected} onSelect={setSelected} />
          <div className="mt-6 grid gap-5">
            <SystemhoodCard json={selected.json} />
            <ExecutabilityCard json={selected.json} />
            <RunCard json={selected.json} />
          </div>
          <Footer />
        </>
      )}
      {!loaded && !error && <Loading />}
    </div>
  );
}

function Header({ loaded }: { loaded: boolean }) {
  return (
    <header className="mb-10">
      <h1
        style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
        className="text-5xl font-semibold tracking-tight"
      >
        bert&#8202;·&#8202;lenses
      </h1>
      <p className="mt-3 text-[15px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
        Rust is the brain, running as WebAssembly in your browser. React is only the face.
        Every verdict below is computed by the kernel in wasm — the page decides nothing.
      </p>
      <div className="mt-4">
        <KernelBadge loaded={loaded} />
      </div>
    </header>
  );
}

function KernelBadge({ loaded }: { loaded: boolean }) {
  return (
    <span
      className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium"
      style={{
        background: loaded ? "var(--accent-soft)" : "var(--bg-surface)",
        color: loaded ? "var(--accent-strong)" : "var(--text-muted)",
        border: "1px solid var(--border)",
      }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ background: loaded ? "var(--accent)" : "var(--text-muted)" }}
      />
      {loaded ? "kernel loaded — bert-core + bert-compose (wasm)" : "loading kernel…"}
    </span>
  );
}

function ModelPicker({ selected, onSelect }: { selected: Sample; onSelect: (s: Sample) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {SAMPLES.map((s) => {
        const active = s.key === selected.key;
        return (
          <button
            key={s.key}
            onClick={() => onSelect(s)}
            className="rounded-full px-4 py-2 text-sm font-medium transition-colors"
            style={{
              background: active ? "var(--accent)" : "var(--bg-secondary)",
              color: active ? "#fff" : "var(--text-secondary)",
              border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
              boxShadow: active ? "var(--shadow-card)" : "none",
            }}
          >
            {s.label}
          </button>
        );
      })}
      <p className="w-full mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
        {selected.note}
      </p>
    </div>
  );
}

function Card({ title, source, children }: { title: string; source: string; children: React.ReactNode }) {
  return (
    <section
      className="rounded-2xl p-6"
      style={{
        background: "var(--bg-secondary)",
        border: "1px solid var(--border)",
        boxShadow: "var(--shadow-card)",
        borderRadius: "var(--radius-card)",
      }}
    >
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
          {title}
        </h2>
        <span className="text-[11px] font-medium tabular" style={{ color: "var(--accent-strong)" }}>
          {source}
        </span>
      </div>
      {children}
    </section>
  );
}

function SystemhoodCard({ json }: { json: string }) {
  const result = useMemo<ValidationResult | { fault: string }>(() => {
    try {
      return validate(json);
    } catch (e) {
      return { fault: String(e) };
    }
  }, [json]);

  if ("fault" in result) return <Card title="Systemhood report" source="bert-core · wasm"><Fault message={result.fault} /></Card>;

  const errors = result.issues.filter((i) => i.severity === "Error").length;
  const warnings = result.issues.filter((i) => i.severity === "Warning").length;

  return (
    <Card title="Systemhood report" source="bert-core · wasm">
      {result.issues.length === 0 ? (
        <Verdict tone="ok">clean — no structural issues</Verdict>
      ) : (
        <>
          <div className="mb-3 flex gap-2 text-xs">
            {errors > 0 && <Pill tone="error">{errors} error{errors === 1 ? "" : "s"}</Pill>}
            {warnings > 0 && <Pill tone="warning">{warnings} warning{warnings === 1 ? "" : "s"}</Pill>}
          </div>
          <ul className="space-y-2">
            {result.issues.slice(0, 6).map((issue, i) => (
              <li key={i} className="text-sm leading-snug">
                <span
                  className="mr-2 tabular text-[11px] uppercase"
                  style={{ color: issue.severity === "Error" ? "var(--verdict-error)" : "var(--verdict-warning)" }}
                >
                  {issue.severity}
                </span>
                <span style={{ color: "var(--text-primary)" }}>{issue.message}</span>
                <span className="ml-1 text-xs" style={{ color: "var(--text-muted)" }}>
                  ({issue.location})
                </span>
              </li>
            ))}
            {result.issues.length > 6 && (
              <li className="text-xs" style={{ color: "var(--text-muted)" }}>
                +{result.issues.length - 6} more…
              </li>
            )}
          </ul>
        </>
      )}
    </Card>
  );
}

function ExecutabilityCard({ json }: { json: string }) {
  const outcome = useMemo(() => {
    try {
      return validateOperational(json);
    } catch (e) {
      return { fault: String(e) } as const;
    }
  }, [json]);

  return (
    <Card title="Executable projection" source="bert-core · wasm">
      {"fault" in outcome ? (
        <Fault message={outcome.fault} />
      ) : "ok" in outcome ? (
        <Verdict tone="ok">projects — the model has enough to simulate</Verdict>
      ) : (
        <Verdict tone="warning">
          refused — {outcome.errors.length} projection{" "}
          {outcome.errors.length === 1 ? "reason" : "reasons"} (structural rung, not executable)
        </Verdict>
      )}
    </Card>
  );
}

function RunCard({ json }: { json: string }) {
  const result = useMemo<RunResult | { fault: string } | null>(() => {
    try {
      return run(json, 1.0, 24);
    } catch {
      return null; // not executable — expected for structural models
    }
  }, [json]);

  return (
    <Card title="Simulation" source="bert-compose · wasm">
      {result === null ? (
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Not executable — pick <span style={{ color: "var(--text-secondary)" }}>flows (runnable)</span> to
          record a trace. (Structural models carry no flow semantics to run.)
        </p>
      ) : "fault" in result ? (
        <Fault message={result.fault} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          <Stat label="ticks recorded" value={String(result.history.length)} />
          <Stat label="Δt" value={result.dt.toFixed(1)} />
          <Stat
            label="conservation residual"
            value={result.final_balance.toExponential(1)}
            tone={Math.abs(result.final_balance) < 1e-3 ? "ok" : "error"}
          />
          <div className="sm:col-span-3">
            <Sparkline history={result.history} />
          </div>
        </div>
      )}
    </Card>
  );
}

function Sparkline({ history }: { history: number[][] }) {
  // Column 3 of each row = node 0's `total` (per the trace layout). Chart it as
  // a legible glance; the numbers themselves are the kernel's, not the face's.
  const series = history.map((row) => row[3] ?? 0);
  const w = 520;
  const h = 56;
  const min = Math.min(...series);
  const max = Math.max(...series);
  const span = max - min || 1;
  const pts = series
    .map((v, i) => {
      const x = (i / Math.max(series.length - 1, 1)) * w;
      const y = h - ((v - min) / span) * h;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <div className="mt-1">
      <p className="mb-1 text-[11px]" style={{ color: "var(--text-muted)" }}>
        node&nbsp;0 total, per tick
      </p>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" preserveAspectRatio="none" style={{ height: h }}>
        <polyline points={pts} fill="none" stroke="var(--accent)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "ok" | "error" }) {
  const color = tone === "ok" ? "var(--verdict-ok)" : tone === "error" ? "var(--verdict-error)" : "var(--text-primary)";
  return (
    <div>
      <div className="text-2xl font-semibold tabular" style={{ color }}>
        {value}
      </div>
      <div className="mt-0.5 text-xs" style={{ color: "var(--text-muted)" }}>
        {label}
      </div>
    </div>
  );
}

function Verdict({ tone, children }: { tone: "ok" | "warning" | "error"; children: React.ReactNode }) {
  const color =
    tone === "ok" ? "var(--verdict-ok)" : tone === "warning" ? "var(--verdict-warning)" : "var(--verdict-error)";
  return (
    <p className="text-sm font-medium" style={{ color }}>
      {children}
    </p>
  );
}

function Pill({ tone, children }: { tone: "error" | "warning"; children: React.ReactNode }) {
  const color = tone === "error" ? "var(--verdict-error)" : "var(--verdict-warning)";
  return (
    <span
      className="rounded-full px-2 py-0.5 font-medium"
      style={{ color, border: `1px solid ${color}`, background: "transparent" }}
    >
      {children}
    </span>
  );
}

function Fault({ message }: { message: string }) {
  return (
    <p className="text-sm tabular" style={{ color: "var(--verdict-error)" }}>
      {message}
    </p>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div
      className="rounded-xl p-4 text-sm"
      style={{ background: "var(--bg-surface)", color: "var(--verdict-error)", border: "1px solid var(--border)" }}
    >
      Failed to load the wasm kernel: {message}
    </div>
  );
}

function Loading() {
  return (
    <p className="text-sm" style={{ color: "var(--text-muted)" }}>
      Instantiating the kernel…
    </p>
  );
}

function Footer() {
  return (
    <footer className="mt-12 border-t pt-5 text-xs leading-relaxed" style={{ borderColor: "var(--hairline)", color: "var(--text-muted)" }}>
      Every report, projection, and number on this page was computed in Rust (bert-core + bert-compose),
      compiled to WebAssembly, running in this browser tab. The React layer parsed no models and decided
      no verdicts. <span style={{ color: "var(--text-secondary)" }}>crates/ = truth · web/ = face.</span>
    </footer>
  );
}
