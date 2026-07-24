// #10 — the resident co-author dock. Static-markup render checks (the pattern
// the Klir/Mobus register tests use): no DOM, no wasm, no network — just that
// the history renders each turn's status and content faithfully.
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { CoAuthorPanel } from "./CoAuthorPanel";
import type { CoauthorTurn } from "./coauthor";

const noopDraft = async () => {};
const noopReopen = () => {};

describe("CoAuthorPanel", () => {
  it("renders an empty state with no drafts yet", () => {
    const m = renderToStaticMarkup(
      <CoAuthorPanel turns={[]} onDraft={noopDraft} onReopenInSlPane={noopReopen} />,
    );
    expect(m).toContain("No drafts yet this session");
    expect(m).toContain("Co-author");
  });

  it("renders a previewing turn with its description and SL", () => {
    const turns: CoauthorTurn[] = [
      {
        id: "t1",
        description: "a home thermostat with a sensor and a furnace",
        sl: 'system Thermostat\ncomponent Sensor interface\ncomponent Furnace interface',
        at: new Date("2026-07-24T12:00:00Z").toISOString(),
        status: "previewing",
      },
    ];
    const m = renderToStaticMarkup(
      <CoAuthorPanel turns={turns} onDraft={noopDraft} onReopenInSlPane={noopReopen} />,
    );
    expect(m).toContain("a home thermostat with a sensor and a furnace");
    expect(m).toContain("component Sensor interface");
    expect(m).toContain("previewing");
    expect(m).toContain("Reopen in SL pane");
  });

  it("surfaces a compile error's fault text instead of hiding it", () => {
    const turns: CoauthorTurn[] = [
      {
        id: "t2",
        description: "an unfinished sketch",
        sl: "system X",
        at: new Date().toISOString(),
        status: "compile-error",
        errorText: "line 2: unknown keyword `foo`",
      },
    ];
    const m = renderToStaticMarkup(
      <CoAuthorPanel turns={turns} onDraft={noopDraft} onReopenInSlPane={noopReopen} />,
    );
    expect(m).toContain("kernel rejected");
    expect(m).toContain("unknown keyword");
  });

  it("distinguishes accepted from discarded turns", () => {
    const turns: CoauthorTurn[] = [
      { id: "a", description: "accepted one", sl: "system A", at: new Date().toISOString(), status: "accepted" },
      { id: "b", description: "discarded one", sl: "system B", at: new Date().toISOString(), status: "discarded" },
    ];
    const m = renderToStaticMarkup(
      <CoAuthorPanel turns={turns} onDraft={noopDraft} onReopenInSlPane={noopReopen} />,
    );
    expect(m).toContain("accepted");
    expect(m).toContain("discarded");
  });
});
