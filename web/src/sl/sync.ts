// The one controlled-sync decision, kept pure so it can be unit-tested
// without mounting an EditorView.
//
// The pane's text is parent-owned state; the editor is the fast local
// surface. A prop change must replace the document only when it did NOT
// originate as an echo of the editor's own last edit — otherwise the
// From-canvas / layout-from-canvas / co-author paths (which really do
// replace the text) would be indistinguishable from the parent reflecting
// a keystroke back one render late, and the reflection would clobber the
// cursor mid-word.
export function shouldReplaceDoc(
  prop: string,
  currentDoc: string,
  lastEmitted: string | null
): boolean {
  return prop !== currentDoc && prop !== lastEmitted;
}
