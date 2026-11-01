// Explicit local browser integration runner, never imported by a Worker/build.
// No real Turnstile, email, credentials, DNS or Cloudflare configuration is used.
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { sourceInventory } from './build-static.mjs';
import { createContactHandler } from '../worker/contact/api.mjs';

const TOKEN = 'synthetic-local-browser-token';
const SECRET = 'synthetic-local-browser-secret';
const INPUT = Object.freeze({ name: 'Synthetic local QA', email: 'visitor@local.fixture.test', message: 'Synthetic browser inquiry' });
const KEY = '1x00000000000000000000AA'; // Public test Site Key; SDK is replaced locally.
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
const scenarios = [
  { name: 'normal', status: 200, stages: ['rate', 'siteverify', 'mail'] },
  { name: 'input_rejected', invalid: true, stages: [] },
  { name: 'origin_rejected', badOrigin: true, status: 403, stages: [] },
  { name: 'turnstile_rejected', verifyDenied: true, status: 400, stages: ['rate', 'siteverify'] },
  { name: 'hostname_rejected', badHostname: true, status: 400, stages: ['rate', 'siteverify'] },
  { name: 'action_rejected', badAction: true, status: 400, stages: ['rate', 'siteverify'] },
  { name: 'siteverify_unavailable', verifyError: true, status: 503, stages: ['rate', 'siteverify'] },
  { name: 'rate_rejected', rateDenied: true, status: 429, stages: ['rate'] },
  { name: 'rate_unavailable', rateError: true, status: 503, stages: ['rate'] },
  { name: 'mail_rejected', mailError: true, status: 503, stages: ['rate', 'siteverify', 'mail'] },
  { name: 'email_missing', missing: 'EMAIL', status: 503, stages: [] },
  { name: 'secret_missing', missing: 'TURNSTILE_SECRET_KEY', status: 503, stages: [] },
  { name: 'destination_missing', missing: 'CONTACT_TO', status: 503, stages: [] },
  { name: 'double_operation', holdMail: true, status: 200, stages: ['rate', 'siteverify', 'mail'] },
  { name: 'client_timeout', holdResponse: true, status: 200, stages: ['rate', 'siteverify', 'mail'] },
  { name: 'form_disabled', disabledForm: true, stages: [] },
  { name: 'server_disabled', disabledServer: true, status: 503, stages: [] },
  { name: 'sdk_failure', sdkError: true, stages: [] },
];

