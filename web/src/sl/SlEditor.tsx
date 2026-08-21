// The CodeMirror host for the SL pane. Construction happens once, in an
// effect on a ref, so the component stays safe under static rendering (the
// test suite renders to markup; EditorView only exists in a real DOM).
// All language logic lives in the pure modules (mode.ts, sync.ts) — this
// file is wiring.
import { useEffect, useRef } from "react";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { syntaxHighlighting } from "@codemirror/language";
import type { SlError } from "../kernel/types";
import { slLanguage } from "./mode";
import { slHighlight } from "./highlight";
import { shouldReplaceDoc } from "./sync";
import { bandExtension } from "./bandView";
import { errorDecorations, errorLinesField, setErrorLines } from "./faults";
import { glyphGutter } from "./glyphView";
import { alignExtension } from "./alignView";

interface SlEditorProps {
  value: string;
  errors: SlError[];
  /** Faults describe the compile-time text; once the author types past them
   *  they dim (the pane's editedSinceCompile discipline, applied here to the
   *  line marks via a container class). */
  stale: boolean;
  onChange: (text: string) => void;
  onCompile: () => void;
  /** Tier 4: the cursor moved to a new line (1-based). Fires on selection
   *  changes only, never on doc edits, so the parent can bridge cursor →
   *  canvas selection without edits reselecting things mid-typing. */
  onCursorLine?: (line: number) => void;
  /** Tier 4: scroll this 1-based line into view and flash it. The nonce
   *  makes the same line re-focusable; null focuses nothing. */
  focusLine?: { line: number; nonce: number } | null;
}

export function SlEditor({
  value,
  errors,
  stale,
  onChange,
  onCompile,
  onCursorLine,
  focusLine,
}: SlEditorProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const lastEmitted = useRef<string | null>(null);
  // Callbacks ride a ref so the keymap and update listener, registered once,
  // always call the latest closures.
  const cbRef = useRef({ onChange, onCompile, onCursorLine });
  cbRef.current = { onChange, onCompile, onCursorLine };
  const lastCursorLine = useRef(0);

  useEffect(() => {
    if (!hostRef.current) return;
    const view = new EditorView({
      state: EditorState.create({
        doc: "",
        extensions: [
          history(),
          keymap.of([
            {
              key: "Mod-Enter",
              run: () => {
                cbRef.current.onCompile();
                return true;
              },
            },
            ...defaultKeymap,
            ...historyKeymap,
          ]),
          slLanguage,
          syntaxHighlighting(slHighlight),
          bandExtension,
          glyphGutter,
          alignExtension,
          errorLinesField,
          errorDecorations,
          // No line wrapping: SL reads columnar (bands, aligned arrows), so
          // long lines scroll horizontally the way they do in a code editor.
          EditorView.updateListener.of((u) => {
            if (u.docChanged) {
              const text = u.state.doc.toString();
              lastEmitted.current = text;
              cbRef.current.onChange(text);
            } else if (u.selectionSet) {
              const line = u.state.doc.lineAt(u.state.selection.main.head).number;
              if (line !== lastCursorLine.current) {
                lastCursorLine.current = line;
                cbRef.current.onCursorLine?.(line);
              }
            }
          }),
        ],
      }),
      parent: hostRef.current,
    });
    viewRef.current = view;
    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, []);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    if (shouldReplaceDoc(value, view.state.doc.toString(), lastEmitted.current)) {
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: value },
      });
      lastEmitted.current = value;
    }
  }, [value]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({ effects: setErrorLines.of(errors.map((e) => e.line)) });
  }, [errors]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view || !focusLine) return;
    if (focusLine.line < 1 || focusLine.line > view.state.doc.lines) return;
    const pos = view.state.doc.line(focusLine.line).from;
    view.dispatch({ effects: EditorView.scrollIntoView(pos, { y: "center" }) });
    const node = view.domAtPos(pos).node;
    const base = node instanceof Element ? node : node.parentElement;
    const el = base?.closest(".cm-line");
    if (el) {
      el.classList.add("sl-line-flash");
      setTimeout(() => el.classList.remove("sl-line-flash"), 900);
    }
  }, [focusLine]);

  return (
    <div
      ref={hostRef}
      className={`sl-editor min-h-0 flex-1 overflow-auto${stale ? " sl-errors-stale" : ""}`}
    />
  );
}
