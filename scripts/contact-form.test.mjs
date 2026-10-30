import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../script.js', import.meta.url), 'utf8');
// Public Cloudflare dummy sitekey. No secret, network, mail or real user input.
const DUMMY_SITEKEY = '1x00000000000000000000AA';
class Element {
  constructor() { this.dataset = {}; this.style = {}; this.listeners = {}; this.attributes = {}; this.classList = { add() {} }; this.disabled = false; }
  addEventListener(name, fn) { (this.listeners[name] ||= []).push(fn); }
  async fire(name) { for (const fn of this.listeners[name] || []) await fn({ preventDefault() {} }); }
  setAttribute(name, value) { this.attributes[name] = value; }
  removeAttribute(name) { delete this.attributes[name]; }
  hasAttribute(name) { return Object.hasOwn(this.attributes, name); }
  focus() {}
  after(element) { this.next = element; }
}
function fixture({ hostname = '127.0.0.1', mode, stagingHost, search = '', origin = `https://${hostname}`, ready = false, key = '' , outcome = 'success' } = {}) {
  const fields = ['name', 'email', 'message'].map((name, i) => Object.assign(new Element(), {
    id: `contact-${name}`, value: ['テスト担当', 'visitor@unit.test', 'テスト本文'][i],
    maxLength: [100, 254, 5000][i], type: i === 1 ? 'email' : 'text', validity: { typeMismatch: false },
  }));
  const form = new Element(); form.dataset.endpointReady = String(ready);
  if (mode) form.dataset.turnstileMode = mode;
  if (stagingHost) form.dataset.turnstileHostname = stagingHost;
  form.elements = { namedItem: name => fields[['name','email','message'].indexOf(name)] };
  const submit = new Element(); submit.disabled = true;
  const status = new Element(), widget = new Element(); widget.dataset.sitekey = key;
  const byId = { 'contact-submit': submit, 'contact-status': status, 'contact-turnstile': widget };
  for (const field of fields) byId[`${field.id}-error`] = new Element();
  form.querySelector = selector => byId[selector.slice(1)] || null;
  form.reset = () => fields.forEach(field => { field.value = ''; });
  const scripts = [], requests = [], events = [], logs = [];
  const document = {
    querySelector: selector => selector === '#contact-form' ? form : null,
    querySelectorAll: () => [], getElementById: id => byId[id],
    createElement: () => new Element(), head: { append: node => scripts.push(node) },
  };
  const window = {
    location: { hostname, origin, search }, matchMedia: () => ({ matches: true }),
    dispatchEvent: event => events.push(event.detail), setTimeout, clearTimeout,
  };
  const sandbox = { window, document, console: { info: (...args) => logs.push(args) }, AbortController,
    CustomEvent: class { constructor(type, init) { this.detail = init.detail; } },
    fetch: async (...args) => {
      requests.push(args);
      if (outcome === 'network') throw Error('mock network failure');
      return { status: outcome === 'success' ? 200 : 500,
        headers: { get: () => 'application/json' }, json: async () => ({ ok: outcome === 'success' }) };
    },
  };
  vm.runInNewContext(source, sandbox);
  let options, resets = 0;
  async function load() {
    assert.equal(scripts.length, 1);
    window.turnstile = { ready: () => { throw Error('async SDK must render from load, not ready'); }, render: (_container, opts) => { options = opts; return 'mock-widget'; }, reset: () => { resets++; } };
    await scripts[0].fire('load'); assert.ok(options, 'real form initializer must render');
    return options;
  }
  return { form, submit, status, widget, fields, scripts, requests, events, logs, load,
    get resets() { return resets; } };
}

