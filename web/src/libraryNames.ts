// Library slot naming (#111). Slots are keyed by name (put overwrites), so a
// name minted for a NEW slot must dodge the ones already taken — a numeric
// suffix, never a silent clobber. Pure, so the discipline is testable.

/** `base` itself, else the first `base-N` (N ≥ 2) not in `taken`. */
export function mintLibraryName(base: string, taken: ReadonlySet<string>): string {
  let name = base;
  for (let n = 2; taken.has(name); n++) name = `${base}-${n}`;
  return name;
}

/** The slot the stamped parent persists under at door time: its existing slot
 *  as-is, else a fresh one derived from the authored model name or the demo
 *  key. Null = the model is unnamed on every axis — the door must refuse
 *  rather than mint a meaningless slot. */
export function parentSlotName(
  current: string | null,
  modelName: string | undefined,
  demoKey: string | undefined,
  taken: ReadonlySet<string>,
): { name: string; isNew: boolean } | null {
  if (current) return { name: current, isNew: false };
  const base = modelName?.trim() || demoKey?.trim() || "";
  if (!base) return null;
  return { name: mintLibraryName(base, taken), isNew: true };
}
