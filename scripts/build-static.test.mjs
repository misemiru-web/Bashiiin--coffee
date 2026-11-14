import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { ROOT, build, verifyOutput, sourceInventory } from './build-static.mjs';

// All destructive/negative cases operate on disposable copies, never real site sources.
const source = sourceInventory();
function fixture(run) {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'bashiiin-build-test-')));
  const files = [...source.files, 'scripts/public-files.json', 'scripts/asset-integrity.json', 'docs/asset-map.md'];
  for (const f of files) {
    fs.mkdirSync(path.dirname(path.join(root, f)), { recursive: true });
    fs.copyFileSync(path.join(ROOT, f), path.join(root, f));
  }
  try { run(root); } finally { fs.rmSync(root, { recursive: true, force: true }); }
}
const change = (root, f, from, to) => fs.writeFileSync(path.join(root, f), fs.readFileSync(path.join(root, f), 'utf8').replace(from, to));
// Synthetic provenance bytes: tests also work when no local photo originals exist.
function archiveOriginal(root, name = 'DSC_0052.webp') {
  const mapFile = path.join(root, 'docs/asset-map.md');
  const map = fs.readFileSync(mapFile, 'utf8');
  const row = map.split('\n').find(line => line.includes('使用中／') && line.includes('`' + name + '`'));
  const file = [...row.matchAll(/`([^`]+)`/g)][0][1];
  const stem = file.replace(/-\d+\.webp$/, '');
  const hashRow = map.split('\n').find(line => line.includes('`' + stem + '`'));
  const oldHash = hashRow.match(/`([a-f0-9]{64})`/)[1];
  const bytes = Buffer.from('synthetic-provenance-only:' + name);
  fs.writeFileSync(mapFile, map.replace(oldHash, createHash('sha256').update(bytes).digest('hex')));
  const filename = path.join(root, 'images/formal ver', name);
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  fs.writeFileSync(filename, bytes);
  return filename;
}
test('repeatable build, exact bytes, stale output removed, injected output rejected', () => fixture(root => {
  const first = build(root);
  assert.deepEqual(first, source.files);
  const hashes = Object.fromEntries(first.map(f => [f, fs.readFileSync(path.join(root, 'dist', f))]));
  fs.writeFileSync(path.join(root, 'dist', 'secret.txt'), 'must not publish');
  assert.throws(() => verifyOutput(root), /allowlist/);
  assert.deepEqual(build(root), first);
  for (const f of first) assert.deepEqual(fs.readFileSync(path.join(root, 'dist', f)), hashes[f]);
  assert.equal(fs.existsSync(path.join(root, 'dist', 'secret.txt')), false);
}));
test('manifest traversal rejected', () => fixture(root => {
  const p = path.join(root, 'scripts/public-files.json');
  const m = JSON.parse(fs.readFileSync(p)); m.files.push('../README.md'); fs.writeFileSync(p, JSON.stringify(m));
  assert.throws(() => build(root), /Not a public file/);
}));
test('source symlink rejected', () => fixture(root => {
  fs.unlinkSync(path.join(root, 'styles.css'));
  fs.symlinkSync(path.join(ROOT, 'styles.css'), path.join(root, 'styles.css'));
  assert.throws(() => build(root), /Symlink/);
}));
test('source parent symlink rejected', () => fixture(root => {
  fs.renameSync(path.join(root, 'about'), path.join(root, 'about-real'));
  fs.symlinkSync(path.join(root, 'about-real'), path.join(root, 'about'));
  assert.throws(() => build(root), /Symlink/);
}));
test('dist symlink rejected without deleting target', () => fixture(root => {
  fs.symlinkSync(path.join(root, 'about'), path.join(root, 'dist'));
  assert.throws(() => build(root), /real directory/);
  assert.equal(fs.existsSync(path.join(root, 'about/index.html')), true);
}));
test('nested output symlink rejected without following it', () => fixture(root => {
  build(root); fs.symlinkSync(path.join(root, 'about'), path.join(root, 'dist', 'leak'));
  assert.throws(() => build(root), /Output symlink/);
}));
test('unapproved HTML resource fails before replacing previous output', () => fixture(root => {
  build(root); const previous = fs.readFileSync(path.join(root, 'dist/index.html'));
  change(root, 'index.html', '/styles.css', '/docs/private.css');
  assert.throws(() => build(root), /outside allowlist/);
  assert.deepEqual(fs.readFileSync(path.join(root, 'dist/index.html')), previous);
}));
test('encoded traversal URL rejected', () => fixture(root => {
  change(root, 'index.html', '/styles.css', '/%2e%2e/styles.css');
  assert.throws(() => build(root), /Unsafe URL/);
}));
test('delivery build and verification work without originals; strict original audit refuses absence', () => fixture(root => {
  assert.equal(fs.existsSync(path.join(root, 'images/formal ver')), false);
  assert.equal(build(root).length, 40);
  assert.equal(verifyOutput(root).length, 40);
  assert.throws(() => sourceInventory(root, { requireOriginals: true }), /ENOENT/);
}));
test('changed original rejected', () => fixture(root => {
  const filename = archiveOriginal(root);
  assert.equal(build(root).length, 40); // A present, matching original is checked.
  fs.appendFileSync(filename, 'changed');
  assert.throws(() => build(root), /hash mismatch/);
}));

for (const asset of ['images/web/space/DSC_0030-400.webp', 'images/web/logo-header.png']) {
  test(`changed delivery bytes fail without originals and preserve previous output: ${asset}`, () => fixture(root => {
    build(root);
    const previous = fs.readFileSync(path.join(root, 'dist', asset));
    const bytes = fs.readFileSync(path.join(root, asset));
    bytes[bytes.length - 1] ^= 1; // Keep the container signature intact.
    fs.writeFileSync(path.join(root, asset), bytes);
    assert.throws(() => build(root), /Asset hash mismatch/);
    assert.throws(() => verifyOutput(root), /Asset hash mismatch/);
    assert.deepEqual(fs.readFileSync(path.join(root, 'dist', asset)), previous);
  }));
}
for (const kind of ['missing-entry', 'extra-entry', 'unsupported-version', 'invalid-hash']) {
  test(`invalid delivery integrity metadata is rejected: ${kind}`, () => fixture(root => {
    const filename = path.join(root, 'scripts/asset-integrity.json');
    const m = JSON.parse(fs.readFileSync(filename));
    const asset = 'images/web/space/DSC_0030-400.webp';
    if (kind === 'missing-entry') delete m.sha256[asset];
    if (kind === 'extra-entry') m.sha256['images/formal ver/private.jpeg'] = '0'.repeat(64);
    if (kind === 'unsupported-version') m.version = 2;
    if (kind === 'invalid-hash') m.sha256[asset] = 'invalid';
    fs.writeFileSync(filename, JSON.stringify(m));
    assert.throws(() => build(root), /integrity manifest|Invalid asset hash/);
  }));
}
test('missing delivery integrity manifest is rejected', () => fixture(root => {
  fs.unlinkSync(path.join(root, 'scripts/asset-integrity.json'));
  assert.throws(() => build(root), /ENOENT/);
}));
test('original mapping remains mandatory without archived originals', () => fixture(root => {
  change(root, 'docs/asset-map.md', '`DSC_0030.jpeg`', 'no-original-mapping');
  assert.throws(() => build(root), /Original mapping missing/);
}));
test('original hash metadata remains mandatory without archived originals', () => fixture(root => {
  change(root, 'docs/asset-map.md', '`f254b238e0be41618d00e9082101f81c183bc2a1b5170f0932ac14d8fa279114`', '`missing`');
  assert.throws(() => build(root), /Original hash missing/);
}));
test('dangling original symlink is not treated as optional absence', () => fixture(root => {
  const filename = archiveOriginal(root);
  fs.unlinkSync(filename);
  fs.symlinkSync(path.join(root, 'missing-original'), filename);
  assert.throws(() => build(root), /Symlink/);
}));
test('invalid original file type is not treated as optional absence', () => fixture(root => {
  const filename = archiveOriginal(root);
  fs.unlinkSync(filename); fs.mkdirSync(filename);
  assert.throws(() => build(root), /Not a regular file/);
}));
test('strict provenance audit succeeds only when all ten originals are present and match', () => fixture(root => {
  const map = fs.readFileSync(path.join(root, 'docs/asset-map.md'), 'utf8');
  const names = map.split('\n').filter(row => row.startsWith('|') && row.includes('使用中／'))
    .map(row => [...row.matchAll(/`([^`]+)`/g)][3][1]);
  assert.equal(names.length, 10);
  for (const name of names) archiveOriginal(root, name);
  assert.equal(sourceInventory(root, { requireOriginals: true }).files.length, 40);
}));
test('noindex removal rejected', () => fixture(root => {
  change(root, 'about/index.html', 'noindex, nofollow, noarchive', 'index, follow');
  assert.throws(() => build(root), /robots policy/);
}));
test('CONTACT activation rejected', () => fixture(root => {
  change(root, 'contact/index.html', 'data-endpoint-ready="false"', 'data-endpoint-ready="true"');
  assert.throws(() => build(root), /CONTACT must remain/);
}));

test('404 is required; a missing error page cannot replace the previous build', () => fixture(root => {
  build(root);
  const previous = fs.readFileSync(path.join(root, 'dist/404.html'));
  fs.unlinkSync(path.join(root, '404.html'));
  assert.throws(() => build(root), /ENOENT/);
  assert.deepEqual(fs.readFileSync(path.join(root, 'dist/404.html')), previous);
}));
test('404 must keep noindex and a valid root-relative return link', () => fixture(root => {
  assert.match(fs.readFileSync(path.join(root, '404.html'), 'utf8'), /href="\/"/);
  change(root, '404.html', 'href="/"', 'href="/missing-return-page/"');
  assert.throws(() => build(root), /outside allowlist/);
}));
test('404 noindex removal is rejected like the five normal pages', () => fixture(root => {
  change(root, '404.html', 'noindex, nofollow, noarchive', 'index, follow');
  assert.throws(() => build(root), /robots policy/);
}));
