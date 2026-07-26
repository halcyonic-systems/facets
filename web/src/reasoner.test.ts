// #199 — the reasoner is off until an explicit act, the endpoint is a runtime
// setting that round-trips through the storage seam, and an unreachable
// endpoint is reported by name.
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_ENDPOINT,
  blockedOnDesktop,
  initReasoner,
  isLoopback,
  memoryReasonerBackend,
  reasonerConfig,
  resetReasonerForTest,
  setReasonerConfig,
  setReasonerConfigBackend,
} from "./reasoner";
import { ReasonerOffError, authorSl } from "./gsr";

function freshBackend(seed: Parameters<typeof memoryReasonerBackend>[0] = null) {
  const backend = memoryReasonerBackend(seed);
  resetReasonerForTest();
  setReasonerConfigBackend(backend);
  return backend;
}

describe("reasoner config", () => {
  beforeEach(() => {
    freshBackend();
  });

  it("is off with nothing stored", async () => {
    const config = await initReasoner();
    expect(config.enabled).toBe(false);
    expect(config.endpoint).toBe(DEFAULT_ENDPOINT);
  });

  it("seeds the local endpoint by default", () => {
    expect(DEFAULT_ENDPOINT).toBe("http://localhost:5010");
  });

  it("persists enabling through the backend and reads it back on the next start", async () => {
    const backend = freshBackend();
    await initReasoner();
    await setReasonerConfig({ enabled: true, endpoint: "http://127.0.0.1:5010" });
    expect(await backend.load()).toEqual({ enabled: true, endpoint: "http://127.0.0.1:5010" });

    resetReasonerForTest();
    setReasonerConfigBackend(backend);
    expect(reasonerConfig().enabled).toBe(false); // cache cleared until init reads
    await initReasoner();
    expect(reasonerConfig()).toEqual({ enabled: true, endpoint: "http://127.0.0.1:5010" });
  });

  it("turning it off is the same seam and also persists", async () => {
    const backend = freshBackend({ enabled: true, endpoint: "http://gsr.example.com:5010" });
    await initReasoner();
    await setReasonerConfig({ enabled: false, endpoint: "http://gsr.example.com:5010" });
    expect((await backend.load())?.enabled).toBe(false);
  });

  it("tells a reasoner on this machine from one that is not", () => {
    expect(isLoopback("http://localhost:5010")).toBe(true);
    expect(isLoopback("http://127.0.0.1:5010")).toBe(true);
    expect(isLoopback("http://gsr.example.com:5010")).toBe(false);
    expect(isLoopback("not a url")).toBe(false);
  });

  it("knows which endpoints the desktop bundle's connect-src cannot reach", () => {
    expect(blockedOnDesktop("http://localhost:5010")).toBe(false);
    expect(blockedOnDesktop("http://127.0.0.1:5010")).toBe(false);
    expect(blockedOnDesktop("http://gsr.example.com:9000")).toBe(true);
  });

  // #229 — the CRITICAL audit finding was publication, not existence: a URL
  // compiled into a distributed binary cannot be recalled. This asserts the
  // module names no remote host at all, so a future edit has to argue with a
  // failing test rather than slip one back in.
  it("names no remote endpoint anywhere in the shipped module", async () => {
    const source = await import("node:fs/promises").then((fs) =>
      fs.readFile(new URL("./reasoner.ts", import.meta.url), "utf8"),
    );
    expect(source).not.toMatch(/https?:\/\/(?!localhost|127\.0\.0\.1)/);
  });
});

describe("the reasoner door", () => {
  beforeEach(() => {
    freshBackend();
  });

  it("refuses to call anything while off", async () => {
    await initReasoner();
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    await expect(authorSl({ description: "a thermostat" })).rejects.toBeInstanceOf(ReasonerOffError);
    expect(fetchSpy).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("calls the configured endpoint once enabled", async () => {
    await initReasoner();
    await setReasonerConfig({ enabled: true, endpoint: "http://example.test:5010" });
    const fetchSpy = vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ sl: "system X", model: "gemma4:12b" }),
    })) as unknown as typeof fetch;
    vi.stubGlobal("fetch", fetchSpy);
    const out = await authorSl({ description: "a thermostat" });
    expect(out.sl).toBe("system X");
    expect(vi.mocked(fetchSpy).mock.calls[0]?.[0]).toBe("http://example.test:5010/author-sl");
    vi.unstubAllGlobals();
  });

  it("names the endpoint when it is unreachable instead of leaking TypeError: Load failed", async () => {
    await initReasoner();
    await setReasonerConfig({ enabled: true, endpoint: "http://127.0.0.1:5999" });
    vi.stubGlobal("fetch", async () => {
      throw new TypeError("Load failed");
    });
    const err: Error = await authorSl({ description: "a thermostat" }).catch((e) => e);
    expect(err.message).toContain("Could not reach the reasoner at http://127.0.0.1:5999");
    expect(err.message).not.toContain("Load failed");
    vi.unstubAllGlobals();
  });
});
