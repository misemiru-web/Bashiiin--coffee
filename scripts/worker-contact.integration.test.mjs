// Non-public workerd integration suite. No Wrangler/config/.env loading and no remote bindings.
// Run: npm run test:worker:integration. Requires the already-installed Miniflare/undici only.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import { MockAgent, getGlobalDispatcher, setGlobalDispatcher, Response } from 'undici';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ORIGIN = 'https://fixture.test'; // dispatchFetch routes internally; this hostname is never resolved.
const SITEVERIFY = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const SYNTHETIC_SECRET = 'synthetic-integration-secret';
const SYNTHETIC_TOKEN = 'synthetic-integration-token';
const payload = () => ({ name: 'Synthetic visitor', email: 'visitor@fixture.test', message: 'Synthetic inquiry', turnstileToken: SYNTHETIC_TOKEN });

// Only this in-memory, non-deployable wrapper creates fake bindings. Production modules are unchanged.
// No request header, query or public route can select fixture settings.
const wrapper = `
import production from './worker/index.mjs';
let events = [];
const outbound = globalThis.fetch.bind(globalThis);
globalThis.fetch = (...args) => { events.push('siteverify'); return outbound(...args); };
export default {
  async fetch(request, bindings) {
    events = [];
    const fixture = bindings.FIXTURE;
    const env = {
      CONTACT_API_ENABLED: fixture.disabled ? 'false' : 'true',
      EMAIL_SENDING_ENABLED: fixture.disabled ? 'false' : 'true',
      TURNSTILE_SECRET_KEY: 'synthetic-integration-secret',
      CONTACT_ORIGIN: 'https://fixture.test', TURNSTILE_HOSTNAME: 'fixture.test',
      CONTACT_FROM: 'sender@fixture.test', CONTACT_TO: 'store@fixture.test',
      CONTACT_RATE_LIMITER: { async limit(value) {
        events.push('rate');
        if (value.key !== 'contact:submission') throw Error('INVALID_MOCK_RATE_KEY');
        if (fixture.rateError) throw Error('MOCK_RATE_ERROR');
        return fixture.rateMalformed ? {} : { success: !fixture.rateDenied };
      } },
      EMAIL: { async send(message) {
        events.push('mail');
        const valid = message.from === 'sender@fixture.test' && message.to === 'store@fixture.test'
          && message.replyTo === 'visitor@fixture.test'
          && message.subject === 'Bashiiin! coffee お問い合わせ'
          && message.text === 'お名前：Synthetic visitor\\nメールアドレス：visitor@fixture.test\\n\\nお問い合わせ内容：\\nSynthetic inquiry';
        events.push(valid ? 'mail-valid' : 'mail-invalid');
        if (fixture.mailError) throw Error('MOCK_MAIL_ERROR');
        return fixture.mailMalformed ? {} : { messageId: 'synthetic-receipt' };
      } },
      ASSETS: { async fetch() { events.push('assets'); return new Response('MOCK_ASSET', { status: 404 }); } },
    };
    if (fixture.omit) delete env[fixture.omit];
    if (fixture.badSetting) env[fixture.badSetting] = fixture.badValue;
    // Capture body access without buffering, changing input, or bypassing production validation.
    const observed = new Proxy(request, { get(target, key) {
      if (key === 'body') events.push('body');
      const value = Reflect.get(target, key, target);
      return typeof value === 'function' ? value.bind(target) : value;
    } });
    const response = await production.fetch(observed, env);
    const headers = new Headers(response.headers);
    headers.set('X-Local-Fixture-Events', JSON.stringify(events));
    return new Response(response.body, { status: response.status, headers });
  },
};
`;

// Explicit module inventory: no source discovery, credentials, browser data or production inputs.
const productionFiles = ['worker/index.mjs', 'worker/contact/api.mjs', 'worker/contact/http.mjs',
  'worker/contact/validation.mjs', 'worker/contact/turnstile.mjs', 'worker/contact/mail.mjs'];
const modules = [{ type: 'ESModule', path: path.join(ROOT, '__local_fixture__.mjs'), contents: wrapper },
  ...productionFiles.map(file => ({ type: 'ESModule', path: path.join(ROOT, file), contents: fs.readFileSync(path.join(ROOT, file), 'utf8') }))];

