// The workbench's bottom console — the results/terminal drawer beneath the
// canvas (IDE/DAW idiom). Presentation only: it re-homes the three forked
// analysis panels (Run / Formal / Audit) into a slim tabbed drawer that the
// canvas can reclaim by collapsing. Every panel's props and behavior are
// preserved verbatim; this file only decides WHERE they sit, not what they say.
import { useState } from "react";
import type { RunResultRich, LensDescription, ValidationResult, IssueTarget } from "./kernel/types";
import { RunPanel } from "./RunPanel";
import { FormalPanel } from "./FormalPanel";
import { AuditPanel } from "./AuditPanel";
import { Card } from "./ui";

type Tab = "run" | "formal" | "audit";

export function BottomConsole({
  result,
  runError,
  analysisError,
  desc,
  verdict,
  issueTargets,
  clean,
  onNavigate,
}: {
  result: RunResultRich | null;
  runError: string | null;
  analysisError: string | null;
  desc: LensDescription | null;
  verdict: ValidationResult | null;
  issueTargets: IssueTarget[];
  clean: boolean;
  onNavigate: (t: IssueTarget) => void;
}) {
  // Results drawer: default to Run (a fresh demo runs on open, so it lands on
  // content); imports leave Run dark and its empty state points at the lit tabs.
  const [tab, setTab] = useState<Tab>("run");
  const [collapsed, setCollapsed] = useState(false);
  const issueCount = verdict?.issues.length ?? 0;

  return (
    <div
      className="mt-4 flex flex-none flex-col overflow-hidden rounded-xl border"
      style={{ borderColor: "var(--hairline)", background: "var(--bg-secondary)" }}
    >
      {/* Slim header row: the three tabs on the left, collapse chevron on the
          right. The active tab underlines in the lens accent (the seam reaches
          here — the drawer lives under data-lens). */}
      <div
        className="flex items-center gap-1 border-b px-2"
        style={{ height: 38, borderColor: collapsed ? "transparent" : "var(--hairline)" }}
      >
        <ConsoleTab label="Run" active={tab === "run"} onClick={() => { setTab("run"); setCollapsed(false); }} />
        <ConsoleTab label="Formal" active={tab === "formal"} onClick={() => { setTab("formal"); setCollapsed(false); }} />
        <ConsoleTab
          label="Audit"
          active={tab === "audit"}
          badge={issueCount > 0 ? issueCount : undefined}
          onClick={() => { setTab("audit"); setCollapsed(false); }}
        />
        <button
          onClick={() => setCollapsed((c) => !c)}
          title={collapsed ? "Expand console" : "Collapse console"}
          className="ml-auto rounded px-2 py-1 text-xs"
          style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}
        >
          {collapsed ? "▴ console" : "▾"}
        </button>
      </div>

      {!collapsed && (
        <div className="overflow-y-auto px-4 py-4" style={{ height: "17rem" }}>
          {tab === "run" && <RunTab result={result} runError={runError} />}
          {tab === "formal" && <FormalTab desc={desc} analysisError={analysisError} />}
          {tab === "audit" && (
            <AuditTab verdict={verdict} issueTargets={issueTargets} clean={clean} onNavigate={onNavigate} />
          )}
        </div>
      )}
    </div>
  );
}

function ConsoleTab({
  label,
  active,
  badge,
  onClick,
}: {
  label: string;
  active: boolean;
  badge?: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="relative flex items-center gap-1.5 px-3 py-2 text-xs font-medium uppercase tracking-wide"
      style={{
        fontFamily: "var(--font-mono)",
        color: active ? "var(--text-primary)" : "var(--text-muted)",
        borderBottom: `2px solid ${active ? "var(--lens-accent)" : "transparent"}`,
      }}
    >
      {label}
      {badge !== undefined && (
        <span
          className="inline-flex min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold"
          style={{ background: "var(--verdict-warning)", color: "#fff" }}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

// Quiet, centered muted note for a tab with nothing to show yet.
function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full items-center justify-center px-6 text-center">
      <p className="text-sm" style={{ color: "var(--text-muted)" }}>
        {children}
      </p>
    </div>
  );
}

function RunTab({ result, runError }: { result: RunResultRich | null; runError: string | null }) {
  if (result) return <RunPanel result={result} />;
  if (runError)
    return (
      <Card title="Result" source="bert-compose · wasm">
        <p className="text-sm" style={{ color: "var(--verdict-error)" }}>
          {runError}
        </p>
      </Card>
    );
  return (
    <Empty>
      Run needs a demo bundle (model + CSV + mapping). Imported models still light up
      structure, lens, formal object, and audit — open a demo to run the simulation.
    </Empty>
  );
}

function FormalTab({ desc, analysisError }: { desc: LensDescription | null; analysisError: string | null }) {
  if (analysisError)
    return (
      <Card title="Kernel rejected this state" source="bert-core · wasm">
        <p className="text-sm" style={{ color: "var(--verdict-error)" }}>
          {analysisError}
        </p>
        <p className="mt-2 text-xs" style={{ color: "var(--text-muted)" }}>
          The canvas still shows the structure above. Switch lens, undo the last edit, or
          load another demo to clear this.
        </p>
      </Card>
    );
  if (desc) return <FormalPanel desc={desc} />;
  return <Empty>Open a model to see its formal object.</Empty>;
}

function AuditTab({
  verdict,
  issueTargets,
  clean,
  onNavigate,
}: {
  verdict: ValidationResult | null;
  issueTargets: IssueTarget[];
  clean: boolean;
  onNavigate: (t: IssueTarget) => void;
}) {
  // AuditPanel self-suppresses when there are no issues; the drawer keeps the
  // tab selectable, so it owns the clean/empty state instead.
  if (verdict && verdict.issues.length > 0)
    return <AuditPanel validation={verdict} targets={issueTargets} onNavigate={onNavigate} />;
  if (clean) return <Empty>✓ No issues — the model satisfies every check for this lens.</Empty>;
  return <Empty>Open a model to audit it.</Empty>;
}
