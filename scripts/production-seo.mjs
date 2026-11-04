// SEO-04A: pure, in-memory preparation only. No writer or noindex removal exists here.
import fs from 'node:fs';
import path from 'node:path';
import { isIP } from 'node:net';
import { fileURLToPath } from 'node:url';
import { parse } from 'parse5';
import { ROOT, checkedPath } from './build-static.mjs';
import { SEO_PAGES } from './seo-pages.mjs';

const ensure = (condition, message) => { if (!condition) throw new Error(message); };
const CONFIG_KEYS = ['version', 'origin', 'approvedOrigin', 'domainApprovalReference', 'publicationApprovalReference', 'generatedFiles'];
const GENERATED_FILES = Object.freeze(['sitemap.xml', 'robots.txt']);

export function validateOrigin(origin) {
  ensure(typeof origin === 'string' && origin.length > 0, 'Formal origin is required');
  let url;
  try { url = new URL(origin); } catch { throw new Error('Invalid formal origin'); }
  // Exact origin syntax excludes credentials, paths, ports, queries, normalization tricks
  // and control characters. The approved value must be stored in canonical form.
  ensure(url.protocol === 'https:' && origin === url.origin && !url.port
    && !url.username && !url.password && !/[\s\\]/.test(origin), 'Canonical HTTPS origin required');
  const host = url.hostname;
  ensure(host.length <= 253 && !isIP(host) && host.includes('.')
    && host.split('.').every(label => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label))
    && /^[a-z]{2,63}$/.test(host.split('.').at(-1)), 'Public DNS hostname required');
  const forbidden = ['localhost', 'local', 'internal', 'test', 'invalid', 'example',
    'example.com', 'example.net', 'example.org', 'pages.dev', 'workers.dev',
    'github.io', 'vercel.app', 'netlify.app'];
  ensure(!forbidden.some(suffix => host === suffix || host.endsWith('.' + suffix)), 'Reserved or preview hostname rejected');
  return origin;
}

export function approvedUrls(config) {
  ensure(config && typeof config === 'object' && !Array.isArray(config)
    && Object.keys(config).length === CONFIG_KEYS.length
    && CONFIG_KEYS.every(key => Object.hasOwn(config, key)) && config.version === 1,
  'Invalid production SEO configuration');
  const origin = validateOrigin(config.origin);
  ensure(config.approvedOrigin === origin, 'Origin has no matching explicit approval');
  for (const key of ['domainApprovalReference', 'publicationApprovalReference']) {
    ensure(typeof config[key] === 'string' && config[key].trim().length > 0, 'Domain and publication approval references required');
  }
  ensure(JSON.stringify(config.generatedFiles) === JSON.stringify(GENERATED_FILES), 'Unexpected generated file definition');
  const urls = SEO_PAGES.map(page => Object.freeze({ ...page, url: new URL(page.path, origin).href }));
  ensure(urls.length === 5 && new Set(urls.map(page => page.url)).size === 5
    && new Set(urls.map(page => page.file)).size === 5, 'SEO routes must be unique');
  return Object.freeze(urls);
}

const escape = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&apos;');

// Input: a Map of the five preview HTML strings. Output stays in memory and retains
// every preview robots tag, body byte, existing OGP field and JSON-LD byte.
// Tests alone may serialize these drafts into disposable OS-temp fixtures.
export function prepareSeoDrafts(htmlByFile, config) {
  const urls = approvedUrls(config);
  ensure(htmlByFile instanceof Map && htmlByFile.size === 5, 'Exactly five source HTML files required');
  const files = new Map();
  for (const page of urls) {
    const html = htmlByFile.get(page.file);
    ensure(typeof html === 'string', 'Missing source HTML');
    const errors = [];
    const tree = parse(html, { sourceCodeLocationInfo: true, onParseError: error => errors.push(error.code) });
    const head = tree.childNodes.find(node => node.tagName === 'html')?.childNodes.find(node => node.tagName === 'head');
    ensure(errors.length === 0 && head?.sourceCodeLocation?.endTag, 'Source HTML structure invalid');
    const nodes = [];
    const walk = node => { nodes.push(node); for (const child of node.childNodes || []) walk(child); };
    walk(tree);
    const attrs = node => Object.fromEntries((node.attrs || []).map(attr => [attr.name, attr.value]));
    const robots = nodes.filter(node => node.tagName === 'meta' && attrs(node).name === 'robots');
    ensure(robots.length === 1 && head.childNodes.includes(robots[0])
      && attrs(robots[0]).content === 'noindex, nofollow, noarchive', 'Preview robots policy required');
    ensure(!nodes.some(node => (node.tagName === 'link' && (attrs(node).rel || '').toLowerCase().split(/\s+/).includes('canonical'))
      || (node.tagName === 'meta' && ['og:url', 'og:image'].includes(attrs(node).property))), 'Source already has URL-dependent SEO');
    const offset = head.sourceCodeLocation.endTag.startOffset;
    const tags = `<link rel="canonical" href="${escape(page.url)}">\n    <meta property="og:url" content="${escape(page.url)}">\n  `;
    files.set(page.file, html.slice(0, offset) + tags + html.slice(offset));
  }
  files.set('sitemap.xml', '<?xml version="1.0" encoding="UTF-8"?>\n'
    + '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    + urls.map(page => `  <url><loc>${escape(page.url)}</loc></url>`).join('\n') + '\n</urlset>\n');
  files.set('robots.txt', `User-agent: *\nAllow: /\nSitemap: ${config.origin}/sitemap.xml\n`);
  return { urls, files };
}

// This gate is deliberately not configurable. No environment flag, CLI argument,
// config edit or approval reference can enable publication in SEO-04A.
// A separately authorized implementation/review must add a production writer later.
export function buildProductionSeo(root = ROOT) {
  root = path.resolve(root);
  const config = JSON.parse(fs.readFileSync(checkedPath(root, 'scripts/production-seo.json'), 'utf8'));
  approvedUrls(config);
  throw new Error('Production output is locked in SEO-04A; no files were written');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    ensure(process.argv.length === 2, 'Production SEO command accepts no arguments');
    buildProductionSeo();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
