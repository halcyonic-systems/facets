// The review report (#204) — what the kernel checked, in the author's language.
// Formerly "Audit": a passive list of citation-led strings. The verdicts are
// unchanged (they are the kernel's, verbatim); what changed is the packaging.
// The headline names counts, lens, and MODE — Bunge judges at Structural
// (bonding only) and Mobus at Operational (dead ends, reachability, stock
// dimensions), so a verdict without its mode is meaningless. Rows lead with the
// verdict's own sentence and carry the citation after it; the doc anchors (#129)
// are demoted, never dropped. Refusals and observations get separate regions,
// because a Warning is the kernel NAMING something and leaving intent to a
// human, not a failure (#212).
// No LLM sits anywhere in this path. Every line below is kernel output or fixed
// copy; if a generated suggestion ever lands here it belongs in its own region,
// visibly outside these. That used to be this comment and nothing else (#233
// §4). It is now the type: `ValidationIssue` carries a provenance brand only
// the wasm boundary can mint (`kernel/types.ts`), so an LLM-derived row cannot
// be widened into `validation.issues` — it is a compile error, and
// `verdictChannel.test.ts` type-checks the violation to prove the error is
// still there.
import type { IssueTarget, Severity, ValidationIssue, ValidationResult } from "./kernel/types";
import type { CanvasModel } from "./kernel/types";
import { MODE_SCOPE, SEVERITY_GLOSS, SEVERITY_HEADING, plainFirst, reviewCounts, summaryLine } from "./review";
import { openExternal } from "./desktop";

// Where the linked docs live. The anchors are repo-relative
// (`docs/glossary.md#precondition`), pinned by the kernel's doc_anchors_resolve
// test, so a rendered link can only die if this base moves.
const DOCS_BASE = "https://github.com/halcyonic-systems/bert-lenses/blob/main/";

/** "docs/glossary.md#precondition" → "glossary § precondition" — presentation
 *  only (a shorter label for the same anchor). */
function docLabel(doc: string): string {
  const [path, anchor] = doc.split("#");
  const file = path.split("/").pop()?.replace(/\.md$/, "") ?? path;
  return anchor ? `${file} § ${anchor}` : file;
}

function BlockHeader({ label, count }: { label: string; count?: string }) {
  return (
    <div
      className="flex items-baseline justify-between gap-4 border-x border-t px-3 py-2"
      style={{ background: "var(--accent-soft)", borderColor: "var(--border)" }}
    >
      <span
        className="text-[11px] font-semibold uppercase tracking-[0.2em]"
        style={{ fontFamily: "var(--font-mono)", color: "var(--accent-strong)" }}
      >
        {label}
      </span>
      {count && (
        <span className="shrink-0 text-[11px] tabular" style={{ color: "var(--accent-strong)" }}>
          {count}
        </span>
      )}
    </div>
  );
}

function Gutter({ index, tone }: { index: number; tone: string }) {
  return (
    <span
      className="flex items-start justify-end py-3 pr-2 tabular text-[11px]"
      style={{ background: "var(--accent-soft)", color: tone, borderRight: "1px solid var(--border)" }}
    >
      {String(index).padStart(2, "0")}
    </span>
  );
}

/** The citation, demoted to a mark under its own sentence. */
function Citation({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="shrink-0 px-1.5 py-0.5 text-[10px] font-semibold tracking-[0.08em]"
      style={{
        background: "var(--accent)",
        color: "var(--text-on-accent)",
        borderRadius: "var(--radius-sm)",
      }}
    >
      {children}
    </span>
  );
}

