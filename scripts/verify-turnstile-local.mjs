// Local operator tool only. Never import CONTACT API, mail, Wrangler or browser credentials.
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { verifyTurnstile, SITEVERIFY } from '../worker/contact/turnstile.mjs';

export const HOSTNAME = 'bashiiin-coffee-staging.misemiruweb.workers.dev';
const offline = async () => { throw new Error('OFFLINE'); };
const safeError = code => Object.assign(new Error(code), { code });
const knownErrors = new Map([
  ['timeout-or-duplicate', 'TIMEOUT_OR_DUPLICATE'],
  ['invalid-input-response', 'INVALID_TOKEN'], ['missing-input-response', 'INVALID_TOKEN'],
  ['invalid-input-secret', 'SECRET_REJECTED'], ['missing-input-secret', 'SECRET_REJECTED'],
  ['internal-error', 'VERIFICATION_UNAVAILABLE'], ['bad-request', 'VERIFICATION_FAILED'],
]);
function validInput(value, max) {
  return typeof value === 'string' && value.length > 0 && value.length <= max && !/[^\x21-\x7e]/.test(value);
}

// No live fetch by default, even when imported. Only main's explicit --live branch supplies fetch.
export async function checkToken(token, secret, fetchImpl = offline, timeout = 5000) {
  const result = { ok: false, hostname: null, action: null, type: 'INPUT_REJECTED' };
  if (!validInput(secret, 4096) || !validInput(token, 2048)) return result;
  let remoteType;
  try {
    await verifyTurnstile(token, secret, HOSTNAME, async (url, init) => {
      if (url !== SITEVERIFY || init.method !== 'POST' || init.redirect !== 'manual') throw safeError('DESTINATION_REJECTED');
      const response = await fetchImpl(url, init); // Exactly one call; diagnostics reuse this response.
      return { ok: response.ok, json: async () => {
        const data = await response.json();
        result.hostname = data?.hostname === HOSTNAME;
        result.action = data?.action === 'contact';
        if (Array.isArray(data?.['error-codes'])) {
          for (const code of data['error-codes']) if (knownErrors.has(code)) { remoteType = knownErrors.get(code); break; }
        }
        return data;
      } };
    }, timeout);
    result.ok = true; result.type = 'VERIFIED';
  } catch (error) {
    result.type = error?.code === 'VERIFICATION_UNAVAILABLE' ? 'VERIFICATION_UNAVAILABLE'
      : result.hostname === false && result.action === true ? 'HOSTNAME_MISMATCH'
      : result.hostname === true && result.action === false ? 'ACTION_MISMATCH'
      : remoteType || 'VERIFICATION_FAILED';
  }
  return result;
}

// Raw TTY suppresses echo without shell commands or readline history. All exits restore it.
export function readHidden(label, { input = process.stdin, output = process.stderr, signals = process } = {}) {
  return new Promise((resolve, reject) => {
    if (!input.isTTY || !output.isTTY || typeof input.setRawMode !== 'function' || input.isRaw || input.listenerCount('data')) {
      reject(safeError('TTY_REQUIRED')); return;
    }
    let value = '', done = false;
    const signalNames = ['SIGINT', 'SIGTERM', 'SIGHUP', 'SIGTSTP'];
    const finish = (error) => {
      if (done) return;
      done = true;
      input.removeListener('data', onData); input.removeListener('error', onError); input.removeListener('end', onEnd);
      for (const name of signalNames) signals.removeListener(name, onSignal);
      try { input.setRawMode(false); } catch { error = safeError('TTY_RESTORE_FAILED'); }
      input.pause();
      try { output.write('\n'); } catch { error = safeError('TTY_UNAVAILABLE'); }
      const captured = value; value = '';
      if (error) reject(error); else resolve(captured);
    };
    const onSignal = () => finish(safeError('CANCELLED'));
    const onError = () => finish(safeError('TTY_UNAVAILABLE'));
    const onEnd = () => finish(safeError('CANCELLED'));
    const onData = chunk => {
      const text = chunk.toString('utf8');
      for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (char === '\r' || char === '\n') {
          if (/[^\r\n]/.test(text.slice(i))) return finish(safeError('INPUT_REJECTED'));
          return finish();
        }
        if (char === '\x03' || char === '\x04' || char === '\x1a') return finish(safeError('CANCELLED'));
        if (char === '\x7f' || char === '\b') value = value.slice(0, -1);
        else if (char < ' ' || char > '~' || value.length >= 4096) return finish(safeError('INPUT_REJECTED'));
        else value += char;
      }
    };
    try {
      input.setRawMode(true);
      input.on('data', onData); input.once('error', onError); input.once('end', onEnd);
      for (const name of signalNames) signals.once(name, onSignal);
      output.write(label); input.resume();
    } catch { finish(safeError('TTY_UNAVAILABLE')); }
  });
}

