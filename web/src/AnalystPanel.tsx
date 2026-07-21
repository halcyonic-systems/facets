// The Analyst panel — the visible read-only loop: kernel fact → context → GSR →
// five-part narration → cited canvas element. It proposes no structure and has
// no write path (the read-only rung); it narrates the kernel's already-computed
// verdicts and judges domain plausibility, then lets each cited element click
// through to the canvas via the SAME onNavigate seam the Audit panel rides.
import { useState } from "react";
import type { CanvasModel, IssueTarget, SystemType } from "./kernel/types";
import type { AnalysisResponse } from "./analysis/types";
import { buildModelContext, renderContextForPrompt } from "./kernel/context";
import { analyzeModel } from "./gsr";
import {
  makeResolver,
  parseCitations,
  countLlmFindings,
  type CitationResolver,
} from "./analysis/citations";
import { Card, Pill } from "./ui";
import { TraceDiagram } from "./analysis/TraceDiagram";

const MODEL_OPTIONS: { label: string; value: string }[] = [
  { label: "Local (gemma4)", value: "" },
  { label: "Frontier (Claude)", value: "claude-haiku-4-5-20251001" },
];

type Coverage = { asks: number; kernel_findings: number; llm_findings: number };
const COVERAGE_KEY = "bert-lenses.analysis-coverage";
const ZERO_COVERAGE: Coverage = { asks: 0, kernel_findings: 0, llm_findings: 0 };

function loadCoverage(): Coverage {
  try {
    const raw = localStorage.getItem(COVERAGE_KEY);
    if (!raw) return ZERO_COVERAGE;
    const p = JSON.parse(raw);
    return {
      asks: Number(p.asks) || 0,
      kernel_findings: Number(p.kernel_findings) || 0,
      llm_findings: Number(p.llm_findings) || 0,
    };
  } catch {
    return ZERO_COVERAGE;
  }
}

function saveCoverage(c: Coverage) {
  try {
    localStorage.setItem(COVERAGE_KEY, JSON.stringify(c));
  } catch {
    // storage unavailable (private mode) — the dial resets, nothing else breaks
  }
}

function selfSufficiency(c: Coverage): string {
  const total = c.kernel_findings + c.llm_findings;
  if (total === 0) return "—";
  return `${Math.round((100 * c.kernel_findings) / total)}%`;
}

// One narration run and the context it was computed against — the resolver keys
// the citations to the exact ids the LLM was shown.
type Run = {
  response: AnalysisResponse;
  model: string;
  generatedAt: string;
  resolver: CitationResolver;
};

