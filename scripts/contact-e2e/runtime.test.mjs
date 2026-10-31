// Local workerd only. No Wrangler, .env, remote bindings, credentials or customer data.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawn } from 'node:child_process';
import childProcess from 'node:child_process';
import { registerHooks, syncBuiltinESMExports } from 'node:module';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import { MockAgent, getGlobalDispatcher, setGlobalDispatcher, Response } from 'undici';
import { ROOT, sourceInventory, verifyOutput, PAGES } from '../build-static.mjs';
import { inventory, validateSafeConfig } from './build.mjs';
import { HOST, ORIGIN, FROM, TO } from './policy.mjs';

const files = ['scripts/contact-e2e/worker.mjs', 'scripts/contact-e2e/guard.mjs', 'scripts/contact-e2e/policy.mjs',
  'worker/contact/api.mjs', 'worker/contact/http.mjs', 'worker/contact/validation.mjs',
  'worker/contact/turnstile.mjs', 'worker/contact/mail.mjs'];
const wrapper = `
import entry from './scripts/contact-e2e/worker.mjs';
import { DeliveryGuard } from './scripts/contact-e2e/guard.mjs';
export class TestGuard extends DeliveryGuard {
  constructor(ctx, env) {
    super(ctx, { ...env, RAW_EMAIL: { async send(message) {
      const response = await fetch('https://mail.fixture.test/', { method: 'POST', body: JSON.stringify(message) });
      if (!response.ok) throw Error('MOCK_MAIL_FAILURE');
      return response.json();
    } } });
  }
}
export default { async fetch(request, env) {
  const f = env.FIXTURE;
  const effective = { ...env, CONTACT_RATE_LIMITER: { async limit(value) {
    const result = await fetch('https://rate.fixture.test/', { method: 'POST', body: JSON.stringify(value) });
    if (!result.ok) throw Error('MOCK_RATE_FAILURE');
    return result.json();
  } } };
  if (f.guardMissing) delete effective.DELIVERY_GUARD;
  if (f.guardBroken) effective.DELIVERY_GUARD = { idFromName() { throw Error('MOCK_GUARD_FAILURE'); } };
  if (f.unwantedEmail) effective.EMAIL = { send() { throw Error('MUST_NOT_REACH'); } };
  return entry.fetch(request, effective);
} };
`;
const modules = [{ type: 'ESModule', path: path.join(ROOT, '__e2e_fixture__.mjs'), contents: wrapper },
  ...files.map(f => ({ type: 'ESModule', path: path.join(ROOT, f), contents: fs.readFileSync(path.join(ROOT, f), 'utf8') }))];
const payload = token => ({ name: 'Synthetic E2E', email: 'visitor@fixture.test', message: 'Synthetic test only', turnstileToken: token || 'synthetic-token' });

