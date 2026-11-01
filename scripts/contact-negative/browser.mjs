// Synthetic browser fixtures only. Every request is fulfilled in memory or aborted.
// Use an already-installed Playwright via PLAYWRIGHT_MODULE; never install packages.
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { inventory } from './build.mjs';
import { previewInventory, PREVIEW_TEST_SITE_KEYS } from './preview.mjs';
import { candidateInventory } from './site-key-candidate.mjs';
import { HOST, ORIGIN } from './policy.mjs';
// Module loading is passive: Playwright and Chrome are resolved only by an explicit call.
export async function runBrowserChecks({ signal, loadChromium = async () => {
  const module = await import(process.env.PLAYWRIGHT_MODULE
    ? pathToFileURL(path.resolve(process.env.PLAYWRIGHT_MODULE)).href : 'playwright');
  return module.chromium;
} } = {}) {
  signal?.throwIfAborted();
  const chromium = await loadChromium();
  signal?.throwIfAborted();
  const browser = await chromium.launch({ channel: 'chrome', headless: true,
    proxy: { server: 'http://127.0.0.1:9' }, args: ['--proxy-bypass-list=<-loopback>'],
    handleSIGINT: false, handleSIGTERM: false, handleSIGHUP: false });
  let closing;
  const close = () => closing ??= Promise.resolve().then(() => browser.close());
  const onAbort = () => { void close().catch(() => {}); };
  signal?.addEventListener('abort', onAbort, { once: true });
  let checks = 0;
  try {
    signal?.throwIfAborted();
    for (const mode of ['safe', 'negative']) {
      const assets = mode === 'safe' ? inventory() : previewInventory({ siteKey: PREVIEW_TEST_SITE_KEYS.success, origin: ORIGIN });
      const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
      let posts = 0, widgets = 0, external = 0;
      const requests = new Set(), intercepted = new Set(); let sockets = 0;
      context.on('request', request => requests.add(request));
      await context.routeWebSocket('**/*', socket => { sockets++; socket.close(); });
      const errors = [];
      const sdk = `window.turnstile={ready:f=>f(),render:(el,options)=>{window.__callbacks=options;window.__renderAction=options.action;return 'synthetic-widget';},reset:()=>{}};`;
      await context.addInitScript(() => {
        window.__leads = 0;
        window.addEventListener('bashiiin:analytics', e => { if (e.detail.name === 'generate_lead') window.__leads++; });
      });
      await context.route('**/*', route => {
        const req = route.request(), u = new URL(req.url());
        intercepted.add(req);
        if (u.origin === ORIGIN && u.pathname === '/api/contact' && req.method() === 'POST') {
          posts++;
          return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ ok: false, code: 'MAIL_UNAVAILABLE' }) });
        }
        if (u.origin === 'https://challenges.cloudflare.com' && u.pathname === '/turnstile/v0/api.js') {
          widgets++; return route.fulfill({ contentType: 'application/javascript', body: sdk });
        }
        if (u.origin !== ORIGIN) { external++; return route.abort(); }
        const key = u.pathname === '/' ? 'index.html' : u.pathname.slice(1) + (u.pathname.endsWith('/') ? 'index.html' : '');
        const buffer = assets.buffers.get(key);
        if (!buffer) return route.fulfill({ status: 404, body: '' });
        const type = key.endsWith('.html') ? 'text/html' : key.endsWith('.css') ? 'text/css'
          : key.endsWith('.js') ? 'application/javascript' : key.endsWith('.webp') ? 'image/webp' : 'image/png';
        return route.fulfill({ status: 200, contentType: type, body: buffer });
      });
      const page = await context.newPage(); page.on('pageerror', e => errors.push(e.name));
      for (const url of ['/', '/about/', '/coffee/', '/contact/', '/access/']) {
        assert.equal((await page.goto(ORIGIN + url)).status(), 200);
        await page.evaluate(() => { for (const img of document.images) img.loading = 'eager'; });
        await page.waitForFunction(() => [...document.images].every(i => i.complete && i.naturalWidth > 0), { timeout: 10000 });
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
        assert.equal(await page.locator('meta[name="robots"]').getAttribute('content'), 'noindex, nofollow, noarchive');
        assert.equal(await page.evaluate(() => [...document.images].filter(i => !i.complete || i.naturalWidth === 0).length), 0);
        checks++;
      }
      await page.goto(ORIGIN + '/contact/');
      assert(await page.locator('#contact-submit').isDisabled());
      if (mode === 'safe') {
        assert.equal(widgets, 0); assert.equal(posts, 0); checks++;
      } else {
        await page.waitForFunction(() => Boolean(window.__callbacks));
        assert.equal(await page.evaluate(() => window.__renderAction), 'contact');
        for (const token of ['', null, 'x'.repeat(2049)]) {
          await page.evaluate(value => window.__callbacks.callback(value), token);
          assert(await page.locator('#contact-submit').isDisabled());
        }
        for (const field of [['name', 'Synthetic E2E'], ['email', 'visitor@fixture.test'], ['message', 'Synthetic test only']]) {
          await page.locator(`[name="${field[0]}"]`).fill(field[1]);
        }
        await page.evaluate(() => window.__callbacks.callback('synthetic-browser-token'));
        assert(!(await page.locator('#contact-submit').isDisabled()));
        await page.evaluate(() => window.__callbacks['expired-callback']());
        assert(await page.locator('#contact-submit').isDisabled());
        for (const callback of ['error-callback', 'timeout-callback']) {
          await page.evaluate(() => window.__callbacks.callback('synthetic-browser-token'));
          await page.evaluate(name => window.__callbacks[name](), callback);
          assert(await page.locator('#contact-submit').isDisabled());
        }
        await page.evaluate(() => window.__callbacks.callback('synthetic-browser-token'));
        await page.locator('#contact-submit').click();
        await page.waitForFunction(() => document.querySelector('#contact-form').dataset.state === 'failure');
        assert.equal(posts, 1); assert(await page.locator('#contact-submit').isDisabled()); checks++;
      }
      assert.equal(await page.evaluate(() => window.__leads), 0); assert.deepEqual(errors, []);
      assert.equal(sockets, 0); assert.equal(requests.size, intercepted.size);
      // External resources such as fonts are intentionally aborted; never continued to the network.
      console.log(`PASS ${mode}: synthetic browser only; 390px x 5 pages; external requests blocked=${external}`);
      await context.close();
    }

    const cases = [
      { name: 'localhost', origin: 'https://localhost', blocked: true },
      { name: 'other Worker', origin: 'https://bashiiin-coffee-staging.misemiruweb.workers.dev', blocked: true },
      { name: 'HTTP scheme', origin: 'http://' + HOST, blocked: true },
      { name: 'similar suffix', origin: ORIGIN + '.other.test', blocked: true },
      { name: 'similar prefix', origin: 'https://other.' + HOST, blocked: true },
      { name: 'different port', origin: ORIGIN + ':444', blocked: true },
      { name: 'missing marker with query/hash/storage', missingMarker: true, blocked: true },
      { name: 'safe with query/hash/storage', safe: true, blocked: true },
      { name: 'SDK load failure', sdkFailure: true },
      { name: 'SDK render failure', renderFailure: true },
      { name: 'mock200 must never claim acceptance', status: 200 },
      { name: 'official failure-key fixture', failureKey: true },
    ];
    // Candidate values are format fixtures only, not issued keys. SDK and API stay mocked.
    const candidateCases = [...cases.filter(f => !f.safe && !f.failureKey),
      { name: '503 after mock authentication' },
      { name: 'E2E hostname', origin: 'https://bashiiin-coffee-contact-e2e.misemiruweb.workers.dev', blocked: true }
    ].map(f => ({ ...f, name: 'candidate ' + f.name, candidate: true }));
    const stageCases = [
      ['origin_rejected', 403, 'ORIGIN_REJECTED'], ['rate_rejected', 429, 'RATE_LIMITED'],
      ['rate_unavailable', 503, 'SERVICE_UNAVAILABLE'], ['input_rejected', 400, 'INVALID_JSON'],
      ['siteverify_rejected', 400, 'VERIFICATION_FAILED'], ['siteverify_unavailable', 503, 'VERIFICATION_UNAVAILABLE'],
      ['siteverify_passed_synthetic_mail_rejected', 503, 'MAIL_UNAVAILABLE'], ['unknown', 503, 'SERVICE_UNAVAILABLE'],
    ].map(([stage, status, code]) => ({ name: 'stage ' + stage, stage, status, code, candidate: true }));
    stageCases.push({ name: 'in-flight double submit and retained input', stage: 'unknown', status: 503,
      code: 'SERVICE_UNAVAILABLE', candidate: true, inflight: true });
    for (const fixture of [...cases, ...candidateCases, ...stageCases]) {
      signal?.throwIfAborted();
      const origin = fixture.origin || ORIGIN;
      const assets = fixture.candidate ? candidateInventory({ siteKey: '0xSYNTHETIC_CANDIDATE_12345', origin: ORIGIN, safe: inventory() })
        : fixture.safe ? inventory() : previewInventory({
        siteKey: fixture.failureKey ? PREVIEW_TEST_SITE_KEYS.failure : PREVIEW_TEST_SITE_KEYS.success, origin: ORIGIN });
      const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
      const requests = new Set(), intercepted = new Set(), errors = [];
      let posts = 0, widgets = 0, sockets = 0, releaseResponse;
      const responseGate = new Promise(resolve => { releaseResponse = resolve; });
      context.on('request', request => requests.add(request));
      await context.routeWebSocket('**/*', socket => { sockets++; socket.close(); });
      await context.addInitScript(() => {
        window.__leads = 0;
        const originalFetch = window.fetch;
        window.fetch = async (...args) => {
          const response = await originalFetch(...args);
          window.__lastStage = response.headers.get('X-Contact-Negative-Stage');
          return response;
        };
        for (const key of ['mode', 'endpointReady', 'contactNegativeOnly']) localStorage.setItem(key, 'negative');
        window.addEventListener('bashiiin:analytics', e => { if (e.detail.name === 'generate_lead') window.__leads++; });
      });
      await context.route('**/*', async route => {
        const req = route.request(), u = new URL(req.url()); intercepted.add(req);
        if (u.origin === 'https://challenges.cloudflare.com' && u.pathname === '/turnstile/v0/api.js') {
          widgets++;
          if (fixture.sdkFailure) return route.abort();
          const sdk = `window.turnstile={render:(el,options)=>{
            ${fixture.renderFailure ? 'throw Error("SYNTHETIC_SDK_ERROR");' : ''}
            window.__callbacks=options;window.__renderAction=options.action;
            ${fixture.failureKey ? 'queueMicrotask(()=>options["error-callback"]());' : ''}
            return 'synthetic-widget';},reset:()=>{}};`;
          return route.fulfill({ contentType: 'application/javascript', body: sdk });
        }
        if (u.origin !== origin) return route.abort();
        if (u.pathname === '/api/contact' && req.method() === 'POST') {
          posts++;
          if (fixture.inflight) await responseGate;
          return route.fulfill({ status: fixture.status || 503, contentType: 'application/json',
            headers: fixture.stage ? { 'X-Contact-Negative-Stage': fixture.stage } : {},
            body: JSON.stringify(fixture.status === 200 ? { ok: true } : { ok: false, code: fixture.code || 'MAIL_UNAVAILABLE' }) });
        }
        const key = u.pathname === '/' ? 'index.html' : u.pathname.slice(1) + (u.pathname.endsWith('/') ? 'index.html' : '');
        let buffer = assets.buffers.get(key);
        if (!buffer) return route.fulfill({ status: 404, body: '' });
        if (fixture.missingMarker && key === 'contact/index.html') buffer = Buffer.from(buffer.toString().replace('data-contact-negative-only="true"', ''));
        const type = key.endsWith('.html') ? 'text/html' : key.endsWith('.js') ? 'application/javascript'
          : key.endsWith('.css') ? 'text/css' : key.endsWith('.webp') ? 'image/webp' : 'image/png';
        return route.fulfill({ status: 200, contentType: type, body: buffer });
      });
      const page = await context.newPage(); page.on('pageerror', e => errors.push(e.name));
      assert.equal((await page.goto(origin + '/contact/?mode=negative&endpointReady=true#negative')).status(), 200);
      assert.equal(await page.locator('meta[name="robots"]').getAttribute('content'), 'noindex, nofollow, noarchive');
      assert(await page.locator('#contact-submit').isDisabled());
      for (const [name, value] of [['name', 'Synthetic preview'], ['email', 'visitor@fixture.test'], ['message', 'Synthetic only']]) {
        await page.locator(`[name="${name}"]`).fill(value);
      }
      if (fixture.blocked) {
        await page.locator('#contact-form').evaluate(form => form.requestSubmit());
        assert.equal(widgets, 0); assert.equal(posts, 0);
      } else if (fixture.sdkFailure || fixture.renderFailure || fixture.failureKey) {
        await page.waitForFunction(() => document.querySelector('#contact-turnstile').dataset.verificationState === 'error');
        assert(await page.locator('#contact-submit').isDisabled()); assert.equal(posts, 0);
      } else {
        await page.waitForFunction(() => Boolean(window.__callbacks));
        assert.equal(await page.evaluate(() => window.__renderAction), 'contact');
        if (fixture.candidate) {
          for (const token of ['', null, 'x'.repeat(2049)]) {
            await page.evaluate(value => window.__callbacks.callback(value), token);
            assert(await page.locator('#contact-submit').isDisabled());
          }
          await page.locator('#contact-form').evaluate(form => form.requestSubmit());
          assert.equal(posts, 0);
        }
        await page.evaluate(() => window.__callbacks.callback('synthetic-preview-token'));
        await page.locator('#contact-submit').click();
        if (fixture.inflight) {
          await page.waitForFunction(() => document.querySelector('#contact-form').dataset.state === 'sending');
          assert(await page.locator('#contact-submit').isDisabled());
          await page.locator('#contact-form').evaluate(form => { form.requestSubmit(); form.requestSubmit(); });
          assert.equal(posts, 1);
          releaseResponse();
        }
        await page.waitForFunction(() => document.querySelector('#contact-form').dataset.state === 'failure');
        assert.match(await page.locator('#contact-status').textContent(), /送信を確認できませんでした/);
        for (const [name, value] of [['name', 'Synthetic preview'], ['email', 'visitor@fixture.test'], ['message', 'Synthetic only']]) {
          assert.equal(await page.locator(`[name="${name}"]`).inputValue(), value);
        }
        if (fixture.stage) assert.equal(await page.evaluate(() => window.__lastStage), fixture.stage);
        assert.equal(posts, 1); assert(await page.locator('#contact-submit').isDisabled());
      }
      assert.equal(await page.evaluate(() => window.__leads), 0); assert.deepEqual(errors, []);
      assert.equal(sockets, 0); assert.equal(requests.size, intercepted.size);
      checks++; console.log(`PASS preview ${fixture.name}; every HTTP request intercepted; no WebSocket`);
      await context.close();
    }
    console.log(`PASS ${checks} browser scenarios; no real SDK, Siteverify, API or email traffic`);
    return checks;
  } finally {
    signal?.removeEventListener('abort', onAbort);
    await close();
  }
}

export async function runBrowserCli() {
  const controller = new AbortController();
  let interrupted = false;
  const interrupt = () => { interrupted = true; controller.abort(); };
  const signals = ['SIGINT', 'SIGTERM', 'SIGHUP'];
  for (const event of signals) process.on(event, interrupt);
  try {
    return await runBrowserChecks({ signal: controller.signal });
  } finally {
    for (const event of signals) process.removeListener(event, interrupt);
    if (interrupted) process.exitCode = 130;
  }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { await runBrowserCli(); }
  catch { console.error('NEGATIVE_BROWSER_STOPPED'); if (!process.exitCode) process.exitCode = 1; }
}