function IssueRow({
  issue,
  index,
  target,
  onNavigate,
}: {
  issue: ValidationIssue;
  index: number;
  target: IssueTarget | undefined;
  onNavigate: (target: IssueTarget) => void;
}) {
  const navigable = !!target && (target.thing !== null || target.relation !== null);
  const tone = issue.severity === "Error" ? "var(--verdict-error)" : "var(--verdict-warning)";
  const { plain, citation } = plainFirst(issue.message);
  return (
    <div
      onClick={navigable ? () => onNavigate(target!) : undefined}
      title={navigable ? "click to select the element on the canvas" : undefined}
      className={`grid w-full grid-cols-[2.5rem_1fr] items-stretch border-b text-left${navigable ? " cursor-pointer" : ""}`}
      style={{ borderColor: "var(--border)" }}
    >
      <Gutter index={index} tone={tone} />
      <span className="block py-3 pl-3 pr-3">
        {/* The verdict, as a sentence. */}
        <span className="block text-sm" style={{ color: "var(--text-primary)" }}>
          {plain}
        </span>
        {/* Second line: where to read why, and what the kernel suggests. */}
        {(citation || issue.doc || issue.suggestion) && (
          <span className="mt-1.5 flex flex-wrap items-center gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
            {citation && <Citation>{citation}</Citation>}
            {issue.doc && (
              <a
                href={DOCS_BASE + issue.doc}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => {
                  e.stopPropagation();
                  openExternal(e);
                }}
                title="read the precondition this issue cites"
                style={{
                  color: "var(--lens-accent)",
                  textDecoration: "underline",
                  textDecorationStyle: "dotted",
                }}
              >
                {docLabel(issue.doc)}
              </a>
            )}
            {issue.suggestion && <span>{issue.suggestion}</span>}
          </span>
        )}
      </span>
    </div>
  );
}

/** One severity's region — refusals and observations never share a list. */
function SeverityRegion({
  severity,
  rows,
  onNavigate,
}: {
  severity: Severity;
  rows: { issue: ValidationIssue; target: IssueTarget | undefined }[];
  onNavigate: (target: IssueTarget) => void;
}) {
  if (rows.length === 0) return null;
  return (
    <div>
      <BlockHeader label={SEVERITY_HEADING[severity]} count={String(rows.length)} />
      <div className="border-x border-t px-3 py-2 text-xs" style={{ borderColor: "var(--border)" }}>
        <span style={{ color: severity === "Error" ? "var(--verdict-error)" : "var(--verdict-warning)" }}>
          {SEVERITY_GLOSS[severity]}
        </span>
      </div>
      <div className="border-x border-t" style={{ borderColor: "var(--border)" }}>
        {rows.map((r, i) => (
          <IssueRow key={i} issue={r.issue} index={i + 1} target={r.target} onNavigate={onNavigate} />
        ))}
      </div>
    </div>
  );
}

export function ReviewPanel({
  model,
  validation,
  targets,
  reviewedAt,
  onReview,
  onNavigate,
}: {
  model: CanvasModel;
  validation: ValidationResult;
  targets: IssueTarget[];
  /** Wall-clock stamp of the last invoked review; null = never invoked (the
   *  panel still shows the standing reading — the kernel judges continuously). */
  reviewedAt: string | null;
  onReview: () => void;
  onNavigate: (target: IssueTarget) => void;
}) {
  const counts = reviewCounts(model, validation);
  const rows = validation.issues.map((issue, i) => ({ issue, target: targets[i] }));
  const clean = validation.issues.length === 0;
  return (
    <div className="grid gap-4">
      <div>
        <BlockHeader label="Review" count="bert-core · wasm" />
        <div
          className="border-x border-t border-b px-3 py-3"
          style={{ borderColor: "var(--border)", background: "var(--bg-primary)" }}
        >
          <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            {summaryLine(model, validation)}
          </p>
          <p className="mt-2 text-xs" style={{ color: "var(--text-muted)" }}>
            {MODE_SCOPE[model.lens]}
          </p>
          {clean && (
            <p className="mt-2 text-sm" style={{ color: "var(--verdict-ok)" }}>
              Every check this mode runs passed. That is a verdict, not a silence.
            </p>
          )}
          <div className="mt-3 flex items-center gap-3">
            <button
              onClick={onReview}
              className="px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em]"
              style={{
                background: "var(--accent-strong)",
                color: "var(--text-on-accent)",
                borderRadius: "var(--radius-sm)",
              }}
              title="Re-run the kernel's review of this model"
            >
              Review model
            </button>
            {reviewedAt && (
              <span className="text-xs tabular" style={{ color: "var(--text-muted)" }}>
                reviewed {reviewedAt}
              </span>
            )}
          </div>
        </div>
      </div>
      <SeverityRegion
        severity="Error"
        rows={rows.filter((r) => r.issue.severity === "Error")}
        onNavigate={onNavigate}
      />
      <SeverityRegion
        severity="Warning"
        rows={rows.filter((r) => r.issue.severity === "Warning")}
        onNavigate={onNavigate}
      />
      <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
        Every line above is a machine-checked verdict from the kernel. Nothing here is generated prose.
      </p>
      {counts.errors > 0 && (
        <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
          A refusal blocks this model from being authored at {model.lens}'s mode; it is not a canvas error.
        </p>
      )}
    </div>
  );
}