async function runtime(fixture = {}, persist) {
  const calls = { verify: 0, mail: 0, rate: 0, denied: 0 };
  const tokens = new Set();
  const vars = {
    E2E_MODE: fixture.mode || 'live', E2E_LIVE_APPROVAL: 'APPROVED_ONE_ATTEMPT',
    CONTACT_API_ENABLED: 'true', EMAIL_SENDING_ENABLED: 'true',
    CONTACT_FROM: FROM, CONTACT_TO: TO, CONTACT_ORIGIN: ORIGIN, TURNSTILE_HOSTNAME: HOST,
    TURNSTILE_SECRET_KEY: 'synthetic-e2e-secret', FIXTURE: fixture, ...fixture.vars,
  };
  const outboundService = async request => {
    // Never forward any request. These are synthetic in-process responses only.
    if (request.method !== 'POST') { calls.denied++; return new Response('', { status: 503 }); }
    if (request.url === 'https://rate.fixture.test/') {
      calls.rate++;
      assert.deepEqual(JSON.parse(await request.text()), { key: 'contact:submission' });
      return fixture.rateError ? new Response('', { status: 503 }) : Response.json({ success: !fixture.rateDenied });
    }
    if (request.url === 'https://challenges.cloudflare.com/turnstile/v0/siteverify') {
      calls.verify++;
      const data = new URLSearchParams(await request.text());
      assert.equal(data.get('secret'), 'synthetic-e2e-secret');
      const token = data.get('response');
      if (fixture.verifyError) throw Error('MOCK_SITEVERIFY_FAILURE');
      if (fixture.verifyTimeout) return new Promise(resolve => setTimeout(() => resolve(new Response('', { status: 503 })), 5200));
      const rejected = fixture.verifyDenied || token === 'expired' || token === 'invalid' || tokens.has(token);
      tokens.add(token);
      return Response.json({ success: !rejected, hostname: fixture.hostnameMismatch ? 'other.test' : HOST,
        action: fixture.actionMismatch ? 'other' : 'contact', 'error-codes': rejected ? ['timeout-or-duplicate'] : [] });
    }
    if (request.url === 'https://mail.fixture.test/') {
      calls.mail++;
      const m = JSON.parse(await request.text());
      assert.equal(m.from, FROM); assert.equal(m.to, TO); assert.equal(m.replyTo, 'visitor@fixture.test');
      assert.deepEqual(Object.keys(m).sort(), ['from', 'to', 'replyTo', 'subject', 'text'].sort());
      if (fixture.mailTimeout) return new Promise(resolve => setTimeout(() => resolve(Response.json({ messageId: 'late-synthetic' })), 5200));
      return fixture.mailError ? new Response('', { status: 503 }) : Response.json(fixture.emptyReceipt ? {} : { messageId: 'synthetic-receipt' });
    }
    calls.denied++;
    return new Response('DENIED', { status: 503 });
  };
  const options = convertV4MiniflareOptions({ name: 'local-contact-e2e', modules, modulesRoot: ROOT,
    compatibilityDate: '2026-10-28', host: '127.0.0.1', port: 0, cf: false,
    telemetry: { enabled: false }, outboundService, bindings: vars,
    durableObjects: { DELIVERY_GUARD: { className: 'TestGuard', useSQLite: true } } });
  // Installed Miniflare v5 persistence option; legacy durableObjectsPersist is ignored by its converter.
  if (persist) options.resourcePersistencePath = persist;
  const mf = new Miniflare(options);
  const post = async (overrides = {}, body = payload()) => {
    const method = overrides.method || 'POST';
    const response = await mf.dispatchFetch(ORIGIN + (overrides.path || '/api/contact'), {
      method, headers: { Origin: ORIGIN, 'Content-Type': 'application/json', ...overrides.headers },
      ...(method === 'GET' ? {} : { body: typeof body === 'string' ? body : JSON.stringify(body) }),
    });
    const text = await response.text();
    assert(!text.includes('synthetic-token')); assert(!text.includes('synthetic-e2e-secret'));
    return { status: response.status, ...JSON.parse(text) };
  };
  return { mf, calls, post };
}

async function withRuntime(fixture, fn) {
  const r = await runtime(fixture);
  try { await fn(r); assert.equal(r.calls.denied, 0); } finally { await r.mf.dispose(); }
}

async function child(persist) {
  const previous = getGlobalDispatcher(), block = new MockAgent();
  block.disableNetConnect(); block.enableNetConnect(/^(?:127\.0\.0\.1|localhost|\[::1\])(?::\d+)?$/);
  setGlobalDispatcher(block);
  try {
    await withRuntimePersist(persist);
  } finally { setGlobalDispatcher(previous); await block.close(); }
}
async function withRuntimePersist(persist) {
  const r = await runtime({}, persist);
  try { const result = await r.post(); console.log(JSON.stringify({ status: result.status, mail: r.calls.mail })); }
  finally { await r.mf.dispose(); }
}

