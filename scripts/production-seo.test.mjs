import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parse } from 'parse5';
import { ROOT, PAGES, sourceInventory, build, verifyOutput } from './build-static.mjs';
import { SEO_PAGES } from './seo-pages.mjs';
import { validateOrigin, approvedUrls, prepareSeoDrafts, buildProductionSeo } from './production-seo.mjs';

// Synthetic origin: no DNS/HTTP requests. Only disposable OS-temp fixtures and
// in-memory drafts use it; repository source and distribution files never do.
const ORIGIN = 'https://approved-seo-fixture.coffee';
const pending = JSON.parse(fs.readFileSync(new URL('./production-seo.json', import.meta.url)));
const approved = () => ({ ...structuredClone(pending), origin: ORIGIN, approvedOrigin: ORIGIN,
  domainApprovalReference: 'isolated-test-domain-approval', publicationApprovalReference: 'isolated-test-publication-approval' });
const source = sourceInventory();
function fixture(run) {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'bashiiin-seo-test-')));
  const map = fs.readFileSync(path.join(ROOT, 'docs/asset-map.md'), 'utf8');
  const originals = map.split('\n').filter(row => row.includes('使用中／'))
    .map(row => 'images/formal ver/' + [...row.matchAll(/`([^`]+)`/g)][3][1]);
  for (const file of new Set([...source.files, ...originals, 'scripts/public-files.json', 'docs/asset-map.md', 'scripts/production-seo.json'])) {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.copyFileSync(path.join(ROOT, file), path.join(root, file));
  }
  try { run(root); } finally { fs.rmSync(root, { recursive: true, force: true }); }
}
const htmlMap = root => new Map(SEO_PAGES.map(page => [page.file, fs.readFileSync(path.join(root, page.file), 'utf8')]));
const setConfig = (root, config) => fs.writeFileSync(path.join(root, 'scripts/production-seo.json'), JSON.stringify(config));

test('shared SEO paths are immutable, unique and match the five existing pages', () => {
  assert.deepEqual(SEO_PAGES.map(page => page.path), ['/', '/about/', '/coffee/', '/contact/', '/access/']);
  assert.deepEqual(SEO_PAGES.map(page => page.file), PAGES);
  assert.equal(new Set(SEO_PAGES.map(page => page.path)).size, 5);
  assert.throws(() => { SEO_PAGES[0].path = '/changed/'; }, TypeError);
});

test('repository configuration is pending with no domain or publication approval', () => {
  for (const key of ['origin', 'approvedOrigin', 'domainApprovalReference', 'publicationApprovalReference']) assert.equal(pending[key], null);
  assert.throws(() => approvedUrls(pending), /origin is required/);
});

for (const origin of [undefined, null, '', 'http://coffee.coffee', 'https://localhost', 'https://shop.localhost',
  'https://127.0.0.1', 'https://[::1]', 'https://2130706433', 'https://example.com', 'https://shop.example.org',
  'https://example.net', 'https://shop.test', 'https://shop.invalid', 'https://shop.internal',
  'https://bashiiin-coffee-client-review.pages.dev', 'https://preview.workers.dev', 'https://site.github.io',
  'https://site.vercel.app', 'https://site.netlify.app', ORIGIN + '/', ORIGIN + '/path', ORIGIN + '?x=1',
  ORIGIN + '#fragment', 'https://user:password@approved-seo-fixture.coffee', ORIGIN + ':443', ORIGIN + ':8443',
  ORIGIN + '\n', 'https://approved-seo-fixture.coffee\\evil', 'https://-bad.coffee', 'https://bad..coffee']) {
  test(`reject invalid or reserved origin: ${JSON.stringify(origin)}`, () => {
    assert.throws(() => validateOrigin(origin));
  });
}

for (const patch of [
  { approvedOrigin: null }, { approvedOrigin: 'https://other-fixture.coffee' },
  { domainApprovalReference: null }, { domainApprovalReference: ' ' },
  { publicationApprovalReference: null }, { publicationApprovalReference: true },
  { generatedFiles: ['robots.txt'] }, { releaseEnabled: true }, { version: 2 },
]) {
  test(`reject missing approval or unexpected config: ${Object.keys(patch)[0]} ${JSON.stringify(Object.values(patch)[0])}`, () => {
    const config = { ...approved(), ...patch };
    assert.throws(() => approvedUrls(config));
    assert.throws(() => prepareSeoDrafts(new Map(), config));
  });
}

test('sitemap, canonical and og:url use exactly the same five URLs; no lastmod or extra files', () => fixture(root => {
  const original = htmlMap(root), config = approved();
  const drafts = prepareSeoDrafts(original, config);
  const expectedUrls = SEO_PAGES.map(page => ORIGIN + page.path);
  assert.deepEqual(drafts.urls.map(page => page.url), expectedUrls);
  assert.deepEqual([...drafts.files.keys()], [...PAGES, 'sitemap.xml', 'robots.txt']);
  assert.equal(drafts.files.get('sitemap.xml'), '<?xml version="1.0" encoding="UTF-8"?>\n'
    + '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    + expectedUrls.map(url => `  <url><loc>${url}</loc></url>`).join('\n') + '\n</urlset>\n');
  assert.equal(drafts.files.get('sitemap.xml').includes('lastmod'), false);
  assert.equal(drafts.files.get('robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${ORIGIN}/sitemap.xml\n`);
  for (const page of drafts.urls) {
    const html = drafts.files.get(page.file), nodes = [];
    const walk = n => { nodes.push(n); for (const c of n.childNodes || []) walk(c); };
    walk(parse(html));
    const attrs = n => Object.fromEntries((n.attrs || []).map(a => [a.name, a.value]));
    assert.equal(nodes.filter(n => n.tagName === 'link' && attrs(n).rel === 'canonical').length, 1);
    assert.equal(nodes.find(n => n.tagName === 'link' && attrs(n).rel === 'canonical').attrs.find(a => a.name === 'href').value, page.url);
    assert.equal(nodes.find(n => n.tagName === 'meta' && attrs(n).property === 'og:url').attrs.find(a => a.name === 'content').value, page.url);
    const insertion = `<link rel="canonical" href="${page.url}">\n    <meta property="og:url" content="${page.url}">\n  `;
    // Stronger than body-only comparison: all original bytes (including robots,
    // existing OGP, inline JSON-LD, form and every head comment) are preserved.
    assert.equal(html.replace(insertion, ''), original.get(page.file));
    assert.equal(fs.readFileSync(path.join(root, page.file), 'utf8'), original.get(page.file));
  }
  const isolated = path.join(root, 'test-only-drafts');
  for (const [file, value] of drafts.files) {
    fs.mkdirSync(path.dirname(path.join(isolated, file)), { recursive: true });
    fs.writeFileSync(path.join(isolated, file), value);
  }
  assert.equal(fs.existsSync(path.join(root, 'dist')), false);
  assert.equal(fs.existsSync(path.join(root, 'dist-production')), false);
}));

