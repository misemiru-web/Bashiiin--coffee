import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {spawn} from 'node:child_process';
import childProcess from 'node:child_process';
import {registerHooks, syncBuiltinESMExports} from 'node:module';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import { MockAgent, getGlobalDispatcher, setGlobalDispatcher, Response } from 'undici';
import { build as bundle } from 'esbuild';
import { ROOT, PAGES, sourceInventory, verifyOutput } from '../build-static.mjs';
import { readConfig, validateConfig, requireNegativeReady, inventory, mockInventory } from './build.mjs';
import { NAME, HOST, ORIGIN, FROM, TO } from './policy.mjs';

// Import is passive. Fixture reads and test registration require an explicit invocation.
export function registerTests() {
test('runtime module imports register no tests and start no resources', async () => {
  const target = pathToFileURL(fileURLToPath(import.meta.url)).href;
  const source = `import assert from 'node:assert/strict';
    import fs from 'node:fs'; import cp from 'node:child_process';
    import net from 'node:net'; import http from 'node:http'; import https from 'node:https';
    import {registerHooks,syncBuiltinESMExports} from 'node:module';
    const counts={tests:0,workerd:0,network:0,files:0,processes:0};
    globalThis.__negativeImportCounts=counts;
    const patches=[];
    function block(object,key,type){patches.push([object,key,object[key]]);
      object[key]=()=>{counts[type]++;throw Error('IMPORT_SIDE_EFFECT_BLOCKED');};}
    for(const key of ['spawn','spawnSync','exec','execSync','execFile','execFileSync','fork'])block(cp,key,'processes');
    for(const key of ['writeFileSync','appendFileSync','mkdirSync','rmSync','unlinkSync','renameSync',
      'writeFile','appendFile','mkdir','rm','unlink','rename'])block(fs,key,'files');
    for(const key of ['writeFile','appendFile','mkdir','rm','unlink','rename'])block(fs.promises,key,'files');
    for(const object of [http,https])for(const key of ['request','get'])block(object,key,'network');
    for(const key of ['connect','createConnection'])block(net,key,'network');
    block(net.Socket.prototype,'connect','network');
    const originalFetch=globalThis.fetch;
    globalThis.fetch=()=>{counts.network++;throw Error('IMPORT_NETWORK_BLOCKED');};
    const guardedFetch=globalThis.fetch, beforeEnv=JSON.stringify(process.env);
    syncBuiltinESMExports();
    const hook=registerHooks({resolve(s,c,n){
      return s==='node:test'||s==='miniflare'?{url:'audit:'+s,shortCircuit:true}:n(s,c);
    },load(u,c,n){
      if(u==='audit:node:test')return {format:'module',shortCircuit:true,
        source:'export default function(){globalThis.__negativeImportCounts.tests++;}'};
      if(u==='audit:miniflare')return {format:'module',shortCircuit:true,
        source:'export class Miniflare{constructor(){globalThis.__negativeImportCounts.workerd++;throw Error("IMPORT_WORKER_BLOCKED");}} export const convertV4MiniflareOptions=x=>x;'};
      return n(u,c);
    }});
    try{
      const first=await import(${JSON.stringify(target)}+'?passive=first');
      assert.equal(await import(${JSON.stringify(target)}+'?passive=first'),first);
      await import(${JSON.stringify(target)}+'?passive=fresh');
      assert.equal(typeof first.registerTests,'function');
      assert.deepEqual(counts,{tests:0,workerd:0,network:0,files:0,processes:0});
      assert.equal(JSON.stringify(process.env),beforeEnv);assert.equal(globalThis.fetch,guardedFetch);
      process.stdout.write('PASSIVE_IMPORT_CONFIRMED\\n');
    }finally{hook.deregister();for(const [o,k,v]of patches)o[k]=v;
      globalThis.fetch=originalFetch;delete globalThis.__negativeImportCounts;syncBuiltinESMExports();}
  `;
  const result = await childProcessRun(source);
  assert.equal(result.code, 0, result.stderr);
  assert.equal(result.stdout.trim(), 'PASSIVE_IMPORT_CONFIRMED');
});

test('explicit registration reports failures with nonzero exit and restores transport', async () => {
  const target = pathToFileURL(fileURLToPath(import.meta.url)).href;
  const source = `import test from 'node:test';import assert from 'node:assert/strict';
    import {registerHooks} from 'node:module';import {getGlobalDispatcher} from 'undici';
    const original=getGlobalDispatcher();let registered=false;
    globalThis.__negativeFailureTest=(...args)=>{if(!registered&&args[0].startsWith('negative-only CONTACT:')){registered=true;return test(...args);}};
    const hook=registerHooks({resolve(s,c,n){return s==='node:test'||s==='miniflare'?{url:'failure:'+s,shortCircuit:true}:n(s,c);},
      load(u,c,n){
        if(u==='failure:node:test')return {format:'module',shortCircuit:true,source:'export default (...args)=>globalThis.__negativeFailureTest(...args);'};
        if(u==='failure:miniflare')return {format:'module',shortCircuit:true,source:'export class Miniflare{constructor(){throw Error("INJECTED_WORKER_START_FAILURE");}} export const convertV4MiniflareOptions=x=>x;'};
        return n(u,c);
      }});
    const runtime=await import(${JSON.stringify(target)}+'?failure=fixture');runtime.registerTests();
    process.on('beforeExit',()=>{assert.equal(getGlobalDispatcher(),original);process.stdout.write('TRANSPORT_RESTORED\\n');});
  `;
  const result = await childProcessRun(source);
  assert.notEqual(result.code, 0);
  assert.match(result.stdout, /INJECTED_WORKER_START_FAILURE/);
  assert.match(result.stdout, /TRANSPORT_RESTORED/);
});

function childProcessRun(source) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['--input-type=module', '-'], {
      cwd: ROOT, env: { PATH: process.env.PATH, TMPDIR: os.tmpdir() }, stdio: ['pipe', 'pipe', 'pipe'],
    });
    let stdout = '', stderr = '';
    const timer = setTimeout(() => { child.kill('SIGKILL'); reject(Error('IMPORT_AUDIT_TIMEOUT')); }, 20000);
    child.on('error', error => { clearTimeout(timer); reject(error); });
    child.stdout.on('data', data => { stdout += data; });
    child.stderr.on('data', data => { stderr += data; });
    child.on('close', code => { clearTimeout(timer); resolve({ code, stdout, stderr }); });
    child.stdin.end(source);
  });
}
const productionFiles = ['scripts/contact-negative/worker.mjs', 'scripts/contact-negative/policy.mjs',
  'worker/contact/api.mjs', 'worker/contact/http.mjs', 'worker/contact/validation.mjs', 'worker/contact/turnstile.mjs', 'worker/contact/mail.mjs'];
