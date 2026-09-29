// The 3D view's beta door (facets#435). One localStorage key, an in-memory
// cache, a subscription — the same shape as draftEffort.ts. The URL promotes
// the key once (`?beta=3d` opens it, `?beta=0` closes it) and the key persists,
// so the door is a one-time act rather than a per-visit query string.

const KEY = "facets.beta.view3d";

let current = false;
let loaded = false;
const listeners = new Set<(on: boolean) => void>();

function load(): void {
  loaded = true;
  try {
    current = localStorage.getItem(KEY) === "1";
  } catch {
    // storage unavailable — the door stays closed for this session
  }
}

export function view3dEnabled(): boolean {
  if (!loaded) load();
  return current;
}

export function setView3dEnabled(on: boolean): void {
  loaded = true;
  current = on;
  try {
    if (on) localStorage.setItem(KEY, "1");
    else localStorage.removeItem(KEY);
  } catch {
    // as above
  }
  for (const fn of listeners) fn(current);
}

export function subscribeView3d(fn: (on: boolean) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Read `?beta=3d` / `?beta=0` off a query string and promote or clear the key.
 *  Returns what the door is set to afterwards. */
export function promoteFromSearch(search: string): boolean {
  const beta = new URLSearchParams(search).get("beta");
  if (beta === "3d") setView3dEnabled(true);
  else if (beta === "0") setView3dEnabled(false);
  return view3dEnabled();
}

/** Reset the module's cache — tests only. */
export function resetView3dForTest(): void {
  current = false;
  loaded = false;
  listeners.clear();
}

if (typeof window !== "undefined") promoteFromSearch(window.location.search);
