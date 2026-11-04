import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
const source = readFileSync(new URL('../script.js', import.meta.url), 'utf8')
  .split('/* ---------- Lời chúc trên thiệp ---------- */')[1]
  .split('/* ---------- Mục đang xem trên thanh điều hướng di động ---------- */')[0];
const flush = () => new Promise(setImmediate);
function element() {
  const classes = new Set();
  return {
    hidden: true, style: {}, offsetHeight: 40, children: [], handlers: {}, attributes: {},
    classList: { add: (name) => classes.add(name), remove: (name) => classes.delete(name), contains: (name) => classes.has(name), toggle(name, value) { if (value) classes.add(name); else classes.delete(name); } },
    setAttribute(name, value) { this.attributes[name] = value; },
    addEventListener(name, callback) { this.handlers[name] = callback; },
    append(...children) { children.forEach((child) => { child.parent = this; this.children.push(child); }); },
    remove() { this.parent.children = this.parent.children.filter((child) => child !== this); },
  };
}
function setup({ rows = [], gate = false, reduced = false, fail = false, pages, bubbleHeight = 40 } = {}) {
  const wall = element(), list = element(), body = element();
  body.classList.toggle('gate-open', gate);
  wall.querySelector = () => list;
  const doc = { hidden: false, body, handlers: {}, querySelector: () => wall, createElement() { const node = element(); node.offsetHeight = bubbleHeight; return node; }, addEventListener(name, callback) { this.handlers[name] = callback; } };
  const timers = new Map(), requests = [];
  let timerId = 0;
  runInNewContext(source, {
    document: doc, window: { matchMedia: () => ({ matches: reduced, addEventListener() {} }) },
    AbortController, performance,
    setTimeout(callback, delay) { const id = ++timerId; timers.set(id, {callback, delay}); return id; },
    clearTimeout: (id) => timers.delete(id),
    fetch: async (url) => { requests.push(url); return { ok: !fail, json: async () => ({ wishes: pages ? pages[requests.length - 1] : rows }) }; },
  });
  function tick(delay) {
    const entry = [...timers.entries()].find(([, timer]) => (delay === undefined || timer.delay === delay));
    assert.ok(entry, `timer ${delay} exists`);
    timers.delete(entry[0]);
    entry[1].callback();
  }
  function end(item) { item.handlers.animationend({ target: item, animationName: reduced ? 'wish-popup-still' : 'wish-popup-fall' }); }
  return { wall, list, doc, timers, requests, tick, end };
}
const rows = [
  { id: '1', name: '<img src=x>', message: '<script>alert(1)</script>' },
  { id: '2', name: 'Gia đình', message: 'Trăm năm hạnh phúc ♥' },
];
test('spacing uses measured height so one-line and two-line wishes keep the same gap', async () => {
  const short = setup({ rows, bubbleHeight: 26 });
  const tall = setup({ rows, bubbleHeight: 42 });
  await flush();
  const delayShort = [...short.timers.values()][0].delay;
  const delayTall = [...tall.timers.values()][0].delay;
  assert.ok(delayTall > delayShort);
  for (const [delay, height] of [[delayShort, 26], [delayTall, 42]]) {
    const gap = delay * 238 / 16000 - height;
    assert.ok(gap >= 6 && gap < 6.02);
  }
});
test('all wishes appear exactly once, fade away, and reload starts a new queue', async () => {
  const ui = setup({ rows });
  await flush();
  const seen = [];
  for (let i = 0; i < 2; i++) {
    if (i) ui.tick();
    const item = ui.list.children.at(-1);
    const line = item.children[0];
    seen.push(line.children[0].textContent);
    assert.equal(line.children[1].innerHTML, undefined);
    ui.end(item);
  }
  assert.deepEqual(seen, [rows[0].name + ': ', rows[1].name + ': ']);
  assert.equal(ui.wall.classList.contains('is-finished'), true);
  ui.tick(800);
  assert.equal(ui.wall.hidden, true);
  assert.equal(ui.timers.size, 0);
  assert.equal(ui.doc.handlers['wishes-updated'], undefined, 'submission must not restart playback');
  const reloaded = setup({ rows });
  await flush();
  assert.equal(reloaded.list.children.length, 1);
  assert.equal(reloaded.wall.hidden, false);
});
test('waits for invitation to open and does not consume wishes in a hidden tab', async () => {
  const ui = setup({ rows, gate: true });
  await flush();
  assert.equal(ui.list.children.length, 0);
  ui.doc.body.classList.remove('gate-open');
  ui.doc.handlers['invitation-opened']();
  assert.equal(ui.list.children.length, 1);
  ui.doc.hidden = true;
  ui.doc.handlers.visibilitychange();
  assert.equal(ui.wall.classList.contains('is-paused'), true);
  assert.equal(ui.timers.size, 0);
  assert.equal(ui.list.children.length, 1);
  ui.doc.hidden = false;
  ui.doc.handlers.visibilitychange();
  ui.tick();
  assert.equal(ui.list.children.length, 2);
});
test('reduced motion plays each wish once at a slower cadence', async () => {
  const ui = setup({ rows, reduced: true });
  await flush();
  assert.equal(ui.wall.classList.contains('is-reduced'), true);
  ui.end(ui.list.children[0]);
  ui.tick(16500);
  ui.end(ui.list.children[0]);
  ui.tick(800);
  assert.equal(ui.wall.hidden, true);
});
test('fetches beyond 100 wishes and deduplicates IDs before playback', async () => {
  const first = Array.from({length: 100}, (_, i) => ({id: String(i), name: 'Khách ' + i, message: 'Hạnh phúc'}));
  const ui = setup({ pages: [first, [first[0], {id: '100', name: 'Khách 100', message: 'Chúc mừng'}]] });
  await flush();
  assert.deepEqual(ui.requests, ['/api/wishes?offset=0', '/api/wishes?offset=100']);
  let total = 0;
  while (true) {
    ui.end(ui.list.children[0]);
    total++;
    if (ui.wall.classList.contains('is-finished')) break;
    ui.tick();
  }
  assert.equal(total, 101);
});
test('empty data or network failure keeps the overlay hidden', async () => {
  for (const fail of [false, true]) {
    const ui = setup({ fail });
    await flush();
    assert.equal(ui.wall.hidden, true);
    assert.equal(ui.list.children.length, 0);
  }
});