test('CONTACT integration in local workerd; all external transports blocked', async t => {
  const previous = getGlobalDispatcher();
  const guard = new MockAgent();
  guard.disableNetConnect();
  guard.enableNetConnect(/^(?:127\.0\.0\.1|localhost|\[::1\])(?::\d+)?$/);
  setGlobalDispatcher(guard); // Miniflare's Node control requests may use loopback only.
  let mf;
  try {
    await t.test('Node transport rejects external requests before network access', async () => {
      await assert.rejects(() => fetch('https://node-egress-probe.invalid/'));
    });
    let fixture = {}, calls = [], denied = 0;
    const outboundService = async request => {
      // Never forward a Request: the handler only returns local synthetic Responses.
      if (request.url !== SITEVERIFY || request.method !== 'POST' || fixture.denyAll) {
        denied++; return new Response('DENIED', { status: 503 });
      }
      const form = new URLSearchParams(await request.text());
      calls.push({ syntheticInputs: form.get('secret') === SYNTHETIC_SECRET && form.get('response') === SYNTHETIC_TOKEN });
      if (fixture.verifyNetwork) throw Error('MOCK_NETWORK_FAILURE');
      if (fixture.verifyTimeout) return new Promise(resolve => {
        const timer = setTimeout(() => resolve(new Response('', { status: 503 })), 5500);
        request.signal.addEventListener('abort', () => { clearTimeout(timer); resolve(new Response('', { status: 503 })); }, { once: true });
      });
      if (fixture.redirect) return Response.json({ success: true, hostname: 'fixture.test', action: 'contact' },
        { status: fixture.redirect, headers: { Location: 'https://redirect-target.invalid/' } });
      if (fixture.verifyHttp) return new Response('', { status: 503 });
      if (fixture.verifyJson) return new Response('not-json');
      return Response.json({ success: !fixture.verifyDenied, hostname: fixture.wrongHostname ? 'other.test' : 'fixture.test',
        action: fixture.wrongAction ? 'other' : 'contact', 'error-codes': fixture.verifyDenied ? ['invalid-input-response'] : [] });
    };
    // Installed v5 exposes this converter; its constructor accepts v5 config/dev workers, not legacy flat options.
    const options = () => convertV4MiniflareOptions({ name: 'local-contact-fixture', modules, modulesRoot: ROOT,
      compatibilityDate: '2026-10-28', host: '127.0.0.1', port: 0,
      cf: false, telemetry: { enabled: false }, outboundService, bindings: { FIXTURE: fixture } });
    mf = new Miniflare(options());

    async function run(config = {}, requestOptions = {}) {
      fixture = config; calls = []; denied = 0;
      await mf.setOptions(options());
      const method = requestOptions.method || 'POST';
      const response = await mf.dispatchFetch(ORIGIN + (requestOptions.path || '/api/contact'), {
        method, headers: { Origin: ORIGIN, 'Content-Type': 'application/json', ...requestOptions.headers },
        ...(method === 'GET' || method === 'HEAD' ? {} : { body: requestOptions.body ?? JSON.stringify(payload()) }),
      });
      const text = await response.text();
      assert.equal(text.includes(SYNTHETIC_SECRET), false); assert.equal(text.includes(SYNTHETIC_TOKEN), false);
      const events = JSON.parse(response.headers.get('X-Local-Fixture-Events'));
      return { status: response.status, body: text ? JSON.parse(text) : null, events,
        calls: [...calls], denied, headers: response.headers };
    }
    const count = (result, event) => result.events.filter(x => x === event).length;
    function expect(result, status, code, verifyCalls, mailCalls, rateCalls) {
      assert.equal(result.status, status, JSON.stringify({ status: result.status, events: result.events, calls: result.calls.length, denied: result.denied })); assert.equal(result.body.ok, status === 200);
      if (code) assert.equal(result.body.code, code);
      assert.equal(result.calls.length, verifyCalls); assert.equal(count(result, 'mail'), mailCalls);
      assert.equal(count(result, 'rate'), rateCalls);
      assert.equal(result.headers.get('Cache-Control'), 'no-store');
      assert.equal(result.headers.get('Access-Control-Allow-Origin'), null);
      assert.equal(result.events.includes('mail-invalid'), false);
    }
    await t.test('runtime outbound handler rejects even the exact Siteverify destination when not allowed', async () => {
      const result = await run({ denyAll: true });
      expect(result, 503, 'VERIFICATION_UNAVAILABLE', 0, 0, 1);
      assert.equal(result.denied, 1);
    });
    await t.test('disabled flags reject before reading invalid JSON, rate, verification or mail', async () => {
      const result = await run({ disabled: true }, { body: '{invalid' });
      expect(result, 503, 'SERVICE_UNAVAILABLE', 0, 0, 0); assert.equal(count(result, 'body'), 0);
    });
    for (const method of ['GET', 'PUT', 'DELETE', 'OPTIONS']) {
      await t.test(`disabled ${method} rejected before configuration/body processing`, async () => {
        const result = await run({ disabled: true }, { method });
        expect(result, 405, 'METHOD_NOT_ALLOWED', 0, 0, 0); assert.deepEqual(result.events, []);
      });
    }
    for (const url of ['/api', '/api/unknown', '/api/contact/']) {
      await t.test(`unknown API ${url} is 404 with no downstream calls`, async () => {
        const result = await run({ disabled: true }, { path: url });
        expect(result, 404, 'NOT_FOUND', 0, 0, 0); assert.deepEqual(result.events, []);
      });
    }
    await t.test('synthetic success follows rate -> body -> Siteverify -> one valid mail receipt', async () => {
      const result = await run(); expect(result, 200, null, 1, 1, 1);
      assert.deepEqual(result.events, ['rate', 'body', 'body', 'siteverify', 'mail', 'mail-valid']);
      assert.equal(result.calls[0].syntheticInputs, true);
    });
    for (const omit of ['CONTACT_API_ENABLED', 'EMAIL_SENDING_ENABLED', 'TURNSTILE_SECRET_KEY', 'CONTACT_ORIGIN',
      'TURNSTILE_HOSTNAME', 'CONTACT_FROM', 'CONTACT_TO', 'EMAIL', 'CONTACT_RATE_LIMITER']) {
      await t.test(`missing ${omit} fails closed before body/upstreams`, async () => {
        const result = await run({ omit }); expect(result, 503, 'SERVICE_UNAVAILABLE', 0, 0, 0);
        assert.deepEqual(result.events, []);
      });
    }
    const cases = [
      ['origin mismatch', {}, { headers: { Origin: 'https://other.test' } }, 403, 'ORIGIN_REJECTED', 0, 0],
      ['rate denied', { rateDenied: true }, {}, 429, 'RATE_LIMITED', 0, 1],
      ['rate error', { rateError: true }, {}, 503, 'SERVICE_UNAVAILABLE', 0, 1],
      ['rate malformed', { rateMalformed: true }, {}, 503, 'SERVICE_UNAVAILABLE', 0, 1],
      ['bad JSON', {}, { body: '{' }, 400, 'INVALID_JSON', 0, 1],
      ['invalid field', {}, { body: JSON.stringify({ ...payload(), name: ' ' }) }, 400, 'VALIDATION_FAILED', 0, 1],
      ['extra destination field', {}, { body: JSON.stringify({ ...payload(), to: 'other@fixture.test' }) }, 400, 'INVALID_STRUCTURE', 0, 1],
      ['bad content type', {}, { headers: { 'Content-Type': 'text/plain' } }, 415, 'UNSUPPORTED_MEDIA_TYPE', 0, 1],
      ['oversized body', {}, { body: 'x'.repeat(48 * 1024 + 1) }, 413, 'PAYLOAD_TOO_LARGE', 0, 1],
      ['Turnstile rejection', { verifyDenied: true }, {}, 400, 'VERIFICATION_FAILED', 1, 1],
      ['hostname mismatch', { wrongHostname: true }, {}, 400, 'VERIFICATION_FAILED', 1, 1],
      ['action mismatch', { wrongAction: true }, {}, 400, 'VERIFICATION_FAILED', 1, 1],
      ['Siteverify network error', { verifyNetwork: true }, {}, 503, 'VERIFICATION_UNAVAILABLE', 1, 1],
      ['Siteverify HTTP error', { verifyHttp: true }, {}, 503, 'VERIFICATION_UNAVAILABLE', 1, 1],
      ['Siteverify JSON error', { verifyJson: true }, {}, 503, 'VERIFICATION_UNAVAILABLE', 1, 1],
    ];
    for (const [name, config, requestOptions, status, code, verifyCalls, rateCalls] of cases) {
      await t.test(name, async () => { expect(await run(config, requestOptions), status, code, verifyCalls, 0, rateCalls); });
    }
    for (const status of [301, 302, 303, 307, 308]) {
      await t.test(`redirect ${status} rejects success JSON without following Location or sending mail`, async () => {
        const result = await run({ redirect: status });
        expect(result, 503, 'VERIFICATION_UNAVAILABLE', 1, 0, 1);
        assert.equal(result.denied, 0, 'redirect target must never reach even the deny handler');
        assert.equal(count(result, 'siteverify'), 1, 'no retry');
      });
    }
    await t.test('Siteverify five-second deadline returns 503 without email or retry', async () => {
      const start = Date.now(); const result = await run({ verifyTimeout: true });
      expect(result, 503, 'VERIFICATION_UNAVAILABLE', 1, 0, 1);
      assert.ok(Date.now() - start >= 4800, 'production five-second deadline remains in effect');
      assert.equal(count(result, 'siteverify'), 1);
    });
    for (const config of [{ mailError: true }, { mailMalformed: true }]) {
      await t.test('mail failure never reports success or retries', async () => {
        expect(await run(config), 503, 'MAIL_UNAVAILABLE', 1, 1, 1);
      });
    }
  } finally {
    try { if (mf) await mf.dispose(); }
    finally { setGlobalDispatcher(previous); await guard.close(); }
  }
});
