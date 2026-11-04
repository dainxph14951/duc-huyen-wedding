import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { randomUUID } from "node:crypto";

const source = readFileSync(new URL("../script.js", import.meta.url), "utf8")
  .split("/* ---------- Lời chúc ---------- */")[1].split("/* ---------- Bàn phím ---------- */")[0];

function setup(respond) {
  const name = { value: "Khách mời", focus() {} };
  const message = { value: "Trăm năm hạnh phúc ♥", focus() {} };
  const submit = {};
  const status = { textContent: "" };
  let listener;
  const form = {
    elements: { namedItem: (key) => key === "name" ? name : message },
    reportValidity: () => true,
    querySelector: () => submit,
    addEventListener: (event, callback) => { if (event === "submit") listener = callback; },
    setAttribute() {}, removeAttribute() {},
    reset() { name.value = ""; message.value = ""; },
  };
  const nodes = { "#wishesForm": form, "#wishesStatus": status };
  const requests = [];
  runInNewContext(source, {
    document: { querySelector: (selector) => nodes[selector] || null, querySelectorAll: () => [], dispatchEvent() {} },
    Event,
    crypto: { randomUUID }, setTimeout, clearTimeout, AbortController, TypeError, SyntaxError,
    fetch: async (url, options) => {
      const body = JSON.parse(options.body);
      requests.push({ url, ...body });
      return respond(body, requests.length);
    },
  });
  return { name, message, status, submit, requests, send: () => listener({ preventDefault() {} }) };
}

test("success clears text only after a matching database receipt", async () => {
  const ui = setup(async ({ id }) => ({ ok: true, json: async () => ({ saved: true, id }) }));
  await ui.send();
  assert.match(ui.status.textContent, /Đã gửi lời chúc/);
  assert.equal(ui.message.value, "");
  assert.equal(ui.submit.disabled, false);
  assert.equal(ui.requests[0].url, "/api/wishes");
});

test("lost response keeps text and retry ID; changed text uses a new ID", async () => {
  const ui = setup(async () => { throw new TypeError("network"); });
  await ui.send();
  assert.equal(ui.message.value, "Trăm năm hạnh phúc ♥");
  assert.match(ui.status.textContent, /bấm gửi lại/);
  await ui.send();
  assert.equal(ui.requests[0].id, ui.requests[1].id);
  ui.message.value = "Chúc hai bạn thật hạnh phúc";
  await ui.send();
  assert.notEqual(ui.requests[1].id, ui.requests[2].id);
});

test("rate limits, unconfigured server, and invalid receipts retain entered text", async () => {
  for (const response of [
    { ok: false, json: async () => ({ code: "rate_limited" }) },
    { ok: false, json: async () => ({ code: "not_configured" }) },
    { ok: true, json: async () => ({ saved: true, id: "wrong" }) },
  ]) {
    const ui = setup(async () => response);
    await ui.send();
    assert.ok(ui.message.value);
    assert.doesNotMatch(ui.status.textContent, /Đã gửi lời chúc/);
    assert.equal(ui.submit.disabled, false);
  }
});

test("double click during a pending request sends only once", async () => {
  let finish;
  const ui = setup(({ id }) => new Promise((resolve) => { finish = () => resolve({ ok: true, json: async () => ({ saved: true, id }) }); }));
  const pending = ui.send();
  await ui.send();
  assert.equal(ui.requests.length, 1);
  assert.equal(ui.submit.disabled, true);
  finish();
  await pending;
  assert.equal(ui.submit.disabled, false);
});

test("Live Server HTML errors are reported as missing API, not lost connectivity", async () => {
  const ui = setup(async () => ({ ok: false, status: 405, json: async () => { throw new SyntaxError("Unexpected token <"); } }));
  await ui.send();
  assert.match(ui.status.textContent, /chưa được triển khai/);
  assert.doesNotMatch(ui.status.textContent, /Kết nối bị gián đoạn/);
  assert.ok(ui.message.value);
  assert.equal(ui.submit.disabled, false);
});

test("HTML fallback and null JSON keep the entered text without claiming a network outage", async () => {
  for (const response of [
    { ok: true, status: 200, json: async () => { throw new SyntaxError("HTML fallback"); } },
    { ok: true, status: 200, json: async () => null },
  ]) {
    const ui = setup(async () => response);
    await ui.send();
    assert.match(ui.status.textContent, /kết quả hợp lệ/);
    assert.doesNotMatch(ui.status.textContent, /Kết nối bị gián đoạn/);
    assert.ok(ui.message.value);
  }
});
