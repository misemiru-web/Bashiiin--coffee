import { test as nodeTest } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import childProcess, { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { syncBuiltinESMExports, registerHooks } from 'node:module';
import * as api from './email-service-local.mjs';
import * as remote from './email-service-remote.mjs';
import { sourceInventory, verifyOutput } from './build-static.mjs';
const { runMock, MESSAGE, validateConfig, validateConsent, isolatedEnv } = api;
// Each scenario gets a fresh process. Production has no test-only reset switch.
let scenarioNumber = 0;
function test(name, run) {
  name = `${++scenarioNumber}: ${name}`; // Distinguish parameterized cases with equal labels.
  nodeTest(name, async () => {
    if (process.env.EMAIL_SCENARIO_CHILD === 'yes') return run();
    const pattern = '^' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$';
    execFileSync(process.execPath, ['--test', '--test-name-pattern', pattern, fileURLToPath(import.meta.url)], {
      env: { ...isolatedEnv(), EMAIL_SCENARIO_CHILD: 'yes' }, timeout: 15000, maxBuffer: 1024 * 1024,
    });
  });
}


const config = JSON.parse(fs.readFileSync(new URL('./wrangler.email-test.jsonc', import.meta.url), 'utf8'));
const account = 'a'.repeat(32);
async function fixture(run) {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'bashiiin-email-mock-')));
  try { await run(root); } finally { fs.chmodSync(root, 0o700); fs.rmSync(root, { recursive: true, force: true }); }
}
const lockFile = root => path.join(root, 'lock', 'delivery.lock');
function prelock(root) {
  fs.mkdirSync(path.join(root, 'lock'), { mode: 0o700 });
  fs.writeFileSync(lockFile(root), 'existing-unmodified-lock', { mode: 0o600 });
}
const expectBlocked = stats => { assert.equal(stats.result, 'BLOCKED'); assert.equal(stats.sendCalls, 0); };

