// Private operator tool. Default execution never imports Wrangler or starts a remote session.
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { randomUUID } from 'node:crypto';
import { verifyIdentity } from './email-service-remote.mjs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createInterface } from 'node:readline/promises';
import { sendNotification } from '../worker/contact/mail.mjs';

export const MESSAGE = Object.freeze({
  from: 'bashiiin-staging@misemiruweb.com',
  to: 'misemiruweb@gmail.com',
  subject: '[STAGING TEST] Bashiiin! coffee メール基盤確認',
  text: 'これはBashiiin! coffeeのStaging環境におけるメール送信基盤の検証です。実際のお問い合わせではありません。',
});
const fail = () => { throw new Error('LOCAL_REJECTED'); };
export function assertMessage(message) {
  if (!message || JSON.stringify(message) !== JSON.stringify(MESSAGE)) fail();
}
export function validateConfig(config) {
  const expected = {
    $schema: '../node_modules/wrangler/config-schema.json', name: 'bashiiin-email-local-harness',
    compatibility_date: '2026-10-28', send_metrics: false, workers_dev: false, preview_urls: false,
    send_email: [{ name: 'EMAIL', destination_address: MESSAGE.to, remote: false }],
  };
  if (JSON.stringify(config) !== JSON.stringify(expected)) fail();
  return config;
}

// Private authority: no reset, state injection, grant export, or public send primitive.
let consumed = false;
const permits = new WeakMap();
function acquireDirectoryLock(directory) {
  const uid = process.getuid();
  if (!path.isAbsolute(directory) || path.resolve(directory) !== directory) fail();
  const inspectParents = () => {
    let current = path.parse(directory).root;
    for (const part of directory.slice(current.length).split(path.sep).filter(Boolean)) {
      current = path.join(current, part);
      const stat = fs.lstatSync(current);
      if (!stat.isDirectory() || stat.isSymbolicLink()) fail();
    }
  };
  // Never create missing ancestors or follow a symlink in any path component.
  const parent = path.dirname(directory);
  let current = path.parse(parent).root;
  for (const part of parent.slice(current.length).split(path.sep).filter(Boolean)) {
    current = path.join(current, part);
    const stat = fs.lstatSync(current);
    if (!stat.isDirectory() || stat.isSymbolicLink()) fail();
  }
  try { fs.mkdirSync(directory, { mode: 0o700 }); }
  catch (error) { if (error.code !== 'EEXIST') throw Error('LOCK_UNAVAILABLE'); }
  inspectParents();
  const before = fs.lstatSync(directory);
  if (before.uid !== uid || (before.mode & 0o777) !== 0o700) fail();
  let directoryFD, lockFD, issued = false;
  try {
    directoryFD = fs.openSync(directory, fs.constants.O_RDONLY | fs.constants.O_DIRECTORY | fs.constants.O_NOFOLLOW);
    const opened = fs.fstatSync(directoryFD);
    if (opened.ino !== before.ino || opened.dev !== before.dev) fail();
    // wx equivalent plus O_NOFOLLOW: atomic creation, no overwrite, no symlink following.
    lockFD = fs.openSync(path.join(directory, 'delivery.lock'),
      fs.constants.O_WRONLY | fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_NOFOLLOW, 0o600);
    const stat = fs.fstatSync(lockFD);
    if (!stat.isFile() || stat.uid !== uid || stat.nlink !== 1 || (stat.mode & 0o777) !== 0o600) fail();
    fs.writeFileSync(lockFD, JSON.stringify({ version: 1, purpose: 'email-delivery-test',
      attempt: randomUUID(), pid: process.pid, createdAt: new Date().toISOString() }) + '\n');
    fs.fsyncSync(lockFD);
    inspectParents();
    const after = fs.lstatSync(directory), named = fs.lstatSync(path.join(directory, 'delivery.lock'));
    if (after.ino !== opened.ino || after.dev !== opened.dev || after.uid !== uid || (after.mode & 0o777) !== 0o700
      || named.ino !== stat.ino || named.dev !== stat.dev || !named.isFile() || named.isSymbolicLink()) fail();
    fs.fsyncSync(directoryFD);
    const permit = Object.freeze({});
    permits.set(permit, { used: false, closed: false, lockFD, directory, directoryIno: opened.ino, directoryDev: opened.dev, ino: stat.ino, dev: stat.dev });
    issued = true; // Keep the descriptor open until this session ends; prevent inode reuse.
    return permit;
  } catch { throw Error('LOCK_UNAVAILABLE'); }
  finally {
    if (!issued && lockFD !== undefined) fs.closeSync(lockFD);
    if (directoryFD !== undefined) fs.closeSync(directoryFD);
    // NEVER unlink: retain even after partial creation, errors, or cancellation.
  }
}

