import type { MouseEvent } from "react";

// One bundle serves the browser and the Tauri desktop shell. The single
// difference that matters here: in a browser an external anchor navigates
// itself, but in a WKWebView `target="_blank"` goes nowhere, so the URL has to
// be handed to the system browser through tauri-plugin-opener.
//
// The plugin's command is invoked directly rather than through
// @tauri-apps/plugin-opener: the npm package is a one-line wrapper over the same
// IPC call, and keeping it out means the web build carries no desktop
// dependency and this stays testable outside a DOM.

type Internals = { invoke: (cmd: string, args?: unknown) => Promise<unknown> };

function internals(): Internals | undefined {
  return (globalThis as { __TAURI_INTERNALS__?: Internals }).__TAURI_INTERNALS__;
}

/** True inside the Tauri shell, which injects __TAURI_INTERNALS__ on the window. */
export function isDesktop(): boolean {
  return internals() !== undefined;
}

/** Anchor click handler for links that leave the app. A no-op in a browser, so
 *  the anchor keeps its native behaviour (and its href, for copy-link). */
export function openExternal(event: MouseEvent<HTMLAnchorElement>): void {
  const tauri = internals();
  if (!tauri) return;
  const url = event.currentTarget.href;
  event.preventDefault();
  void tauri.invoke("plugin:opener|open_url", { url });
}
