// #10 — the resident co-author, folded into the SL pane as a mode. Static-
// markup render checks (the pattern the Klir/Mobus register tests use): no
// DOM, no wasm, no network — just that the history renders each turn's status
// and content faithfully.
import { beforeEach, describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { CoAuthorMode, stageLabel } from "./CoAuthorMode";
import type { CoauthorTurn, DraftStage } from "./coauthor";
import {
  initReasoner,
  memoryReasonerBackend,
  resetReasonerForTest,
  setReasonerConfigBackend,
} from "./reasoner";

const noopDraft = async () => {};
const noopLoad = () => {};

/** #199: the drafting surface only exists once the reasoner is on. */
async function reasonerOn(endpoint = "http://localhost:5010") {
  resetReasonerForTest();
  setReasonerConfigBackend(memoryReasonerBackend({ enabled: true, endpoint }));
  await initReasoner();
}

describe("CoAuthorMode", () => {
  beforeEach(async () => {
    await reasonerOn();
  });

  it("renders an empty state with no drafts yet", () => {
    const m = renderToStaticMarkup(
      <CoAuthorMode turns={[]} onDraft={noopDraft} onLoad={noopLoad} />,
    );
    expect(m).toContain("No drafts yet");
    expect(m).toContain("Draft");
  });

  it("offers the enable choice — and no drafting surface — while the reasoner is off", async () => {
    resetReasonerForTest();
    setReasonerConfigBackend(memoryReasonerBackend(null));
    await initReasoner();
    const m = renderToStaticMarkup(
      <CoAuthorMode turns={[]} onDraft={noopDraft} onLoad={noopLoad} />,
    );
    expect(m).toContain("Turn on the co-author");
    expect(m).toContain("Your own reasoner");
    expect(m).toContain("Halcyonic&#x27;s hosted reasoner");
    expect(m).toContain("http://localhost:5010");
    expect(m).not.toContain("Describe a system in plain language");
  });

  it("says which reasoner is in use once it is on, and offers to turn it off", async () => {
    await reasonerOn("http://127.0.0.1:5010");
    const m = renderToStaticMarkup(
      <CoAuthorMode turns={[]} onDraft={noopDraft} onLoad={noopLoad} />,
    );
    expect(m).toContain("Co-author is on");
    expect(m).toContain("your own reasoner");
    expect(m).toContain("http://127.0.0.1:5010");
    expect(m).toContain("Turn off");
  });

  it("renders a previewing turn with its description and SL", () => {
    const turns: CoauthorTurn[] = [
      {
        id: "t1",
        description: "a home thermostat with a sensor and a furnace",
        sl: "system Thermostat\ncomponent Sensor interface\ncomponent Furnace interface",
        at: new Date("2026-07-24T12:00:00Z").toISOString(),
        status: "previewing",
      },
    ];
    const m = renderToStaticMarkup(
      <CoAuthorMode turns={turns} onDraft={noopDraft} onLoad={noopLoad} />,
    );
    expect(m).toContain("a home thermostat with a sensor and a furnace");
    expect(m).toContain("component Sensor interface");
    expect(m).toContain("previewing");
    expect(m).toContain("Load");
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
      <CoAuthorMode turns={turns} onDraft={noopDraft} onLoad={noopLoad} />,
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
      <CoAuthorMode turns={turns} onDraft={noopDraft} onLoad={noopLoad} />,
    );
    expect(m).toContain("accepted");
    expect(m).toContain("discarded");
  });
});

describe("stageLabel (#218 — naming the stage instead of a static 'Drafting…')", () => {
  const LOCAL = "http://localhost:5010";
  const HOSTED = "https://reasoner.halcyonic.systems";

  it("falls back to the static label when no stage is known yet", () => {
    expect(stageLabel(null, LOCAL)).toBe("Drafting…");
  });

  it("names the local default model when asking one's own endpoint", () => {
    expect(stageLabel({ kind: "asking" }, LOCAL)).toBe("Asking the local reasoner (gemma4)…");
  });

  it("does not invent a model name for the hosted reasoner", () => {
    const label = stageLabel({ kind: "asking" }, HOSTED);
    expect(label).toBe("Asking Halcyonic's reasoner…");
    expect(label).not.toMatch(/gemma|claude/i);
  });

  it("names the compile phase", () => {
    expect(stageLabel({ kind: "compiling" }, LOCAL)).toBe("Compiling the draft…");
  });

  it("makes the heal-loop retry legible, with the attempt count", () => {
    const stage: DraftStage = { kind: "retrying", attempt: 2, maxAttempts: 3 };
    expect(stageLabel(stage, LOCAL)).toBe("Draft did not compile, retrying (2 of 3)…");
  });

  it("reflects the final attempt distinctly from the first retry", () => {
    const stage: DraftStage = { kind: "retrying", attempt: 3, maxAttempts: 3 };
    expect(stageLabel(stage, LOCAL)).toBe("Draft did not compile, retrying (3 of 3)…");
  });
});
