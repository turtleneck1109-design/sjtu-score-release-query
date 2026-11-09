const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const { webcrypto } = require('node:crypto');
const code = fs.readFileSync(require('node:path').join(__dirname, '../reader.js'), 'utf8');

function setup({ blocked = false, reject = false } = {}) {
  const listeners = {};
  const intervals = new Map();
  const windows = [];
  const payloads = [];
  const statuses = [];
  let now = 0;
  let timerId = 0;
  const element = () => ({ addEventListener(type, fn) { this[type] = fn; } });
  const button = element(), bookmark = element(), help = {};
  const window = {
    addEventListener(type, fn) { listeners[type] = fn; },
    open(url) {
      if (blocked) return null;
      const popup = { url, closed: false, replies: [], postMessage(...args) { this.replies.push(args); } };
      windows.push(popup);
      return popup;
    },
  };
  const context = vm.createContext({ window, location: { origin: 'https://query.example', protocol: 'https:' },
    URL, URLSearchParams, crypto: webcrypto, Uint32Array, Date: { now: () => now },
    setInterval(fn) { intervals.set(++timerId, fn); return timerId; },
    clearInterval(id) { intervals.delete(id); },
  });
  vm.runInContext(code, context);
  const reader = context.createSjtuReader({ button, bookmark, help,
    getUrl: () => 'https://i.sjtu.edu.cn/cjlrjg/cjlrjg_cxCjlrjg.html?xnm=2026&xqm=3',
    onPayload(payload) { if (reject) throw new Error('invalid payload'); payloads.push(payload); },
    onStatus(...args) { statuses.push(args); }, timeoutMs: 5000,
  });
  function event(popup = windows.at(-1)) {
    return { origin: 'https://i.sjtu.edu.cn', source: popup, data: {
      type: 'sjtu-reader-data', requestId: new URLSearchParams(new URL(popup.url).hash.slice(1)).get('sjtuReader'),
      payload: { items: [] },
    } };
  }
  return { button, bookmark, windows, payloads, statuses, reader, intervals, event,
    send: e => listeners.message(e), tick: ms => { now += ms; [...intervals.values()].forEach(fn => fn()); } };
}

test('accepts only the selected SJTU window, exact origin and active request; acknowledges once', () => {
  const h = setup(); h.button.click();
  const valid = h.event();
  for (const invalid of [
    { ...valid, origin: 'https://i.sjtu.edu.cn.evil.example' },
    { ...valid, source: {} },
    { ...valid, data: { ...valid.data, requestId: 'stale' } },
    { ...valid, data: null },
  ]) h.send(invalid);
  assert.equal(h.payloads.length, 0);
  h.send(valid); h.send(valid);
  assert.equal(h.payloads.length, 1);
  assert.equal(h.windows[0].replies.length, 1);
  assert.equal(h.windows[0].replies[0][0].ok, true);
  assert.equal(h.windows[0].replies[0][1], 'https://i.sjtu.edu.cn');
  assert.equal(h.intervals.size, 0);
});

test('retry and cancellation invalidate old windows and leave no running timer', () => {
  const h = setup(); h.button.click(); const old = h.event();
  h.button.click(); const current = h.event();
  assert.notEqual(old.data.requestId, current.data.requestId);
  h.send(old); assert.equal(h.payloads.length, 0);
  h.reader.cancel(); h.send(current);
  assert.equal(h.payloads.length, 0); assert.equal(h.intervals.size, 0);
});

test('blocked popup, closed window and timeout produce actionable errors', () => {
  const blocked = setup({ blocked: true }); blocked.button.click();
  assert.match(blocked.statuses.at(-1)[0], /拦截/);
  assert.equal(blocked.intervals.size, 0);
  for (const close of [true, false]) {
    const h = setup(); h.button.click(); const late = h.event();
    h.windows[0].closed = close; h.tick(close ? 1000 : 5000);
    assert.match(h.statuses.at(-1)[0], close ? /已关闭/ : /超时/);
    h.send(late); assert.equal(h.payloads.length, 0);
    assert.equal(h.intervals.size, 0);
  }
});

test('malformed payload is reported as failure rather than a success acknowledgement', () => {
  const h = setup({ reject: true }); h.button.click(); h.send(h.event());
  assert.equal(h.windows[0].replies[0][0].ok, false);
  assert.match(h.statuses.at(-1)[0], /invalid payload/);
  assert.equal(h.intervals.size, 0);
});

test('bookmark is pinned to this query origin and sends no cookies', () => {
  const h = setup();
  const script = decodeURIComponent(h.bookmark.href.slice('javascript:'.length));
  assert.match(script, /https:\/\/query.example/);
  assert.doesNotMatch(script, /document.cookie|fetch\(/);
});