const wrapper = `
import entry from './scripts/contact-negative/worker.mjs';
export default { async fetch(request, bindings) {
  const {FIXTURE: f, ...env} = bindings;
  env.CONTACT_RATE_LIMITER = {async limit(value) {
    const response = await fetch('https://rate.fixture.test/', {method:'POST',body:JSON.stringify(value)});
    if(!response.ok)throw Error('MOCK_RATE_FAILURE');return response.json();
  }};
  if(f.omit)delete env[f.omit];
  if(f.inject)env[f.inject]={send(){return fetch('https://forbidden-mail.invalid/');},
    idFromName(){return fetch('https://forbidden-do.invalid/');},fetch(){return fetch('https://forbidden-service.invalid/');}};
  return entry.fetch(request,env);
}};`;
const modules = [{ type: 'ESModule', path: path.join(ROOT, '__negative_fixture__.mjs'), contents: wrapper },
  ...productionFiles.map(f => ({ type: 'ESModule', path: path.join(ROOT, f), contents: fs.readFileSync(path.join(ROOT, f), 'utf8') }))];
const payload = (token = 'synthetic-negative-token') => ({ name: 'Synthetic visitor', email: 'visitor@fixture.test', message: 'Synthetic test only', turnstileToken: token });
async function scenario(fixture, run) {
  const counts = { rate: 0, verify: 0, forbidden: 0 }, used = new Set();
  const params = { E2E_MODE: 'negative', CONTACT_API_ENABLED: 'true', EMAIL_SENDING_ENABLED: 'true',
    CONTACT_FROM: FROM, CONTACT_TO: TO, CONTACT_ORIGIN: ORIGIN, TURNSTILE_HOSTNAME: HOST,
    TURNSTILE_SECRET_KEY: 'synthetic-negative-secret', ...fixture.vars, FIXTURE: fixture };
  const outboundService = async request => {
    // No forwarding, DNS, actual bindings or account data. Unrecognized destinations are denied.
    if (request.method === 'POST' && request.url === 'https://rate.fixture.test/') {
      counts.rate++; assert.deepEqual(JSON.parse(await request.text()), { key: 'contact:submission' });
      if (fixture.rateFailure) return new Response('', { status: 503 });
      return Response.json(fixture.rateMalformed ? {} : { success: !fixture.rateDenied });
    }
    if (request.method === 'POST' && request.url === 'https://challenges.cloudflare.com/turnstile/v0/siteverify') {
      counts.verify++;
      const data = new URLSearchParams(await request.text()); assert.equal(data.get('secret'), 'synthetic-negative-secret');
      const token = data.get('response');
      if (fixture.networkError) throw Error('MOCK_NETWORK');
      if (fixture.timeout) return new Promise(resolve => setTimeout(() => resolve(new Response('', { status: 503 })), 5200));
      if (fixture.redirect) return Response.json({ success: true, hostname: HOST, action: 'contact' }, { status: 302, headers: { Location: 'https://forbidden-redirect.invalid/' } });
      const refused = fixture.refused || token === 'invalid' || token === 'expired' || used.has(token);
      used.add(token);
      return Response.json({ success: !refused, hostname: fixture.badHostname ? 'other.test' : HOST, action: fixture.badAction ? 'other' : 'contact' });
    }
    counts.forbidden++; return new Response('DENIED', { status: 503 });
  };
  const mf = new Miniflare(convertV4MiniflareOptions({ name: 'local-contact-negative', modules, modulesRoot: ROOT,
    compatibilityDate: '2026-10-28', host: '127.0.0.1', port: 0, cf: false, telemetry: { enabled: false },
    bindings: params, outboundService }));
  const post = async (options = {}, body = payload()) => {
    const method = options.method || 'POST';
    const response = await mf.dispatchFetch(ORIGIN + (options.path || '/api/contact'), {
      method, headers: { Origin: ORIGIN, 'Content-Type': 'application/json', ...options.headers },
      ...(method === 'GET' || method === 'HEAD' ? {} : { body: typeof body === 'string' ? body : JSON.stringify(body) }),
    });
    const text = await response.text();
    assert(!text.includes('synthetic-negative-token') && !text.includes('synthetic-negative-secret'));
    const result = JSON.parse(text); assert.equal(result.ok, false); assert.equal('messageId' in result, false);
    return { status: response.status, ...result };
  };
  try { await run({ post, counts }); assert.equal(counts.forbidden, 0); }
  finally { await mf.dispose(); }
}

