import { defineConfig } from "vitest/config";

// The contract-fixture suite (src/kernel/contract.test.ts) is pure data
// validation — no DOM, no wasm — so it runs in a plain node environment. It
// reads the committed fixtures the Rust tests write and checks them against the
// TS boundary mirrors in src/kernel/types.ts.
export default defineConfig({
  test: {
    environment: "node",
    // .tsx too: register tests render lens views to static markup (no DOM
    // needed — react-dom/server), e.g. src/canvas/mobusRegister.test.tsx.
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
