/// <reference types="vite/client" />

// Build provenance, injected by vite.config.ts's `define` (#229). Absent under
// vitest, which loads vitest.config.ts and defines nothing — buildInfo.ts reads
// each one through a `typeof` guard for that reason.
declare const __APP_VERSION__: string;
declare const __KERNEL_VERSION__: string;
declare const __CORE_VERSION__: string;
declare const __GIT_SHA__: string;
declare const __SSF_COMMIT__: string;
declare const __WASM_SHA256__: string;
declare const __BUILD_TIME__: string;