test('default CLI is mock-only, fixed output, and uses a temporary lock', () => fixture(async root => {
  const result = execFileSync(process.execPath, ['scripts/email-service-local.mjs'], {
    env: { ...isolatedEnv(), TMPDIR: root, TURNSTILE_SECRET_KEY: 'private-sentinel', CONTACT_TO: 'other@fixture.test' }, encoding: 'utf8' });
  assert.equal(result, 'MOCK ACCEPTED sendCalls=1 (no remote connection)\n');
  const generated = fs.readdirSync(root); assert.equal(generated.length, 1);
  assert(fs.existsSync(path.join(root, generated[0], 'lock', 'delivery.lock')));
}));
test('no public send, grant, live connector, or main API remains', () => {
  assert.deepEqual(Object.keys(api).sort(), ['MESSAGE', 'assertMessage', 'isolatedEnv', 'runMock', 'validateConfig', 'validateConsent'].sort());
  assert.deepEqual(Object.keys(remote), ['verifyIdentity']);
});
test('old senderOnce bypass with an existing temporary lock calls send zero times', () => fixture(async root => {
  prelock(root); const before = fs.readFileSync(lockFile(root)); let sends = 0;
  const binding = { send: async () => { sends++; return { messageId: 'synthetic' }; } };
  assert.throws(() => api.senderOnce(binding));
  await assert.rejects(() => runMock({ root, binding }));
  expectBlocked(await runMock({ root }));
  assert.equal(sends, 0); assert.deepEqual(fs.readFileSync(lockFile(root)), before);
}));
for (const field of ['binding', 'state', 'grant', 'permit', 'locked', 'remote', 'acquireLock', 'identity', 'open', 'connect', 'send',
  'lockPath', 'directory', 'account', 'from', 'to', 'subject', 'text', 'cc', 'bcc', 'attachments', 'replyTo']) {
  test(`mock rejects injected ${field} before lock or provider calls`, () => fixture(async root => {
    let sends = 0;
    const value = field === 'remote' ? false : ['permit', 'locked'].includes(field) ? true : field === 'state' ? { remote: false, locked: true }
      : field === 'grant' ? {} : field === 'binding' ? { send: () => { sends++; } } : () => { sends++; return true; };
    await assert.rejects(() => runMock({ root, [field]: value }));
    assert.equal(sends, 0); assert.equal(fs.existsSync(lockFile(root)), false);
  }));
}
for (const [field, value] of [['from', 'other@fixture.test'], ['to', 'other@fixture.test'], ['subject', 'changed'],
  ['text', 'customer-sentinel'], ['cc', 'other@fixture.test'], ['bcc', 'other@fixture.test'], ['replyTo', 'other@fixture.test'], ['attachments', []]]) {
  test(`fixed message rejects ${field} change`, () => assert.throws(() => api.assertMessage({ ...MESSAGE, [field]: value })));
}
test('fixed content is frozen and matches the authorized synthetic notification', () => {
  assert(Object.isFrozen(MESSAGE)); api.assertMessage({ ...MESSAGE });
  assert.equal(MESSAGE.from, 'bashiiin-staging@misemiruweb.com'); assert.equal(MESSAGE.to, 'misemiruweb@gmail.com');
  assert.equal(MESSAGE.subject, '[STAGING TEST] Bashiiin! coffee メール基盤確認');
  assert.equal(MESSAGE.text, 'これはBashiiin! coffeeのStaging環境におけるメール送信基盤の検証です。実際のお問い合わせではありません。');
  assert.throws(() => { MESSAGE.to = 'other@fixture.test'; });
});
for (const scenario of ['success', 'failure', 'network', 'missing-receipt', 'empty-id', 'blank-id', 'wrong-id', 'timeout', 'late-acceptance']) {
  test(`locked mock ${scenario} makes exactly one provider call and retains the lock`, () => fixture(async root => {
    const result = await runMock({ root, scenario });
    assert.equal(result.sendCalls, 1); assert.equal(result.openCalls, 1); assert.equal(result.closeCalls, 1);
    assert.equal(result.result, scenario === 'success' ? 'ACCEPTED' : 'UNKNOWN_OR_REJECTED');
    assert.equal(fs.statSync(path.join(root, 'lock')).mode & 0o777, 0o700);
    assert.equal(fs.statSync(lockFile(root)).mode & 0o777, 0o600);
    const before = fs.readFileSync(lockFile(root));
    expectBlocked(await runMock({ root })); assert.deepEqual(fs.readFileSync(lockFile(root)), before);
  }));
}
for (const scenario of ['identity-mismatch', 'identity-unavailable', 'invalid-config', 'cancel-before-open', 'cancel-after-open', 'lock-removed', 'lock-replaced']) {
  test(`mock ${scenario} rejects before send and cannot re-arm`, () => fixture(async root => {
    const result = await runMock({ root, scenario }); expectBlocked(result);
    assert.equal(result.closeCalls, result.openCalls);
    if (['identity-mismatch', 'identity-unavailable', 'invalid-config', 'cancel-before-open'].includes(scenario)) assert.equal(result.openCalls, 0);
    expectBlocked(await runMock({ root }));
  }));
}
for (const count of [2, 10]) {
  test(`${count} concurrent mock calls share one process gate and one real temporary lock`, () => fixture(async root => {
    const results = await Promise.all(Array.from({ length: count }, () => runMock({ root })));
    assert.equal(results.reduce((sum, item) => sum + item.sendCalls, 0), 1);
    assert.equal(results.filter(item => item.result === 'ACCEPTED').length, 1);
  }));
}
test('different mock roots cannot mint separate process permits', () => fixture(async root => fixture(async other => {
  assert.equal((await runMock({ root })).sendCalls, 1);
  expectBlocked(await runMock({ root: other })); assert.equal(fs.existsSync(lockFile(other)), false);
})));
for (const invalid of [null, [], true, () => {}, Object.create(null)]) {
  test(`invalid mock options rejected (${typeof invalid}, array=${Array.isArray(invalid)}, null=${invalid === null})`, async () => {
    await assert.rejects(() => runMock(invalid));
  });
}
test('mock rejects accessor and symbol injections without evaluating them', async () => {
  let calls = 0;
  await assert.rejects(() => runMock({ get root() { calls++; return '/invalid'; } }));
  await assert.rejects(() => runMock({ [Symbol('binding')]: true })); assert.equal(calls, 0);
});
for (const scenario of ['--live', 'remote', 'arbitrary-provider']) {
  test(`mock scenario ${scenario} cannot select a live transport`, () => fixture(async root => {
    await assert.rejects(() => runMock({ root, scenario })); assert.equal(fs.existsSync(lockFile(root)), false);
  }));
}
for (const root of ['/not-a-mock-root', '.', '../escape', 1, false]) {
  test(`mock root format rejected (${typeof root}, ${String(root)})`, async () => assert.rejects(() => runMock({ root })));
}
const consent = { args: ['--live'], tty: true, account, confirmation: 'SEND ONE' };
test('pure consent validator accepts complete authorization without doing I/O', () => validateConsent(consent));
for (const patch of [{ args: [] }, { args: ['--live', '--live'] }, { args: ['--to=x'] }, { tty: false }, { tty: 'true' },
  { account: '' }, { account: 'wrong' }, { account: 'a'.repeat(31) }, { confirmation: '' }, { confirmation: 'no' }]) {
  test(`consent requires ${Object.keys(patch)[0]} (${JSON.stringify(patch)})`, () => assert.throws(() => validateConsent({ ...consent, ...patch })));
}
for (const identity of [{ loggedIn: false }, { loggedIn: true, accounts: [] }, { loggedIn: true, accounts: [{ id: 'b'.repeat(32) }] }]) {
  test(`identity mismatch is rejected (${JSON.stringify(identity)})`, () => assert.throws(() => remote.verifyIdentity(identity, account)));
}
test('pure account check accepts only the expected authenticated membership', () => remote.verifyIdentity({ loggedIn: true, accounts: [{ id: account }] }, account));
for (const patch of [{ send_email: [{ name: 'EMAIL' }] }, { send_email: [{ name: 'EMAIL', destination_address: 'other@fixture.test', remote: false }] },
  { send_email: [{ ...config.send_email[0], remote: true }] }, { routes: [] }, { vars: { TURNSTILE_SECRET_KEY: 'synthetic' } }, { workers_dev: true }]) {
  test(`dedicated config rejects ${JSON.stringify(patch)}`, () => assert.throws(() => validateConfig({ ...config, ...patch })));
}
test('dedicated config remains offline and has exactly one fixed binding', () => { validateConfig(config); assert.equal(config.send_email.length, 1); assert.equal(config.send_email[0].remote, false); });
test('isolated environment excludes credentials, recipient overrides, and Node hooks', () => {
  const env = isolatedEnv({ HOME: '/synthetic', PATH: '/bin', CONTACT_TO: 'other@fixture.test', NODE_OPTIONS: '--import=evil', TURNSTILE_SECRET_KEY: 'private', CLOUDFLARE_API_TOKEN: 'private' });
  for (const key of ['CONTACT_TO', 'NODE_OPTIONS', 'TURNSTILE_SECRET_KEY', 'CLOUDFLARE_API_TOKEN']) assert.equal(env[key], undefined);
  assert.equal(env.WRANGLER_WRITE_LOGS, 'false');
});

