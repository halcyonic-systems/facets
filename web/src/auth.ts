// Identity for the Model face's reasoner calls (#361) — the same contract the
// chat client already runs (chat/index.html): the client does not invent a user,
// a managed provider mints the subject, and GSR verifies the token at one seam
// (gsr#47). Everything above that seam is getAccessToken().
//
// The publishable key is public by design; it identifies the project and nothing
// else. On localhost the local minter runs instead, matching GSR's
// AUTH_MODE=local claim shape so the whole stack works offline against a dev
// server. No UI, no prompt, nothing on screen: the reasoner toggle stays the
// only thing the author ever turns on.

const SUPABASE_URL = "https://xezkcsntepjnvdxhkdwi.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_7xS0HratrVUgOuZz5yIzpQ_AS4F2JU-";
/** Local mode only; the mode is a hostname check, so this is unreachable in production. */
const DEV_AUTH_SECRET = "facets-dev-secret";
const TOKEN_TTL = 7 * 24 * 3600;
/** Re-mint this long before expiry rather than racing the clock mid-call. */
const SKEW = 300;

const SUB_KEY = "facets_auth_sub";
const TOKEN_KEY = "facets_auth_token";

// The desktop shell and the node test environment have no localStorage, and a
// browser in private mode throws on touching it. Identity survives the process
// either way; only its persistence across reloads is lost.
const memory = new Map<string, string>();

function read(key: string): string | null {
  try {
    const v = localStorage.getItem(key);
    if (v !== null) return v;
  } catch {
    // storage unavailable — the memory map is the whole store
  }
  return memory.get(key) ?? null;
}

function write(key: string, value: string): void {
  memory.set(key, value);
  try {
    localStorage.setItem(key, value);
  } catch {
    // session-only, which is the honest outcome when storage refuses
  }
}

function localHost(): boolean {
  const loc = (globalThis as { location?: Location }).location;
  if (!loc) return true; // desktop shell and tests: the reasoner is the user's own
  return (
    loc.hostname === "localhost" ||
    loc.hostname === "127.0.0.1" ||
    loc.protocol === "file:" ||
    loc.protocol === "tauri:"
  );
}

export type AuthMode = "supabase" | "local";

export function authMode(): AuthMode {
  return localHost() ? "local" : "supabase";
}

function b64url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlJson(obj: unknown): string {
  return b64url(new TextEncoder().encode(JSON.stringify(obj)));
}

/** The subject, minted once and kept. A rejected token is never a reason to
 *  become a second user (council §4.4), so nothing here ever rotates it. */
function authSubject(): string {
  let sub = read(SUB_KEY);
  if (!sub) {
    sub = crypto.randomUUID();
    write(SUB_KEY, sub);
  }
  return sub;
}

async function mintLocalToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const body =
    b64urlJson({ alg: "HS256", typ: "JWT" }) +
    "." +
    b64urlJson({
      sub: authSubject(),
      aud: "authenticated",
      role: "authenticated",
      iat: now,
      exp: now + TOKEN_TTL,
      is_anonymous: true,
    });
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(DEV_AUTH_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return body + "." + b64url(new Uint8Array(sig));
}

export function tokenExpiry(token: string): number {
  try {
    const claims = JSON.parse(
      atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")),
    ) as { exp?: number };
    return claims.exp ?? 0;
  } catch {
    return 0;
  }
}

let minting: Promise<string> | null = null;

function localToken(): Promise<string> {
  const cached = read(TOKEN_KEY);
  if (cached && tokenExpiry(cached) - SKEW > Date.now() / 1000) return Promise.resolve(cached);
  if (!minting) {
    minting = mintLocalToken().then(
      (tok) => {
        write(TOKEN_KEY, tok);
        minting = null;
        return tok;
      },
      (e) => {
        minting = null;
        throw e;
      },
    );
  }
  return minting;
}

// The SDK is 200KB and only the provider path needs it, so it loads on demand —
// a localhost author never pays for it.
type SupabaseClient = {
  auth: {
    getSession(): Promise<{ data: { session: { access_token: string } | null } }>;
    signInAnonymously(): Promise<{
      data: { session: { access_token: string } | null };
      error: unknown;
    }>;
    refreshSession(): Promise<{
      data: { session: { access_token: string } | null };
      error: unknown;
    }>;
  };
};

let client: SupabaseClient | null = null;

async function supabase(): Promise<SupabaseClient> {
  if (!client) {
    const sdk = await import("@supabase/supabase-js");
    client = sdk.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) as unknown as SupabaseClient;
  }
  return client;
}

async function supabaseToken(): Promise<string | null> {
  const sb = await supabase();
  let { data } = await sb.auth.getSession();
  if (!data.session) {
    const r = await sb.auth.signInAnonymously();
    if (r.error) throw r.error;
    data = r.data;
  }
  return data.session ? data.session.access_token : null;
}

/** The one seam. Every reasoner call goes through authHeaders, which goes
 *  through here. Null when identity is unavailable: the call still goes out
 *  unauthenticated and the reasoner's 401 is what the author sees, rather than
 *  a second failure mode invented here. */
export async function getAccessToken(): Promise<string | null> {
  try {
    return authMode() === "supabase" ? await supabaseToken() : await localToken();
  } catch {
    return null;
  }
}

/** After a 401: the same subject, a fresh token. Called once per rejected call
 *  and never in a loop — a token the reasoner refuses twice is a reasoner the
 *  author has to be told about. */
export async function refreshAccessToken(): Promise<string | null> {
  try {
    if (authMode() === "local") {
      memory.delete(TOKEN_KEY);
      try {
        localStorage.removeItem(TOKEN_KEY);
      } catch {
        // nothing stored to drop
      }
      return await localToken();
    }
    const sb = await supabase();
    const r = await sb.auth.refreshSession();
    if (!r.error && r.data.session) return r.data.session.access_token;
    return await supabaseToken();
  } catch {
    return null;
  }
}

export async function authHeaders(): Promise<Record<string, string>> {
  const tok = await getAccessToken();
  return tok ? { Authorization: `Bearer ${tok}` } : {};
}

/** Drop the cached identity — tests only. */
export function resetAuthForTest(): void {
  memory.clear();
  minting = null;
  client = null;
  try {
    localStorage.removeItem(SUB_KEY);
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // nothing stored to drop
  }
}
