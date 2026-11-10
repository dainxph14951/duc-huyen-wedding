const { test } = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { runInNewContext } = require("node:vm");
const handler = require("../api/invitation.js");
const { renderInvitation } = handler;
const template = readFileSync(require.resolve("../index.html"), "utf8");
const script = readFileSync(require.resolve("../script.js"), "utf8")
  .split("// Chỉ hạn chế thao tác thông thường;")[0];

function frontend(search) {
  const nodes = [{}, {}];
  const document = { querySelectorAll: () => nodes };
  runInNewContext(script, { URLSearchParams, window: { location: { search } }, document });
  return { document, nodes };
}

test("personalizes visible names and share metadata in the initial HTML without JavaScript", () => {
  const html = renderInvitation(template, "/?guest=Anh%20%C4%90%E1%BA%A1i");
  assert.equal((html.match(/<strong data-guest-name>Anh Đại<\/strong>/g) || []).length, 2);
  for (const attribute of ['property="og:title"', 'name="twitter:title"']) {
    assert.ok(html.includes(`${attribute} content="Thân mời Anh Đại | Minh Đức ♥ Ngọc Huyền"`));
  }
  assert.ok(html.includes('<title>Thân mời Anh Đại | Minh Đức ♥ Ngọc Huyền</title>'));
  assert.equal((html.match(/content="Trân trọng kính mời Anh Đại đến dự/g) || []).length, 3);
  assert.ok(html.includes('property="og:url" content="https://duc-huyen-wedding.vercel.app/?Anh%20%C4%90%E1%BA%A1i"'));
  assert.ok(html.includes('rel="canonical" href="https://duc-huyen-wedding.vercel.app/?Anh%20%C4%90%E1%BA%A1i"'));
  assert.equal(html.match(/property="og:image"[^>]+/)[0], template.match(/property="og:image"[^>]+/)[0]);
});

test("missing, empty and whitespace-only names retain the general invitation", () => {
  for (const url of ["/", "/?guest=", "/?guest=%20%0A%20", "/?other=Anh"] ) {
    assert.equal(renderInvitation(template, url), template);
    assert.equal(frontend(new URL(url, "https://test.invalid").search).nodes[0].textContent, "Quý khách");
  }
});

test("short links match legacy links in browser and server, including encoded delimiters", () => {
  for (const name of ["Anh Đại", "Gia đình anh Đại & chị Lan", "Anh A=B + C #1", '<img src=x onerror="alert(1)">']) {
    const short = `?${encodeURIComponent(name)}`;
    const legacy = `?guest=${encodeURIComponent(name)}`;
    assert.equal(frontend(short).nodes[0].textContent, name);
    assert.equal(renderInvitation(template, `/index.html${short}`), renderInvitation(template, `/${legacy}`));
  }
  assert.equal(frontend("?Anh+Đại").nodes[0].textContent, "Anh Đại");
  for (const search of ["?", "?%20%20", "?%E0%A4", "?guest=&Anh", "?utm_source=test"]) {
    assert.equal(frontend(search).nodes[0].textContent, "Quý khách");
    assert.equal(renderInvitation(template, `/${search}`), template);
  }
});

test("escapes markup and preserves literal replacement tokens in guest names", () => {
  const guest = '<img src=x onerror="alert(1)"> & $& $\' $`';
  const search = `?guest=${encodeURIComponent(guest)}`;
  const html = renderInvitation(template, `/${search}`);
  assert.ok(!html.includes('<img src=x'));
  assert.ok(html.includes('&lt;img src=x onerror=&quot;alert(1)&quot;&gt; &amp; $&amp; $&#39; $`'));
  assert.equal(frontend(search).nodes[0].textContent, guest);
});

test("server and static fallback agree on Unicode, length limit, whitespace and repeated query params", () => {
  for (const raw of ["  Anh   Đại\n ", "Gia đình anh Đại & chị Lan", "🌸".repeat(110), "Anh\u202e Đại", "Anh+Đại"]) {
    const search = `?guest=${encodeURIComponent(raw)}&guest=Other`;
    const ui = frontend(search);
    const guest = ui.nodes[0].textContent;
    assert.equal(ui.nodes[1].textContent, guest);
    assert.ok(Array.from(guest).length <= 100);
    assert.ok(!guest.includes("\u202e"));
    const html = renderInvitation(template, `/${search}`);
    assert.ok(html.includes(`<title>${ui.document.title.replaceAll("&", "&amp;")}</title>`));
  }
});

test("function serves built HTML, avoids cross-guest caching, supports HEAD and rejects POST", async () => {
  async function request(method, guest) {
    const res = { headers: {}, setHeader(key, value) { this.headers[key] = value; }, end(body) { this.body = body; } };
    await handler({ method, url: `/?guest=${encodeURIComponent(guest)}` }, res);
    return res;
  }
  const first = await request("GET", "Anh Đại");
  assert.equal(first.statusCode, 200);
  assert.equal(first.headers["Cache-Control"], "private, no-store");
  assert.match(first.headers["Content-Type"], /text\/html/);
  assert.ok(first.body.includes("Thân mời Anh Đại"));
  const second = await request("GET", "Chị Lan");
  assert.ok(second.body.includes("Thân mời Chị Lan"));
  assert.ok(!second.body.includes("Anh Đại"));
  const head = await request("HEAD", "Anh Đại");
  assert.equal(head.statusCode, 200);
  assert.equal(head.body, undefined);
  const post = await request("POST", "Anh Đại");
  assert.equal(post.statusCode, 405);
  assert.equal(post.headers.Allow, "GET, HEAD");
});
