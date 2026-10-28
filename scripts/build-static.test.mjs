import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ROOT, build, verifyOutput, sourceInventory } from './build-static.mjs';

// All destructive/negative cases operate on disposable copies, never real site sources.
const source = sourceInventory();
function fixture(run) {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'bashiiin-build-test-')));
  const map = fs.readFileSync(path.join(ROOT, 'docs/asset-map.md'), 'utf8');
  const originals = new Set();
  for (const row of map.split('\n').filter(x => x.includes('使用中／'))) {
    originals.add('images/formal ver/' + [...row.matchAll(/`([^`]+)`/g)][3][1]);
  }
  const files = [...source.files, 'scripts/public-files.json', 'docs/asset-map.md', ...originals];
  for (const f of files) {
    fs.mkdirSync(path.dirname(path.join(root, f)), { recursive: true });
    fs.copyFileSync(path.join(ROOT, f), path.join(root, f));
  }
  try { run(root); } finally { fs.rmSync(root, { recursive: true, force: true }); }
}
const change = (root, f, from, to) => fs.writeFileSync(path.join(root, f), fs.readFileSync(path.join(root, f), 'utf8').replace(from, to));
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
test('missing original provenance rejected', () => fixture(root => {
  fs.unlinkSync(path.join(root, 'images/formal ver/DSC_0052.webp'));
  assert.throws(() => build(root), /ENOENT/);
}));
test('changed original rejected', () => fixture(root => {
  fs.appendFileSync(path.join(root, 'images/formal ver/DSC_0052.webp'), 'changed');
  assert.throws(() => build(root), /hash mismatch/);
}));
test('noindex removal rejected', () => fixture(root => {
  change(root, 'about/index.html', 'noindex, nofollow, noarchive', 'index, follow');
  assert.throws(() => build(root), /robots policy/);
}));
test('CONTACT activation rejected', () => fixture(root => {
  change(root, 'contact/index.html', 'data-endpoint-ready="false"', 'data-endpoint-ready="true"');
  assert.throws(() => build(root), /CONTACT must remain/);
}));
