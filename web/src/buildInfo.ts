// What this build IS, in terms a holder of the binary can check (#229).
//
// The app tells users its verdicts are machine-checked against Lean proofs in
// another repository. Someone handed the .app has no way to test that: the
// bundled JS and wasm are minified and hashed, and until this file existed
// nothing in them named a version, a commit, or the proof base the claims are
// pinned to. A verdict a reader cannot trace to a proof commit is a verdict
// that cannot be defended.
//
// Every field is injected at build time by vite.config.ts, derived from the
// shipping artifact or the tree that produced it. Under vitest the defines do
// not exist, so each is read through a `typeof` guard and falls back to
// "unknown" — a build that could not determine a fact says so rather than
// printing a plausible one.

const define = (read: () => string): string => {
  try {
    return read();
  } catch {
    return "unknown";
  }
};

export interface BuildInfo {
  /** The app version, from src-tauri/tauri.conf.json. */
  version: string;
  /** The wasm kernel crate's version, and bert-core's under it. */
  kernelVersion: string;
  coreVersion: string;
  /** The commit this artifact was built from; `-dirty` if the tree was not clean. */
  gitSha: string;
  /** The systems-science-foundations commit every "machine-checked" claim is
   *  pinned to (docs/lean-provenance.md). */
  ssfCommit: string;
  /** SHA-256 of the kernel wasm as shipped. `shasum -a 256` on the .wasm inside
   *  the bundle reproduces this — or does not. */
  wasmSha256: string;
  buildTime: string;
}

export const buildInfo: BuildInfo = {
  version: define(() => (typeof __APP_VERSION__ === "string" ? __APP_VERSION__ : "unknown")),
  kernelVersion: define(() => (typeof __KERNEL_VERSION__ === "string" ? __KERNEL_VERSION__ : "unknown")),
  coreVersion: define(() => (typeof __CORE_VERSION__ === "string" ? __CORE_VERSION__ : "unknown")),
  gitSha: define(() => (typeof __GIT_SHA__ === "string" ? __GIT_SHA__ : "unknown")),
  ssfCommit: define(() => (typeof __SSF_COMMIT__ === "string" ? __SSF_COMMIT__ : "unknown")),
  wasmSha256: define(() => (typeof __WASM_SHA256__ === "string" ? __WASM_SHA256__ : "unknown")),
  buildTime: define(() => (typeof __BUILD_TIME__ === "string" ? __BUILD_TIME__ : "unknown")),
};

/** A hash as a person reads one: enough to compare by eye, never presented as
 *  the whole thing. The full value is always available to copy. */
export function shortHash(hash: string, keep = 12): string {
  return hash === "unknown" || hash.length <= keep ? hash : `${hash.slice(0, keep)}…`;
}

/** The provenance lines the About surface prints, in the order it prints them.
 *  A list rather than markup so the same facts can be written into an export
 *  without going through React. */
export function provenanceLines(info: BuildInfo = buildInfo): { label: string; value: string; note?: string }[] {
  return [
    { label: "Version", value: info.version, note: "the app" },
    {
      label: "Kernel",
      value: `bert-lenses-kernel ${info.kernelVersion} · bert-core ${info.coreVersion}`,
      note: "every verdict on this canvas comes from here",
    },
    { label: "Built from", value: info.gitSha, note: "commit in halcyonic-systems/bert-lenses" },
    {
      label: "Proof base",
      value: info.ssfCommit,
      note: "systems-science-foundations — the commit the machine-checked claims are pinned to",
    },
    {
      label: "Kernel wasm SHA-256",
      value: info.wasmSha256,
      note: "shasum -a 256 the .wasm in this bundle to check it",
    },
    { label: "Built", value: info.buildTime },
  ];
}
