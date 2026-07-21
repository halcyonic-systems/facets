// The audit panel — the kernel's issue list made navigable (harvest #5b: click
// a red row → the offending element is selected on the canvas; the panel stays
// READ-ONLY). Rows and targets both come from analyze_canvas: messages are the
// kernel's verbatim, and navigation rides issue_targets (kernel-resolved from
// the projection's id maps) — never a location string parsed in JS.
//
// #129: each issue may carry `doc` — a stable, kernel-chosen anchor into the
// repo's glossary/concordance/spec (bert_core::validate::doc). The face only
// typesets it as a link; WHICH entry a refusal cites is kernel judgment.
import type { IssueTarget, ValidationResult } from "./kernel/types";
import { Card, Pill } from "./ui";

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

export function AuditPanel({
  validation,
  targets,
  onNavigate,
}: {
  validation: ValidationResult;
  targets: IssueTarget[];
  onNavigate: (target: IssueTarget) => void;
}) {
  if (validation.issues.length === 0) return null;
  return (
    <Card title="Audit" source="bert-core · wasm">
      <div className="grid gap-2">
        {validation.issues.map((issue, i) => {
          const target = targets[i];
          const navigable = target && (target.thing !== null || target.relation !== null);
          return (
            <div
              key={i}
              onClick={navigable ? () => onNavigate(target) : undefined}
              title={navigable ? "click to select the element on the canvas" : undefined}
              className={`flex items-start gap-3 rounded-lg px-3 py-2 text-sm${navigable ? " cursor-pointer" : ""}`}
              style={{
                background: "var(--bg-primary)",
                border: `1px solid ${navigable ? "var(--lens-accent)" : "var(--border)"}`,
              }}
            >
              <Pill tone={issue.severity === "Error" ? "error" : "warning"}>{issue.severity}</Pill>
              <div className="min-w-0">
                <div style={{ color: "var(--text-primary)" }}>{issue.message}</div>
                {(issue.suggestion || issue.doc) && (
                  <div className="mt-0.5 text-xs" style={{ color: "var(--text-muted)" }}>
                    {issue.suggestion}
                    {issue.doc && (
                      <>
                        {issue.suggestion ? " · " : ""}
                        <a
                          href={DOCS_BASE + issue.doc}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          title="read the precondition this refusal cites"
                          style={{
                            color: "var(--lens-accent)",
                            textDecoration: "underline",
                            textDecorationStyle: "dotted",
                          }}
                        >
                          {docLabel(issue.doc)}
                        </a>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