function claim(directory) {
  if (consumed) fail();
  consumed = true; // Synchronous, before any asynchronous authentication or send.
  return acquireDirectoryLock(directory);
}
function validatePermit(permit) {
  const state = permits.get(permit);
  if (!state || state.used || state.closed) fail();
  const held = fs.fstatSync(state.lockFD);
  const directory = fs.lstatSync(state.directory);
  const lock = fs.lstatSync(path.join(state.directory, 'delivery.lock'));
  if (!directory.isDirectory() || directory.isSymbolicLink() || directory.uid !== process.getuid()
    || (directory.mode & 0o777) !== 0o700 || directory.ino !== state.directoryIno || directory.dev !== state.directoryDev
    || !lock.isFile() || lock.isSymbolicLink() || lock.uid !== process.getuid() || (lock.mode & 0o777) !== 0o600
    || lock.ino !== state.ino || lock.dev !== state.dev || lock.nlink !== 1
    || held.ino !== lock.ino || held.dev !== lock.dev || held.nlink !== 1) fail();
  return state;
}
async function deliver(binding, permit, timeout) {
  const state = validatePermit(permit);
  if (typeof binding?.send !== 'function') fail();
  state.used = true; // Never re-arm, even if the provider throws or times out.
  try { await sendNotification(binding, { ...MESSAGE }, timeout); return 'ACCEPTED'; }
  catch { return 'UNKNOWN_OR_REJECTED'; }
}
// Both adapters are constructed privately below, never supplied by an API caller.
async function execute(directory, adapter) {
  const permit = claim(directory);
  let platform;
  try {
    adapter.afterLock?.();
    const active = () => { if (adapter.signal?.aborted) throw Error('CANCELLED'); };
    active();
    const config = validateConfig(adapter.config());
    const identity = await adapter.identity();
    active(); verifyIdentity(identity, adapter.account);
    platform = await adapter.open(config);
    active();
    return await deliver(platform.env.EMAIL, permit, adapter.timeout);
  } finally {
    try { await platform?.dispose(); }
    finally { const state = permits.get(permit); state.closed = true; fs.closeSync(state.lockFD); }
  }
}
export function isolatedEnv(source = process.env) {
  const env = {};
  for (const key of ['PATH', 'HOME', 'TMPDIR', 'XDG_CONFIG_HOME']) if (source[key]) env[key] = source[key];
  return { ...env, CI: 'true', BROWSER: 'false', WRANGLER_SEND_METRICS: 'false',
    WRANGLER_WRITE_LOGS: 'false', WRANGLER_LOG: 'none', CLOUDFLARE_CF_FETCH_ENABLED: 'false' };
}
const mockScenarios = Object.freeze(['success', 'failure', 'network', 'missing-receipt', 'empty-id', 'blank-id',
  'wrong-id', 'timeout', 'late-acceptance', 'identity-mismatch', 'identity-unavailable', 'invalid-config',
  'cancel-before-open', 'cancel-after-open', 'crash-after-lock', 'interrupt-after-lock', 'lock-removed', 'lock-replaced']);