test('preview remains byte-identical with 40 files and no sitemap/robots, even with SEO environment flags', () => fixture(root => {
  const keys = ['SEO_ORIGIN', 'PRODUCTION_ORIGIN', 'SEO_PUBLICATION_APPROVED'];
  const previous = keys.map(key => process.env[key]);
  try {
    process.env.SEO_ORIGIN = ORIGIN; process.env.PRODUCTION_ORIGIN = ORIGIN; process.env.SEO_PUBLICATION_APPROVED = 'true';
    build(root);
    assert.equal(verifyOutput(root).length, 40);
    for (const file of source.files) assert.deepEqual(fs.readFileSync(path.join(root, 'dist', file)), source.buffers.get(file));
    for (const page of PAGES) assert.match(fs.readFileSync(path.join(root, 'dist', page), 'utf8'), /content="noindex, nofollow, noarchive"/);
    for (const file of ['sitemap.xml', 'robots.txt']) assert.equal(fs.existsSync(path.join(root, 'dist', file)), false);
  } finally { keys.forEach((key, i) => { if (previous[i] === undefined) delete process.env[key]; else process.env[key] = previous[i]; }); }
}));

test('pending and fully approved config both refuse production output; preview and existing directories untouched', () => fixture(root => {
  build(root);
  fs.mkdirSync(path.join(root, 'dist-production'));
  fs.writeFileSync(path.join(root, 'dist-production', 'sentinel'), 'preexisting data');
  const before = fs.readdirSync(root).sort();
  for (const config of [pending, approved()]) {
    setConfig(root, config);
    assert.throws(() => buildProductionSeo(root), config.origin ? /output is locked/ : /origin is required/);
    assert.deepEqual(fs.readdirSync(root).sort(), before);
    assert.equal(verifyOutput(root).length, 40);
    assert.deepEqual(fs.readdirSync(path.join(root, 'dist-production')), ['sentinel']);
    assert.equal(fs.readFileSync(path.join(root, 'dist-production', 'sentinel'), 'utf8'), 'preexisting data');
  }
}));

test('production config symlink refused without touching its target', () => fixture(root => {
  fs.unlinkSync(path.join(root, 'scripts/production-seo.json'));
  fs.symlinkSync(path.join(ROOT, 'scripts/production-seo.json'), path.join(root, 'scripts/production-seo.json'));
  assert.throws(() => buildProductionSeo(root), /Symlink/);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/production-seo.json'))), pending);
}));

for (const replacement of [
  html => html.replace('noindex, nofollow, noarchive', 'index, follow'),
  html => html.replace('</head>', '<link rel="canonical" href="https://conflict-fixture.coffee/">\n</head>'),
  html => html.replace('</head>', '<meta property="og:url" content="https://conflict-fixture.coffee/">\n</head>'),
  html => html.replace('</head>', '<meta property="og:image" content="/unapproved.webp">\n</head>'),
  html => html.replace('</head>', '<meta name="robots" content="index">\n</head>'),
]) {
  test('conflicting SEO or robots changes fail before any draft can be returned', () => fixture(root => {
    const input = htmlMap(root); input.set('index.html', replacement(input.get('index.html')));
    assert.throws(() => prepareSeoDrafts(input, approved()));
    assert.equal(fs.existsSync(path.join(root, 'dist')), false);
  }));
}
