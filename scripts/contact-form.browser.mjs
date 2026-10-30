// Requires an already-installed Playwright and Chrome; never installs dependencies.
// Run after the existing local dev launcher. PLAYWRIGHT_MODULE can point at an existing module.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const moduleName = process.env.PLAYWRIGHT_MODULE;
const { chromium } = await import(moduleName ? pathToFileURL(path.resolve(moduleName)).href : 'playwright');
const origin = 'http://127.0.0.1:8787';
const output = fs.mkdtempSync(path.join(os.tmpdir(), 'bashiiin-turnstile-browser-'));
const browser = await chromium.launch({ channel: 'chrome', headless: true });
// These are public dummy sitekeys from Cloudflare's official testing documentation, not credentials.
const PASS = '1x00000000000000000000AA', FAIL = '2x00000000000000000000AB';
const checks = [];
async function visit({ mode = false, key = '', mock = false, width = 390, stagingHtml } = {}) {
  const context = await browser.newContext({ viewport: { width, height: 900 } });
  let posts = 0, scriptLoads = 0, siteverifyCalls = 0;
  const errors = [], networkFailures = [], consoleErrors = [], scriptResponses = [];
  const diagnostic = async () => ({ state: await page.locator('#contact-turnstile').getAttribute('data-verification-state'), errors, networkFailures, consoleErrors, scriptResponses, details: await page.evaluate(() => ({ library: typeof window.turnstile, iframes: document.querySelectorAll('#contact-turnstile iframe').length })) });
  await context.addInitScript(() => {
    window.__leadCount = 0;
    window.addEventListener('bashiiin:analytics', e => { if (e.detail.name === 'generate_lead') window.__leadCount++; });
  });
  await context.route('**/*', async route => {
    const request = route.request(), u = new URL(request.url());
    if (u.pathname.endsWith('/siteverify')) { siteverifyCalls++; return route.abort(); }
    if (u.origin === origin && u.pathname === '/api/contact' && request.method() === 'POST') {
      posts++; return route.abort(); // Any form POST is a test failure; no backend submission.
    }
    if (u.origin === origin && u.pathname === '/contact/' && request.isNavigationRequest()) {
      const response = await route.fetch();
      let html = stagingHtml ?? await response.text();
      if (mode) html = html.replace('data-endpoint-ready="false"', 'data-endpoint-ready="false" data-turnstile-mode="verify-only"');
      if (key) html = html.replace('data-sitekey=""', `data-sitekey="${key}"`);
      return route.fulfill({ response, body: html }); // Browser-only fixture; dist/source remain untouched.
    }
    if (u.hostname === 'challenges.cloudflare.com' && u.pathname === '/turnstile/v0/api.js') {
      scriptLoads++;
      if (mock) return route.fulfill({ contentType: 'application/javascript', body: `window.turnstile={ready:f=>f(),render:(el,options)=>{window.__widgetCallbacks=options;el.textContent='認証コールバックのモック';return 'mock';},reset:()=>{window.__resetCount=(window.__resetCount||0)+1;}};` });

    }
    if (u.origin !== origin && u.hostname !== 'challenges.cloudflare.com') return route.abort();
    return route.continue();
  });
  const page = await context.newPage();
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if(m.type()==='error') consoleErrors.push(m.text().replace(/[12]x0+[AB]+/g, '[dummy-sitekey]')); });
  page.on('response', async r => { if(r.request().resourceType()==='script' && new URL(r.url()).hostname==='challenges.cloudflare.com') scriptResponses.push({ status:r.status(), type:r.headers().get?.('content-type') || r.headers()['content-type'], bytes:(await r.body().catch(()=>Buffer.alloc(0))).length }); });
  page.on('requestfailed', r => networkFailures.push({ host: new URL(r.url()).hostname, error: r.failure()?.errorText }));
  const response = await page.goto(origin + '/contact/', { waitUntil: 'domcontentloaded' });
  assert.equal(response.status(), 200);
  const widget = page.locator('#contact-turnstile'), submit = page.locator('#contact-submit');
  async function assertSafe() {
    assert.equal(await submit.isDisabled(), true);
    assert.equal(await page.locator('#contact-form').getAttribute('data-endpoint-ready'), 'false');
    assert.equal(await page.locator('meta[name="robots"]').getAttribute('content'), 'noindex, nofollow, noarchive');
    // Scripted submit also must be stopped even though a user cannot click the disabled button.
    await page.locator('#contact-form').evaluate(form => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
    assert.equal(posts, 0); assert.equal(siteverifyCalls, 0);
    assert.equal(await page.evaluate(() => window.__leadCount), 0); assert.deepEqual(errors, []);
  }
  return { context, page, widget, submit, assertSafe, diagnostic, get scriptLoads() { return scriptLoads; } };
}
try {
  for (const width of [390, 1440]) {
    const f = await visit({ width });
    await f.page.waitForTimeout(300);
    assert.equal(f.scriptLoads, 0); assert.equal(await f.widget.getAttribute('data-verification-state'), 'idle');
    assert.equal(await f.widget.locator('iframe').count(), 0); await f.assertSafe();
    await f.page.screenshot({ path: `${output}/${width}-normal.png`, fullPage: true });
    await f.context.close(); checks.push(`normal disabled ${width}px`);
  }
  const stagingPath = new URL('../dist-staging/contact/index.html', import.meta.url);
  if (fs.existsSync(stagingPath)) {
    const html = fs.readFileSync(stagingPath, 'utf8');
    assert.match(html, /data-turnstile-mode="staging-verify-only"/);
    assert.match(html, /data-sitekey="1x00000000000000000000AA"/); // Only run this fixture with the official dummy key.
    const f = await visit({ stagingHtml: html });
    await f.page.waitForTimeout(300);
    assert.equal(f.scriptLoads, 0); await f.assertSafe();
    await f.context.close(); checks.push('generated staging HTML rejects loopback origin (not an actual staging connection)');
  }
  const mock = await visit({ mode: true, key: PASS, mock: true });
  await mock.page.waitForFunction(() => Boolean(window.__widgetCallbacks));
  for (const [callback, state] of [['error-callback','error'], ['expired-callback','expired'], ['timeout-callback','timeout']]) {
    await mock.page.evaluate(name => { window.__widgetCallbacks.callback('opaque-browser-token'); window.__widgetCallbacks[name](); }, callback);
    assert.equal(await mock.widget.getAttribute('data-verification-state'), state); await mock.assertSafe();
    checks.push(`mock ${state}`);
  }
  await mock.page.evaluate(() => window.__widgetCallbacks.callback('opaque-browser-token'));
  await mock.page.locator('#contact-verification-reset').click();
  assert.equal(await mock.page.evaluate(() => window.__resetCount), 1);
  assert.equal(await mock.widget.getAttribute('data-verification-state'), 'reset'); await mock.assertSafe();
  checks.push('mock reset'); await mock.context.close();
  // Real client-side requests use official dummy sitekeys. No Secret or Siteverify request.
  for (const width of [390, 1440]) {
    const f = await visit({ mode: true, key: PASS, width });
    await f.page.waitForFunction(() => ['success','error'].includes(document.querySelector('#contact-turnstile').dataset.verificationState), null, { timeout: 45000 }).then(async () => { if(await f.widget.getAttribute('data-verification-state') !== 'success') throw Error('official dummy did not succeed'); }).catch(async error => { await f.page.screenshot({ path: `${output}/${width}-dummy-unavailable.png`, fullPage: true }); console.log(JSON.stringify({ officialWidgetDiagnostic: await f.diagnostic(), output })); throw error; });
    assert.ok(f.page.frames().some(frame => frame.url().startsWith('https://challenges.cloudflare.com/')));
    await f.page.waitForTimeout(500);
    assert.ok((await f.page.locator('#contact-verification-reset').boundingBox()).height >= 44);
    assert.equal(await f.page.evaluate(() => document.documentElement.scrollWidth), width);
    await f.page.screenshot({ path: `${output}/${width}-dummy-success.png`, fullPage: true });
    await f.assertSafe();
    await f.page.locator('#contact-verification-reset').click();
    await f.page.waitForFunction(() => ['success','error'].includes(document.querySelector('#contact-turnstile').dataset.verificationState), null, { timeout: 45000 }).then(async () => { if(await f.widget.getAttribute('data-verification-state') !== 'success') throw Error('official dummy did not succeed'); }).catch(async error => { await f.page.screenshot({ path: `${output}/${width}-dummy-unavailable.png`, fullPage: true }); console.log(JSON.stringify({ officialWidgetDiagnostic: await f.diagnostic(), output })); throw error; });
    await f.assertSafe(); checks.push(`official dummy success and reset ${width}px`);
    await f.context.close();
  }
  const fail = await visit({ mode: true, key: FAIL });
  await fail.page.waitForFunction(() => document.querySelector('#contact-turnstile').dataset.verificationState === 'error', null, { timeout: 45000 });
  await fail.assertSafe(); await fail.page.screenshot({ path: `${output}/390-dummy-error.png`, fullPage: true });
  checks.push('official dummy failure'); await fail.context.close();
  const report = { browser: browser.version(), checks, passed: checks.length, contactPosts: 0, leadEvents: 0, siteverifyCalls: 0,
    realClientWidget: 'official dummy sitekeys only', expiryAndTimeout: 'mock callbacks; no real five-minute expiry wait' };
  fs.writeFileSync(`${output}/results.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ ...report, output }));
} finally { await browser.close(); }
