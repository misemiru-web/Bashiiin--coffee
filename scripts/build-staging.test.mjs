import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ROOT, build, sourceInventory, verifyOutput } from './build-static.mjs';
import { buildStaging, verifyStaging, STAGING_HOSTNAME } from './build-staging.mjs';

const env = { STAGING_TURNSTILE_SITE_KEY: '1x00000000000000000000AA' };
const source = sourceInventory();
function fixture(run) {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'bashiiin-staging-test-')));
  const map = fs.readFileSync(path.join(ROOT, 'docs/asset-map.md'), 'utf8');
  const originals = map.split('\n').filter(row => row.includes('使用中／')).map(row => 'images/formal ver/' + [...row.matchAll(/`([^`]+)`/g)][3][1]);
  for (const file of new Set([...source.files, ...originals, 'scripts/public-files.json', 'docs/asset-map.md', 'wrangler.jsonc', 'wrangler.staging.jsonc'])) {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.copyFileSync(path.join(ROOT, file), path.join(root, file));
  }
  try { run(root); } finally { fs.rmSync(root, { recursive: true, force: true }); }
}
test('staging changes only CONTACT attributes; isolated normal output remains byte-identical', () => fixture(root => {
  build(root); buildStaging(root, env);
  assert.equal(verifyStaging(root, env).length, 39); assert.equal(verifyOutput(root).length, 39);
  for (const file of source.files) {
    const normal = fs.readFileSync(path.join(root, 'dist', file));
    const staging = fs.readFileSync(path.join(root, 'dist-staging', file));
    assert.deepEqual(normal, source.buffers.get(file));
    if (file !== 'contact/index.html') assert.deepEqual(normal, staging);
    else {
      const restored = staging.toString()
        .replace(` data-turnstile-mode="staging-verify-only" data-turnstile-hostname="${STAGING_HOSTNAME}"`, '')
        .replace(`data-sitekey="${env.STAGING_TURNSTILE_SITE_KEY}"`, 'data-sitekey=""');
      assert.equal(restored, normal.toString());
      assert.match(staging.toString(), /data-endpoint-ready="false"/);
    }
  }
  assert.throws(() => verifyOutput(root, source, path.join(root, 'dist-staging')), /content mismatch/);
  build(root); assert.equal(verifyStaging(root, env).length, 39);
}));
for (const key of [undefined, '', ' ', 'invalid', 'x'.repeat(35), '"'.repeat(22), '0x' + 'a'.repeat(19), '1x00000000000000000000AA\n']) {
  test(`missing/malformed public key is rejected (${typeof key}, length ${key?.length ?? 0})`, () => fixture(root => {
    assert.throws(() => buildStaging(root, { STAGING_TURNSTILE_SITE_KEY: key }), /Site Key|SITE_KEY/);
    assert.equal(fs.existsSync(path.join(root, 'dist-staging')), false);
  }));
}
for (const [from, to] of [
  ['bashiiin-coffee-staging', 'other-worker'], ['"workers_dev": true', '"workers_dev": false'],
  ['"preview_urls": false', '"preview_urls": true'], ['"./dist-staging"', '"./dist"'],
  ['"CONTACT_API_ENABLED": "false"', '"CONTACT_API_ENABLED": "true"'],
  ['"EMAIL_SENDING_ENABLED": "false"', '"EMAIL_SENDING_ENABLED": "true"'],
  ['"/api/*"', '"/*"'], ['"none"', '"single-page-application"'],
  ['"send_metrics": false', '"routes": [], "send_metrics": false'],
]) {
  test(`unsafe staging configuration rejected: ${from}`, () => fixture(root => {
    const filename = path.join(root, 'wrangler.staging.jsonc');
    fs.writeFileSync(filename, fs.readFileSync(filename, 'utf8').replace(from, to));
    assert.throws(() => buildStaging(root, env));
    assert.equal(fs.existsSync(path.join(root, 'dist-staging')), false);
  }));
}
test('staging verifier detects extra files and altered HTML; rebuild removes stale files', () => fixture(root => {
  buildStaging(root, env);
  fs.writeFileSync(path.join(root, 'dist-staging', 'private.txt'), 'fixture only');
  assert.throws(() => verifyStaging(root, env), /allowlist/);
  buildStaging(root, env);
  fs.appendFileSync(path.join(root, 'dist-staging/contact/index.html'), 'altered');
  assert.throws(() => verifyStaging(root, env), /content mismatch/);
}));
for (const nested of [false, true]) {
  test(`staging output ${nested ? 'nested' : 'root'} symlink rejected without affecting source`, () => fixture(root => {
    if (nested) buildStaging(root, env);
    fs.symlinkSync(path.join(root, 'about'), path.join(root, 'dist-staging', ...(nested ? ['leak'] : [])));
    assert.throws(() => buildStaging(root, env), /real directory|symlink/);
    assert.equal(fs.existsSync(path.join(root, 'about/index.html')), true);
  }));
}
test('staging configuration symlink is rejected', () => fixture(root => {
  fs.unlinkSync(path.join(root, 'wrangler.staging.jsonc'));
  fs.symlinkSync(path.join(ROOT, 'wrangler.staging.jsonc'), path.join(root, 'wrangler.staging.jsonc'));
  assert.throws(() => buildStaging(root, env), /Symlink/);
}));
test('secret environment values are never interpolated into output', () => fixture(root => {
  const marker = 'synthetic-private-marker-not-a-key';
  buildStaging(root, { ...env, TURNSTILE_SECRET_KEY: marker, CONTACT_TO: marker });
  for (const file of source.files) assert.equal(fs.readFileSync(path.join(root, 'dist-staging', file), 'utf8').includes(marker), false);
}));

test('normal build ignores staging environment and cannot consume its output', () => fixture(root => {
  const previous = process.env.STAGING_TURNSTILE_SITE_KEY;
  try {
    process.env.STAGING_TURNSTILE_SITE_KEY = env.STAGING_TURNSTILE_SITE_KEY;
    buildStaging(root, env); build(root);
    const html = fs.readFileSync(path.join(root, 'dist/contact/index.html'), 'utf8');
    assert.match(html, /data-sitekey=""/); assert.equal(html.includes('staging-verify-only'), false);
    assert.equal(verifyOutput(root).length, 39);
  } finally {
    if (previous === undefined) delete process.env.STAGING_TURNSTILE_SITE_KEY;
    else process.env.STAGING_TURNSTILE_SITE_KEY = previous;
  }
}));
test('missing key never verifies or replaces previous staging output', () => fixture(root => {
  buildStaging(root, env);
  const before = fs.readFileSync(path.join(root, 'dist-staging/contact/index.html'));
  assert.throws(() => buildStaging(root, {})); assert.throws(() => verifyStaging(root, {}));
  assert.deepEqual(fs.readFileSync(path.join(root, 'dist-staging/contact/index.html')), before);
}));

for (const [label, binding] of [
  ['missing', undefined], ['empty', []], ['unrestricted', [{ name: 'EMAIL' }]],
  ['different destination', [{ name: 'EMAIL', destination_address: 'other@fixture.test' }]],
  ['different name', [{ name: 'OTHER', destination_address: 'misemiruweb@gmail.com' }]],
  ['extra binding', [{ name: 'EMAIL', destination_address: 'misemiruweb@gmail.com' }, { name: 'UNRESTRICTED' }]],
  ['remote development', [{ name: 'EMAIL', destination_address: 'misemiruweb@gmail.com', remote: true }]],
  ['recipient allowlist instead of fixed destination', [{ name: 'EMAIL', allowed_destination_addresses: ['misemiruweb@gmail.com'] }]],
]) {
  test(`staging rejects email binding ${label}`, () => fixture(root => {
    const file = path.join(root, 'wrangler.staging.jsonc');
    const config = JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\s*\/\/.*$/gm, ''));
    if (binding === undefined) delete config.send_email; else config.send_email = binding;
    fs.writeFileSync(file, JSON.stringify(config));
    assert.throws(() => buildStaging(root, env), /approved fixed destination/);
    assert.equal(fs.existsSync(path.join(root, 'dist-staging')), false);
  }));
}

const approvedRateLimiter = { name: 'CONTACT_RATE_LIMITER', namespace_id: '31001', simple: { limit: 5, period: 60 } };
for (const [label, mutate] of [
  ['missing', config => { delete config.ratelimits; }],
  ['empty', config => { config.ratelimits = []; }],
  ['wrong name', config => { config.ratelimits[0].name = 'OTHER'; }],
  ['wrong namespace', config => { config.ratelimits[0].namespace_id = '31002'; }],
  ['numeric namespace', config => { config.ratelimits[0].namespace_id = 31001; }],
  ['namespace with leading zero', config => { config.ratelimits[0].namespace_id = '031001'; }],
  ['zero limit', config => { config.ratelimits[0].simple.limit = 0; }],
  ['different limit', config => { config.ratelimits[0].simple.limit = 6; }],
  ['string limit', config => { config.ratelimits[0].simple.limit = '5'; }],
  ['different period', config => { config.ratelimits[0].simple.period = 10; }],
  ['invalid period', config => { config.ratelimits[0].simple.period = 0; }],
  ['string period', config => { config.ratelimits[0].simple.period = '60'; }],
  ['additional binding', config => { config.ratelimits.push({ ...approvedRateLimiter, name: 'EXTRA' }); }],
  ['remote binding', config => { config.ratelimits[0].remote = true; }],
  ['remote proxy', config => { config.ratelimits[0].remoteProxyConnectionString = 'synthetic-test-only'; }],
  ['additional settings', config => { config.ratelimits[0].simple.extra = true; }],
]) {
  test(`staging rejects rate limiter ${label}`, () => fixture(root => {
    const file = path.join(root, 'wrangler.staging.jsonc');
    const config = JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\s*\/\/.*$/gm, ''));
    config.ratelimits = [structuredClone(approvedRateLimiter)];
    mutate(config);
    fs.writeFileSync(file, JSON.stringify(config));
    assert.throws(() => buildStaging(root, env), /approved fixed settings/);
    assert.equal(fs.existsSync(path.join(root, 'dist-staging')), false);
  }));
}
