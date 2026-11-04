const { test, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const handler = require("../api/wishes.js");

const id = "80b4fc78-15b6-43f8-a2d5-985ed79793e1";
const originalFetch = global.fetch;
const originalUrl = process.env.SUPABASE_URL;
const originalKey = process.env.SUPABASE_SECRET_KEY;
let calls;
beforeEach(() => {
  calls = [];
  process.env.SUPABASE_URL = "https://test.supabase.co";
  process.env.SUPABASE_SECRET_KEY = "sb_secret_TEST_ONLY";
  global.fetch = async (url, options) => {
    calls.push({ url: String(url), ...options });
    return { ok: true, json: async () => ({ status: "saved", id }) };
  };
});
afterEach(() => {
  global.fetch = originalFetch;
  for (const [key, value] of [["SUPABASE_URL", originalUrl], ["SUPABASE_SECRET_KEY", originalKey]]) {
    if (value === undefined) delete process.env[key]; else process.env[key] = value;
  }
});

async function request(overrides = {}) {
  const req = {
    method: "POST",
    headers: { host: "wedding.test", origin: "https://wedding.test", "content-type": "application/json", "x-vercel-forwarded-for": "192.0.2.1" },
    body: { id, name: "  Bạn thân  ", message: "  Chúc hai bạn hạnh phúc ♥  " },
    ...overrides,
  };
  const res = { headers: {}, setHeader(key, value) { this.headers[key] = value; }, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
  await handler(req, res);
  return res;
}

test("saves trimmed text, hashes the trusted IP, returns only receipt", async () => {
  const res = await request();
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { saved: true, id });
  assert.equal(res.headers["Cache-Control"], "no-store");
  const sent = JSON.parse(calls[0].body);
  assert.equal(sent.p_name, "Bạn thân");
  assert.equal(sent.p_message, "Chúc hai bạn hạnh phúc ♥");
  assert.match(sent.p_sender_hash, /^[a-f0-9]{64}$/);
  assert.ok(!calls[0].body.includes("192.0.2.1"));
  assert.equal(calls[0].url, "https://test.supabase.co/rest/v1/rpc/submit_wedding_wish");
  assert.equal(calls[0].headers.apikey, "sb_secret_TEST_ONLY");
  assert.ok(!JSON.stringify(res.body).includes("sb_secret"));
});

test("GET exposes only public wish fields and bounds the result", async () => {
  global.fetch = async (url, options) => {
    calls.push({ url: String(url), ...options });
    return { ok: true, json: async () => [{ id, name: "Bạn thân", message: "Hạnh phúc ♥", created_at: "2026-11-04T00:00:00Z", sender_hash: "PRIVATE", extra: "PRIVATE" }] };
  };
  const res = await request({ method: "GET" });
  assert.equal(res.statusCode, 200);
  assert.deepEqual(Object.keys(res.body.wishes[0]), ["id", "name", "message", "created_at"]);
  assert.ok(!JSON.stringify(res.body).includes("PRIVATE"));
  const url = new URL(calls[0].url);
  assert.equal(url.searchParams.get("select"), "id,name,message,created_at");
  assert.equal(url.searchParams.get("limit"), "100");
});

test("GET handles an empty list and storage failures without exposing internals", async () => {
  global.fetch = async () => ({ ok: true, json: async () => [] });
  assert.deepEqual((await request({ method: "GET" })).body, { wishes: [] });
  global.fetch = async () => ({ ok: false });
  assert.equal((await request({ method: "GET" })).statusCode, 503);
  global.fetch = async () => ({ ok: true, json: async () => null });
  assert.equal((await request({ method: "GET" })).statusCode, 503);
});

test("GET paginates all wishes and rejects invalid offsets", async () => {
  global.fetch = async (url) => {
    calls.push(String(url));
    return { ok: true, json: async () => [] };
  };
  assert.equal((await request({ method: "GET", url: "/api/wishes?offset=100" })).statusCode, 200);
  assert.equal(new URL(calls[0]).searchParams.get("offset"), "100");
  for (const offset of ["-1", "1.5", "invalid", "1000000000"]) {
    assert.equal((await request({ method: "GET", url: `/api/wishes?offset=${offset}` })).statusCode, 400);
  }
  assert.equal(calls.length, 1);
});

test("unsupported methods cannot mutate or delete wishes", async () => {
  const res = await request({ method: "DELETE" });
  assert.equal(res.statusCode, 405);
  assert.equal(res.headers.Allow, "GET, POST");
  assert.equal(calls.length, 0);
});

test("rejects cross-origin browser posts and non-JSON requests", async () => {
  assert.equal((await request({ headers: { origin: "https://other.test", host: "wedding.test" } })).statusCode, 403);
  assert.equal((await request({ headers: { "content-type": "text/plain" } })).statusCode, 415);
  assert.equal(calls.length, 0);
});

test("rejects malformed, oversized and invalid input before contacting storage", async () => {
  for (const body of ["{", "null", "[]", {}, { id, name: " ", message: "Hi" }, { id, name: "A", message: " " },
    { id: "bad", name: "A", message: "Hi" }, { id, name: "A".repeat(81), message: "Hi" },
    { id, name: "A", message: "♥".repeat(1001) }, { id, name: "A\nB", message: "Hi" }, { id, name: "A", message: "Hi\0" }]) {
    assert.equal((await request({ body })).statusCode, 400, JSON.stringify(body));
  }
  assert.equal((await request({ body: JSON.stringify({ message: "a".repeat(9000) }) })).statusCode, 413);
  assert.equal(calls.length, 0);
});

test("missing configuration fails without reporting a save", async () => {
  delete process.env.SUPABASE_SECRET_KEY;
  const res = await request();
  assert.equal(res.statusCode, 503);
  assert.equal(res.body.code, "not_configured");
  assert.equal(calls.length, 0);
});

test("maps persistent rate limit and idempotency conflict", async () => {
  global.fetch = async () => ({ ok: true, json: async () => ({ status: "rate_limited" }) });
  const limited = await request();
  assert.equal(limited.statusCode, 429);
  assert.equal(limited.headers["Retry-After"], "30");
  global.fetch = async () => ({ ok: true, json: async () => ({ status: "conflict" }) });
  assert.equal((await request()).statusCode, 409);
});

test("storage failures and malformed receipts never become success or expose internals", async () => {
  for (const result of [
    async () => { throw new Error("internal secret"); },
    async () => ({ ok: false }),
    async () => ({ ok: true, json: async () => ({ status: "saved", id: "wrong-id" }) }),
    async () => ({ ok: true, json: async () => null }),
  ]) {
    global.fetch = result;
    const res = await request();
    assert.equal(res.statusCode, 503);
    assert.deepEqual(res.body, { code: "storage_unavailable" });
  }
});