if (process.argv[2] === '--persistence-child') {
  await child(process.argv[3]);
} else {
  test('CONTACT E2E in local workerd with SQLite and deny-by-default transports', async t => {
    const previous = getGlobalDispatcher(), block = new MockAgent();
    block.disableNetConnect(); block.enableNetConnect(/^(?:127\.0\.0\.1|localhost|\[::1\])(?::\d+)?$/);
    setGlobalDispatcher(block);
    try {
      await t.test('Node egress is denied without resolving or contacting external services', async () => {
        await assert.rejects(() => fetch('https://egress-probe.invalid/'));
      });
      await t.test('safe mode refuses before rate, verification and mail', () => withRuntime({ mode: 'safe', vars: {
        CONTACT_API_ENABLED: 'false', EMAIL_SENDING_ENABLED: 'false',
      } }, async r => { assert.equal((await r.post({}, '{')).status, 503); assert.deepEqual(r.calls, { verify: 0, mail: 0, rate: 0, denied: 0 }); }));
      await t.test('negative mode authenticates but cannot send or return fake success', () => withRuntime({ mode: 'negative' }, async r => {
        const response = await r.post(); assert.equal(response.status, 503); assert.equal(response.code, 'MAIL_UNAVAILABLE');
        assert.equal(r.calls.verify, 1); assert.equal(r.calls.rate, 1); assert.equal(r.calls.mail, 0);
      }));
      await t.test('negative mode refuses an accidentally supplied email binding', () => withRuntime({ mode: 'negative', unwantedEmail: true }, async r => {
        assert.equal((await r.post()).status, 503); assert.equal(r.calls.verify, 0); assert.equal(r.calls.mail, 0);
      }));
      for (const n of [2, 10]) await t.test(`${n} simultaneous valid POSTs consume one SQLite slot and attempt one mock email`, () => withRuntime({}, async r => {
        const result = await Promise.all(Array.from({ length: n }, (_, i) => r.post({}, payload('synthetic-' + i))));
        assert.equal(result.filter(x => x.status === 200).length, 1);
        assert.equal(result.filter(x => x.status === 503).length, n - 1); assert.equal(r.calls.mail, 1);
        assert.equal((await r.post({}, payload('fresh-token'))).status, 503); assert.equal(r.calls.mail, 1);
      }));
      const cases = [
        ['invalid token', {}, {}, payload('invalid'), 400, 1],
        ['expired token (mock)', {}, {}, payload('expired'), 400, 1],
        ['verification rejection', { verifyDenied: true }, {}, payload(), 400, 1],
        ['hostname mismatch', { hostnameMismatch: true }, {}, payload(), 400, 1],
        ['action mismatch', { actionMismatch: true }, {}, payload(), 400, 1],
        ['Siteverify network failure', { verifyError: true }, {}, payload(), 503, 1],
        ['Siteverify timeout', { verifyTimeout: true }, {}, payload(), 503, 1],
        ['Origin mismatch', {}, { headers: { Origin: 'https://other.test' } }, payload(), 403, 0],
        ['content type', {}, { headers: { 'Content-Type': 'text/plain' } }, payload(), 415, 0],
        ['invalid JSON', {}, {}, '{', 400, 0],
        ['invalid name', {}, {}, { ...payload(), name: ' ' }, 400, 0],
        ['client slot injection', {}, {}, { ...payload(), slot: 'fresh' }, 400, 0],
        ['missing token', {}, {}, { ...payload(), turnstileToken: '' }, 400, 0],
        ['body cap', {}, {}, 'x'.repeat(49153), 413, 0],
        ['rate rejection', { rateDenied: true }, {}, payload(), 429, 0],
        ['rate failure', { rateError: true }, {}, payload(), 503, 0],
        ['missing guard', { guardMissing: true }, {}, payload(), 503, 0],
        ['guard RPC failure', { guardBroken: true }, {}, payload(), 503, 1],
        ['missing secret', { vars: { TURNSTILE_SECRET_KEY: '' } }, {}, payload(), 503, 0],
        ['missing live approval', { vars: { E2E_LIVE_APPROVAL: '' } }, {}, payload(), 503, 0],
        ['incorrect server hostname', { vars: { TURNSTILE_HOSTNAME: 'other.test' } }, {}, payload(), 503, 0],
        ['GET', {}, { method: 'GET' }, payload(), 405, 0],
        ['unknown API', {}, { path: '/api/reset' }, payload(), 404, 0],
      ];
      for (const [name, f, options, body, status, verifies] of cases) await t.test(name, () => withRuntime(f, async r => {
        assert.equal((await r.post(options, body)).status, status); assert.equal(r.calls.verify, verifies); assert.equal(r.calls.mail, 0);
      }));
      await t.test('reused token rejected before email (mock Siteverify)', () => withRuntime({ mode: 'negative' }, async r => {
        assert.equal((await r.post()).status, 503); assert.equal((await r.post()).status, 400); assert.equal(r.calls.mail, 0);
      }));
      for (const fixture of [{ mailError: true }, { mailTimeout: true }, { emptyReceipt: true }]) {
        await t.test('mail failure/timeout/empty receipt consumes slot permanently without retry', () => withRuntime(fixture, async r => {
          assert.equal((await r.post()).status, 503); assert.equal(r.calls.mail, 1);
          assert.equal((await r.post({}, payload('fresh-token'))).status, 503); assert.equal(r.calls.mail, 1);
        }));
      }
      await t.test('separate Node/workerd process restart preserves the consumed SQLite record', async () => {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bashiiin-e2e-restart-'));
        const run = () => new Promise((resolve, reject) => {
          const p = spawn(process.execPath, [fileURLToPath(import.meta.url), '--persistence-child', dir], {
            env: { PATH: process.env.PATH, TMPDIR: os.tmpdir() }, stdio: ['ignore', 'pipe', 'pipe'],
          });
          let out = '', err = ''; p.stdout.on('data', b => { out += b; }); p.stderr.on('data', b => { err += b; });
          p.on('error', reject); p.on('exit', code => code === 0 ? resolve(JSON.parse(out.trim())) : reject(Error('LOCAL_CHILD_FAILURE ' + err)));
        });
        try { assert.deepEqual(await run(), { status: 200, mail: 1 }); assert.deepEqual(await run(), { status: 503, mail: 0 }); }
        finally { fs.rmSync(dir, { recursive: true, force: true }); }
      });
    } finally { setGlobalDispatcher(previous); await block.close(); }
  });

  test('dedicated build policy preserves 39 assets, source, noindex and disabled HTML', async t => {
    const source = sourceInventory(), safe = inventory();
    assert.equal(safe.files.length, 39); verifyOutput(); validateSafeConfig();
    for (const file of safe.files) assert(safe.buffers.get(file).equals(source.buffers.get(file)));
    for (const page of PAGES) assert(safe.buffers.get(page).toString().includes('noindex, nofollow, noarchive'));
    assert.match(safe.buffers.get('contact/index.html').toString(), /id="contact-submit"[^>]*disabled/);
    await t.test('form activation requires explicit approval, exact hostname and a public key', () => {
      for (const env of [{}, { E2E_TURNSTILE_SITE_KEY: '1x00000000000000000000AA' }]) assert.throws(() => inventory('negative', env));
      const enabled = inventory('negative', { E2E_HOSTNAME: HOST, E2E_FORM_APPROVAL: 'APPROVED_E2E_FORM', E2E_TURNSTILE_SITE_KEY: '1x00000000000000000000AA' });
      assert.equal(enabled.files.length, 39);
      assert.deepEqual(source.files.filter(f => !source.buffers.get(f).equals(enabled.buffers.get(f))), ['contact/index.html']);
      assert.match(enabled.buffers.get('contact/index.html').toString(), /data-endpoint-ready="true"/);
      assert.match(enabled.buffers.get('contact/index.html').toString(), /id="contact-submit"[^>]*disabled/);
    });
  });

  test('guard failure boundaries: exact production method with a synthetic Storage interface', async t => {
    // Only replace the runtime base class import; execute the unchanged guard method.
    const source = fs.readFileSync(new URL('./guard.mjs', import.meta.url), 'utf8')
      .replace("import { DurableObject } from 'cloudflare:workers';", 'class DurableObject { constructor(ctx, env) { this.ctx = ctx; this.env = env; } }')
      .replace("'./policy.mjs'", JSON.stringify(pathToFileURL(path.join(ROOT, 'scripts/contact-e2e/policy.mjs')).href));
    const { DeliveryGuard } = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
    const message = { from: FROM, to: TO, replyTo: 'visitor@fixture.test', subject: 'Bashiiin! coffee お問い合わせ', text: 'Synthetic only' };
    for (const fault of ['transaction', 'sync', 'consumed', 'invalid-from', 'invalid-to', 'extra-field']) {
      await t.test(`${fault} refuses before the mail binding is accessed`, async () => {
        let calls = 0, consumed = fault === 'consumed';
        const storage = {
          transactionSync(fn) { if (fault === 'transaction') throw Error('STORAGE_FAILED'); return fn(); },
          sql: { exec(sql) {
            if (sql.startsWith('SELECT')) return { toArray: () => consumed ? [{ slot: 1 }] : [] };
            if (sql.startsWith('INSERT')) consumed = true;
          } },
          async sync() { if (fault === 'sync') throw Error('SYNC_FAILED'); },
        };
        const guard = new DeliveryGuard({ storage }, { E2E_MODE: 'live', E2E_LIVE_APPROVAL: 'APPROVED_ONE_ATTEMPT',
          CONTACT_API_ENABLED: 'true', EMAIL_SENDING_ENABLED: 'true', CONTACT_FROM: FROM, CONTACT_TO: TO,
          CONTACT_ORIGIN: ORIGIN, TURNSTILE_HOSTNAME: HOST,
          RAW_EMAIL: { async send() { calls++; return { messageId: 'synthetic' }; } } });
        const input = { ...message };
        if (fault === 'invalid-from') input.from = 'other@fixture.test';
        if (fault === 'invalid-to') input.to = 'other@fixture.test';
        if (fault === 'extra-field') input.bcc = 'other@fixture.test';
        await assert.rejects(() => guard.sendOnce(input)); assert.equal(calls, 0);
        if (fault === 'sync') { await assert.rejects(() => guard.sendOnce(input)); assert.equal(calls, 0); assert(consumed); }
      });
    }
    await t.test('the SQL record is durable before the only binding call; no deletion API exists', async () => {
      const events = []; let consumed = false;
      const storage = {
        transactionSync(fn) { events.push('transaction'); return fn(); },
        sql: { exec(sql) {
          if (sql.startsWith('SELECT')) return { toArray: () => consumed ? [{}] : [] };
          if (sql.startsWith('INSERT')) { consumed = true; events.push('consume'); }
        } }, async sync() { events.push('durable'); },
      };
      const guard = new DeliveryGuard({ storage }, { E2E_MODE: 'live', E2E_LIVE_APPROVAL: 'APPROVED_ONE_ATTEMPT',
        CONTACT_API_ENABLED: 'true', EMAIL_SENDING_ENABLED: 'true', CONTACT_FROM: FROM, CONTACT_TO: TO,
        CONTACT_ORIGIN: ORIGIN, TURNSTILE_HOSTNAME: HOST,
        RAW_EMAIL: { async send() { events.push('send'); return { messageId: 'synthetic' }; } } });
      await guard.sendOnce(message); await assert.rejects(() => guard.sendOnce(message));
      assert.deepEqual(events, ['transaction', 'consume', 'durable', 'send', 'transaction']);
      assert.equal(guard.reset, undefined); assert.equal(guard.alarm, undefined);
    });
  });

  test('browser module import and lifecycle safety; no real Chrome or network', async t => {
    await t.test('first, repeated and fresh module imports have zero launch/network/write/process side effects', async () => {
      const beforeEnv = JSON.stringify(process.env), beforeFetch = globalThis.fetch;
      const events = ['SIGINT', 'SIGTERM', 'SIGHUP'];
      const beforeListeners = events.map(event => process.listeners(event));
      const counts = { launch: 0, network: 0, write: 0, process: 0 };
      const restore = [];
      const patch = (object, key, type) => {
        restore.push([object, key, object[key]]);
        object[key] = () => { counts[type]++; throw Error('IMPORT_SIDE_EFFECT_BLOCKED'); };
      };
      for (const key of ['spawn', 'exec', 'execFile', 'fork']) patch(childProcess, key, 'process');
      for (const key of ['writeFileSync', 'mkdirSync', 'rmSync', 'unlinkSync', 'renameSync', 'appendFileSync',
        'writeFile', 'mkdir', 'rm', 'unlink', 'rename', 'appendFile']) patch(fs, key, 'write');
      for (const key of ['writeFile', 'mkdir', 'rm', 'unlink', 'rename', 'appendFile']) patch(fs.promises, key, 'write');
      globalThis.fetch = () => { counts.network++; throw Error('IMPORT_NETWORK_BLOCKED'); };
      const guardedFetch = globalThis.fetch;
      const sentinel = '__contactE2eAuditLaunch';
      const priorSentinel = globalThis[sentinel];
      globalThis[sentinel] = () => { counts.launch++; throw Error('IMPORT_LAUNCH_BLOCKED'); };
      syncBuiltinESMExports();
      const hooks = registerHooks({
        resolve(specifier, context, next) {
          if (specifier === 'playwright' || (process.env.PLAYWRIGHT_MODULE
            && specifier === pathToFileURL(path.resolve(process.env.PLAYWRIGHT_MODULE)).href)) {
            return { url: 'audit:playwright', shortCircuit: true };
          }
          return next(specifier, context);
        },
        load(url, context, next) {
          if (url === 'audit:playwright') return { format: 'module', shortCircuit: true,
            source: `export const chromium={launch:()=>globalThis.${sentinel}()};` };
          return next(url, context);
        },
      });
      try {
        const one = await import('./browser.mjs?import-audit=one');
        assert.equal(await import('./browser.mjs?import-audit=one'), one);
        await import('./browser.mjs?import-audit=two');
        assert.equal(typeof one.runBrowserChecks, 'function');
        assert.deepEqual(counts, { launch: 0, network: 0, write: 0, process: 0 });
        assert.equal(JSON.stringify(process.env), beforeEnv); assert.equal(globalThis.fetch, guardedFetch);
        events.forEach((event, i) => assert.deepEqual(process.listeners(event), beforeListeners[i]));
      } finally {
        hooks.deregister();
        for (const [object, key, value] of restore) object[key] = value;
        globalThis.fetch = beforeFetch;
        if (priorSentinel === undefined) delete globalThis[sentinel]; else globalThis[sentinel] = priorSentinel;
        syncBuiltinESMExports();
      }
    });
    await t.test('explicit execution launches once and closes once after a scenario exception', async () => {
      const { runBrowserChecks } = await import('./browser.mjs');
      let launched = 0, closed = 0;
      await assert.rejects(() => runBrowserChecks({ loadChromium: async () => ({ async launch(options) {
        launched++; assert.equal(options.handleSIGINT, false);
        return { async newContext() { throw Error('SYNTHETIC_SCENARIO_FAILURE'); }, async close() { closed++; } };
      } }) }), /SYNTHETIC_SCENARIO_FAILURE/);
      assert.equal(launched, 1); assert.equal(closed, 1);
    });
    await t.test('aborted before launch starts no process', async () => {
      const { runBrowserChecks } = await import('./browser.mjs');
      const controller = new AbortController(); controller.abort(); let loaded = 0;
      await assert.rejects(() => runBrowserChecks({ signal: controller.signal, loadChromium: async () => { loaded++; } }));
      assert.equal(loaded, 0);
    });
    await t.test('abort during a scenario releases the browser exactly once', async () => {
      const { runBrowserChecks } = await import('./browser.mjs');
      const controller = new AbortController(); let closed = 0, started;
      const ready = new Promise(resolve => { started = resolve; }); let rejectContext;
      const pending = runBrowserChecks({ signal: controller.signal, loadChromium: async () => ({ async launch() {
        return { newContext() { started(); return new Promise((_, reject) => { rejectContext = reject; }); },
          async close() { closed++; rejectContext(Error('SYNTHETIC_ABORT')); } };
      } }) });
      await ready; controller.abort(); await assert.rejects(() => pending, /SYNTHETIC_ABORT/); assert.equal(closed, 1);
    });
    await t.test('abort while launch is pending closes the acquired browser before any scenario', async () => {
      const { runBrowserChecks } = await import('./browser.mjs');
      const controller = new AbortController(); let closed = 0, contexts = 0;
      await assert.rejects(() => runBrowserChecks({ signal: controller.signal, loadChromium: async () => ({ async launch() {
        controller.abort(); return { async close() { closed++; }, async newContext() { contexts++; } };
      } }) }));
      assert.equal(closed, 1); assert.equal(contexts, 0);
    });
    await t.test('CLI SIGINT closes the mock browser, removes listeners and exits 130', async () => {
      const browserURL = pathToFileURL(path.join(ROOT, 'scripts/contact-e2e/browser.mjs')).href;
      const fake = `export const chromium={async launch(){let reject;return {
        newContext(){process.stdout.write('READY\\n');return new Promise((_,r)=>{reject=r;});},
        async close(){process.stdout.write('CLOSED\\n');reject(Error('SYNTHETIC_ABORT'));}
      };}};`;
      const source = `import {registerHooks} from 'node:module';
        const h=registerHooks({resolve(s,c,n){return s==='playwright'?{url:'audit:pw',shortCircuit:true}:n(s,c);},
        load(u,c,n){return u==='audit:pw'?{format:'module',shortCircuit:true,source:${JSON.stringify(fake)}}:n(u,c);}});
        const {runBrowserCli}=await import(${JSON.stringify(browserURL)});
        const events=['SIGINT','SIGTERM','SIGHUP'], before=events.map(x=>process.listenerCount(x));
        const keepAlive=setInterval(()=>{},1000); // A real browser owns open pipes; the mock must also remain alive.
        try{await runBrowserCli();}catch{}finally{clearInterval(keepAlive);h.deregister();
          if(events.every((x,i)=>process.listenerCount(x)===before[i]))process.stdout.write('RESTORED\\n');}
      `;
      await new Promise((resolve, reject) => {
        const p = spawn(process.execPath, ['--input-type=module', '-'], {
          env: { PATH: process.env.PATH, TMPDIR: os.tmpdir() }, stdio: ['pipe', 'pipe', 'pipe'],
        });
        let stdout = '', interrupted = false;
        const timer = setTimeout(() => { p.kill('SIGKILL'); reject(Error('MOCK_CHILD_TIMEOUT')); }, 10000);
        p.on('error', reject);
        p.stdout.on('data', b => {
          stdout += b;
          if (!interrupted && stdout.includes('READY\n')) { interrupted = true; p.kill('SIGINT'); }
        });
        p.stderr.resume();
        p.on('exit', code => {
          clearTimeout(timer);
          try { assert.equal(code, 130); assert.equal(stdout.split('CLOSED\n').length - 1, 1); assert(stdout.includes('RESTORED\n')); resolve(); }
          catch (error) { reject(error); }
        });
        p.stdin.end(source);
      });
    });
  });
}
