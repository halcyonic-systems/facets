// Kernel fault lines as editor state: one effect to set them, one field to
// hold them, decorations and the glyph gutter both derived from the same
// field so the two surfaces can never disagree about where the faults are.
import { StateEffect, StateField } from "@codemirror/state";
import type { DecorationSet } from "@codemirror/view";
import { Decoration, EditorView } from "@codemirror/view";

export const setErrorLines = StateEffect.define<number[]>();

export const errorLinesField = StateField.define<ReadonlySet<number>>({
  create: () => new Set(),
  update(lines, tr) {
    for (const e of tr.effects) {
      if (e.is(setErrorLines)) return new Set(e.value);
    }
    return lines;
  },
});

const errorLine = Decoration.line({ class: "sl-line-error" });

export const errorDecorations = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(deco, tr) {
    deco = deco.map(tr.changes);
    for (const e of tr.effects) {
      if (e.is(setErrorLines)) {
        const marks = [];
        for (const n of e.value) {
          // Kernel fault lines are 1-based; line 0 is a whole-text fault
          // (emit refusals), which has no line to mark.
          if (n >= 1 && n <= tr.state.doc.lines) {
            marks.push(errorLine.range(tr.state.doc.line(n).from));
          }
        }
        deco = Decoration.set(marks, true);
      }
    }
    return deco;
  },
  provide: (f) => EditorView.decorations.from(f),
});
