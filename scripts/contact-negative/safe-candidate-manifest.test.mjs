import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import childProcess from 'node:child_process';
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SAFE_ASSET_BASELINE, validateSafeCandidateManifest as validate } from './safe-candidate-manifest.mjs';

const directory = path.resolve(fileURLToPath(new URL('./.generated/safe/', import.meta.url)));
const fixture = () => ({
  worker: 'bashiiin-coffee-contact-negative',
  bindings: [
    { name: 'E2E_MODE', type: 'plain_text', value: 'safe' },
    { name: 'CONTACT_API_ENABLED', type: 'plain_text', value: 'false' },
    { name: 'EMAIL_SENDING_ENABLED', type: 'plain_text', value: 'false' },
    { name: 'ASSETS', type: 'assets' },
    { name: 'TURNSTILE_SECRET_KEY', type: 'secret_text' },
  ],
  compatibility_date: '2026-10-28', compatibility_flags: [],
  assets: SAFE_ASSET_BASELINE.map(row => ({ ...row })),
});
const expect = (value, classification) => assert.equal(validate(value).classification, classification, 'fixed validation classification must match');

test('valid exact candidate matches recorded39 existing Assets without changing input', () => {
  const input = fixture(), before = JSON.stringify(input), output = validate(input);
  assert.equal(output.classification, 'PASS'); assert.equal(output.code, 'LOCAL_CANDIDATE_MATCH');
  assert.equal(JSON.stringify(input) === before, true, 'input is read-only');
  assert.equal(Object.isFrozen(output), true);
  assert(output.limitations.includes('NO_SERVER_INHERITANCE_GUARANTEE'));
});
test('binding and asset ordering do not imply server configuration', () => {
  const value = fixture(); value.bindings.reverse(); value.assets.reverse(); expect(value, 'PASS');
});
test('baseline is immutable and contains exactly39 unique paths', () => {
  assert.equal(SAFE_ASSET_BASELINE.length, 39);
  assert.equal(new Set(SAFE_ASSET_BASELINE.map(x => x.path)).size, 39);
  assert.throws(() => { SAFE_ASSET_BASELINE[0].sha256 = 'synthetic'; });
  assert.throws(() => { SAFE_ASSET_BASELINE.push({}); });
});
for (const [label, mutate] of [
  ['non-safe mode', m => { m.bindings[0].value = 'negative'; }],
  ['boolean false API', m => { m.bindings[1].value = false; }],
  ['boolean false mail', m => { m.bindings[2].value = false; }],
  ['true API', m => { m.bindings[1].value = 'true'; }],
  ['true mail', m => { m.bindings[2].value = 'true'; }],
  ['Secret value field', m => { m.bindings[4].value = 'SYNTHETIC_NOT_A_SECRET'; }],
  ['Secret text field', m => { m.bindings[4].text = 'SYNTHETIC_NOT_A_SECRET'; }],
  ['Secret absent', m => { m.bindings.pop(); }],
  ['unknown Secret', m => { m.bindings[4].name = 'OTHER_SECRET'; }],
  ['duplicate name', m => { m.bindings[4] = { ...m.bindings[3] }; }],
  ['unknown type', m => { m.bindings[3].type = 'unknown'; }],
  ['extra binding', m => { m.bindings.push({ name: 'OTHER', type: 'plain_text', value: 'synthetic' }); }],
  ['missing assets binding', m => { m.bindings.splice(3, 1); }],
  ['assets binding extra property', m => { m.bindings[3].id = 'synthetic'; }],
  ['binding wrong structure', m => { m.bindings[3] = []; }],
  ['binding inherited property', m => { m.bindings[3] = Object.assign(Object.create({ remote: true }), m.bindings[3]); }],
  ['binding sparse array', m => { delete m.bindings[0]; }],
  ['binding array extra property', m => { m.bindings.remote = true; }],
  ['wrong worker', m => { m.worker = 'bashiiin-coffee-staging'; }],
  ['wrong date', m => { m.compatibility_date = '2026-10-29'; }],
  ['missing date', m => { delete m.compatibility_date; }],
  ['date wrong type', m => { m.compatibility_date = 20261028; }],
  ['extra flag', m => { m.compatibility_flags.push('nodejs_compat'); }],
  ['flags absent', m => { delete m.compatibility_flags; }],
  ['flags wrong type', m => { m.compatibility_flags = ''; }],
  ['flags extra property', m => { m.compatibility_flags.extra = true; }],
  ['assets missing', m => { m.assets.pop(); }],
  ['assets excess', m => { m.assets.push({ path: 'extra.txt', sha256: '0'.repeat(64) }); }],
  ['assets hash mismatch', m => { m.assets[0].sha256 = '0'.repeat(64); }],
  ['asset absent hash', m => { delete m.assets[0].sha256; }],
  ['asset hash wrong type', m => { m.assets[0].sha256 = false; }],
  ['asset duplicate', m => { m.assets[1] = { ...m.assets[0] }; }],
  ['asset link declaration', m => { m.assets[0].symlink = true; }],
  ['assets sparse', m => { delete m.assets[0]; }],
  ['assets wrong type', m => { m.assets = {}; }],
  ['unrecognized root property', m => { m.remote = true; }],
]) test('reject ' + label, () => { const m = fixture(); mutate(m); expect(m, 'REJECT'); });
for (const type of ['send_email', 'durable_object_namespace', 'service', 'ratelimit', 'email', 'secret_key']) {
  test('reject forbidden type even with an allowed binding name: ' + type, () => {
    const m = fixture(); m.bindings[3].type = type; expect(m, 'REJECT');
  });
}
for (const name of ['EMAIL', 'RAW_EMAIL', 'DELIVERY_GUARD', 'CONTACT_RATE_LIMITER', 'SERVICE']) {
  test('reject forbidden name even with an allowed type: ' + name, () => {
    const m = fixture(); m.bindings[3].name = name; expect(m, 'REJECT');
  });
}
for (const key of ['keepSecrets', 'keep-secrets', 'keepVars', 'keep-vars', 'secrets.required', 'keep_bindings', 'inherit', 'version_id', 'previous_upload', 'secrets']) {
  test('reject inheritance or undeclared key regardless of false value: ' + key, () => {
    const m = fixture(); m[key] = false; expect(m, 'REJECT');
  });
}
for (const [label, value] of [['parent', '../index.html'], ['absolute', '/index.html'], ['backslash', 'about\\index.html'],
  ['dot', './index.html'], ['empty segment', 'about//index.html'], ['NUL', 'index\0.html'], ['unlisted', 'other.html']]) {
  test('reject asset path ' + label, () => { const m = fixture(); m.assets[0].path = value; expect(m, 'REJECT'); });
}
for (const [label, value] of [['undefined', undefined], ['null', null], ['array', []], ['string', '{broken JSON'], ['number', 1], ['boolean', false], ['date object', new Date(0)]]) {
  test('invalid input ' + label, () => expect(value, 'INVALID_INPUT'));
}
test('input accessors are rejected without invoking the getter', () => {
  const m = fixture(); let calls = 0;
  Object.defineProperty(m, 'worker', { enumerable: true, get() { calls++; throw Error('SYNTHETIC_PRIVATE_SENTINEL'); } });
  expect(m, 'INVALID_INPUT'); assert.equal(calls, 0);
});
test('Proxy input is rejected without invoking traps', () => {
  let calls = 0; const m = new Proxy(fixture(), { get() { calls++; throw Error('SYNTHETIC_PRIVATE_SENTINEL'); }, ownKeys() { calls++; return []; } });
  expect(m, 'INVALID_INPUT'); assert.equal(calls, 0);
});
test('symbol property cannot hide extra settings', () => {
  const m = fixture(); m[Symbol('synthetic')] = true; expect(m, 'INVALID_INPUT');
});
test('Secret getter rejected without reading or echoing the synthetic value', () => {
  const m = fixture(); let calls = 0;
  Object.defineProperty(m.bindings[4], 'value', { enumerable: true, get() { calls++; throw Error('SYNTHETIC_PRIVATE_SENTINEL'); } });
  const output = validate(m); assert.equal(output.classification, 'REJECT'); assert.equal(calls, 0);
  assert.equal(JSON.stringify(output).includes('SYNTHETIC_PRIVATE_SENTINEL'), false);
});

