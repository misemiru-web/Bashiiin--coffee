import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { parse } from 'parse5';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const PAGES = ['index.html', 'about/index.html', 'coffee/index.html', 'contact/index.html', 'access/index.html'];
const BASE = [...PAGES, 'styles.css', 'script.js'];
const BRAND = ['images/web/logo-header.png', 'images/web/favicon.png'];
const sha = data => createHash('sha256').update(data).digest('hex');
function requireCondition(ok, message) { if (!ok) throw new Error(message); }

// Check every path component before opening; never follow source or output links.
export function checkedPath(root, relative) {
  requireCondition(typeof relative === 'string' && relative.length > 0 && !path.isAbsolute(relative)
    && !/[\\\0]/.test(relative) && !relative.split('/').some(x => !x || x === '.' || x === '..'), `Unsafe path: ${relative}`);
  let current = root;
  requireCondition(fs.realpathSync(root) === root, 'Root must be a real directory');
  for (const part of relative.split('/')) {
    current = path.join(current, part);
    requireCondition(!fs.lstatSync(current).isSymbolicLink(), `Symlink rejected: ${relative}`);
  }
  return current;
}
function read(root, relative) {
  const filename = checkedPath(root, relative);
  const fd = fs.openSync(filename, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
  try {
    requireCondition(fs.fstatSync(fd).isFile(), `Not a regular file: ${relative}`);
    return fs.readFileSync(fd);
  } finally { fs.closeSync(fd); }
}
function walk(node, visit) {
  visit(node);
  for (const child of node.childNodes || []) walk(child, visit);
  if (node.content) walk(node.content, visit);
}
function attributes(node) { return Object.fromEntries((node.attrs || []).map(a => [a.name, a.value])); }
function localReference(value, from) {
  if (!value || /^(?:https?:|mailto:|tel:|data:|#)/i.test(value)) return null;
  requireCondition(!value.startsWith('//') && !/^[a-z][a-z\d+.-]*:/i.test(value), `Unsupported URL in ${from}`);
  const raw = value.split(/[?#]/)[0];
  const decoded = decodeURIComponent(raw);
  requireCondition(!/[\\\0]/.test(decoded) && !decoded.split('/').includes('..')
    && !decoded.split('/').includes('.'), `Unsafe URL in ${from}: ${value}`);
  let result = decoded.startsWith('/') ? decoded.slice(1) : path.posix.join(path.posix.dirname(from), decoded);
  if (!result || decoded.endsWith('/')) result += 'index.html';
  return result;
}
function cssReferences(text) {
  const clean = text.replace(/\/\*[\s\S]*?\*\//g, '');
  return [...clean.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)|@import\s+["']([^"']+)["']/g)].map(m => (m[1] || m[2]).trim());
}
export function sourceInventory(root = ROOT) {
  root = path.resolve(root);
  const manifest = JSON.parse(read(root, 'scripts/public-files.json'));
  requireCondition(Array.isArray(manifest.files), 'Invalid public manifest');
  const files = manifest.files;
  requireCondition(new Set(files).size === files.length, 'Duplicate allowlist entry');
  requireCondition(BASE.every(f => files.includes(f)), 'Missing required site file');
  for (const f of files) {
    requireCondition(typeof f === 'string' && (BASE.includes(f) || BRAND.includes(f)
      || /^images\/web\/(hero|coffee|sweets|space|culture|journal)\/[A-Za-z0-9_-]+\.webp$/.test(f)), `Not a public file: ${f}`);
  }
  const buffers = new Map(files.map(f => [f, read(root, f)]));
  const used = new Set(BASE);
  const links = [];
  const ids = new Map();
  const record = (value, from) => {
    const target = localReference(value, from);
    if (target) {
      requireCondition(buffers.has(target), `Reference outside allowlist or missing: ${from} -> ${target}`);
      used.add(target);
    }
    return target;
  };
  for (const page of PAGES) {
    const tree = parse(buffers.get(page).toString());
    const pageIds = new Set(); ids.set(page, pageIds);
    let robots = false, disabled = false, ready = false, sitekey = null;
    walk(tree, node => {
      const a = attributes(node);
      if (a.id) { requireCondition(!pageIds.has(a.id), `Duplicate id in ${page}: ${a.id}`); pageIds.add(a.id); }
      if (node.tagName === 'meta' && a.name === 'robots') robots = a.content === 'noindex, nofollow, noarchive';
      if (a.id === 'contact-form') ready = a['data-endpoint-ready'] === 'false' && a.action === '/api/contact' && a.method === 'post';
      if (a.id === 'contact-submit') disabled = Object.hasOwn(a, 'disabled');
      if (a.id === 'contact-turnstile') sitekey = a['data-sitekey'];
      if (node.tagName === 'base') throw new Error('HTML base URL requires an explicit build review');
      for (const key of ['src', 'poster', 'data']) if (a[key]) record(a[key], page);
      if (a.srcset) for (const candidate of a.srcset.split(',')) record(candidate.trim().split(/\s+/)[0], page);
      if (a.href) {
        const target = record(a.href, page);
        if (target || a.href.startsWith('#')) links.push({ page, target: target || page, fragment: a.href.split('#')[1] });
      }
      if (a.style) for (const value of cssReferences(a.style)) record(value, page);
      if (node.tagName === 'style') for (const child of node.childNodes || []) {
        for (const value of cssReferences(child.value || '')) record(value, page);
      }
    });
    requireCondition(robots, `Pre-publication robots policy missing: ${page}`);
    if (page === 'contact/index.html') requireCondition(ready && disabled && sitekey === '', 'CONTACT must remain disabled and unconfigured');
  }
  for (const { page, target, fragment } of links) {
    if (fragment && ids.has(target)) requireCondition(ids.get(target).has(decodeURIComponent(fragment)), `Broken fragment: ${page} -> ${target}`);
  }
  for (const value of cssReferences(buffers.get('styles.css').toString())) record(value, 'styles.css');
  // Current JS has no photo URLs. Check literal asset paths; dynamic asset URLs need a build review.
  for (const match of buffers.get('script.js').toString().matchAll(/["'`]((?:\/|\.\/)[^"'`\n]+\.(?:webp|png|jpg|jpeg|avif|svg|css|js|woff2?)(?:[?#][^"'`\n]*)?)["'`]/g)) record(match[1], 'script.js');
  requireCondition(files.every(f => used.has(f)), 'Unused allowlisted file; remove it from the public manifest');
  const assetMap = read(root, 'docs/asset-map.md').toString();
  for (const f of files.filter(f => f.startsWith('images/'))) {
    requireCondition(assetMap.includes('`' + f + '`'), `Asset-map entry missing: ${f}`);
    const data = buffers.get(f);
    if (f.endsWith('.webp')) {
      requireCondition(data.toString('ascii', 0, 4) === 'RIFF' && data.toString('ascii', 8, 12) === 'WEBP', `Not WebP: ${f}`);
      const row = assetMap.split('\n').find(line => line.includes('使用中／') && line.includes('`' + f + '`'));
      const original = row && [...row.matchAll(/`([^`]+)`/g)][3]?.[1];
      requireCondition(original && !original.includes('/'), `Original mapping missing: ${f}`);
      const source = read(root, 'images/formal ver/' + original);
      const stem = f.replace(/-\d+\.webp$/, '');
      const hashRow = assetMap.split('\n').find(line => line.includes('`' + stem + '`'));
      const expectedHash = hashRow?.match(/`([a-f0-9]{64})`/)?.[1];
      requireCondition(expectedHash && sha(source) === expectedHash, `Original hash mismatch: ${f}`);
    } else requireCondition(data.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])), `Not PNG: ${f}`);
  }
  return { files: [...files].sort(), buffers };
}
function outputFiles(directory, prefix = '') {
  requireCondition(fs.lstatSync(directory).isDirectory() && !fs.lstatSync(directory).isSymbolicLink(), 'Output is not a real directory');
  const found = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const rel = prefix + entry.name;
    const full = path.join(directory, entry.name);
    const stat = fs.lstatSync(full);
    requireCondition(!stat.isSymbolicLink(), `Output symlink rejected: ${rel}`);
    if (stat.isDirectory()) {
      const children = outputFiles(full, rel + '/');
      requireCondition(children.length > 0, `Unexpected empty output directory: ${rel}`);
      found.push(...children);
    } else { requireCondition(stat.isFile(), `Non-file output: ${rel}`); found.push(rel); }
  }
  return found.sort();
}
export function verifyOutput(root = ROOT, inventory = sourceInventory(root), directory = path.join(root, 'dist')) {
  requireCondition(JSON.stringify(outputFiles(directory)) === JSON.stringify(inventory.files), 'Output does not exactly match public allowlist');
  for (const f of inventory.files) requireCondition(read(directory, f).equals(inventory.buffers.get(f)), `Output content mismatch: ${f}`);
  return inventory.files;
}
export function build(root = ROOT) {
  root = path.resolve(root);
  const inventory = sourceInventory(root); // Validate all input before touching existing output.
  const target = path.join(root, 'dist');
  if (fs.existsSync(target) || fs.lstatSync(root).isSymbolicLink()) outputFiles(target);
  else {
    try { fs.lstatSync(target); throw new Error('Unsafe dist entry'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  const temp = fs.mkdtempSync(path.join(root, '.static-build-'));
  try {
    for (const f of inventory.files) {
      const out = path.join(temp, f);
      fs.mkdirSync(path.dirname(out), { recursive: true });
      fs.writeFileSync(out, inventory.buffers.get(f), { flag: 'wx', mode: 0o644 });
    }
    verifyOutput(root, inventory, temp);
    // Only the fixed generated dist directory is replaced; originals are never touched.
    if (fs.existsSync(target)) { outputFiles(target); fs.rmSync(target, { recursive: true }); }
    fs.renameSync(temp, target);
    return verifyOutput(root, inventory);
  } finally { if (fs.existsSync(temp)) fs.rmSync(temp, { recursive: true }); }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    requireCondition(process.argv.slice(2).every(a => a === '--verify'), 'Only --verify is supported');
    const files = process.argv.includes('--verify') ? verifyOutput() : build();
    console.log(`${process.argv.includes('--verify') ? 'Verified' : 'Built'} ${files.length} allowlisted public files in dist/`);
  } catch (error) { console.error(`Static build failed: ${error.message}`); process.exitCode = 1; }
}