export function AnalystPanel({
  canvasModel,
  onNavigate,
}: {
  canvasModel: CanvasModel;
  onNavigate: (target: IssueTarget) => void;
}) {
  const [question, setQuestion] = useState("");
  const [model, setModel] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [run, setRun] = useState<Run | null>(null);
  const [coverage, setCoverage] = useState<Coverage>(loadCoverage);

  async function analyze() {
    setBusy(true);
    setError(null);
    try {
      const ctx = buildModelContext(canvasModel);
      const context = renderContextForPrompt(ctx);
      const { response, model: used } = await analyzeModel({
        context,
        question: question.trim() || undefined,
        lens: ctx.lens,
        model,
        domain: canvasModel.system_type?.domain?.trim() || undefined,
      });
      setRun({
        response,
        model: used,
        generatedAt: new Date().toISOString(),
        resolver: makeResolver(canvasModel, ctx.analysis),
      });
      const next: Coverage = {
        asks: coverage.asks + 1,
        kernel_findings: coverage.kernel_findings + ctx.analysis.validation.issues.length,
        llm_findings: coverage.llm_findings + countLlmFindings(response.evidence),
      };
      setCoverage(next);
      saveCoverage(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card title="Analyst" source="gsr · read-only">
      <div className="grid gap-3">
        <label className="grid gap-1 text-xs" style={{ color: "var(--text-secondary)" }}>
          Question (optional)
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="e.g. is the veto path modeled correctly?"
            className="rounded-md px-2 py-1 text-sm"
            style={{ border: "1px solid var(--border)", background: "var(--bg-primary)", color: "var(--text-primary)" }}
          />
        </label>
        <AssertedType systemType={canvasModel.system_type} />
        <div className="flex items-center gap-2">
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="rounded-md px-2 py-1 text-xs"
            style={{ border: "1px solid var(--border)", background: "var(--bg-primary)", color: "var(--text-primary)" }}
          >
            {MODEL_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <button
            onClick={analyze}
            disabled={busy}
            className="ml-auto rounded-full px-5 py-2 text-sm font-semibold transition-colors"
            style={{ background: "var(--accent)", color: "var(--text-on-accent)", opacity: busy ? 0.5 : 1, cursor: busy ? "wait" : "pointer" }}
          >
            {busy ? "Analyzing…" : "Analyze"}
          </button>
        </div>

        {error && (
          <p className="text-sm" style={{ color: "var(--verdict-error)", whiteSpace: "pre-wrap" }}>
            {error}
          </p>
        )}

        {!run && !error && (
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Analyze narrates the kernel's verdicts and judges domain plausibility. It proposes no
            structure — the Audit panel keeps the verdicts.
          </p>
        )}

        {run && (
          <div className="grid gap-4">
            <Section title="Answer">
              <p className="text-sm" style={{ color: "var(--text-primary)" }}>
                <Cited text={run.response.answer} resolver={run.resolver} onNavigate={onNavigate} />
              </p>
            </Section>

            {run.response.trace.length > 0 && (
              <Section title="Trace">
                <TraceDiagram
                  trace={run.response.trace}
                  evidence={run.response.evidence}
                  resolver={run.resolver}
                  onNavigate={onNavigate}
                />
                <ul className="mt-2 grid gap-1">
                  {run.response.trace.map((t, i) => (
                    <li key={i} className="text-xs" style={{ color: "var(--text-secondary)" }}>
                      <Cited text={t} resolver={run.resolver} onNavigate={onNavigate} />
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {run.response.evidence.length > 0 && (
              <Section title="Evidence">
                <ul className="grid gap-1">
                  {run.response.evidence.map((e, i) => (
                    <li key={i} className="text-xs" style={{ color: "var(--text-secondary)" }}>
                      <Cited text={e} resolver={run.resolver} onNavigate={onNavigate} />
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {run.response.next.length > 0 && (
              <Section title="Next">
                <ul className="grid gap-1">
                  {run.response.next.map((n, i) => (
                    <li key={i} className="text-xs" style={{ color: "var(--text-secondary)" }}>
                      {n}
                    </li>
                  ))}
                </ul>
              </Section>
            )}
          </div>
        )}

        <div
          className="mt-1 grid gap-1 border-t pt-3 text-[11px]"
          style={{ borderColor: "var(--hairline)", color: "var(--text-muted)" }}
        >
          <div className="flex flex-wrap items-center gap-2">
            <Pill tone="neutral">{run ? run.model || "local" : "—"}</Pill>
            <span className="tabular">{run ? run.generatedAt : "not run yet"}</span>
            <span className="ml-auto tabular">
              kernel {coverage.kernel_findings} · LLM {coverage.llm_findings} · self-sufficiency{" "}
              {selfSufficiency(coverage)}
            </span>
          </div>
          <div>narrates kernel facts — verdicts live in the Audit panel.</div>
        </div>
      </div>
    </Card>
  );
}

// The model's asserted type, read-only — authored in the inspector's Type tab.
// The domain here is the `domain` arg passed to analyzeModel; kingdom/genus reach
// the LLM through the rendered context, not this line.
function AssertedType({ systemType }: { systemType: SystemType | undefined }) {
  const parts = [systemType?.kingdom, systemType?.genus, systemType?.domain?.trim()].filter(
    (p): p is string => !!p,
  );
  return (
    <div className="text-xs" style={{ color: "var(--text-secondary)" }}>
      {parts.length > 0 ? (
        <>
          Asserted as: <span style={{ color: "var(--text-primary)" }}>{parts.join(" · ")}</span>
        </>
      ) : (
        <span style={{ color: "var(--text-muted)" }}>No system type asserted — set one in the Type tab.</span>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
        {title}
      </div>
      {children}
    </div>
  );
}

// Render a narration string with its resolved citation tokens as clickable chips
// (riding the lens accent, like the Audit rows). Unresolved tokens never reach
// here — parseCitations leaves them as plain text (the hallucination guard).
function Cited({
  text,
  resolver,
  onNavigate,
}: {
  text: string;
  resolver: CitationResolver;
  onNavigate: (target: IssueTarget) => void;
}) {
  const segments = parseCitations(text, resolver);
  return (
    <>
      {segments.map((seg, i) =>
        seg.kind === "text" ? (
          <span key={i}>{seg.text}</span>
        ) : (
          <button
            key={i}
            onClick={() => onNavigate(seg.target)}
            title={`${seg.text}: click to select on the canvas`}
            className="mx-0.5 rounded px-1 text-xs"
            style={{
              color: "var(--lens-accent)",
              border: "1px solid var(--lens-accent)",
              background: "var(--lens-accent-soft)",
            }}
          >
            {seg.label}
          </button>
        ),
      )}
    </>
  );
}
