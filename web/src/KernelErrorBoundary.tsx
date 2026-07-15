// A render-phase safety net around the canvas + panels.
//
// The kernel (crates/bert-lenses-kernel/API.md, "Error contract") never panics,
// but it DOES throw a `JsError` / `KernelError` on a malformed-but-parseable
// editing state — exactly what palette authoring produces. Several of those
// calls happen during render (App's `analyzeCanvas` memo; children reading lens
// facts), so an uncaught throw would unmount the whole React tree: a validation
// failure becomes a session failure, a white screen. This boundary catches that
// throw and renders it as a verdict panel instead — the kernel's own message,
// never a blank page. Presentation only; it decides nothing about systemhood.
import { Component, type ErrorInfo, type ReactNode } from "react";
import { isKernelError } from "./kernel";
import { Card } from "./ui";

type Props = {
  /** When any entry changes (by identity), the caught error clears and the
   *  children re-render. Pass the canvas model / demo key so loading another
   *  demo or undoing an edit recovers automatically — the error is ephemeral. */
  resetKeys: unknown[];
  children: ReactNode;
};

type State = { error: Error | null };

export class KernelErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidUpdate(prev: Props) {
    // Ephemeral by design: any change to a reset key (a new demo, an undo, a
    // fresh edit) drops the caught error so the recovered state renders.
    if (this.state.error && keysChanged(prev.resetKeys, this.props.resetKeys)) {
      this.setState({ error: null });
    }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Surfaced for debugging; the panel below is what the user sees.
    console.error("kernel rejected this state:", error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    const kernel = isKernelError(error);
    return (
      <Card title="Kernel rejected this state" source="bert-core · wasm">
        <p className="text-sm" style={{ color: "var(--verdict-error)" }}>
          {error.message || "The kernel refused the current editing state."}
        </p>
        <p className="mt-2 text-xs" style={{ color: "var(--text-muted)" }}>
          {kernel
            ? "This state could not be validated. Load another demo or undo the last edit to continue — the canvas recovers on its own."
            : "Load another demo or undo the last edit to continue."}
        </p>
      </Card>
    );
  }
}

function keysChanged(a: unknown[], b: unknown[]): boolean {
  if (a.length !== b.length) return true;
  return a.some((k, i) => !Object.is(k, b[i]));
}
