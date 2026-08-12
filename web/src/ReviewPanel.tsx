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
import type { IssueTarget, Severity, ValidationResult } from "./kernel/types";
import type { CanvasModel } from "./kernel/types";
import type { IssueGroup, IssueRow as IssueRowData } from "./review";
import {
  MODE_SCOPE,
  SEVERITY_GLOSS,
  SEVERITY_HEADING,
  groupIssues,
  plainFirst,
  reviewCounts,
  shapePhrase,
  splitRationale,
  summaryLine,
} from "./review";
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

/** The doc anchor, as a link. Demoted (#204), never dropped (#129). */
function DocLink({ doc }: { doc: string }) {
  return (
    <a
      href={DOCS_BASE + doc}
      target="_blank"
      rel="noreferrer"
      onClick={(e) => {
        e.stopPropagation();
        openExternal(e);
      }}
      title="read the precondition this issue cites"
      style={{ color: "var(--lens-accent)", textDecoration: "underline", textDecorationStyle: "dotted" }}
    >
      {docLabel(doc)}
    </a>
  );
}

/** Why the kernel says so, folded away.
 *
 *  The citation is the product's central claim and it is also the thing that was
 *  read six times before the fix was read once (#319). It stays one click away
 *  and on the page, never removed: a verdict that cannot be checked is not what
 *  this panel is for. `<details>` and not state, so it survives a server render
 *  and a printed page. */
function Rationale({
  citation,
  rationale,
  doc,
}: {
  citation: string | null;
  rationale: string | null;
  doc: string | null;
}) {
  if (!citation && !rationale && !doc) return null;
  return (
    <details className="px-3 py-2 text-xs" style={{ color: "var(--text-muted)" }}>
      <summary className="cursor-pointer select-none" style={{ color: "var(--text-muted)" }}>
        Why the kernel says so
      </summary>
      <span className="mt-2 flex flex-wrap items-baseline gap-2">
        {citation && <Citation>{citation}</Citation>}
        {rationale && <span className="basis-full">{rationale}</span>}
        {doc && <DocLink doc={doc} />}
      </span>
    </details>
  );
}

function IssueRow({
  row,
  group,
  onNavigate,
}: {
  row: IssueRowData;
  /** What the group already said once, so the row does not repeat it. */
  group: IssueGroup;
  onNavigate: (target: IssueTarget) => void;
}) {
  const { issue, target, index } = row;
  const navigable = !!target && (target.thing !== null || target.relation !== null);
  const tone = issue.severity === "Error" ? "var(--verdict-error)" : "var(--verdict-warning)";
  const { plain, citation } = plainFirst(issue.message);
  const { claim, rationale } = splitRationale(plain);
  const ownCitation = group.citation === null ? citation : null;
  const ownRationale = group.rationale === null ? rationale : null;
  const ownDoc = group.doc === null ? issue.doc : null;
  const ownRepair = group.repair === null ? issue.suggestion : null;
  const disregarded = target?.disregarded_relations ?? 0;
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
          {claim}
        </span>
        {/* #320: the subject is drawn with lines this verdict did not count.
            Saying so is the difference between a refusal that reads as wrong and
            one that teaches Bunge's bond/mere distinction where it bites. */}
        {disregarded > 0 && (
          <span className="mt-1.5 block text-xs" style={{ color: "var(--verdict-warning)" }}>
            {disregarded === 1
              ? "1 relation drawn here is mere, so this reading does not count it as a bond."
              : `${disregarded} relations drawn here are mere, so this reading does not count them as bonds.`}
          </span>
        )}
        {ownRepair && (
          <span className="mt-1.5 block text-xs" style={{ color: "var(--text-muted)" }}>
            {ownRepair}
          </span>
        )}
        {(ownCitation || ownRationale || ownDoc) && (
          <span className="mt-1.5 flex flex-wrap items-baseline gap-2 text-xs" style={{ color: "var(--text-muted)" }}>
            {ownCitation && <Citation>{ownCitation}</Citation>}
            {ownRationale && <span className="basis-full">{ownRationale}</span>}
            {ownDoc && <DocLink doc={ownDoc} />}
          </span>
        )}
      </span>
    </div>
  );
}

/** One defect kind: what it is, how many times, how to repair it, then its
 *  instances. The repair leads because it is what the reader acts on; the
 *  provenance follows, once. */
function GroupBlock({ group, onNavigate }: { group: IssueGroup; onNavigate: (target: IssueTarget) => void }) {
  const n = group.rows.length;
  return (
    <div className="border-x border-t" style={{ borderColor: "var(--border)" }}>
      <div
        className="flex items-baseline justify-between gap-4 border-b px-3 py-2"
        style={{ borderColor: "var(--border)" }}
      >
        <span className="text-xs" style={{ fontFamily: "var(--font-mono)", color: "var(--text-primary)" }}>
          {group.label || "unnamed check"}
        </span>
        <span className="shrink-0 text-[11px] tabular" style={{ color: "var(--text-muted)" }}>
          {n === 1 ? "1 instance" : `${n} instances`}
        </span>
      </div>
      {group.repair && (
        <p className="border-b px-3 py-2 text-sm" style={{ borderColor: "var(--border)", color: "var(--text-primary)" }}>
          {group.repair}
        </p>
      )}
      <div>
        {group.rows.map((row) => (
          <IssueRow key={row.index} row={row} group={group} onNavigate={onNavigate} />
        ))}
      </div>
      <Rationale citation={group.citation} rationale={group.rationale} doc={group.doc} />
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
  rows: IssueRowData[];
  onNavigate: (target: IssueTarget) => void;
}) {
  if (rows.length === 0) return null;
  const groups = groupIssues(rows);
  return (
    <div>
      <BlockHeader label={SEVERITY_HEADING[severity]} count={shapePhrase(groups)} />
      <div className="border-x border-t px-3 py-2 text-xs" style={{ borderColor: "var(--border)" }}>
        <span style={{ color: severity === "Error" ? "var(--verdict-error)" : "var(--verdict-warning)" }}>
          {SEVERITY_GLOSS[severity]}
        </span>
      </div>
      {groups.map((g) => (
        <GroupBlock key={g.code || `singleton-${g.rows[0].index}`} group={g} onNavigate={onNavigate} />
      ))}
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
  // Numbering is per region and assigned before grouping, so a grouped list
  // still names each verdict by the position the kernel gave it: grouping
  // rearranges the reading, never the set.
  const rowsOf = (severity: Severity): IssueRowData[] =>
    validation.issues
      .map((issue, i) => ({ issue, target: targets[i] }))
      .filter((r) => r.issue.severity === severity)
      .map((r, i) => ({ ...r, index: i + 1 }));
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
      <SeverityRegion severity="Error" rows={rowsOf("Error")} onNavigate={onNavigate} />
      <SeverityRegion severity="Warning" rows={rowsOf("Warning")} onNavigate={onNavigate} />
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
