// Where a saved model lives, and whether the browser promised to keep it (#457).
//
// The library is IndexedDB in one browser profile (modelStore.ts). A browser
// may evict site data under storage pressure unless the site has asked to be
// kept; `navigator.storage.persist()` is that request, and `persisted()` is
// the browser's current answer. Neither survives a person clearing site data,
// and this module does not pretend otherwise — its one job is to make the
// standing readable on the page in the same words every time.
//
// Pure apart from the navigator calls, which are guarded so a test, a worker,
// or Safari (which refuses persistence) reads as "unknown" rather than throwing.

export type StorageStanding = "persistent" | "best-effort" | "unknown";

function storage(): StorageManager | undefined {
  const nav = (globalThis as { navigator?: Navigator }).navigator;
  return nav?.storage;
}

let requested: Promise<StorageStanding> | null = null;

/** Ask once per page load; later calls return the same answer. The library's
 *  first save is the moment to ask — a site the person has just written to is
 *  one Chromium grants. */
export function requestPersistence(): Promise<StorageStanding> {
  if (requested) return requested;
  requested = (async () => {
    const s = storage();
    if (!s || typeof s.persist !== "function") return "unknown";
    try {
      return (await s.persist()) ? "persistent" : "best-effort";
    } catch {
      return "unknown";
    }
  })();
  return requested;
}

/** The browser's current answer, without asking for anything. */
export async function readStanding(): Promise<StorageStanding> {
  const s = storage();
  if (!s || typeof s.persisted !== "function") return "unknown";
  try {
    return (await s.persisted()) ? "persistent" : "best-effort";
  } catch {
    return "unknown";
  }
}

/** The one line the Yours section prints. */
export function describeStanding(standing: StorageStanding): string {
  switch (standing) {
    case "persistent":
      return "stored in this browser · persistent";
    case "best-effort":
      return "stored in this browser · may be cleared by the browser";
    default:
      return "stored in this browser";
  }
}
