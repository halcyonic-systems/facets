// The workspace frame (#409 M1). One question arranges the screen: what are
// you doing? Write, Build or Read is a preset over the panes that already
// exist; Focus is one toggle on top of it that gives the primary surface the
// window. The preset is a plain function of (mode, focus, previewing), so
// which panes are shown is a fact that can be tested without a DOM.
//
// The mode is a per-browser preference, kept the way the drafter model is
// (drafterModel.ts): one localStorage key, an in-memory cache, subscribers.
// Focus is session state and lives in the shell.

export type WorkspaceMode = "write" | "build" | "read";

export const WORKSPACE_MODES: { value: WorkspaceMode; label: string; title: string }[] = [
  { value: "write", label: "Write", title: "The text, full width, with the co-author" },
  { value: "build", label: "Build", title: "The canvas, the palette, and the element inspector" },
  { value: "read", label: "Read", title: "The diagram with the kernel's readings: formal object, review, analyst" },
];

export type InspectorTab = "element" | "formal" | "review" | "analyst";

/** Which panes a preset shows. `editor` is the SL pane at the full width or
 *  nothing (side by side is gone: Text was Write, Diagram was Build, and
 *  Split returns in M2 as Write's thumbnail). `inspector` names the tabs the
 *  dock offers, or is empty when the dock is not shown. `gateInPane` says
 *  where a previewed draft's Accept/Discard has to be: the pane carries it
 *  whenever the canvas banner that normally holds it cannot be seen. */
export type Preset = {
  editor: boolean;
  canvas: boolean;
  palette: boolean;
  inspector: InspectorTab[];
  inspectorWide: boolean;
  gateInPane: boolean;
  /** Write's right margin: the diagram small, the kernel's word, the caret. */
  margin: boolean;
  /** The top bar shrinks to a strip that returns on hover. */
  topBarStrip: boolean;
};

const READ_TABS: InspectorTab[] = ["formal", "review", "analyst"];

export function preset(mode: WorkspaceMode, focus: boolean, previewing: boolean): Preset {
  switch (mode) {
    case "write":
      return {
        editor: true,
        canvas: false,
        palette: false,
        inspector: [],
        inspectorWide: false,
        gateInPane: previewing,
        margin: !focus,
        topBarStrip: focus,
      };
    case "build":
      return {
        editor: false,
        canvas: true,
        palette: !focus,
        inspector: focus ? [] : ["element"],
        inspectorWide: false,
        gateInPane: false,
        margin: false,
        topBarStrip: focus,
      };
    case "read":
      return {
        editor: false,
        canvas: true,
        palette: false,
        inspector: focus ? [] : READ_TABS,
        inspectorWide: true,
        gateInPane: false,
        margin: false,
        topBarStrip: focus,
      };
  }
}

/** The primary surface of a mode, the one Focus gives the window to. */
export function primarySurface(mode: WorkspaceMode): "editor" | "canvas" {
  return mode === "write" ? "editor" : "canvas";
}

const KEY = "facets.workspace-mode";

function isMode(v: unknown): v is WorkspaceMode {
  return v === "write" || v === "build" || v === "read";
}

let current: WorkspaceMode = "write";
let loaded = false;
const listeners = new Set<(mode: WorkspaceMode) => void>();

function load(): void {
  loaded = true;
  try {
    const raw = localStorage.getItem(KEY);
    if (isMode(raw)) current = raw;
  } catch {
    // storage unavailable (private mode, quota) — the mode stays session-only
  }
}

export function workspaceMode(): WorkspaceMode {
  if (!loaded) load();
  return current;
}

export function setWorkspaceMode(mode: WorkspaceMode): void {
  loaded = true;
  current = mode;
  try {
    localStorage.setItem(KEY, mode);
  } catch {
    // as above — the choice holds for this session
  }
  for (const fn of listeners) fn(current);
}

export function subscribeWorkspaceMode(fn: (mode: WorkspaceMode) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Reset the module's cache — tests only. */
export function resetWorkspaceForTest(): void {
  current = "write";
  loaded = false;
  listeners.clear();
}
