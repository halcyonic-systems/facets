import { defineConfig } from "vitest/config";

// The contract-fixture suite (src/kernel/contract.test.ts) is pure data
// validation — no DOM, no wasm — so it runs in a plain node environment. It
// reads the committed fixtures the Rust tests write and checks them against the
// TS boundary mirrors in src/kernel/types.ts.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