export async function runLocalContactBrowserChecks({ chromium, signal } = {}) {
  assert(chromium, 'LOCAL_BROWSER_REQUIRED'); signal?.throwIfAborted();
  const inventory = sourceInventory(); // Read-only; requires current published source to stay disabled/noindex.
  const candidate = JSON.parse(fs.readFileSync(new URL('./contact-production-candidate.json', import.meta.url), 'utf8'));
  assert.equal(candidate.vars.CONTACT_API_ENABLED, 'false');
  assert.equal(candidate.vars.EMAIL_SENDING_ENABLED, 'false');
  const baseHtml = inventory.buffers.get('contact/index.html').toString();
  const baseJS = inventory.buffers.get('script.js').toString();
  const remoteSDK = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
  assert.equal(baseJS.split(remoteSDK).length, 2, 'SDK_REPLACEMENT_MUST_BE_EXACT');
  // These two copies exist only in memory, outside every production build path.
  const testHtml = baseHtml.replace('data-endpoint-ready="false"', 'data-endpoint-ready="true"')
    .replace('data-sitekey=""', `data-sitekey="${KEY}"`);
  const testJS = baseJS.replace(remoteSDK, '/__local-qa/turnstile.js');
  const sdk = "window.turnstile={render:(el,options)=>{window.__localCallbacks=options;window.__localAction=options.action;window.__localSiteKey=options.sitekey;el.textContent='ローカル合成認証（実通信なし）';return 'synthetic-widget'},reset:()=>{}};";
  let localOrigin, current, browser, context;
  const sockets = new Set();
  const counters = { loopbackPosts: 0, forbiddenRequests: 0, socketsBlocked: 0, leaks: 0, pageErrors: 0 };
  const checks = [];
  const server = http.createServer(async (req, res) => {
    try {
      if (req.socket.remoteAddress !== '127.0.0.1' || req.headers.host !== new URL(localOrigin).host) {
        res.writeHead(403); return res.end();
      }
      const url = new URL(req.url, localOrigin);
      if (req.method === 'POST' && url.pathname === '/api/contact') {
        const state = current;
        if (!state) { res.writeHead(503); return res.end(); }
        state.posts++; counters.loopbackPosts++;
        let raw = ''; for await (const chunk of req) { raw += chunk; if (Buffer.byteLength(raw) > 8192) throw Error('SYNTHETIC_BODY_LIMIT'); }
        // Only the runner's exact synthetic payload is accepted by this adapter.
        const data = JSON.parse(raw);
        if (Object.keys(data).sort().join() !== 'email,message,name,turnstileToken'
          || Object.keys(INPUT).some(k => data[k] !== INPUT[k]) || data.turnstileToken !== TOKEN) {
          res.writeHead(400, { 'Content-Type': 'application/json' }); return res.end('{"ok":false,"code":"SYNTHETIC_INPUT_ONLY"}');
        }
        const cfg = state.scenario;
        const env = {
          CONTACT_API_ENABLED: cfg.disabledServer ? 'false' : 'true', EMAIL_SENDING_ENABLED: 'true',
          CONTACT_ORIGIN: candidate.vars.CONTACT_ORIGIN, TURNSTILE_HOSTNAME: candidate.vars.TURNSTILE_HOSTNAME,
          CONTACT_FROM: candidate.vars.CONTACT_FROM,
          // Never use the candidate's real address in this local test environment.
          CONTACT_TO: 'recipient@local.fixture.test', TURNSTILE_SECRET_KEY: SECRET,
          CONTACT_RATE_LIMITER: { async limit(value) {
            state.stages.push('rate'); assert.equal(value.key, 'contact:submission');
            if (cfg.rateError) throw Error('SYNTHETIC_RATE_ERROR');
            return { success: !cfg.rateDenied };
          } },
          EMAIL: { async send(message) {
            state.stages.push('mail');
            assert.equal(message.from === env.CONTACT_FROM && message.to === 'recipient@local.fixture.test'
              && message.replyTo === INPUT.email, true, 'SYNTHETIC_ADDRESS_CONTRACT');
            if (cfg.mailError) throw Error('SYNTHETIC_MAIL_REJECTED');
            if (cfg.holdMail) { state.entered.resolve(); await state.release.promise; }
            return { messageId: 'synthetic-local-accepted' };
          } },
        };
        if (cfg.missing) delete env[cfg.missing];
        const handler = createContactHandler({ fetchImpl: async (_url, init) => {
          state.stages.push('siteverify'); assert.equal(init.body.get('secret') === SECRET, true);
          if (cfg.verifyError) throw Error('SYNTHETIC_VERIFY_UNAVAILABLE');
          return Response.json({ success: !cfg.verifyDenied,
            hostname: cfg.badHostname ? 'unrelated.fixture.test' : env.TURNSTILE_HOSTNAME,
            action: cfg.badAction ? 'other' : 'contact' });
        } });
        // Test-only HTTP loopback -> logical HTTPS adapter. This is not TLS validation.
        // Rewrite ONLY the exact real loopback Origin. Mismatches reach the production Origin guard unchanged.
        const rawOrigin = req.headers.origin;
        // Negative-Origin case is fault injection in this adapter, not a browser ability to forge Origin.
        const origin = cfg.badOrigin ? 'https://unrelated.fixture.test'
          : rawOrigin === localOrigin ? env.CONTACT_ORIGIN : rawOrigin || 'null';
        const response = await handler(new Request(env.CONTACT_ORIGIN + '/api/contact', {
          method: 'POST', headers: { 'Content-Type': req.headers['content-type'] || '', Origin: origin,
            'Sec-Fetch-Site': req.headers['sec-fetch-site'] || 'same-origin' }, body: raw,
        }), env);
        state.status = response.status;
        const body = await response.text();
        assert.equal([INPUT.name, INPUT.email, INPUT.message, TOKEN, SECRET].some(v => body.includes(v)), false, 'PUBLIC_REPLY_MUST_BE_PRIVATE');
        if (cfg.holdResponse) { state.entered.resolve(); await state.release.promise; }
        if (!res.destroyed) { res.writeHead(response.status, Object.fromEntries(response.headers)); res.end(body); }
        return;
      }
      if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405); return res.end(); }
      let content, contentType;
      if (url.pathname === '/__local-qa/turnstile.js') { content = sdk; contentType = 'text/javascript'; }
      else {
        const file = url.pathname.endsWith('/') ? url.pathname.slice(1) + 'index.html' : url.pathname.slice(1);
        content = inventory.buffers.get(file);
        if (file === 'contact/index.html' && !current?.scenario.disabledForm) content = testHtml;
        if (file === 'script.js') content = testJS;
        contentType = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp' }[path.extname(file)];
      }
      if (content === undefined) { res.writeHead(404); return res.end(); }
      res.writeHead(200, { 'Content-Type': contentType || 'application/octet-stream', 'Cache-Control': 'no-store' });
      res.end(req.method === 'HEAD' ? undefined : content);
    } catch { if (!res.destroyed) { res.writeHead(500, { 'Content-Type': 'application/json' }); res.end('{"ok":false,"code":"LOCAL_FIXTURE_ERROR"}'); } }
  });
  server.on('connection', socket => { sockets.add(socket); socket.on('close', () => sockets.delete(socket)); });
  server.requestTimeout = 3000; server.headersTimeout = 3000;
  const abort = () => { current?.release.resolve(); void browser?.close().catch(() => {}); };
  signal?.addEventListener('abort', abort, { once: true });
  try {
    await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
    localOrigin = `http://127.0.0.1:${server.address().port}`;
    browser = await chromium.launch({ channel: 'chrome', headless: true,
      proxy: { server: 'http://127.0.0.1:9', bypass: '127.0.0.1' },
      args: ['--disable-background-networking', '--disable-quic', '--disable-component-update', '--disable-sync'],
      handleSIGINT: false, handleSIGTERM: false, handleSIGHUP: false });
    for (const scenario of scenarios) {
      signal?.throwIfAborted();
      current = { scenario, posts: 0, stages: [], status: null, entered: deferred(), release: deferred() };
      const state = current;
      context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block', reducedMotion: 'reduce' });
      await context.routeWebSocket('**/*', socket => { counters.socketsBlocked++; socket.close(); });
      await context.route('**/*', route => {
        const request = route.request(), url = new URL(request.url());
        if (url.origin !== localOrigin || !(['GET', 'HEAD'].includes(request.method()) || (request.method() === 'POST' && url.pathname === '/api/contact'))) {
          counters.forbiddenRequests++; return route.abort();
        }
        return route.continue();
      });
      await context.addInitScript(() => {
        window.__localLeadCount = 0;
        window.addEventListener('bashiiin:analytics', e => { if (e.detail.name === 'generate_lead') window.__localLeadCount++; });
      });
      const page = await context.newPage(); page.setDefaultTimeout(5000);
      page.on('pageerror', () => { counters.pageErrors++; });
      page.on('console', message => { if ([INPUT.name, INPUT.email, INPUT.message, TOKEN, SECRET].some(v => message.text().includes(v))) counters.leaks++; });
      try {
        if (scenario.holdResponse) await page.clock.install();
        await page.goto(localOrigin + '/contact/', { waitUntil: 'load' });
        await page.locator('#contact-name').fill(INPUT.name);
        await page.locator('#contact-email').fill(scenario.invalid ? 'invalid-email' : INPUT.email);
        await page.locator('#contact-message').fill(INPUT.message);
        if (!scenario.disabledForm) {
          await page.waitForFunction(() => Boolean(window.__localCallbacks));
          assert.equal(await page.evaluate(() => window.__localAction), 'contact');
          assert.equal(await page.evaluate(() => window.__localSiteKey), KEY);
          await page.evaluate(({ token, error }) => error ? window.__localCallbacks['error-callback']() : window.__localCallbacks.callback(token), { token: TOKEN, error: scenario.sdkError });
        }
        if (scenario.sdkError || scenario.disabledForm) {
          assert.equal(await page.locator('#contact-submit').isDisabled(), true);
          await page.locator('#contact-form').evaluate(form => form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true })));
        } else {
          await page.locator('#contact-submit').click();
          if (scenario.holdMail || scenario.holdResponse) {
            let timer;
            try { await Promise.race([state.entered.promise, new Promise((_, reject) => { timer = setTimeout(() => reject(Error('LOCAL_BARRIER_TIMEOUT')), 4000); })]); }
            finally { clearTimeout(timer); }
            assert.equal(await page.evaluate(() => window.__localLeadCount), 0);
            if (scenario.holdMail) {
              assert.equal(await page.locator('#contact-submit').isDisabled(), true);
              await page.locator('#contact-form').evaluate(form => form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true })));
              assert.equal(state.posts, 1); state.release.resolve();
            } else await page.clock.fastForward(20001); // Real frontend 20s abort, virtual browser clock only.
          }
        }
        const expectedState = scenario.invalid || scenario.disabledForm || scenario.sdkError ? 'error'
          : scenario.holdResponse || scenario.status !== 200 ? 'failure' : 'success';
        await page.waitForFunction(expected => document.querySelector('#contact-form').dataset.state === expected, expectedState);
        assert.equal(await page.evaluate(() => window.__localLeadCount), expectedState === 'success' ? 1 : 0);
        assert.equal(state.posts, scenario.invalid || scenario.disabledForm || scenario.sdkError ? 0 : 1);
        assert.equal(state.status, scenario.status ?? null);
        assert.deepEqual(state.stages, scenario.stages);
        if (expectedState === 'failure') assert.equal(await page.locator('#contact-name').inputValue(), INPUT.name);
        checks.push({ name: scenario.name, passed: true, localPosts: state.posts, apiStatus: state.status, uiState: expectedState, syntheticMailCalls: state.stages.filter(s => s === 'mail').length });
      } catch (error) {
        checks.push({ name: scenario.name, passed: false, errorClass: error.name, localPosts: state.posts, apiStatus: state.status, stages: state.stages });
        throw Error('LOCAL_BROWSER_SCENARIO_FAILED');
      } finally { state.release.resolve(); await context.close(); context = null; }
    }
    assert.equal(counters.forbiddenRequests + counters.socketsBlocked + counters.leaks + counters.pageErrors, 0, 'LOCAL_ISOLATION_OR_PRIVACY_FAILURE');
    assert.equal(inventory.buffers.get('contact/index.html').toString(), baseHtml);
    assert.equal(inventory.buffers.get('script.js').toString(), baseJS);
    return { passed: checks.length, failed: 0, checks, counters, externalMailSends: 0,
      caveat: 'Loopback HTTP plus in-memory logical HTTPS adapter; real TLS, Turnstile, mail delivery and Cloudflare bindings are not verified.' };
  } catch {
    return { passed: checks.filter(c => c.passed).length, failed: Math.max(1, checks.filter(c => !c.passed).length), checks, counters, error: 'LOCAL_CONTACT_BROWSER_CHECK_FAILED' };
  } finally {
    signal?.removeEventListener('abort', abort); current?.release.resolve();
    await context?.close().catch(() => {}); await browser?.close().catch(() => {});
    for (const socket of sockets) socket.destroy();
    if (server.listening) await new Promise(resolve => server.close(resolve));
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const controller = new AbortController();
  const stop = () => controller.abort();
  process.once('SIGINT', stop); process.once('SIGTERM', stop);
  try {
    // Read only this non-secret module locator on explicit CLI execution; never enumerate process.env.
    const require = createRequire(import.meta.url);
    const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
    const report = await runLocalContactBrowserChecks({ chromium, signal: controller.signal });
    console.log(JSON.stringify(report)); if (report.failed) process.exitCode = 1;
  } catch { console.error('LOCAL_CONTACT_BROWSER_RUN_FAILED'); process.exitCode = 1; }
  finally { process.removeListener('SIGINT', stop); process.removeListener('SIGTERM', stop); }
}
