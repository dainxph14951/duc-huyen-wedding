const { createHmac } = require("node:crypto");

// Vercel Node.js Function. Secrets stay here, outside the static dist/ directory.
module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (req.method === "GET") {
    const offset = new URL(req.url || "/api/wishes", "http://localhost").searchParams.get("offset") || "0";
    if (!/^\d{1,9}$/.test(offset)) return res.status(400).json({ code: "invalid_offset" });
    const databaseUrl = process.env.SUPABASE_URL;
    const secret = process.env.SUPABASE_SECRET_KEY;
    if (!databaseUrl || !secret) return res.status(503).json({ code: "not_configured" });
    try {
      const url = new URL("/rest/v1/wedding_wishes", databaseUrl);
      url.searchParams.set("select", "id,name,message,created_at");
      url.searchParams.set("order", "created_at.desc,id.desc");
      url.searchParams.set("limit", "100");
      url.searchParams.set("offset", offset);
      const response = await fetch(url, {
        headers: { apikey: secret }, signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) throw new Error("Storage unavailable");
      const rows = await response.json();
      if (!Array.isArray(rows) || rows.some((row) => !row || typeof row.id !== "string"
        || typeof row.name !== "string" || typeof row.message !== "string"
        || typeof row.created_at !== "string")) throw new Error("Invalid data");
      // Explicit projection prevents private database columns from entering the public response.
      return res.status(200).json({ wishes: rows.slice(0, 100).map(({ id, name, message, created_at }) => ({ id, name, message, created_at })) });
    } catch {
      return res.status(503).json({ code: "storage_unavailable" });
    }
  }
  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ code: "method_not_allowed" });
  }

  // This limits cross-site browser submissions; it is not authentication.
  if (req.headers.origin) {
    try {
      if (new URL(req.headers.origin).host !== req.headers.host) {
        return res.status(403).json({ code: "origin_not_allowed" });
      }
    } catch {
      return res.status(403).json({ code: "origin_not_allowed" });
    }
  }
  if (req.headers["content-type"]?.split(";")[0].trim().toLowerCase() !== "application/json") {
    return res.status(415).json({ code: "json_required" });
  }

  let body;
  try {
    const raw = typeof req.body === "string" ? req.body : JSON.stringify(req.body);
    if (!raw || Buffer.byteLength(raw) > 8192) {
      return res.status(413).json({ code: "payload_too_large" });
    }
    body = JSON.parse(raw);
  } catch {
    return res.status(400).json({ code: "invalid_input" });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return res.status(400).json({ code: "invalid_input" });
  }
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";
  const id = typeof body.id === "string" ? body.id.toLowerCase() : body.id;
  const controlCharacters = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/;
  if (typeof id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
    || !name || Array.from(name).length > 80 || /[\r\n\t]/.test(name)
    || !message || Array.from(message).length > 1000
    || controlCharacters.test(name + message)) {
    return res.status(400).json({ code: "invalid_input" });
  }

  const databaseUrl = process.env.SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!databaseUrl || !secret) return res.status(503).json({ code: "not_configured" });

  // Vercel overwrites this header with the visitor IP. Do not trust client body IDs for throttling.
  const address = req.headers["x-vercel-forwarded-for"]?.split(",")[0].trim()
    || req.socket?.remoteAddress || "unknown";
  const senderHash = createHmac("sha256", secret).update(`wedding-wishes:${address}`).digest("hex");
  try {
    const response = await fetch(new URL("/rest/v1/rpc/submit_wedding_wish", databaseUrl), {
      method: "POST",
      headers: { apikey: secret, "Content-Type": "application/json" },
      body: JSON.stringify({ p_id: id, p_name: name, p_message: message, p_sender_hash: senderHash }),
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return res.status(503).json({ code: "storage_unavailable" });
    const result = await response.json();
    if (result.status === "rate_limited") {
      res.setHeader("Retry-After", "30");
      return res.status(429).json({ code: "rate_limited" });
    }
    if (result.status === "conflict") return res.status(409).json({ code: "request_conflict" });
    if (result.status !== "saved" || result.id !== id) {
      return res.status(503).json({ code: "storage_unavailable" });
    }
    return res.status(200).json({ saved: true, id });
  } catch {
    // Never expose database errors, request content, IP addresses, or credentials.
    return res.status(503).json({ code: "storage_unavailable" });
  }
};