test('negative-only CONTACT: local workerd with deny-by-default egress and no mail/DO services', async t => {
  const previous = getGlobalDispatcher(), block = new MockAgent();
  block.disableNetConnect(); block.enableNetConnect(/^(?:127\.0\.0\.1|localhost|\[::1\])(?::\d+)?$/);
  setGlobalDispatcher(block);
  try {
    await t.test('Node external transport is denied', async () => { await assert.rejects(() => fetch('https://negative-egress-probe.invalid/')); });
    await t.test('safe flags refuse before body parsing, rate or Siteverify', () => scenario({ vars: {
      E2E_MODE: 'safe', CONTACT_API_ENABLED: 'false', EMAIL_SENDING_ENABLED: 'false',
    } }, async r => { assert.equal((await r.post({}, '{')).status, 503); assert.equal(r.counts.rate, 0); assert.equal(r.counts.verify, 0); }));
    await t.test('synthetic valid authentication ends in mail rejection, never success', () => scenario({}, async r => {
      const result = await r.post(); assert.equal(result.status, 503); assert.equal(result.code, 'MAIL_UNAVAILABLE');
      assert.equal(r.counts.rate, 1); assert.equal(r.counts.verify, 1);
    }));
    for (const n of [2, 10]) await t.test(`${n} concurrent POSTs all reject with zero external mail/DO calls`, () => scenario({}, async r => {
      const results = await Promise.all(Array.from({ length: n }, (_, i) => r.post({}, payload('synthetic-' + i))));
      assert(results.every(x => x.status === 503 && x.code === 'MAIL_UNAVAILABLE'));
      assert.equal(r.counts.verify, n); assert.equal(r.counts.forbidden, 0);
    }));
    for (const inject of ['EMAIL', 'RAW_EMAIL', 'DELIVERY_GUARD', 'SERVICE', 'E2E_LIVE_APPROVAL']) {
      await t.test(`environment capability injection ${inject} fails before downstream calls`, () => scenario({ inject }, async r => {
        assert.equal((await r.post()).status, 503); assert.equal(r.counts.rate, 0); assert.equal(r.counts.verify, 0);
      }));
    }
    for (const omit of ['TURNSTILE_SECRET_KEY', 'CONTACT_RATE_LIMITER', 'CONTACT_FROM', 'CONTACT_TO',
      'CONTACT_ORIGIN', 'TURNSTILE_HOSTNAME', 'CONTACT_API_ENABLED', 'EMAIL_SENDING_ENABLED']) {
      await t.test(`missing ${omit} fails closed`, () => scenario({ omit }, async r => {
        assert.equal((await r.post()).status, 503); assert.equal(r.counts.rate, 0); assert.equal(r.counts.verify, 0);
      }));
    }
    await t.test('URL/header modes cannot enable safe configuration', () => scenario({ vars: { E2E_MODE: 'safe' } }, async r => {
      assert.equal((await r.post({ path: '/api/contact?mode=negative&EMAIL_SENDING_ENABLED=true', headers: { 'X-E2E-Mode': 'negative' } })).status, 503);
      assert.equal(r.counts.verify, 0);
    }));
    const cases = [
      ['Origin mismatch', {}, { headers: { Origin: 'https://other.test' } }, payload(), 403, 'ORIGIN_REJECTED', 0],
      ['bad Content-Type', {}, { headers: { 'Content-Type': 'text/plain' } }, payload(), 415, 'UNSUPPORTED_MEDIA_TYPE', 0],
      ['broken JSON', {}, {}, '{', 400, 'INVALID_JSON', 0],
      ['invalid input', {}, {}, { ...payload(), name: ' ' }, 400, 'VALIDATION_FAILED', 0],
      ['client recipient injection', {}, {}, { ...payload(), to: 'other@fixture.test' }, 400, 'INVALID_STRUCTURE', 0],
      ['client mode injection', {}, {}, { ...payload(), mode: 'negative' }, 400, 'INVALID_STRUCTURE', 0],
      ['missing token', {}, {}, { ...payload(), turnstileToken: '' }, 400, 'VALIDATION_FAILED', 0],
      ['invalid token', {}, {}, payload('invalid'), 400, 'VERIFICATION_FAILED', 1],
      ['expired token (mock)', {}, {}, payload('expired'), 400, 'VERIFICATION_FAILED', 1],
      ['hostname mismatch', { badHostname: true }, {}, payload(), 400, 'VERIFICATION_FAILED', 1],
      ['action mismatch', { badAction: true }, {}, payload(), 400, 'VERIFICATION_FAILED', 1],
      ['verification network error', { networkError: true }, {}, payload(), 503, 'VERIFICATION_UNAVAILABLE', 1],
      ['verification timeout', { timeout: true }, {}, payload(), 503, 'VERIFICATION_UNAVAILABLE', 1],
      ['redirect not followed', { redirect: true }, {}, payload(), 503, 'VERIFICATION_UNAVAILABLE', 1],
      ['rate denied', { rateDenied: true }, {}, payload(), 429, 'RATE_LIMITED', 0],
      ['rate failure', { rateFailure: true }, {}, payload(), 503, 'SERVICE_UNAVAILABLE', 0],
      ['rate malformed', { rateMalformed: true }, {}, payload(), 503, 'SERVICE_UNAVAILABLE', 0],
      ['GET', {}, { method: 'GET' }, payload(), 405, 'METHOD_NOT_ALLOWED', 0],
      ['unknown API', {}, { path: '/api/reset' }, payload(), 404, 'NOT_FOUND', 0],
      ['body cap', {}, {}, 'x'.repeat(49153), 413, 'PAYLOAD_TOO_LARGE', 0],
      ['unsupported mode', { vars: { E2E_MODE: 'other' } }, {}, payload(), 503, 'SERVICE_UNAVAILABLE', 0],
      ['false is not true', { vars: { EMAIL_SENDING_ENABLED: 'false' } }, {}, payload(), 503, 'SERVICE_UNAVAILABLE', 0],
    ];
    for (const [name, f, options, body, status, code, verify] of cases) await t.test(name, () => scenario(f, async r => {
      const result = await r.post(options, body); assert.equal(result.status, status); assert.equal(result.code, code); assert.equal(r.counts.verify, verify);
    }));
    await t.test('single-use token rejected after a successful mock Siteverify', () => scenario({}, async r => {
      assert.equal((await r.post()).code, 'MAIL_UNAVAILABLE'); assert.equal((await r.post()).code, 'VERIFICATION_FAILED');
    }));
  } finally { setGlobalDispatcher(previous); await block.close(); }
});