test('default disabled form does not load widget or send', async () => {
  const f = fixture(); assert.equal(f.scripts.length, 0); assert.equal(f.submit.disabled, true);
  await f.form.fire('submit'); assert.equal(f.requests.length, 0); assert.equal(f.events.length, 0);
});
test('sitekey alone cannot enable ordinary widget or submission', () => {
  const f = fixture({ key: DUMMY_SITEKEY }); assert.equal(f.scripts.length, 0); assert.equal(f.submit.disabled, true);
});
for (const hostname of ['127.0.0.1', 'localhost', '[::1]']) {
  test(`verification-only is available on ${hostname} and never submits`, async () => {
    const f = fixture({ hostname, mode: 'verify-only', key: DUMMY_SITEKEY });
    const opts = await f.load(); assert.equal(opts.sitekey, DUMMY_SITEKEY); assert.equal(opts.action, 'contact');
    assert.equal(opts['response-field'], false); opts.callback('opaque-token');
    assert.equal(f.widget.dataset.verificationState, 'success'); assert.equal(f.submit.disabled, true);
    await f.form.fire('submit'); assert.equal(f.requests.length, 0); assert.equal(f.events.length, 0); assert.equal(f.logs.length, 0);
    assert.match(f.status.textContent, /送信はできません/);
  });
}
for (const hostname of ['staging.unit.test', 'localhost.evil.test', '127.0.0.1.evil.test']) {
  test(`verification-only fails closed on ${hostname}, even if endpoint is ready`, async () => {
    const f = fixture({ hostname, mode: 'verify-only', ready: true, key: DUMMY_SITEKEY });
    assert.equal(f.scripts.length, 0); assert.equal(f.submit.disabled, true);
    await f.form.fire('submit'); assert.equal(f.requests.length, 0); assert.equal(f.events.length, 0);
  });
}
test('verification-only without sitekey stays disabled and cannot post', async () => {
  const f = fixture({ mode: 'verify-only', ready: true }); assert.equal(f.scripts.length, 0);
  await f.form.fire('submit'); assert.equal(f.requests.length, 0);
});
test('verification-only overrides endpoint-ready=true and a tampered button', async () => {
  const f = fixture({ mode: 'verify-only', ready: true, key: DUMMY_SITEKEY });
  (await f.load()).callback('opaque-token'); f.submit.disabled = false;
  await f.form.fire('submit'); assert.equal(f.requests.length, 0); assert.equal(f.events.length, 0);
});
for (const [callback, state] of [['error-callback','error'], ['expired-callback','expired'], ['timeout-callback','timeout']]) {
  test(`${callback} clears a usable token and requires a new success`, async () => {
    const f = fixture({ ready: true, key: DUMMY_SITEKEY }); const opts = await f.load();
    opts.callback('opaque-token'); assert.equal(f.submit.disabled, false);
    opts[callback](); assert.equal(f.submit.disabled, true); assert.equal(f.widget.dataset.verificationState, state);
    await f.form.fire('submit'); assert.equal(f.requests.length, 0); assert.equal(f.events.length, 0);
  });
}
test('verification reset clears token, calls widget reset, and stays disabled', async () => {
  const f = fixture({ mode: 'verify-only', key: DUMMY_SITEKEY }); const opts = await f.load();
  opts.callback('opaque-token'); await f.widget.next.fire('click');
  assert.equal(f.resets, 1); assert.equal(f.widget.dataset.verificationState, 'reset'); assert.equal(f.submit.disabled, true);
  await f.form.fire('submit'); assert.equal(f.requests.length, 0); assert.equal(f.events.length, 0);
});
for (const token of ['', ' ', null, 123, 'a'.repeat(2049)]) {
  test(`malformed callback token (${typeof token}) remains disabled`, async () => {
    const f = fixture({ ready: true, key: DUMMY_SITEKEY }); (await f.load()).callback(token);
    assert.equal(f.submit.disabled, true); assert.equal(f.widget.dataset.verificationState, 'error');
    await f.form.fire('submit'); assert.equal(f.requests.length, 0);
  });
}
test('widget script load failure stays disabled', async () => {
  const f = fixture({ mode: 'verify-only', key: DUMMY_SITEKEY }); await f.scripts[0].fire('error');
  assert.equal(f.widget.dataset.verificationState, 'error'); assert.equal(f.submit.disabled, true); assert.equal(f.requests.length, 0);
});
test('ordinary configured flow still waits for token, posts once, then emits one lead', async () => {
  const f = fixture({ ready: true, key: DUMMY_SITEKEY }); const opts = await f.load();
  assert.equal(f.submit.disabled, true); opts.callback('opaque-token'); assert.equal(f.submit.disabled, false);
  assert.equal(f.events.length, 0); await f.form.fire('submit');
  assert.equal(f.requests.length, 1); assert.equal(f.requests[0][0], '/api/contact');
  assert.equal(f.events.filter(e => e.name === 'generate_lead').length, 1);
  assert.equal(f.resets, 1); assert.equal(f.submit.disabled, true);
  assert.equal(JSON.stringify(f.logs).includes('opaque-token'), false);
  assert.equal(JSON.stringify(f.logs).includes('visitor@unit.test'), false);
});
for (const outcome of ['server', 'network']) {
  test(`ordinary ${outcome} failure retains inputs and emits no lead`, async () => {
    const f = fixture({ ready: true, key: DUMMY_SITEKEY, outcome }); const opts = await f.load();
    opts.callback('opaque-token'); await f.form.fire('submit');
    assert.equal(f.requests.length, 1); assert.equal(f.events.some(e => e.name === 'generate_lead'), false);
    assert.equal(f.fields[0].value, 'テスト担当'); assert.equal(f.submit.disabled, true);
  });
}

