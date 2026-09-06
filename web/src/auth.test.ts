// #361 — the Model face carries the same anonymous identity the chat client
// does. The claims are GSR's AUTH_MODE=local shape, the token is cached rather
// than re-minted per call, and a refused token buys exactly one retry.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { authHeaders, getAccessToken, refreshAccessToken, resetAuthForTest, tokenExpiry } from "./auth";
import { ReasonerOffError, analyzeModel, authorSl } from "./gsr";
import {
  memoryReasonerBackend,
  resetReasonerForTest,
  setReasonerConfig,
  setReasonerConfigBackend,
} from "./reasoner";

const SECRET = "facets-dev-secret";

function claims(token: string): Record<string, unknown> {
  return JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString()) as Record<
    string,
    unknown
  >;
}

async function signatureVerifies(token: string): Promise<boolean> {
  const [h, p, s] = token.split(".");
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const sig = Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64");
  return crypto.subtle.verify("HMAC", key, sig, new TextEncoder().encode(`${h}.${p}`));
}

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response;
}

beforeEach(() => {
  resetAuthForTest();
  resetReasonerForTest();
  setReasonerConfigBackend(memoryReasonerBackend());
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("dev identity", () => {
  it("mints an HS256 token with GSR's local claim shape", async () => {
    const token = await getAccessToken();
    expect(token).toBeTruthy();
    const c = claims(token!);
    expect(c.aud).toBe("authenticated");
    expect(c.role).toBe("authenticated");
    expect(c.is_anonymous).toBe(true);
    expect(String(c.sub)).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    const week = 7 * 24 * 3600;
    expect(Number(c.exp) - Number(c.iat)).toBe(week);
    expect(tokenExpiry(token!)).toBe(Number(c.exp));
    await expect(signatureVerifies(token!)).resolves.toBe(true);
  });

  it("caches the token and keeps the same subject across a re-mint", async () => {
    const first = await getAccessToken();
    expect(await getAccessToken()).toBe(first);
    const refreshed = await refreshAccessToken();
    expect(refreshed).toBeTruthy();
    expect(claims(refreshed!).sub).toBe(claims(first!).sub);
  });

  it("puts the token on the Authorization header", async () => {
    const headers = await authHeaders();
    expect(headers.Authorization).toBe(`Bearer ${await getAccessToken()}`);
  });
});

describe("reasoner calls", () => {
  it("carries the bearer token on every spending route", async () => {
    await setReasonerConfig({ enabled: true, endpoint: "http://localhost:5010" });
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse({ sl: "system S", model: "gemma4:12b" }))
      .mockResolvedValueOnce(jsonResponse({ response: {}, model: "gemma4:12b" }));

    await authorSl({ description: "a steel plant" });
    await analyzeModel({ context: "system S", lens: "Mobus" });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const token = await getAccessToken();
    for (const [url, init] of fetchMock.mock.calls) {
      expect(String(url)).toMatch(/localhost:5010/);
      const headers = (init as RequestInit).headers as Record<string, string>;
      expect(headers.Authorization).toBe(`Bearer ${token}`);
    }
  });

  it("retries a 401 once with a fresh token, then reports it", async () => {
    await setReasonerConfig({ enabled: true, endpoint: "http://localhost:5010" });
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(jsonResponse({ error: "unauthorized" }, 401));

    await expect(authorSl({ description: "a steel plant" })).rejects.toThrow(
      /did not accept this session/,
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("accepts the retry when the fresh token is good", async () => {
    await setReasonerConfig({ enabled: true, endpoint: "http://localhost:5010" });
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse({ error: "unauthorized" }, 401))
      .mockResolvedValueOnce(jsonResponse({ sl: "system S", model: "gemma4:12b" }));

    await expect(authorSl({ description: "a steel plant" })).resolves.toMatchObject({
      sl: "system S",
    });
  });

  it("never reaches the identity seam while the reasoner is off", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    await expect(authorSl({ description: "a steel plant" })).rejects.toBeInstanceOf(
      ReasonerOffError,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
