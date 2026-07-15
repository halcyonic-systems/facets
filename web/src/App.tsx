import { useEffect, useState } from "react";
import { ready, runForced } from "./kernel";
import type { Manifest, RunResultRich } from "./kernel/types";
import { DEMOS, type Demo } from "./demos";
import { MappingWizard, useCanFinish } from "./MappingWizard";
import { RunPanel } from "./RunPanel";
import { Card } from "./ui";

const today = () => new Date().toISOString().slice(0, 10);

export default function App() {
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    ready()
      .then(() => setLoaded(true))
      .catch((e) => setLoadError(String(e)));
  }, []);

  return (
    <div className="mx-auto max-w-3xl px-6 py-14">
      <Header loaded={loaded} />
      {loadError && (
        <p className="text-sm" style={{ color: "var(--verdict-error)" }}>
          Failed to load the wasm kernel: {loadError}
        </p>
      )}
      {loaded && <Workspace />}
      <Footer />
    </div>
  );
}

function Workspace() {
  const [demo, setDemo] = useState<Demo | null>(null);
  const [csvText, setCsvText] = useState("");
  const [manifest, setManifest] = useState<Manifest>({ model: "", data: "", t: 12, mapping: [] });
  const [dt, setDt] = useState(1);
  const [t, setT] = useState(12);
  const [result, setResult] = useState<RunResultRich | null>(null);
  const [runError, setRunError] = useState<string | null>(null);

  const runWith = (modelJson: string, csv: string, m: Manifest, dtv: number, tv: number) => {
    try {
      setResult(runForced(modelJson, csv, m, dtv, tv, today()));
      setRunError(null);
    } catch (e) {
      setResult(null);
      setRunError(e instanceof Error ? e.message : String(e));
    }
  };

  const pick = (d: Demo) => {
    setDemo(d);
    setCsvText(d.csv);
    setManifest(d.manifest);
    setDt(d.manifest.dt ?? 1);
    setT(d.t);
    runWith(d.modelJson, d.csv, d.manifest, d.manifest.dt ?? 1, d.t); // one click → runs
  };

  const onCsvFile = async (file: File) => {
    const text = await file.text();
    setCsvText(text);
    // A fresh CSV starts unmapped — the user maps it onto the current model.
    setManifest({ model: "", data: "", t, mapping: [] });
    setResult(null);
    setRunError(null);
  };

  const canFinish = useCanFinish(demo?.modelJson ?? "{}", csvText, manifest);

  return (
    <>
      <DemoGallery selected={demo} onPick={pick} />
      {demo && (
        <div className="mt-6 grid gap-5">
          <Card title="Data & mapping" source="tether · wasm">
            <p className="mb-4 text-sm" style={{ color: "var(--text-secondary)" }}>
              {demo.blurb}
            </p>
            <MappingWizard
              modelJson={demo.modelJson}
              csvText={csvText}
              manifest={manifest}
              onChange={setManifest}
            />
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <NumField label="Δt" value={dt} onChange={setDt} />
              <NumField label="T" value={t} onChange={setT} />
              <button
                onClick={() => demo && runWith(demo.modelJson, csvText, manifest, dt, t)}
                disabled={!canFinish}
                className="rounded-full px-5 py-2 text-sm font-semibold transition-colors"
                style={{
                  background: canFinish ? "var(--accent)" : "var(--bg-surface)",
                  color: canFinish ? "#fff" : "var(--text-muted)",
                  cursor: canFinish ? "pointer" : "not-allowed",
                }}
              >
                ▶ Run forced
              </button>
              <label
                className="cursor-pointer text-xs underline"
                style={{ color: "var(--text-muted)" }}
              >
                import a different CSV
                <input
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && onCsvFile(e.target.files[0])}
                />
              </label>
            </div>
          </Card>

          {runError && (
            <Card title="Result" source="bert-compose · wasm">
              <p className="text-sm" style={{ color: "var(--verdict-error)" }}>
                {runError}
              </p>
            </Card>
          )}
          {result && <RunPanel result={result} />}
        </div>
      )}
    </>
  );
}

function DemoGallery({ selected, onPick }: { selected: Demo | null; onPick: (d: Demo) => void }) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {DEMOS.map((d) => {
        const active = selected?.key === d.key;
        return (
          <button
            key={d.key}
            onClick={() => onPick(d)}
            className="rounded-2xl p-4 text-left transition-shadow"
            style={{
              background: "var(--bg-secondary)",
              border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
              boxShadow: active ? "var(--shadow-card-hover)" : "var(--shadow-card)",
              borderRadius: "var(--radius-card)",
            }}
          >
            <div
              className="text-base font-semibold"
              style={{
                fontFamily: "var(--font-display)",
                color: active ? "var(--accent-strong)" : "var(--text-primary)",
              }}
            >
              {d.title}
            </div>
            <div className="mt-1 text-xs leading-snug" style={{ color: "var(--text-muted)" }}>
              {d.blurb.split(".")[0]}.
            </div>
          </button>
        );
      })}
    </div>
  );
}

function NumField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex items-center gap-1.5 text-sm" style={{ color: "var(--text-secondary)" }}>
      {label}
      <input
        type="number"
        value={value}
        min={0}
        step="any"
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="w-20 rounded-md px-2 py-1 text-sm tabular"
        style={{ border: "1px solid var(--border)", background: "var(--bg-primary)", color: "var(--text-primary)" }}
      />
    </label>
  );
}

function Header({ loaded }: { loaded: boolean }) {
  return (
    <header className="mb-8">
      <h1
        style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}
        className="text-5xl font-semibold tracking-tight"
      >
        bert&#8202;·&#8202;lenses
      </h1>
      <p className="mt-3 text-[15px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
        Force a model with real data and watch it run — and conserve. The Rust kernel
        (bert-core + bert-compose) does every bit of it in WebAssembly, right here in
        the page. React only draws the result.
      </p>
      <div className="mt-4">
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
          {loaded ? "kernel loaded (wasm)" : "loading kernel…"}
        </span>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer
      className="mt-12 border-t pt-5 text-xs leading-relaxed"
      style={{ borderColor: "var(--hairline)", color: "var(--text-muted)" }}
    >
      Every gate, projection, forced simulation, and number above was computed in Rust
      (bert-core + bert-compose) compiled to WebAssembly, in this tab. The React layer
      parsed no models and decided no verdicts.{" "}
      <span style={{ color: "var(--text-secondary)" }}>crates/ = truth · web/ = face.</span>
    </footer>
  );
}
