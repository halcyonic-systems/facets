// #10: the SL pane's manual-authoring surface is the base surface and must
// never be gated behind the co-author — it renders whether or not `coauthor`
// is supplied, and stays the default view even when the mode switch is
// present. Static-markup checks (no DOM events, so mode-switch clicking is
// exercised live — see the PR's manual verification note). The editor is a
// CodeMirror host mounted in an effect (#353 Tier 2), so static markup shows
// its host div, not the text; the text is asserted at the pure-module level
// (sl/mode.test.ts, sl/sync.test.ts).
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { SlPane } from "./SlPane";

const noop = () => {};

describe("SlPane — manual authoring is preserved", () => {
  it("renders the textarea and Compile button with no coauthor prop at all", () => {
    const m = renderToStaticMarkup(
      <SlPane
        text="system X"
        errors={[]}
        onTextChange={noop}
        onErrors={noop}
        onCompiled={noop}
        onClose={noop}
        canvasModel={null}
      />,
    );
    expect(m).toContain("sl-editor");
    expect(m).toContain("Compile");
    expect(m).not.toContain("Co-author");
  });

  it("still defaults to the SL (manual) view when coauthor is supplied", () => {
    const m = renderToStaticMarkup(
      <SlPane
        text="system Y"
        errors={[]}
        onTextChange={noop}
        onErrors={noop}
        onCompiled={noop}
        onClose={noop}
        canvasModel={null}
        coauthor={{ turns: [], onDraft: async () => ({ produced: true }), onCorrect: async () => ({ produced: true }) }}
      />,
    );
    // Both the mode switch AND the manual editor/Compile are present —
    // co-author is an added mode, not a replacement for hand-authoring.
    expect(m).toContain("Co-author");
    expect(m).toContain("sl-editor");
    expect(m).toContain("Compile");
  });

  it("opens on the co-author tab, with the words kept, when a description is handed in", () => {
    const m = renderToStaticMarkup(
      <SlPane
        text=""
        errors={[]}
        onTextChange={noop}
        onErrors={noop}
        onCompiled={noop}
        onClose={noop}
        canvasModel={null}
        coauthor={{
          turns: [],
          onDraft: async () => ({ produced: true }),
          onCorrect: async () => ({ produced: true }),
          seed: { description: "a bathtub with a faucet and a drain", nonce: 1 },
        }}
      />,
    );
    expect(m).toContain("a bathtub with a faucet and a drain");
    expect(m).not.toContain("sl-editor");
  });

  // The compile chain is an addition beside the authoring surface, on the same
  // terms as the co-author mode: absent without the prop, and never replacing
  // the textarea when present.
  it("shows the compile chain only when the parent supplies the kernel outputs", () => {
    const base = {
      text: "system Z",
      errors: [],
      onTextChange: noop,
      onErrors: noop,
      onCompiled: noop,
      onClose: noop,
      canvasModel: null,
    };
    // The chain sits under the footer's details, which a remembered choice
    // opens. No DOM here, so the remembered choice is the way in.
    vi.stubGlobal("localStorage", { getItem: (k: string) => (k === "sl-pane-details" ? "open" : null), setItem: noop });
    expect(renderToStaticMarkup(<SlPane {...base} />)).not.toContain("the compile chain");
    const withChain = renderToStaticMarkup(
      <SlPane {...base} chain={{ desc: null, verdict: null, onShowFormal: noop }} />,
    );
    expect(withChain).toContain("the compile chain");
    expect(withChain).toContain("Compile");
    expect(withChain).toContain("From canvas");
    expect(withChain).toContain("hide details");
    vi.unstubAllGlobals();
  });

  const base = {
    text: "system Z",
    errors: [],
    onTextChange: noop,
    onErrors: noop,
    onCompiled: noop,
    onClose: noop,
    canvasModel: null,
  };

  it("offers the three arrangements only when the parent can act on them", () => {
    expect(renderToStaticMarkup(<SlPane {...base} />)).not.toContain("Arrangement");
    const m = renderToStaticMarkup(<SlPane {...base} arrangement="split" onArrangement={noop} />);
    for (const label of ["Text", "Split", "Diagram"]) expect(m).toContain(`>${label}</button>`);
  });

  it("folds to a rail under Diagram, with the text one click away and no editor mounted", () => {
    const m = renderToStaticMarkup(<SlPane {...base} arrangement="diagram" onArrangement={noop} />);
    expect(m).toContain("sl-rail");
    expect(m).not.toContain("sl-editor");
  });

  it("drops the fixed width and the resize handle when the text has the full width", () => {
    const split = renderToStaticMarkup(<SlPane {...base} arrangement="split" onArrangement={noop} />);
    const full = renderToStaticMarkup(<SlPane {...base} arrangement="sl" onArrangement={noop} />);
    expect(split).toContain("sl-pane-resize");
    expect(full).not.toContain("sl-pane-resize");
    expect(full).not.toMatch(/<aside[^>]*width:/);
  });

  it("carries Accept/Discard itself when a draft is previewing and the diagram is hidden", () => {
    const preview = { onAccept: noop, onDiscard: noop };
    const full = renderToStaticMarkup(<SlPane {...base} arrangement="sl" onArrangement={noop} preview={preview} />);
    expect(full).toContain("sl-preview-gate");
    expect(full).toContain("Accept");
    expect(full).toContain("Discard");
    // Beside a visible canvas the banner there is the gate; the pane adds none.
    const split = renderToStaticMarkup(<SlPane {...base} arrangement="split" onArrangement={noop} preview={preview} />);
    expect(split).not.toContain("sl-preview-gate");
    // No draft waiting, no gate.
    expect(renderToStaticMarkup(<SlPane {...base} arrangement="sl" onArrangement={noop} />)).not.toContain("sl-preview-gate");
  });

  it("keeps the footer to one status row, with the grammar in reach and the rest under details", () => {
    const m = renderToStaticMarkup(
      <SlPane {...base} chain={{ desc: null, verdict: null, onShowFormal: noop }} />,
    );
    expect(m).toContain("sl-status");
    expect(m).toContain("not compiled yet");
    expect(m).toContain("docs/language/spec.md#4-grammar");
    expect(m).toContain(">details</button>");
    expect(m).not.toContain("the compile chain");
    expect(m).not.toContain("lean-provenance");
  });
});
