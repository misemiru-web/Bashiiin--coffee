// Synthetic browser fixtures only. Every request is fulfilled in memory or aborted.
// Use an already-installed Playwright via PLAYWRIGHT_MODULE; never install packages.
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { inventory } from './build.mjs';
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
    handleSIGINT: false, handleSIGTERM: false, handleSIGHUP: false });
  let closing;
  const close = () => closing ??= Promise.resolve().then(() => browser.close());
  const onAbort = () => { void close().catch(() => {}); };
  signal?.addEventListener('abort', onAbort, { once: true });
  let checks = 0;
  try {
    signal?.throwIfAborted();
    for (const mode of ['safe', 'negative']) {
      const assets = inventory(mode, mode === 'safe' ? {} : {
        E2E_HOSTNAME: HOST, E2E_FORM_APPROVAL: 'APPROVED_E2E_FORM', E2E_TURNSTILE_SITE_KEY: '1x00000000000000000000AA',
      });
      const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
      let posts = 0, widgets = 0, external = 0;
      const errors = [];
      const sdk = `window.turnstile={ready:f=>f(),render:(el,options)=>{window.__callbacks=options;return 'synthetic-widget';},reset:()=>{}};`;
      await context.addInitScript(() => {
        window.__leads = 0;
        window.addEventListener('bashiiin:analytics', e => { if (e.detail.name === 'generate_lead') window.__leads++; });
      });
      await context.route('**/*', route => {
        const req = route.request(), u = new URL(req.url());
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
      // External resources such as fonts are intentionally aborted; never continued to the network.
      console.log(`PASS ${mode}: synthetic browser only; 390px x 5 pages; external requests blocked=${external}`);
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
  catch { console.error('E2E_BROWSER_STOPPED'); if (!process.exitCode) process.exitCode = 1; }
}
