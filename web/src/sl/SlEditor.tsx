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
}

export function SlEditor({ value, errors, stale, onChange, onCompile }: SlEditorProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const lastEmitted = useRef<string | null>(null);
  // Callbacks ride a ref so the keymap and update listener, registered once,
  // always call the latest closures.
  const cbRef = useRef({ onChange, onCompile });
  cbRef.current = { onChange, onCompile };

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

  return (
    <div
      ref={hostRef}
      className={`sl-editor min-h-0 flex-1 overflow-auto${stale ? " sl-errors-stale" : ""}`}
    />
  );
}
