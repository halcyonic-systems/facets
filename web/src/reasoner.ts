// Where the reasoner runs, and whether it runs at all — a RUNTIME setting, not
// a build-time constant, so one build serves the web app and the desktop app
// and any user can point at their own GSR without a rebuild (#199 step 1).
//
// Storage follows library.ts's shape: one interface, one swappable backend,
// so the Tauri shell can later store this as a real file (async by design —
// a filesystem is). The value is cached in memory after `initReasoner()` so
// render paths and the fetch door can read it synchronously.

/** The default seed. Flipping the shipped pre-fill is a change to THIS line.
 *  Local today (#199, 2026-07-25): the local path gets exercised first. */
export const DEFAULT_ENDPOINT: string = import.meta.env.VITE_GSR_URL ?? "http://localhost:5010";

/** Halcyonic's hosted reasoner — the other named option at the enable moment. */
export const HOSTED_ENDPOINT = "https://reasoner.halcyonic.systems";

export type ReasonerConfig = {
  /** Off until the user turns it on. Nothing leaves the machine before that. */
  enabled: boolean;
  endpoint: string;
};

export const REASONER_OFF: ReasonerConfig = { enabled: false, endpoint: DEFAULT_ENDPOINT };

export interface ReasonerConfigBackend {
  /** The stored config, or null when nothing has been stored yet. */
  load(): Promise<ReasonerConfig | null>;
  save(config: ReasonerConfig): Promise<void>;
}

const KEY = "bert-lenses.reasoner";

function parse(raw: string | null): ReasonerConfig | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Partial<ReasonerConfig>;
    if (typeof v?.enabled !== "boolean") return null;
    const endpoint = typeof v.endpoint === "string" && v.endpoint.trim() ? v.endpoint.trim() : DEFAULT_ENDPOINT;
    return { enabled: v.enabled, endpoint };
  } catch {
    return null;
  }
}

/** Today's backend: browser-local storage. The Tauri seam swaps this for a file. */
export const localStorageBackend: ReasonerConfigBackend = {
  async load() {
    try {
      return parse(localStorage.getItem(KEY));
    } catch {
      return null;
    }
  },
  async save(config) {
    try {
      localStorage.setItem(KEY, JSON.stringify(config));
    } catch {
      // storage unavailable (private mode, quota) — the setting stays session-only
    }
  },
};

/** An in-memory backend with the same contract — tests, and the shape a
 *  filesystem backend copies. */
export function memoryReasonerBackend(seed: ReasonerConfig | null = null): ReasonerConfigBackend {
  let stored = seed;
  return {
    async load() {
      return stored;
    },
    async save(config) {
      stored = { ...config };
    },
  };
}

let backend: ReasonerConfigBackend = localStorageBackend;
let current: ReasonerConfig = REASONER_OFF;
const listeners = new Set<(config: ReasonerConfig) => void>();

export function setReasonerConfigBackend(next: ReasonerConfigBackend): void {
  backend = next;
}

/** Read what was stored into the in-memory cache. Called once at startup. */
export async function initReasoner(): Promise<ReasonerConfig> {
  current = (await backend.load()) ?? REASONER_OFF;
  return current;
}

export function reasonerConfig(): ReasonerConfig {
  return current;
}

export async function setReasonerConfig(next: ReasonerConfig): Promise<void> {
  current = { enabled: next.enabled, endpoint: next.endpoint.trim() || DEFAULT_ENDPOINT };
  await backend.save(current);
  for (const fn of listeners) fn(current);
}

export function subscribeReasoner(fn: (config: ReasonerConfig) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Reset the module's cache — tests only. */
export function resetReasonerForTest(): void {
  current = REASONER_OFF;
  listeners.clear();
}

/** How the endpoint reads in the UI: "your own reasoner" vs "Halcyonic's". */
export function endpointKind(endpoint: string): "hosted" | "own" {
  return endpoint.replace(/\/+$/, "") === HOSTED_ENDPOINT ? "hosted" : "own";
}

// The desktop shell's CSP names the origins it may reach (src-tauri/tauri.conf.json
// connect-src). An endpoint outside that list fails as a bare `TypeError: Load
// failed`, which reads like "the reasoner is down". Mirrored here so the app can
// SAY so instead. Widening the CSP to a wildcard is not the fix.
export const DESKTOP_ALLOWED_ORIGINS = [
  "http://localhost:5010",
  "http://127.0.0.1:5010",
  HOSTED_ENDPOINT,
];

export function originOf(endpoint: string): string {
  try {
    return new URL(endpoint).origin;
  } catch {
    return endpoint;
  }
}

/** True when the desktop bundle's connect-src cannot reach this endpoint. */
export function blockedOnDesktop(endpoint: string): boolean {
  const origin = originOf(endpoint);
  return !DESKTOP_ALLOWED_ORIGINS.some((allowed) => originOf(allowed) === origin);
}
