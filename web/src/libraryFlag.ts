// The library's door (cut 2026-10-26). Closed by default: the public face
// offers three models (home.ts FEATURED) and the reader's own; `?library=all`
// opens the whole standard library — the corpus, the bench, the field models,
// the shelves and the ledger — for a browser that wants it (`?library=0` closes
// it again). Same shape as canvas3d/flag.ts. Nothing is removed by this flag:
// every model still ships, compiles, is held by its gates and answers in the
// CLI; the flag decides what the page shows first.

const KEY = "facets.library.all";

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

export function libraryAllEnabled(): boolean {
  if (!loaded) load();
  return current;
}

export function setLibraryAllEnabled(on: boolean): void {
  loaded = true;
  current = on;
  try {
    if (on) localStorage.setItem(KEY, "1");
    else localStorage.removeItem(KEY);
  } catch {
    // as above
  }
}

/** Read `?library=all` / `?library=0` off a query string and set or clear the
 *  key. Returns what the door is set to afterwards. */
export function promoteLibraryFromSearch(search: string): boolean {
  const v = new URLSearchParams(search).get("library");
  if (v?.toLowerCase() === "all") setLibraryAllEnabled(true);
  else if (v === "0") setLibraryAllEnabled(false);
  return libraryAllEnabled();
}

/** Reset the module's cache — tests only. */
export function resetLibraryForTest(): void {
  current = false;
  loaded = false;
}

if (typeof window !== "undefined") promoteLibraryFromSearch(window.location.search);
