// The inspector dock — the workbench's right-edge instrument panel. The three
// analysis faces (Run / Formal / Audit) share one docked column and show one at
// a time behind a tab strip, so the canvas keeps the viewport while the active
// reading sits beside it. Placement only: each tab hosts the existing panel
// unchanged (same props, same kernel-fed data). The dock decides nothing — it
// arranges. Frost chrome, lens-tinted active tab (rides the --lens-* seam).
import { useEffect, useState } from "react";
import type {
  CanvasModel,
  IssueTarget,
  Lens,
  LensDescription,
  RunResultRich,
  SystemType,
  Thing,
  ValidationResult,
} from "./kernel/types";
import { NodeEditorRows, type DecomposeAffordance } from "./canvas/NodeEditor";
import { RunPanel } from "./RunPanel";
import { FormalPanel } from "./FormalPanel";
import { AuditPanel } from "./AuditPanel";
import { AnalystPanel } from "./AnalystPanel";
import { SystemTypeEditor } from "./SystemTypeEditor";
import { KernelErrorBoundary } from "./KernelErrorBoundary";
import { Card } from "./ui";

type Tab = "element" | "run" | "formal" | "audit" | "analyst" | "type";

/** The selected element's editing surface, as the shell hands it over (#122).
 *  Null thing = nothing selected; the face says so rather than vanishing. */
export interface ElementSelection {
  thing: Thing | null;
  lens: Lens;
  decompose: DecomposeAffordance | null;
  onUpdate: (t: Thing) => void;
  onDelete: () => void;
  onDeselect: () => void;
}