export function mockFetch(kind) {
  let used = false;
  return async (_url, init) => {
    if (kind === 'network') throw new Error('synthetic-private-failure');
    if (kind === 'timeout') return new Promise((_, reject) => init.signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true }));
    if (kind === 'http') return new Response('', { status: 503 });
    if (kind === 'json') return new Response('not-json');
    const failure = kind === 'invalid' ? 'invalid-input-response'
      : kind === 'expired' || (kind === 'replay' && used) ? 'timeout-or-duplicate' : null;
    used = true;
    return Response.json({ success: !failure, hostname: kind === 'hostname' ? 'mismatch.invalid' : HOSTNAME,
      action: kind === 'action' ? 'other' : 'contact', 'error-codes': failure ? [failure] : [] });
  };
}
const match = value => value === null ? 'UNKNOWN' : value ? 'MATCH' : 'MISMATCH';
const line = (result, pass = result.ok) => `${pass ? 'PASS' : 'FAIL'} hostname=${match(result.hostname)} action=${match(result.action)} type=${result.type}\n`;

export async function main(args = [], { input = process.stdin, output = process.stdout, ttyOutput = process.stderr,
  signals = process, liveFetch = fetch, prompt = readHidden } = {}) {
  if (args.some(arg => arg !== '--live' && arg !== '--replay') || new Set(args).size !== args.length
    || (args.includes('--replay') && !args.includes('--live'))) {
    output.write('FAIL type=ARGUMENTS_REJECTED\n'); return 1;
  }
  if (!args.includes('--live')) {
    // Built-in synthetic inputs, not Cloudflare keys or actual browser tokens.
    let passed = true;
    for (const kind of ['success', 'replay', 'invalid', 'expired', 'hostname', 'action', 'network', 'timeout', 'http', 'json']) {
      const transport = mockFetch(kind);
      if (kind === 'replay') await checkToken('synthetic-token', 'synthetic-secret', transport);
      const result = await checkToken('synthetic-token', 'synthetic-secret', transport, 20);
      const expected = kind === 'success' ? 'VERIFIED' : kind === 'replay' || kind === 'expired' ? 'TIMEOUT_OR_DUPLICATE'
        : kind === 'invalid' ? 'INVALID_TOKEN' : kind === 'hostname' ? 'HOSTNAME_MISMATCH'
        : kind === 'action' ? 'ACTION_MISMATCH' : 'VERIFICATION_UNAVAILABLE';
      const pass = result.type === expected && result.ok === (kind === 'success');
      output.write(`MOCK ${kind} ${line(result, pass)}`); passed &&= pass;
    }
    return passed ? 0 : 1;
  }
  if (!input.isTTY || !ttyOutput.isTTY || typeof input.setRawMode !== 'function') {
    output.write('FAIL type=TTY_REQUIRED\n'); return 1;
  }
  let secret = '', token = '';
  try {
    secret = await prompt('Secret (hidden): ', { input, output: ttyOutput, signals });
    if (!validInput(secret, 4096)) { output.write('FAIL type=INPUT_REJECTED\n'); return 1; }
    token = await prompt('Token (hidden): ', { input, output: ttyOutput, signals });
    const result = await checkToken(token, secret, liveFetch);
    output.write(line(result));
    if (args.includes('--replay') && result.ok) {
      // Explicit replay experiment, never an automatic retry after failure/timeout.
      const replay = await checkToken(token, secret, liveFetch);
      const pass = !replay.ok && replay.type === 'TIMEOUT_OR_DUPLICATE';
      output.write(`REPLAY ${line(replay, pass)}`); return pass ? 0 : 1;
    }
    return result.ok ? 0 : 1;
  } catch (error) {
    const code = ['TTY_REQUIRED', 'TTY_RESTORE_FAILED', 'TTY_UNAVAILABLE', 'CANCELLED', 'INPUT_REJECTED'].includes(error?.code) ? error.code : 'LOCAL_FAILURE';
    output.write(`FAIL type=${code}\n`); return 1;
  } finally { secret = ''; token = ''; }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).then(code => { process.exitCode = code; }, () => {
    process.stderr.write('FAIL type=LOCAL_FAILURE\n'); process.exitCode = 1;
  });
}
