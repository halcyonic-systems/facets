// What this browser remembers about the READER rather than about a model: the
// models they had open last, and which way into the library they prefer.
//
// What the reader had open last is the load-bearing half of that.
//
// Recency cannot live where the models live. `shippedModels()` is derived from
// the assets at build time and is the same list for everyone; the library store
// holds the user's own saved models and knows nothing of the corpus. "Opened
// two hours ago" is true of a PAIRING of a reader and a model, so it is kept
// where the reader is: one small list in this browser's storage, written at the
// open seams and read by the library's first section.
//
// An entry is an ADDRESS, never a copy — the same three-armed address the
// workbench pins use (workbench.ts). A model that was since renamed, edited or
// deleted therefore needs no migration here: the address either still resolves
// when the page reads it, or the row is simply not drawn.

export type RecentKind = "library" | "example" | "corpus";

export interface RecentEntry {
  kind: RecentKind;
  /** The library slot name, the demo key, or the corpus file — per `kind`. */
  key: string;
  /** Epoch ms of the open. */
  at: number;
}

const KEY = "facets.recent";

/** How many opens are kept. The page shows four; the tail is kept so that
 *  deleting a model or clearing a filter can fall back to something real
 *  instead of leaving a short section shorter. */
const CAP = 12;

/** Fold one open into a list, newest first. Re-opening a model MOVES it rather
 *  than adding a second row: the section answers "where was I", and one model
 *  appearing four times answers nothing. Pure, so the ordering rule is testable
 *  without storage. */
export function remember(list: RecentEntry[], entry: RecentEntry, cap = CAP): RecentEntry[] {
  const rest = list.filter((e) => !(e.kind === entry.kind && e.key === entry.key));
  return [entry, ...rest].sort((a, b) => b.at - a.at).slice(0, cap);
}

function isEntry(v: unknown): v is RecentEntry {
  const e = v as RecentEntry | null;
  return (
    !!e &&
    (e.kind === "library" || e.kind === "example" || e.kind === "corpus") &&
    typeof e.key === "string" &&
    typeof e.at === "number" &&
    Number.isFinite(e.at)
  );
}

/** The opens this browser remembers, newest first. Storage that is missing,
 *  refused or corrupt reads as no history — a library with no Recent section is
 *  a correct first visit, so there is no error to report. */
export function readRecent(): RecentEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (typeof raw !== "string") return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isEntry).sort((a, b) => b.at - a.at);
  } catch {
    return [];
  }
}

/** Record an open. Called at the app's open seams, never from the page — the
 *  page reads this list and must not be able to write it by rendering. */
export function noteOpened(kind: RecentKind, key: string, now = Date.now()): void {
  if (!key) return;
  try {
    localStorage.setItem(KEY, JSON.stringify(remember(readRecent(), { kind, key, at: now })));
  } catch {
    // storage unavailable (private mode, quota) — this visit leaves no trace,
    // which is the same state as a first visit and renders correctly.
  }
}

// ---------------------------------------------------------------------------
// the other thing this browser remembers: which way in the reader prefers
// ---------------------------------------------------------------------------

const ARRANGE_KEY = "facets.library-arrange";

/** BY LENS or BY DOMAIN, as last chosen here. Lens is the default: the
 *  instrument's claim is about readings, so a reader who has expressed no
 *  preference is shown the readings. */
export function readArrange(): "lens" | "domain" {
  try {
    return localStorage.getItem(ARRANGE_KEY) === "domain" ? "domain" : "lens";
  } catch {
    return "lens";
  }
}

export function noteArrange(value: "lens" | "domain"): void {
  try {
    localStorage.setItem(ARRANGE_KEY, value);
  } catch {
    // as above — the choice holds for this session
  }
}
