// #199 — the reasoner is off until an explicit act, the endpoint is a runtime
// setting that round-trips through the storage seam, and an unreachable
// endpoint is reported by name.
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_ENDPOINT,
  HOSTED_ENDPOINT,
  blockedOnDesktop,
  endpointKind,
  initReasoner,
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
    const backend = freshBackend({ enabled: true, endpoint: HOSTED_ENDPOINT });
    await initReasoner();
    await setReasonerConfig({ enabled: false, endpoint: HOSTED_ENDPOINT });
    expect((await backend.load())?.enabled).toBe(false);
  });

  it("names the hosted endpoint as hosted and anything else as the user's own", () => {
    expect(endpointKind(HOSTED_ENDPOINT)).toBe("hosted");
    expect(endpointKind(`${HOSTED_ENDPOINT}/`)).toBe("hosted");
    expect(endpointKind("http://localhost:5010")).toBe("own");
  });

  it("knows which endpoints the desktop bundle's connect-src cannot reach", () => {
    expect(blockedOnDesktop("http://localhost:5010")).toBe(false);
    expect(blockedOnDesktop(HOSTED_ENDPOINT)).toBe(false);
    expect(blockedOnDesktop("http://gsr.example.com:9000")).toBe(true);
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