// Virtual read-only faults: never create links, files or directories on disk.
test('reject existing root as a virtual symlink', t => {
  const original = fs.lstatSync;
  t.mock.method(fs, 'lstatSync', (file, ...args) => String(file) === directory
    ? { isSymbolicLink: () => true } : original(file, ...args));
  expect(fixture(), 'REJECT');
});
test('reject virtual leaf symlink', t => {
  const target = path.join(directory, SAFE_ASSET_BASELINE[0].path), original = fs.lstatSync;
  t.mock.method(fs, 'lstatSync', (file, ...args) => String(file) === target
    ? { isSymbolicLink: () => true } : original(file, ...args));
  expect(fixture(), 'REJECT');
});
test('reject a virtual missing asset on disk', t => {
  const original = fs.readdirSync;
  t.mock.method(fs, 'readdirSync', (file, ...args) => {
    const rows = original(file, ...args);
    return String(file) === directory ? rows.filter(row => row.name !== 'index.html') : rows;
  });
  expect(fixture(), 'REJECT');
});
test('reject a virtual extra asset on disk', t => {
  const original = fs.readdirSync;
  t.mock.method(fs, 'readdirSync', (file, ...args) => String(file) === directory
    ? [...original(file, ...args), { name: 'SYNTHETIC_EXTRA_FILE' }] : original(file, ...args));
  expect(fixture(), 'REJECT');
});
test('reject disk content mismatch instead of accepting manifest hashes alone', t => {
  const read = fs.readFileSync, open = fs.openSync, close = fs.closeSync, assetFDs = new Set(); let assetReads = 0;
  t.mock.method(fs, 'openSync', (file, ...args) => {
    const fd = open(file, ...args); if (String(file).startsWith(directory + path.sep)) assetFDs.add(fd); return fd;
  });
  t.mock.method(fs, 'closeSync', fd => { assetFDs.delete(fd); return close(fd); });
  t.mock.method(fs, 'readFileSync', (file, ...args) => {
    if (assetFDs.has(file)) { assetReads++; return Buffer.from('SYNTHETIC_MISMATCH'); }
    return read(file, ...args);
  });
  expect(fixture(), 'REJECT'); assert.equal(assetReads, 1); assert.equal(assetFDs.size, 0);
});
test('missing allowlist fails closed', t => {
  t.mock.method(fs, 'readFileSync', () => { throw Error('SYNTHETIC_PRIVATE_SENTINEL'); });
  const output = validate(fixture()); assert.equal(output.classification, 'REJECT');
  assert.equal(JSON.stringify(output).includes('SYNTHETIC_PRIVATE_SENTINEL'), false);
});
test('altered allowlist hash is rejected without rebuilding the baseline', t => {
  const read = fs.readFileSync;
  t.mock.method(fs, 'readFileSync', (file, ...args) => typeof file === 'number' ? Buffer.from('{"files":[]}') : read(file, ...args));
  expect(fixture(), 'REJECT');
});
test('read errors close the descriptor and do not expose their messages', t => {
  const close = fs.closeSync; let closed = 0;
  t.mock.method(fs, 'readFileSync', () => { throw Error('SYNTHETIC_PRIVATE_SENTINEL'); });
  t.mock.method(fs, 'closeSync', fd => { closed++; return close(fd); });
  const result = validate(fixture()); assert.equal(result.classification, 'REJECT'); assert.equal(closed, 1);
  assert.equal(JSON.stringify(result).includes('SYNTHETIC_PRIVATE_SENTINEL'), false);
});
test('no output, transport, process launch or writer is used by validation', t => {
  const denied = () => { throw Error('FORBIDDEN_SIDE_EFFECT'); };
  for (const method of ['log', 'warn', 'error']) t.mock.method(console, method, denied);
  for (const method of ['writeFileSync', 'mkdirSync', 'rmSync', 'unlinkSync', 'renameSync', 'appendFileSync']) t.mock.method(fs, method, denied);
  t.mock.method(globalThis, 'fetch', denied);
  for (const method of ['spawn', 'spawnSync', 'exec', 'execSync', 'execFile', 'execFileSync', 'fork']) t.mock.method(childProcess, method, denied);
  for (const transport of [http, https]) for (const method of ['request', 'get']) t.mock.method(transport, method, denied);
  for (const method of ['connect', 'createConnection']) t.mock.method(net, method, denied);
  t.mock.method(net.Socket.prototype, 'connect', denied);
  expect(fixture(), 'PASS');
});
test('import and reimport retain the guarded fetch function without filesystem writes', async t => {
  const fetchBefore = globalThis.fetch;
  const denied = () => { throw Error('IMPORT_SIDE_EFFECT'); };
  for (const method of ['writeFileSync', 'mkdirSync', 'rmSync', 'unlinkSync']) t.mock.method(fs, method, denied);
  t.mock.method(globalThis, 'fetch', denied);
  const guarded = globalThis.fetch;
  const a = await import('./safe-candidate-manifest.mjs?passive=one');
  assert.equal(await import('./safe-candidate-manifest.mjs?passive=one'), a);
  await import('./safe-candidate-manifest.mjs?passive=two');
  assert.equal(globalThis.fetch, guarded);
  assert.equal(typeof fetchBefore, 'function');
});