test('config/build/bundle capability isolation', async t => {
  await t.test('safe and incomplete negative configs validate structurally; negative readiness is blocked', () => {
    validateConfig(readConfig('safe'), 'safe'); validateConfig(readConfig('negative'), 'negative');
    assert.throws(() => requireNegativeReady(readConfig('negative')));
    assert.throws(() => inventory('negative')); assert.throws(() => inventory('negative', { NEGATIVE_TURNSTILE_SITE_KEY: '1x00000000000000000000AA' }));
  });
  for (const setting of ['send_email', 'durable_objects', 'migrations', 'services', 'unsafe', 'routes', 'triggers']) {
    await t.test(`config rejects added ${setting}`, () => { const c = readConfig('negative'); c[setting] = []; assert.throws(() => validateConfig(c, 'negative')); });
  }
  for (const [label, mutate] of [
    ['public workers.dev', c => { c.workers_dev = true; }],
    ['preview URL', c => { c.preview_urls = true; }],
    ['remote binding', c => { c.remote = true; }],
    ['plaintext Secret', c => { c.vars.TURNSTILE_SECRET_KEY = 'synthetic-must-be-rejected'; }],
    ['wrong Origin', c => { c.vars.CONTACT_ORIGIN = 'https://other.test'; }],
    ['wrong hostname', c => { c.vars.TURNSTILE_HOSTNAME = 'other.test'; }],
    ['boolean flag', c => { c.vars.EMAIL_SENDING_ENABLED = true; }],
    ['bypassed build gate', c => { delete c.build; }],
    ['extra Secret', c => { c.secrets.required.push('UNAPPROVED'); }],
    ['duplicate rate binding', c => { c.ratelimits = [1, 2]; }],
  ]) await t.test(`configuration rejects ${label}`, () => {
    const c = readConfig('negative'); mutate(c); assert.throws(() => validateConfig(c, 'negative'));
  });
  for (const rate of [
    { name: 'OTHER', namespace_id: '99999', simple: { limit: 5, period: 60 } },
    { name: 'CONTACT_RATE_LIMITER', namespace_id: '31001', simple: { limit: 5, period: 60 } },
    { name: 'CONTACT_RATE_LIMITER', namespace_id: 99999, simple: { limit: 5, period: 60 } },
    { name: 'CONTACT_RATE_LIMITER', namespace_id: '99999', simple: { limit: 50, period: 60 } },
    { name: 'CONTACT_RATE_LIMITER', namespace_id: '99999', simple: { limit: 5, period: 10 } },
    { name: 'CONTACT_RATE_LIMITER', namespace_id: '99999', simple: { limit: 5, period: 60 }, remote: true },
  ]) await t.test('invalid rate configuration rejected (isolated synthetic IDs only)', () => {
    const c = readConfig('negative'); c.ratelimits = [rate]; assert.throws(() => validateConfig(c, 'negative'));
  });
  await t.test('output stays39; only CONTACT attributes differ in in-memory mock HTML', () => {
    const source = sourceInventory(), safe = inventory(), mock = mockInventory(); assert.equal(safe.files.length, 39);
    verifyOutput(); assert.deepEqual(source.files.filter(f => !source.buffers.get(f).equals(mock.buffers.get(f))), ['contact/index.html']);
    for (const f of safe.files) assert(source.buffers.get(f).equals(safe.buffers.get(f)));
    for (const f of PAGES) assert(mock.buffers.get(f).toString().includes('noindex, nofollow, noarchive'));
    assert.match(safe.buffers.get('contact/index.html').toString(), /id="contact-submit"[^>]*disabled/);
    assert.equal(fs.existsSync(path.join(ROOT, 'scripts/contact-negative/.generated/negative')), false);
  });
  await t.test('generated Worker bundle imports only the approved negative/common modules', async () => {
    const result = await bundle({ entryPoints: [path.join(ROOT, 'scripts/contact-negative/worker.mjs')], bundle: true,
      format: 'esm', platform: 'browser', write: false, metafile: true });
    assert.deepEqual(Object.keys(result.metafile.inputs).map(f => path.relative(ROOT, path.resolve(f))).sort(), [...productionFiles].sort());
    const text = result.outputFiles[0].text;
    for (const marker of ['RAW_EMAIL', 'DeliveryGuard', 'sendOnce', 'idFromName', 'cloudflare:email', 'cloudflare:workers', 'APPROVED_ONE_ATTEMPT']) assert(!text.includes(marker));
    assert(text.includes('NEGATIVE_MAIL_DISABLED')); assert(!text.includes('messageId:'));
    assert.equal(readConfig('safe').name, NAME);
  });
});

  test('negative browser module import and lifecycle safety; no real Chrome or network', async t => {
    await t.test('first, repeated and fresh module imports have zero launch/network/write/process side effects', async () => {
      const beforeEnv = JSON.stringify(process.env), beforeFetch = globalThis.fetch;
      const events = ['SIGINT', 'SIGTERM', 'SIGHUP'];
      const beforeListeners = events.map(event => process.listeners(event));
      const counts = { launch: 0, library: 0, network: 0, write: 0, process: 0 };
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
          if (url === 'audit:playwright') {
            counts.library++;
            return { format: 'module', shortCircuit: true,
              source: `export const chromium={launch:()=>globalThis.${sentinel}()};` };
          }
          return next(url, context);
        },
      });
      try {
        await import('./worker.mjs?import-audit=one');
        await import('./policy.mjs?import-audit=one');
        await import('./build.mjs?import-audit=one');
        const one = await import('./browser.mjs?import-audit=one');
        assert.equal(await import('./browser.mjs?import-audit=one'), one);
        await import('./browser.mjs?import-audit=two');
        assert.equal(typeof one.runBrowserChecks, 'function');
        assert.deepEqual(counts, { launch: 0, library: 0, network: 0, write: 0, process: 0 });
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
      const browserURL = pathToFileURL(path.join(ROOT, 'scripts/contact-negative/browser.mjs')).href;
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
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  registerTests();
}
