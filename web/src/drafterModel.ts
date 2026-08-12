// Which model the co-author drafts with. A RUNTIME preference, stored and read
// the way the reasoner's address is (reasoner.ts): one localStorage key, an
// in-memory cache so draft paths can read it synchronously, and a subscription
// so the pane and the drafter never disagree about what was asked for.
//
// The whole request path already existed — `authorSl` takes a model and GSR
// routes on the name ("" = the reasoner's own default, "claude-…" = its cloud
// path). This module only remembers the choice.
//
// It does NOT know whether a given model is reachable. GSR's /status reports
// the RAG system's model, not whether it holds an API key, so any local claim
// about availability would be a guess. The answering model is read off the
// response instead (see coauthor.ts / CoAuthorMode.tsx).

export type DrafterModelOption = {
  /** Sent as `model` to /author-sl. "" = the reasoner's own default. */
  value: string;
  label: string;
  /** Where the work happens. Not a quality claim. */
  where: string;
};

/** A small demo-sized set, not a catalogue. Values are the names GSR routes on. */
export const DRAFTER_MODELS: DrafterModelOption[] = [
  { value: "", label: "Local default (gemma4:12b)", where: "on the reasoner's machine" },
  { value: "qwen3:32b", label: "qwen3:32b", where: "on the reasoner's machine" },
  { value: "claude-sonnet-4-6", label: "claude-sonnet-4-6", where: "through the reasoner's cloud path" },
  {
    value: "claude-haiku-4-5-20251001",
    label: "claude-haiku-4-5-20251001",
    where: "through the reasoner's cloud path",
  },
];

const KEY = "bert-lenses.coauthor-model";

let current = "";
let loaded = false;
const listeners = new Set<(model: string) => void>();

function load(): void {
  loaded = true;
  try {
    const raw = localStorage.getItem(KEY);
    if (typeof raw === "string") current = raw;
  } catch {
    // storage unavailable (private mode, quota) — the choice stays session-only
  }
}

/** The chosen model, as sent to /author-sl. "" = the reasoner's own default. */
export function drafterModel(): string {
  if (!loaded) load();
  return current;
}

export function setDrafterModel(value: string): void {
  loaded = true;
  current = value;
  try {
    localStorage.setItem(KEY, value);
  } catch {
    // as above — the setting holds for this session
  }
  for (const fn of listeners) fn(current);
}

export function subscribeDrafterModel(fn: (model: string) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** The display name for a model value, falling back to the raw name so a model
 *  the reasoner picked that this list has never heard of is still shown. */
export function drafterModelLabel(value: string): string {
  const known = DRAFTER_MODELS.find((m) => m.value === value);
  if (known) return known.label;
  return value || "the reasoner's default";
}

/** Where a chosen model runs, or null when this list does not know the name. */
export function drafterModelWhere(value: string): string | null {
  return DRAFTER_MODELS.find((m) => m.value === value)?.where ?? null;
}

/** Reset the module's cache — tests only. */
export function resetDrafterModelForTest(): void {
  current = "";
  loaded = false;
  listeners.clear();
}
