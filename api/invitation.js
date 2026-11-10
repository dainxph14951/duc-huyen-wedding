const { readFile } = require("node:fs/promises");
const path = require("node:path");

const siteUrl = "https://duc-huyen-wedding.vercel.app/";

function normalizeGuest(value) {
  return Array.from((value || "").normalize("NFC")
    .replace(/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g, " ")
    .replace(/\s+/gu, " ").trim()).slice(0, 100).join("");
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
}

function renderInvitation(template, requestUrl) {
  const request = new URL(requestUrl, siteUrl);
  let raw = request.searchParams.get("guest") || "";
  if (!request.searchParams.has("guest") && request.search.length > 1 && !request.search.includes("=")) {
    try { raw = decodeURIComponent(request.search.slice(1).replace(/\+/g, " ")); }
    catch { raw = ""; }
  }
  const guest = normalizeGuest(raw);
  if (!guest) return template;
  const title = escapeHtml(`Thân mời ${guest} | Minh Đức ♥ Ngọc Huyền`);
  const description = escapeHtml(`Trân trọng kính mời ${guest} đến dự và chung vui cùng gia đình chúng tôi! Chạm mở thiệp, cùng chung vui.`);
  const canonical = escapeHtml(`${siteUrl}?${encodeURIComponent(guest)}`);
  // Callback replacements keep literal "$&" and similar guest text intact.
  return template
    .replace(/(<strong data-guest-name>)[\s\S]*?(<\/strong>)/g,
      (_, start, end) => start + escapeHtml(guest) + end)
    .replace(/<title>[\s\S]*?<\/title>/, () => `<title>${title}</title>`)
    .replace(/(<meta\s+(?:name|property)="(?:og:title|twitter:title)"\s+content=")[^"]*("\s*\/>)/g,
      (_, start, end) => start + title + end)
    .replace(/(<meta\s+(?:name|property)="(?:description|og:description|twitter:description)"\s+content=")[^"]*("\s*\/>)/g,
      (_, start, end) => start + description + end)
    .replace(/(<meta property="og:url" content=")[^"]*("\s*\/>)/,
      (_, start, end) => start + canonical + end)
    .replace(/(<link rel="canonical" href=")[^"]*("\s*\/>)/,
      (_, start, end) => start + canonical + end);
}

async function handler(req, res) {
  // Never let a shared cache reuse one guest's invitation for another guest.
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (!["GET", "HEAD"].includes(req.method)) {
    res.setHeader("Allow", "GET, HEAD");
    res.statusCode = 405;
    res.end();
    return;
  }
  try {
    const template = await readFile(path.join(__dirname, "..", "dist", "index.html"), "utf8");
    const html = renderInvitation(template, req.url);
    res.statusCode = 200;
    res.end(req.method === "HEAD" ? undefined : html);
  } catch {
    res.statusCode = 500;
    res.end("Không thể mở thiệp lúc này. Vui lòng thử lại sau.");
  }
}

module.exports = handler;
module.exports.renderInvitation = renderInvitation;