for (const file of ['email-service-local.mjs', 'email-service-remote.mjs', 'email-service-runtime-check.mjs']) {
  test(`fresh import of ${file} has no process, network, file, IPC or environment effects`, async () => {
    const before = { ...process.env }, beforeFetch = globalThis.fetch, beforeSend = process.send;
    const events = ['message', 'SIGINT', 'SIGTERM', 'SIGHUP'], listeners = events.map(event => process.listeners(event));
    const savedFS = {}, savedChild = {}; let forbidden = 0;
    const blocked = () => { forbidden++; throw Error('SIDE_EFFECT_FORBIDDEN'); };
    for (const method of ['writeFileSync', 'writeFile', 'appendFileSync', 'appendFile', 'mkdirSync', 'mkdir',
      'mkdtempSync', 'mkdtemp', 'rmSync', 'rm', 'unlinkSync', 'unlink', 'renameSync', 'rename', 'watch', 'createWriteStream']) {
      savedFS[method] = fs[method]; fs[method] = blocked;
    }
    savedFS.openSync = fs.openSync;
    fs.openSync = (filename, flags, ...args) => {
      if (typeof flags === 'number' ? flags & (fs.constants.O_WRONLY | fs.constants.O_RDWR | fs.constants.O_CREAT) : /[wax+]/.test(flags)) return blocked();
      return savedFS.openSync(filename, flags, ...args);
    };
    for (const method of ['spawn', 'spawnSync', 'fork', 'exec', 'execSync', 'execFile', 'execFileSync']) {
      savedChild[method] = childProcess[method]; childProcess[method] = blocked;
    }
    syncBuiltinESMExports(); globalThis.fetch = blocked; process.send = blocked;
    const hook = registerHooks({ resolve(specifier, context, next) {
      if (specifier === 'wrangler' || specifier.startsWith('wrangler/')) return blocked();
      return next(specifier, context);
    } });
    try {
      const url = new URL(file, import.meta.url); url.search = '?fresh-import-probe'; await import(url);
      assert.deepEqual({ ...process.env }, before); assert.equal(globalThis.fetch, blocked); assert.equal(process.send, blocked);
      events.forEach((event, i) => assert.deepEqual(process.listeners(event), listeners[i])); assert.equal(forbidden, 0);
    } finally {
      hook.deregister(); Object.assign(fs, savedFS); Object.assign(childProcess, savedChild); syncBuiltinESMExports();
      globalThis.fetch = beforeFetch; if (beforeSend === undefined) delete process.send; else process.send = beforeSend;
    }
  });
}
const raceCode = String.raw`
  import {runMock} from './scripts/email-service-local.mjs';
  globalThis.fetch=()=>{throw Error('EXTERNAL_NETWORK_FORBIDDEN');};
  const root=process.argv[1], scenario=process.argv[2];
  process.once('message',async()=>{
    try {const result=await runMock({root,scenario});process.stdout.write(JSON.stringify(result));process.exit(0);}
    catch {process.exit(2);}
  });
  process.send('ready');
`;
async function race(root, scenarios) {
  const children = [], ready = [], done = [];
  try {
    for (const scenario of scenarios) {
      const child = childProcess.spawn(process.execPath, ['--input-type=module', '-e', raceCode, root, scenario], {
        cwd: fileURLToPath(new URL('../', import.meta.url)), env: isolatedEnv(), stdio: ['ignore', 'pipe', 'ignore', 'ipc'],
      }); children.push(child);
      ready.push(new Promise((resolve, reject) => { child.once('message', resolve); child.once('error', reject); }));
      done.push(new Promise((resolve, reject) => {
        let text = ''; child.stdout.on('data', chunk => { text += chunk; }); child.once('error', reject);
        child.once('close', (code, signal) => resolve({ code, signal, result: text ? JSON.parse(text) : undefined }));
      }));
    }
    const timeout = new Promise((_, reject) => { const timer = setTimeout(() => reject(Error('MOCK_CHILD_TIMEOUT')), 5000); timer.unref(); });
    await Promise.race([Promise.all(ready), timeout]); for (const child of children) child.send('go');
    return await Promise.race([Promise.all(done), timeout]);
  } finally { for (const child of children) if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL'); }
}
for (const count of [2, 5]) {
  test(`${count} processes share one temporary persistent lock and send at most once`, () => fixture(async root => {
    const results = await race(root, Array(count).fill('success'));
    assert(results.every(item => item.code === 0));
    assert.equal(results.reduce((sum, item) => sum + item.result.sendCalls, 0), 1);
    assert.equal(results.filter(item => item.result.result === 'ACCEPTED').length, 1);
  }));
}
for (const scenario of ['success', 'failure', 'timeout']) {
  test(`fresh process cannot resend after ${scenario}`, () => fixture(async root => {
    const [first] = await race(root, [scenario]); assert.equal(first.result.sendCalls, 1);
    const before = fs.readFileSync(lockFile(root));
    const [second] = await race(root, ['success']); expectBlocked(second.result);
    assert.deepEqual(fs.readFileSync(lockFile(root)), before);
  }));
}
for (const scenario of ['crash-after-lock', 'interrupt-after-lock']) {
  test(`${scenario} retains lock and prevents a restarted process from sending`, () => fixture(async root => {
    const [first] = await race(root, [scenario]); assert.equal(first.signal, scenario === 'crash-after-lock' ? 'SIGKILL' : 'SIGINT');
    const before = fs.readFileSync(lockFile(root));
    const [second] = await race(root, ['success']); expectBlocked(second.result);
    assert.deepEqual(fs.readFileSync(lockFile(root)), before);
  }));
}
test('existing lock, including an empty partial lock, is never overwritten', () => fixture(async root => {
  prelock(root); fs.writeFileSync(lockFile(root), ''); expectBlocked(await runMock({ root }));
  assert.equal(fs.readFileSync(lockFile(root), 'utf8'), '');
}));
test('old lock is never automatically expired', () => fixture(async root => {
  prelock(root); const before = fs.readFileSync(lockFile(root)); fs.utimesSync(lockFile(root), new Date(0), new Date(0));
  expectBlocked(await runMock({ root })); assert.deepEqual(fs.readFileSync(lockFile(root)), before);
}));
for (const kind of ['directory file', 'directory symlink', 'ancestor symlink', 'public directory', 'lock symlink']) {
  test(`unsafe lock path rejects: ${kind}`, () => fixture(async root => {
    const directory = path.join(root, 'lock'), other = path.join(root, 'other'); fs.mkdirSync(other, { mode: 0o700 });
    if (kind === 'directory file') fs.writeFileSync(directory, 'unchanged');
    else if (kind === 'directory symlink') fs.symlinkSync(other, directory);
    else if (kind === 'ancestor symlink') {
      const linked = path.join(root, 'bashiiin-email-mock-linked'); fs.symlinkSync(other, linked);
      await assert.rejects(() => runMock({ root: linked })); assert.deepEqual(fs.readdirSync(other), []); return;
    } else {
      fs.mkdirSync(directory, { mode: kind === 'public directory' ? 0o755 : 0o700 });
      if (kind === 'lock symlink') { fs.writeFileSync(path.join(other, 'protected'), 'unchanged'); fs.symlinkSync(path.join(other, 'protected'), lockFile(root)); }
    }
    expectBlocked(await runMock({ root }));
    if (kind === 'directory symlink') assert.deepEqual(fs.readdirSync(other), []);
    if (kind === 'lock symlink') assert.equal(fs.readFileSync(path.join(other, 'protected'), 'utf8'), 'unchanged');
  }));
}
test('wrong owner is rejected before lock creation or send', () => fixture(async root => {
  fs.mkdirSync(path.join(root, 'lock'), { mode: 0o700 }); const original = fs.lstatSync;
  fs.lstatSync = (filename, ...args) => { const stat = original(filename, ...args); if (filename === path.join(root, 'lock')) stat.uid++; return stat; };
  try { expectBlocked(await runMock({ root })); assert.equal(fs.existsSync(lockFile(root)), false); }
  finally { fs.lstatSync = original; }
}));
test('filesystem creation failure blocks identity, transport and provider', () => fixture(async root => {
  const original = fs.openSync;
  fs.openSync = (filename, ...args) => { if (filename === lockFile(root)) throw Error('MOCK_PERMISSION_DENIED'); return original(filename, ...args); };
  try { const result = await runMock({ root }); expectBlocked(result); assert.equal(result.identityCalls, 0); assert.equal(result.openCalls, 0); }
  finally { fs.openSync = original; }
}));
test('lock is atomically exclusive and no-follow, with private owner and metadata', () => fixture(async root => {
  let seen; const original = fs.openSync;
  fs.openSync = (filename, flags, ...args) => { if (filename === lockFile(root)) seen = flags; return original(filename, flags, ...args); };
  try { assert.equal((await runMock({ root })).sendCalls, 1); } finally { fs.openSync = original; }
  for (const flag of ['O_CREAT', 'O_EXCL', 'O_NOFOLLOW']) assert(seen & fs.constants[flag]);
  const stat = fs.statSync(lockFile(root)); assert.equal(stat.uid, process.getuid()); assert.equal(stat.mode & 0o777, 0o600);
  const data = JSON.parse(fs.readFileSync(lockFile(root), 'utf8')); assert(data.attempt); assert.equal(data.pid, process.pid);
  assert.equal(JSON.stringify(data).includes(MESSAGE.to), false);
}));
test('an existing lock cannot be bypassed using old state.remote=false or arbitrary binding', () => fixture(async root => {
  prelock(root); let sends = 0; const binding = { send: () => { sends++; } };
  for (const options of [{ root, state: { remote: false }, binding }, { root, grant: { locked: true }, binding }, { root, acquireLock: () => true, binding }]) {
    await assert.rejects(() => runMock(options));
  }
  expectBlocked(await runMock({ root })); assert.equal(sends, 0);
}));
test('internal send helpers cannot be accessed through the remote module', () => {
  for (const key of ['senderOnce', 'sendReserved', 'runRemote', 'remoteAttempt', 'liveConnect', 'reserveAttempt', 'lockRemoteGrant']) {
    assert.equal(api[key], undefined); assert.equal(remote[key], undefined);
  }
});
test('no logs expose provider failures, tokens or customer data', () => fixture(async root => {
  const methods = ['log', 'warn', 'error', 'info', 'debug'], saved = {}, logs = [];
  for (const method of methods) { saved[method] = console[method]; console[method] = (...args) => logs.push(args); }
  try { assert.equal((await runMock({ root, scenario: 'failure' })).sendCalls, 1); assert.deepEqual(logs, []); }
  finally { Object.assign(console, saved); }
}));
for (const failure of [false, true]) {
  test(`offline runtime checker restores environment/fetch/dispatcher on ${failure ? 'exception' : 'success'}`, async () => {
    const { checkLocalRuntime } = await import('./email-service-runtime-check.mjs');
    const { getGlobalDispatcher } = await import('undici');
    const before = { ...process.env }, beforeFetch = globalThis.fetch, beforeDispatcher = getGlobalDispatcher(); let closed = 0;
    const loadRuntime = async () => ({ getPlatformProxy: async options => {
      assert.equal(options.remoteBindings, false); if (failure) throw Error('MOCK_START_FAILURE');
      return { env: { EMAIL: { send: () => assert.fail('must not send') } }, dispose: async () => { closed++; } };
    } });
    if (failure) await assert.rejects(() => checkLocalRuntime({ loadRuntime })); else await checkLocalRuntime({ loadRuntime });
    assert.deepEqual({ ...process.env }, before); assert.equal(globalThis.fetch, beforeFetch); assert.equal(getGlobalDispatcher(), beforeDispatcher);
    assert.equal(closed, failure ? 0 : 1);
  });
}
test('public allowlist remains 39 files and excludes all scripts', () => {
  const inventory = sourceInventory(); assert.equal(inventory.files.length, 39);
  assert(inventory.files.every(file => !file.startsWith('scripts/'))); assert.equal(verifyOutput().length, 39);
});
test('static sending graph has one private send site and no CONTACT route or IPC', () => {
  const source = fs.readFileSync(new URL('./email-service-local.mjs', import.meta.url), 'utf8');
  const remoteSource = fs.readFileSync(new URL('./email-service-remote.mjs', import.meta.url), 'utf8');
  assert.equal([...source.matchAll(/await sendNotification\(/g)].length, 1);
  assert.match(source, /const permit = claim\(directory\)/); assert.match(source, /const state = validatePermit\(permit\)/);
  assert.doesNotMatch(source, /state\.remote|contact\/api|contact\/turnstile|\/api\/contact|process\.send/);
  assert.doesNotMatch(remoteSource, /getPlatformProxy|sendNotification|process\.once/);
});
