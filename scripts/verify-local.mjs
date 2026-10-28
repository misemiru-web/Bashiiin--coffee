import assert from 'node:assert/strict';
import { sourceInventory, verifyOutput, PAGES } from './build-static.mjs';

const origin = new URL(process.argv[2] || 'http://127.0.0.1:8787');
assert.equal(origin.protocol, 'http:');
assert.ok(['127.0.0.1', 'localhost'].includes(origin.hostname), 'Only loopback verification is allowed');
assert.equal(origin.pathname, '/');
assert.ok(!origin.username && !origin.password && !origin.search && !origin.hash);
const inventory = sourceInventory();
verifyOutput();
const request = (url, options = {}) => fetch(new URL(url, origin), { redirect: 'manual', signal: AbortSignal.timeout(10000), ...options });
const route = file => file === 'index.html' ? '/' : file.replace(/index\.html$/, '');
let checks = 0;
for (const file of inventory.files) {
  const url = '/' + route(file).replace(/^\//, '');
  const response = await request(url);
  assert.equal(response.status, 200, `${url}: expected 200`);
  const expectedType = file.endsWith('.html') ? 'text/html' : file.endsWith('.css') ? 'text/css' : file.endsWith('.js') ? '(?:text|application)/javascript' : file.endsWith('.webp') ? 'image/webp' : 'image/png';
  assert.match(response.headers.get('content-type') || '', new RegExp('^' + expectedType), `${url}: content type`);
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), inventory.buffers.get(file), `${url}: unexpected response content`);
  checks++;
}
for (const page of PAGES.slice(1)) {
  const url = '/' + route(page).replace(/\/$/, '');
  const r = await request(url);
  assert.ok([301, 302, 307, 308].includes(r.status), `${url}: expected canonical redirect`);
  assert.equal(new URL(r.headers.get('location'), origin).pathname, url + '/'); checks++;
}
const forbidden = [
  '/missing-page/', '/missing-file.webp', '/about/unknown/', '/docs/', '/docs/asset-map.md',
  '/AGENTS.md', '/CLAUDE.md', '/README.md', '/.git/config', '/.github/workflows/deploy-pages.yml',
  '/bashiiin_coffee_jsonld.html', '/images/formal%20ver/DSC_0052.webp', '/images/web/coffee-cup.jpg',
  '/images/source/ai-placeholder/05_caramel_pudding.jpg', '/package.json', '/package-lock.json',
  '/wrangler.jsonc', '/scripts/build-static.mjs', '/scripts/public-files.json', '/.env', '/api/contact',
];
for (const url of forbidden) {
  const r = await request(url, { headers: { 'Sec-Fetch-Mode': 'navigate' } });
  assert.equal(r.status, 404, `${url}: must not expose a file or SPA fallback`); checks++;
}
for (const url of ['/api/contact', '/api/contact/', '/contact/']) {
  // Empty JSON only: no user input, tokens, external services, or real message submission.
  const r = await request(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  assert.ok([404, 405].includes(r.status), `${url}: POST must not be accepted (got ${r.status})`); checks++;
}
console.log(`PASS: ${checks} local Wrangler HTTP checks; ${inventory.files.length} assets match source bytes and MIME; unknown/private paths 404; POST rejected.`);
