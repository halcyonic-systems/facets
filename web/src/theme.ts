// Which theme the instrument is shown in — a RUNTIME preference, stored and
// read the way the drafter model is (drafterModel.ts): one localStorage key, an
// in-memory cache so render paths can read it synchronously, and a subscription
// so the control and the document never disagree.
//
// PRESENTATION ONLY. Nothing here decides a systems fact; it writes one
// attribute on <html> and the CSS in index.css does the rest. The palette lives
// there as `light-dark(<light>, <dark>)` pairs, and this attribute only narrows
// `color-scheme` so one half or the other resolves.
//
// THREE states, not two. "System" is the default and is not a synonym for
// either: with no attribute set, `color-scheme: light dark` follows
// `prefers-color-scheme` natively, so a user who has never touched the control
// gets the OS answer with no JS involved, and gets it again the moment the OS
// changes. An explicit choice is the user overriding that — which is exactly
// why it has to be a third state and not a boolean seeded from the OS.

export type ThemeChoice = "system" | "light" | "dark";

export const THEME_CHOICES: readonly ThemeChoice[] = ["system", "light", "dark"] as const;

/** The label the control shows. Fixed UI copy, so lowercase in the mono chrome. */
export const THEME_LABEL: Record<ThemeChoice, string> = {
  system: "auto",
  light: "light",
  dark: "dark",
};

const KEY = "bert-lenses.theme";

function isChoice(v: unknown): v is ThemeChoice {
  return v === "system" || v === "light" || v === "dark";
}

let current: ThemeChoice = "system";
let loaded = false;
const listeners = new Set<(choice: ThemeChoice) => void>();

function load(): void {
  loaded = true;
  try {
    const raw = localStorage.getItem(KEY);
    // An unrecognised stored value falls back to system rather than to light:
    // system is the state that is never wrong, only unopinionated.
    if (isChoice(raw)) current = raw;
  } catch {
    // storage unavailable (private mode, quota) — the choice stays session-only
  }
}

/**
 * The attribute value for a choice, or null when the choice is "system".
 * Exported because the three-state behaviour is worth binding a test to
 * without a document: system MUST NOT stamp an attribute, or it silently
 * becomes a fourth thing that pins whatever the OS said at load time.
 */
export function themeAttr(choice: ThemeChoice): "light" | "dark" | null {
  return choice === "system" ? null : choice;
}

function apply(choice: ThemeChoice): void {
  if (typeof document === "undefined") return;
  const attr = themeAttr(choice);
  if (attr === null) document.documentElement.removeAttribute("data-theme");
  else document.documentElement.setAttribute("data-theme", attr);
}

/**
 * Read the stored choice and put it on the document. Called at the top of
 * main.tsx — before `createRoot`, and synchronously, so the attribute is in
 * place before the first paint of app content and an explicit choice that
 * disagrees with the OS does not flash the OS's answer first.
 *
 * The desktop bundle's CSP is `script-src 'self'` with no `'unsafe-inline'`, so
 * the usual inline <script> in index.html is not available here; the module
 * graph's first statement is the earliest hook there is.
 */
export function initTheme(): ThemeChoice {
  if (!loaded) load();
  apply(current);
  return current;
}

export function themeChoice(): ThemeChoice {
  if (!loaded) load();
  return current;
}

export function setThemeChoice(next: ThemeChoice): void {
  loaded = true;
  current = next;
  apply(current);
  try {
    localStorage.setItem(KEY, next);
  } catch {
    // as above — the setting holds for this session
  }
  for (const fn of listeners) fn(current);
}

export function subscribeTheme(fn: (choice: ThemeChoice) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** The next state in the cycle the control offers: system → light → dark → system. */
export function nextThemeChoice(from: ThemeChoice): ThemeChoice {
  const i = THEME_CHOICES.indexOf(from);
  return THEME_CHOICES[(i + 1) % THEME_CHOICES.length];
}

/** Reset the module's cache — tests only. */
export function resetThemeForTest(): void {
  current = "system";
  loaded = false;
  listeners.clear();
  if (typeof document !== "undefined") document.documentElement.removeAttribute("data-theme");
}