const STAGING_HOST = 'bashiiin-coffee-staging.misemiruweb.workers.dev';
const stagingOptions = { hostname: STAGING_HOST, stagingHost: STAGING_HOST, mode: 'staging-verify-only', key: DUMMY_SITEKEY };
test('staging exact HTTPS origin can render but cannot submit even with ready=true', async () => {
  const f = fixture({ ...stagingOptions, ready: true });
  const options = await f.load(); options.callback('opaque-staging-token');
  assert.equal(f.submit.disabled, true); f.submit.disabled = false;
  await f.form.fire('submit'); assert.equal(f.requests.length, 0); assert.equal(f.events.length, 0); assert.equal(f.logs.length, 0);
  await f.widget.next.fire('click'); assert.equal(f.resets, 1); assert.equal(f.submit.disabled, true);
});
for (const override of [
  { hostname: 'localhost' }, { hostname: STAGING_HOST + '.evil.test' },
  { hostname: 'public.unit.test' }, { origin: 'http://' + STAGING_HOST },
  { origin: 'https://' + STAGING_HOST + ':8443' }, { stagingHost: 'other.unit.test' },
  { stagingHost: undefined }, { key: '' },
]) {
  test(`staging rejects mismatched context ${JSON.stringify(Object.keys(override))} ${JSON.stringify(Object.values(override))}`, async () => {
    const values = { ...stagingOptions, ...override, ready: true };
    if (override.hostname) values.origin = 'https://' + override.hostname;
    const f = fixture(values); assert.equal(f.scripts.length, 0); assert.equal(f.submit.disabled, true);
    await f.form.fire('submit'); assert.equal(f.requests.length, 0); assert.equal(f.events.length, 0);
  });
}
for (const callback of ['error-callback', 'expired-callback', 'timeout-callback']) {
  test(`staging ${callback} clears token and never posts`, async () => {
    const f = fixture(stagingOptions); const options = await f.load();
    options.callback('opaque-staging-token'); options[callback]();
    assert.equal(f.submit.disabled, true); await f.form.fire('submit');
    assert.equal(f.requests.length, 0); assert.equal(f.events.length, 0);
  });
}
test('staging malformed success token is rejected', async () => {
  const f = fixture(stagingOptions); (await f.load()).callback(null);
  assert.equal(f.widget.dataset.verificationState, 'error'); assert.equal(f.submit.disabled, true);
  await f.form.fire('submit'); assert.equal(f.requests.length, 0);
});

test('URL parameters cannot enable staging verification on an ordinary disabled form', async () => {
  const f = fixture({ hostname: STAGING_HOST, key: DUMMY_SITEKEY,
    search: '?turnstileMode=staging-verify-only&endpointReady=true&verify-only=true' });
  assert.equal(f.scripts.length, 0); assert.equal(f.submit.disabled, true);
  await f.form.fire('submit'); assert.equal(f.requests.length, 0); assert.equal(f.events.length, 0);
});
