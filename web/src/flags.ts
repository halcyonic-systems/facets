// The Klir lens's door (cut 2026-10-26). Closed by default: the Model face
// shows Bunge and Mobus, and `?lens=klir` opens Klir for a browser that wants
// the third reading (`?lens=0` closes it again). One localStorage key, an
// in-memory cache — the same shape as canvas3d/flag.ts, which is the pattern
// `?beta=3d` set. The kernel, the CLI and the corpus know nothing of this: a
// flag hides a tab, it never changes a verdict.
//
// A model pinned to Klir (a corpus `@lens klir` entry, an archive file, a saved
// model with `lens: "Klir"`) still opens and renders under Klir with the door
// closed — see `lensTabs`.

import type { CanvasModel } from "./kernel/types";

const KEY = "facets.lens.klir";

type Lens = CanvasModel["lens"];

/** Every lens the kernel knows, in the K≅2 ladder's order. */
export const ALL_LENSES: readonly Lens[] = ["Klir", "Bunge", "Mobus"];

let current = false;
let loaded = false;

function load(): void {
  loaded = true;
  try {
    current = localStorage.getItem(KEY) === "1";
  } catch {
    // storage unavailable — the door stays closed for this session
  }
}

export function klirEnabled(): boolean {
  if (!loaded) load();
  return current;
}

export function setKlirEnabled(on: boolean): void {
  loaded = true;
  current = on;
  try {
    if (on) localStorage.setItem(KEY, "1");
    else localStorage.removeItem(KEY);
  } catch {
    // as above
  }
}

/** Read `?lens=klir` / `?lens=0` off a query string and set or clear the key.
 *  Returns what the door is set to afterwards. */
export function promoteKlirFromSearch(search: string): boolean {
  const lens = new URLSearchParams(search).get("lens");
  if (lens?.toLowerCase() === "klir") setKlirEnabled(true);
  else if (lens === "0") setKlirEnabled(false);
  return klirEnabled();
}

/** The lens tabs the Model face offers for the open model. With the door
 *  closed the strip is Bunge and Mobus — unless the open model IS Klir, in
 *  which case the Klir tab shows for as long as that is true, so the author can
 *  see which reading they are under and switch away from it; once they do, the
 *  tab goes. The flag hides a tab, it never breaks a model. */
export function lensTabs(active: Lens | undefined): Lens[] {
  if (klirEnabled() || active === "Klir") return [...ALL_LENSES];
  return ALL_LENSES.filter((l) => l !== "Klir");
}

/** Reset the module's cache — tests only. */
export function resetKlirForTest(): void {
  current = false;
  loaded = false;
}

if (typeof window !== "undefined") promoteKlirFromSearch(window.location.search);
