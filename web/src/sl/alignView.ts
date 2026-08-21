// Paints flowPads as zero-width spacer widgets. The document is never
// touched; delete the extension and the text is exactly what it always was.
import type { EditorState } from "@codemirror/state";
import { RangeSetBuilder } from "@codemirror/state";
import type { DecorationSet, ViewUpdate } from "@codemirror/view";
import { Decoration, EditorView, ViewPlugin, WidgetType } from "@codemirror/view";
import { flowPads } from "./align";

class PadWidget extends WidgetType {
  constructor(readonly ch: number) {
    super();
  }
  override eq(other: PadWidget) {
    return other.ch === this.ch;
  }
  override toDOM() {
    const el = document.createElement("span");
    el.className = "sl-align-pad";
    el.setAttribute("aria-hidden", "true");
    el.style.width = `${this.ch}ch`;
    return el;
  }
  override get estimatedHeight() {
    return -1;
  }
}

function build(state: EditorState): DecorationSet {
  const lines: string[] = [];
  for (let n = 1; n <= state.doc.lines; n++) lines.push(state.doc.line(n).text);
  const builder = new RangeSetBuilder<Decoration>();
  for (const pad of flowPads(lines)) {
    const from = state.doc.line(pad.line).from;
    if (pad.arrowPad > 0) {
      builder.add(
        from + pad.arrowAt,
        from + pad.arrowAt,
        Decoration.widget({ widget: new PadWidget(pad.arrowPad), side: -1 })
      );
    }
    if (pad.colonAt !== null && pad.colonPad > 0) {
      builder.add(
        from + pad.colonAt,
        from + pad.colonAt,
        Decoration.widget({ widget: new PadWidget(pad.colonPad), side: -1 })
      );
    }
  }
  return builder.finish();
}

export const alignExtension = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = build(view.state);
    }
    update(u: ViewUpdate) {
      if (u.docChanged) this.decorations = build(u.state);
    }
  },
  { decorations: (v) => v.decorations }
);
