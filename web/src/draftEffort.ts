// How hard the drafter thinks before it writes. A RUNTIME preference, stored
// and read the way the drafting model is (drafterModel.ts): one localStorage
// key, an in-memory cache, a subscription, so the pane and the request cannot
// disagree about what was asked for.
//
// Careful is the default and sends nothing: the drafter runs at its own
// default effort, which is what every draft before this setting did. Fast
// sends `effort: "low"` on /author-sl. Either way the draft is compiled and
// judged by the kernel, and healed if refused; the setting changes how long
// the drafter deliberates, never what checks its work.
//
// Only the Claude 5 drafters take the setting. For every other model nothing
// is sent, so a stored "fast" is inert there rather than a request the model
// would reject. A reasoner that predates the field ignores it.

export type DraftEffort = "careful" | "fast";

export type DraftEffortOption = { value: DraftEffort; label: string; detail: string };

/** Typical times from measured drafts. Ranges, not promises. */
export const DRAFT_EFFORTS: DraftEffortOption[] = [
  { value: "careful", label: "Careful", detail: "thinks first · often 30–60s" },
  { value: "fast", label: "Fast", detail: "answers sooner · often under 20s" },
];

/** Whether a drafter takes the setting at all. */
export function effortApplies(model: string): boolean {
  return /^claude-[a-z]+-5($|-)/.test(model);
}

/** The author's choice as it stands for a given drafter: the stored setting
 *  when the model takes it, nothing when it does not. This is what a turn
 *  records, so the history never claims a mode the drafter could not honour. */
export function chosenEffort(model: string): DraftEffort | undefined {
  return effortApplies(model) ? draftEffort() : undefined;
}

/** What goes on the wire: `"low"` for Fast, nothing for Careful. */
export function effortOnWire(effort: DraftEffort | undefined): "low" | undefined {
  return effort === "fast" ? "low" : undefined;
}

const KEY = "bert-lenses.coauthor-effort";

let current: DraftEffort = "careful";
let loaded = false;
const listeners = new Set<(effort: DraftEffort) => void>();

function load(): void {
  loaded = true;
  try {
    if (localStorage.getItem(KEY) === "fast") current = "fast";
  } catch {
    // storage unavailable (private mode, quota) — the choice stays session-only
  }
}

export function draftEffort(): DraftEffort {
  if (!loaded) load();
  return current;
}

export function setDraftEffort(value: DraftEffort): void {
  loaded = true;
  current = value;
  try {
    localStorage.setItem(KEY, value);
  } catch {
    // as above — the setting holds for this session
  }
  for (const fn of listeners) fn(current);
}

export function subscribeDraftEffort(fn: (effort: DraftEffort) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Reset the module's cache — tests only. */
export function resetDraftEffortForTest(): void {
  current = "careful";
  loaded = false;
  listeners.clear();
}
