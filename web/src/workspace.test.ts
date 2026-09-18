import { beforeEach, describe, expect, it } from "vitest";
import {
  preset,
  primarySurface,
  resetWorkspaceForTest,
  setWorkspaceMode,
  subscribeWorkspaceMode,
  workspaceMode,
  type WorkspaceMode,
} from "./workspace";

const MODES: WorkspaceMode[] = ["write", "build", "read"];

describe("workspace presets (#409 M1)", () => {
  it("shows exactly one primary surface per mode, and Focus keeps it", () => {
    for (const mode of MODES) {
      for (const focus of [false, true]) {
        const p = preset(mode, focus, false);
        expect(p.editor !== p.canvas).toBe(true);
        expect(p.editor).toBe(primarySurface(mode) === "editor");
      }
    }
  });

  it("Write: the text alone, no palette, no inspector", () => {
    const p = preset("write", false, false);
    expect(p).toMatchObject({ editor: true, canvas: false, palette: false, inspector: [], margin: true });
    expect(preset("build", false, false).margin).toBe(false);
    expect(preset("read", false, false).margin).toBe(false);
  });

  it("Build: canvas, palette and the element inspector; Read: canvas and the readings, widened", () => {
    expect(preset("build", false, false)).toMatchObject({
      canvas: true,
      palette: true,
      inspector: ["element"],
      inspectorWide: false,
    });
    expect(preset("read", false, false)).toMatchObject({
      canvas: true,
      palette: false,
      inspector: ["formal", "review", "analyst"],
      inspectorWide: true,
    });
  });

  it("every existing surface is reachable from some mode", () => {
    const all = MODES.map((m) => preset(m, false, false));
    expect(all.some((p) => p.editor)).toBe(true);
    expect(all.some((p) => p.canvas)).toBe(true);
    expect(all.some((p) => p.palette)).toBe(true);
    for (const tab of ["element", "formal", "review", "analyst"] as const) {
      expect(all.some((p) => p.inspector.includes(tab))).toBe(true);
    }
  });

  it("Focus removes every pane but the primary surface, and shrinks the top bar", () => {
    for (const mode of MODES) {
      const p = preset(mode, true, false);
      expect(p.palette).toBe(false);
      expect(p.inspector).toEqual([]);
      expect(p.margin).toBe(false);
      expect(p.topBarStrip).toBe(true);
      expect(preset(mode, false, false).topBarStrip).toBe(false);
    }
  });

  it("never hides a draft preview's gate: the pane carries it exactly when the canvas is out of sight", () => {
    for (const mode of MODES) {
      for (const focus of [false, true]) {
        const p = preset(mode, focus, true);
        expect(p.gateInPane).toBe(!p.canvas);
        expect(preset(mode, focus, false).gateInPane).toBe(false);
      }
    }
  });
});

describe("the remembered mode", () => {
  beforeEach(resetWorkspaceForTest);

  it("opens on Write when nothing is stored", () => {
    expect(workspaceMode()).toBe("write");
  });

  it("tells subscribers about a change and holds it", () => {
    const seen: WorkspaceMode[] = [];
    subscribeWorkspaceMode((m) => seen.push(m));
    setWorkspaceMode("read");
    expect(seen).toEqual(["read"]);
    expect(workspaceMode()).toBe("read");
  });
});