function mockRoot(root) {
  const temp = fs.realpathSync(os.tmpdir());
  if (root === undefined) root = fs.mkdtempSync(path.join(temp, 'bashiiin-email-mock-'));
  // Reject outside paths lexically BEFORE accessing them (especially the live home).
  if (typeof root !== 'string' || !path.isAbsolute(root) || path.resolve(root) !== root
    || !root.startsWith(temp + path.sep) || !path.basename(root).startsWith('bashiiin-email-mock-')) fail();
  const stat = fs.lstatSync(root);
  if (!stat.isDirectory() || stat.isSymbolicLink() || stat.uid !== process.getuid()
    || (stat.mode & 0o777) !== 0o700 || fs.realpathSync(root) !== root) fail();
  return root;
}
export async function runMock(options = {}) {
  // No binding, state, grant, callback, remote switch, account, or lock-path injection.
  if (!options || Object.getPrototypeOf(options) !== Object.prototype
    || Reflect.ownKeys(options).some(key => !['root', 'scenario'].includes(key)
      || !Object.hasOwn(Object.getOwnPropertyDescriptor(options, key), 'value'))) fail();
  const scenario = options.scenario ?? 'success';
  if (!mockScenarios.includes(scenario)) fail();
  const root = mockRoot(options.root), directory = path.join(root, 'lock');
  const stats = { result: 'BLOCKED', sendCalls: 0, identityCalls: 0, openCalls: 0, closeCalls: 0 };
  const account = 'a'.repeat(32), controller = new AbortController();
  const config = JSON.parse(fs.readFileSync(new URL('./wrangler.email-test.jsonc', import.meta.url), 'utf8'));
  if (scenario === 'invalid-config') config.workers_dev = true;
  try {
    stats.result = await execute(directory, {
      account, timeout: 10, signal: controller.signal, config: () => config,
      afterLock: () => {
        if (scenario === 'crash-after-lock') process.kill(process.pid, 'SIGKILL');
        if (scenario === 'interrupt-after-lock') process.kill(process.pid, 'SIGINT');
      },
      identity: async () => {
        stats.identityCalls++;
        if (scenario === 'interrupt-after-lock') return new Promise(() => {});
        if (scenario === 'cancel-before-open') controller.abort();
        return { loggedIn: scenario !== 'identity-unavailable', accounts: [{ id: scenario === 'identity-mismatch' ? 'b'.repeat(32) : account }] };
      },
      open: async () => {
        stats.openCalls++;
        if (scenario === 'cancel-after-open') controller.abort();
        // These fault cases affect ONLY the already-validated temporary mock root.
        if (scenario === 'lock-removed' || scenario === 'lock-replaced') {
          fs.unlinkSync(path.join(directory, 'delivery.lock'));
          if (scenario === 'lock-replaced') fs.writeFileSync(path.join(directory, 'delivery.lock'), 'replacement', { mode: 0o600 });
        }
        return { env: { EMAIL: { send: async message => {
          assertMessage(message); stats.sendCalls++;
          if (scenario === 'failure' || scenario === 'network') throw Error('SYNTHETIC_PROVIDER_FAILURE');
          if (scenario === 'timeout') return new Promise(() => {});
          if (scenario === 'late-acceptance') return new Promise(resolve => setTimeout(() => resolve({ messageId: 'synthetic-late' }), 20));
          if (scenario === 'missing-receipt') return undefined;
          return { messageId: scenario === 'empty-id' ? '' : scenario === 'blank-id' ? ' ' : scenario === 'wrong-id' ? 12 : 'synthetic-only' };
        } } }, dispose: async () => { stats.closeCalls++; } };
      },
    });
  } catch { /* Only fixed result codes are returned. No provider diagnostics. */ }
  return Object.freeze(stats);
}
export function validateConsent(value) {
  if (!value || JSON.stringify(value.args) !== '["--live"]' || value.tty !== true
    || !/^[0-9a-f]{32}$/.test(value.account) || value.confirmation !== 'SEND ONE') fail();
}
// The ONLY live entry is this private function, called by the direct CLI below.
async function runLive(account) {
  const previous = { ...process.env }, controller = new AbortController();
  const signals = ['SIGINT', 'SIGTERM', 'SIGHUP'], cancel = () => controller.abort();
  let directory;
  try {
    // No caller can replace this directory, adapter, or transport.
    const fixed = path.join(os.userInfo().homedir, '.bashiiin-email-verification');
    return await execute(fixed, {
      account, timeout: 5000, signal: controller.signal,
      config: () => {
        // Called AFTER claim acquired the fixed lock.
        for (const key of Object.keys(process.env)) delete process.env[key];
        Object.assign(process.env, isolatedEnv(previous));
        for (const signal of signals) process.once(signal, cancel);
        directory = fs.mkdtempSync(path.join(os.tmpdir(), 'bashiiin-email-live-'));
        return JSON.parse(fs.readFileSync(new URL('./wrangler.email-test.jsonc', import.meta.url), 'utf8'));
      },
      identity: async () => {
        const cli = fileURLToPath(new URL('../node_modules/wrangler/bin/wrangler.js', import.meta.url));
        const configPath = fileURLToPath(new URL('./wrangler.email-test.jsonc', import.meta.url));
        const { stdout } = await promisify(execFile)(process.execPath, [cli, 'whoami', '--json', '--config', configPath],
          { cwd: directory, env: process.env, timeout: 20000, maxBuffer: 128 * 1024, signal: controller.signal });
        return JSON.parse(stdout);
      },
      open: async config => {
        const { getPlatformProxy } = await import('wrangler');
        const filename = path.join(directory, 'wrangler.json');
        fs.writeFileSync(filename, JSON.stringify({ ...config, account_id: account,
          send_email: config.send_email.map(binding => ({ ...binding, remote: true })) }), { mode: 0o600 });
        return getPlatformProxy({ configPath: filename, remoteBindings: true, persist: false, envFiles: [] });
      },
    });
  } catch { return 'UNKNOWN_OR_REJECTED'; }
  finally {
    for (const signal of signals) process.removeListener(signal, cancel);
    try { if (directory) fs.rmSync(directory, { recursive: true, force: true }); }
    finally {
      for (const key of Object.keys(process.env)) delete process.env[key];
      Object.assign(process.env, previous);
    }
  }
}
async function question(text) {
  const terminal = createInterface({ input: process.stdin, output: process.stdout, terminal: true, historySize: 0 });
  try { return await terminal.question(text); } finally { terminal.close(); }
}
async function main(args) {
  if (args.length === 0) {
    const result = await runMock();
    console.log(`MOCK ${result.result} sendCalls=${result.sendCalls} (no remote connection)`);
    return result.result === 'ACCEPTED' ? 0 : 1;
  }
  if (JSON.stringify(args) !== '["--live"]') fail();
  if (!process.stdin.isTTY || !process.stdout.isTTY) fail();
  // main is private and direct-CLI-only; execute consumes the sole sending gate.
  if (consumed) fail();
  const account = await question('Dashboardで照合したCloudflare Account ID（キーではありません）: ');
  const confirmation = await question(`固定送信元 ${MESSAGE.from}\n固定宛先 ${MESSAGE.to}\n1回の実送信とremote接続を許可する場合だけ SEND ONE と入力: `);
  validateConsent({ args, tty: true, account, confirmation });
  const result = await runLive(account);
  console.log(result === 'ACCEPTED' ? 'LIVE ACCEPTED (inbox delivery unverified)' : 'FAIL UNKNOWN_OR_REJECTED (do not retry)');
  return result === 'ACCEPTED' ? 0 : 1;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).then(code => { process.exitCode = code; })
    .catch(() => { process.stderr.write('FAIL LOCAL_REJECTED\n'); process.exitCode = 1; });
}
