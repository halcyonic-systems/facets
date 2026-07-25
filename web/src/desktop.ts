import type { MouseEvent } from "react";

// One bundle serves the browser and the Tauri desktop shell. The single
// difference that matters here: in a browser an external anchor navigates
// itself, but in a WKWebView `target="_blank"` goes nowhere, so the URL has to
// be handed to the system browser through the opener plugin.

/** True inside the Tauri shell. Tauri injects __TAURI_INTERNALS__ on the window,
 *  which is globalThis in a browser. */
export function isDesktop(): boolean {
  return "__TAURI_INTERNALS__" in globalThis;
}

/** Anchor click handler for links that leave the app. A no-op in a browser, so
 *  the anchor keeps its native behaviour (and its href, for copy-link). */
export function openExternal(event: MouseEvent<HTMLAnchorElement>): void {
  if (!isDesktop()) return;
  const url = event.currentTarget.href;
  event.preventDefault();
  void import("@tauri-apps/plugin-opener").then(({ openUrl }) => openUrl(url));
}
