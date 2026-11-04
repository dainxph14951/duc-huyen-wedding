// Local-only server: serves public files and runs the same handler as Vercel.
const http = require("node:http");
const path = require("node:path");
const { existsSync } = require("node:fs");
const { readFile } = require("node:fs/promises");
const wishes = require("../api/wishes.js");

const root = path.resolve(__dirname, "..");
const envPath = path.join(root, ".env");
if (existsSync(envPath)) process.loadEnvFile(envPath);
const port = Number(process.env.WEDDING_DEV_PORT || 3000);
const types = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8", ".svg": "image/svg+xml",
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".webp": "image/webp", ".mp3": "audio/mpeg",
};

async function serve(req, res) {
  // Match Vercel's response helpers without exposing the API source as a static file.
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (body) => {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify(body));
  };
  res.setHeader("Cache-Control", "no-store");
  const pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
  if (pathname === "/api/wishes") {
    if (req.method === "POST") {
      let size = 0;
      const chunks = [];
      for await (const chunk of req) {
        size += chunk.length;
        if (size > 8192) {
          res.status(413).json({ code: "payload_too_large" });
          return;
        }
        chunks.push(chunk);
      }
      req.body = Buffer.concat(chunks).toString("utf8");
    }
    // Only trust the socket locally; the browser cannot spoof throttling via proxy headers.
    delete req.headers["x-vercel-forwarded-for"];
    await wishes(req, res);
    return;
  }
  if (!["GET", "HEAD"].includes(req.method)) {
    res.setHeader("Allow", "GET, HEAD");
    res.status(405).json({ code: "method_not_allowed" });
    return;
  }
  const relative = pathname === "/" ? "index.html" : pathname.slice(1);
  const filename = path.resolve(root, relative);
  const publicAsset = relative.startsWith("assets/")
    && filename.startsWith(path.join(root, "assets") + path.sep)
    && !relative.split("/").some((part) => part.startsWith("."));
  if (!["index.html", "styles.css", "script.js"].includes(relative) && !publicAsset) {
    res.status(404).json({ code: "not_found" });
    return;
  }
  try {
    const content = await readFile(filename);
    res.setHeader("Content-Type", types[path.extname(filename)] || "application/octet-stream");
    res.end(req.method === "HEAD" ? undefined : content);
  } catch {
    res.status(404).json({ code: "not_found" });
  }
}

const server = http.createServer((req, res) => {
  serve(req, res).catch(() => {
    if (!res.headersSent) res.status(500).json({ code: "server_error" });
    else res.end();
  });
});
server.listen(port, "127.0.0.1", () => {
  console.log(`Wedding preview + API: http://127.0.0.1:${server.address().port}`);
  console.log("Stop with Ctrl+C. Restart after changing .env or server code.");
});