export function InspectorDock({
  result,
  runError,
  desc,
  verdict,
  issueTargets,
  analysisError,
  canvasModel,
  onNavigate,
  onSystemTypeChange,
  onAcceptUnit,
  element,
  resetKeys,
  focused,
  onToggleFocus,
  tick,
}: {
  result: RunResultRich | null;
  runError: string | null;
  desc: LensDescription | null;
  verdict: ValidationResult | null;
  issueTargets: IssueTarget[];
  analysisError: string | null;
  canvasModel: CanvasModel | null;
  onNavigate: (target: IssueTarget) => void;
  onSystemTypeChange: (next: SystemType) => void;
  /** #94: run panel's accept-derived-unit affordance — writes a derived stock
   *  unit into the authoring model as declared. Placement only; App owns it. */
  onAcceptUnit?: (name: string, unit: string) => void;
  /** #154 P1: SimScrubber tick, forwarded to RunPanel's state-space marker. */
  tick?: number;
  resetKeys: unknown[];
  /** #122: the canvas's element editor lives HERE, not in a popover at the
   *  pointer. Null in a surface that carries its own inline editor (the Klir
   *  and Bunge registers), which then owns the element face itself. */
  element: ElementSelection | null;
  // #57: focus mode. When on, the parent hides the palette + canvas and this
  // dock fills the whole work region so the active tab reads as a full screen.
  focused: boolean;
  onToggleFocus: () => void;
}) {
  const [tab, setTab] = useState<Tab>("run");
  const [collapsed, setCollapsed] = useState(false);
  const issueCount = verdict?.issues.length ?? 0;

  // Selecting a thing on the canvas raises its editor here — the docked
  // replacement for the popover that used to mount under the pointer. An
  // arriving selection also un-collapses the dock: a click that produced no
  // visible response would read as a dead click.
  const selectedId = element?.thing?.id ?? null;
  useEffect(() => {
    if (selectedId === null) return;
    setTab("element");
    setCollapsed(false);
  }, [selectedId]);

  // Focus wins over the thin collapse rail — a full-width dock can't be a sliver.
  if (collapsed && !focused) {
    return (
      <div
        className="flex w-8 flex-col items-center gap-3 border-l py-2"
        style={{ borderColor: "var(--hairline)", background: "var(--bg-secondary)" }}
      >
        <button
          onClick={() => setCollapsed(false)}
          title="Show inspector"
          className="text-xs"
          style={{ color: "var(--text-muted)" }}
        >
          ◂
        </button>
        <span
          className="text-[10px] font-semibold uppercase tracking-wide"
          style={{ color: "var(--text-muted)", writingMode: "vertical-rl" }}
        >
          inspector
        </span>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col border-l ${focused ? "min-h-0 flex-1" : "w-96 shrink-0"}`}
      style={{ borderColor: "var(--hairline)", background: "var(--bg-secondary)" }}
    >
      {/* Tab strip — the instrument's face selector. The active tab carries the
          lens accent (underline + text), the rest stay quiet. */}
      <div
        className="flex items-stretch border-b"
        style={{ borderColor: "var(--hairline)" }}
      >
        {element && (
          <TabButton label="Element" active={tab === "element"} onClick={() => setTab("element")} />
        )}
        <TabButton label="Run" active={tab === "run"} onClick={() => setTab("run")} />
        <TabButton label="Formal" active={tab === "formal"} onClick={() => setTab("formal")} />
        <TabButton
          label="Audit"
          active={tab === "audit"}
          onClick={() => setTab("audit")}
          badge={issueCount > 0 ? issueCount : undefined}
        />
        <TabButton label="Analyst" active={tab === "analyst"} onClick={() => setTab("analyst")} />
        <TabButton label="Type" active={tab === "type"} onClick={() => setTab("type")} />
        <div className="ml-auto flex items-stretch">
          {/* Focus toggle — pops the active tab full-width (hides the canvas) and
              back. Same quiet glyph-button chrome as the collapse control. */}
          <button
            onClick={onToggleFocus}
            title={focused ? "Exit focus (show canvas)" : "Focus — expand this tab full-width"}
            aria-pressed={focused}
            className="px-3 text-xs"
            style={{ color: focused ? "var(--lens-accent)" : "var(--text-muted)" }}
          >
            {focused ? "⤡" : "⤢"}
          </button>
          {/* Collapse to a sliver — only meaningful in the docked (non-focus)
              layout; full-width focus can't collapse to a rail. */}
          {!focused && (
            <button
              onClick={() => setCollapsed(true)}
              title="Collapse inspector"
              className="px-3 text-xs"
              style={{ color: "var(--text-muted)" }}
            >
              ▸
            </button>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {/* In focus mode the panel gets the whole row; hold it to a comfortable
            reading measure so it reads as a designed screen, not a stretched
            dock (harvested from #55's PanelScreen shell). */}
        <div className={focused ? "mx-auto w-full max-w-4xl" : undefined}>
          <KernelErrorBoundary resetKeys={resetKeys}>
            {tab === "element" &&
              (element?.thing ? (
                <NodeEditorRows
                  thing={element.thing}
                  lens={element.lens}
                  decompose={element.decompose}
                  onUpdateThing={element.onUpdate}
                  onDelete={element.onDelete}
                  onClose={element.onDeselect}
                />
              ) : (
                <Placeholder>Click a component or environment thing to edit it here.</Placeholder>
              ))}
            {tab === "run" && (
              <RunTab
                result={result}
                runError={runError}
                lens={canvasModel?.lens ?? "Klir"}
                onAcceptUnit={onAcceptUnit}
                tick={tick}
              />
            )}
            {tab === "formal" && <FormalTab desc={desc} analysisError={analysisError} />}
            {tab === "audit" && (
              <AuditTab
                verdict={verdict}
                issueTargets={issueTargets}
                analysisError={analysisError}
                onNavigate={onNavigate}
              />
            )}
            {tab === "analyst" &&
              (canvasModel ? (
                <AnalystPanel canvasModel={canvasModel} onNavigate={onNavigate} />
              ) : (
                <Placeholder>Open or import a model to analyze it.</Placeholder>
              ))}
            {tab === "type" &&
              (canvasModel ? (
                <SystemTypeEditor value={canvasModel.system_type} onChange={onSystemTypeChange} />
              ) : (
                <Placeholder>Open or import a model to assert its system type.</Placeholder>
              ))}
          </KernelErrorBoundary>
        </div>
      </div>
    </div>
  );
}

function TabButton({
  label,
  active,
  onClick,
  badge,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide transition-colors"
      style={{
        color: active ? "var(--text-primary)" : "var(--text-muted)",
        borderBottom: `2px solid ${active ? "var(--lens-accent)" : "transparent"}`,
        marginBottom: "-1px",
        transition: "var(--transition-base)",
      }}
    >
      {label}
      {badge !== undefined && (
        <span
          className="inline-flex min-w-[1.1rem] items-center justify-center rounded-full px-1 text-[10px] font-medium tabular"
          style={{ background: "var(--verdict-warning)", color: "var(--text-on-accent)" }}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

// The empty / waiting state for a tab whose kernel output isn't there yet.
function Placeholder({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-1 py-6 text-sm" style={{ color: "var(--text-muted)" }}>
      {children}
    </p>
  );
}

function RunTab({
  result,
  runError,
  lens,
  onAcceptUnit,
  tick,
}: {
  result: RunResultRich | null;
  runError: string | null;
  lens: CanvasModel["lens"];
  onAcceptUnit?: (name: string, unit: string) => void;
  tick?: number;
}) {
  if (runError) {
    return (
      <Card title="Result" source="bert-compose · wasm">
        <p className="text-sm" style={{ color: "var(--verdict-error)" }}>
          {runError}
        </p>
      </Card>
    );
  }
  if (result) return <RunPanel result={result} lens={lens} onAcceptUnit={onAcceptUnit} tick={tick} />;
  return (
    <Placeholder>
      Run a demo bundle (model + CSV + mapping) to see the forced simulation here.
    </Placeholder>
  );
}

function FormalTab({ desc, analysisError }: { desc: LensDescription | null; analysisError: string | null }) {
  if (analysisError) return <RejectedCard message={analysisError} />;
  if (desc) return <FormalPanel desc={desc} />;
  return <Placeholder>Open or import a model to see its formal object in the active lens.</Placeholder>;
}

function AuditTab({
  verdict,
  issueTargets,
  analysisError,
  onNavigate,
}: {
  verdict: ValidationResult | null;
  issueTargets: IssueTarget[];
  analysisError: string | null;
  onNavigate: (target: IssueTarget) => void;
}) {
  if (analysisError) return <RejectedCard message={analysisError} />;
  if (!verdict) return <Placeholder>Open or import a model to audit it against the kernel.</Placeholder>;
  if (verdict.issues.length === 0) {
    return (
      <Card title="Audit" source="bert-core · wasm">
        <p className="text-sm" style={{ color: "var(--verdict-ok)" }}>
          ✓ No issues — the kernel validates this model.
        </p>
      </Card>
    );
  }
  return <AuditPanel validation={verdict} targets={issueTargets} onNavigate={onNavigate} />;
}

// The kernel-rejected notice, shared by the Formal and Audit tabs (both read the
// same projection, so a rejection blanks both).
function RejectedCard({ message }: { message: string }) {
  return (
    <Card title="Kernel rejected this state" source="bert-core · wasm">
      <p className="text-sm" style={{ color: "var(--verdict-error)" }}>
        {message}
      </p>
      <p className="mt-2 text-xs" style={{ color: "var(--text-muted)" }}>
        The canvas still shows the structure. Switch lens, undo the last edit, or load another demo to clear this.
      </p>
    </Card>
  );
}
