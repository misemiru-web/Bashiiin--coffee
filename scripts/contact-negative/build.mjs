import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOT, sourceInventory, checkedPath, verifyOutput } from '../build-static.mjs';
import { NAME, HOST, ORIGIN, FROM, TO } from './policy.mjs';
const ensure = value => { if (!value) throw Error('NEGATIVE_PREPARATION_REJECTED'); };
const baseKeys = ['$schema', 'name', 'main', 'compatibility_date', 'send_metrics', 'workers_dev',
  'preview_urls', 'assets', 'vars', 'observability', 'dev'];
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
export function readConfig(mode) {
  ensure(['safe', 'negative'].includes(mode));
  return JSON.parse(fs.readFileSync(checkedPath(ROOT, `scripts/contact-negative/wrangler.${mode}.jsonc`), 'utf8'));
}
export function validateConfig(config, mode) {
  ensure(['safe', 'negative'].includes(mode));
  ensure(config.name === NAME && config.main === 'worker.mjs' && config.compatibility_date === '2026-10-28'
    && config.workers_dev === false && config.preview_urls === false && config.send_metrics === false);
  ensure(Object.keys(config).every(k => [...baseKeys, ...(mode === 'negative' ? ['build', 'secrets', 'ratelimits'] : [])].includes(k)));
  ensure(equal(config.assets, { directory: `./.generated/${mode}`, binding: 'ASSETS', run_worker_first: ['/api/*'],
    html_handling: 'force-trailing-slash', not_found_handling: 'none' }));
  ensure(equal(config.observability, { enabled: false }) && equal(config.dev, { ip: '127.0.0.1', port: 8792 }));
  const flags = { E2E_MODE: mode, CONTACT_API_ENABLED: mode === 'safe' ? 'false' : 'true', EMAIL_SENDING_ENABLED: mode === 'safe' ? 'false' : 'true' };
  ensure(equal(config.vars, mode === 'safe' ? flags : { ...flags, CONTACT_FROM: FROM, CONTACT_TO: TO,
    CONTACT_ORIGIN: ORIGIN, TURNSTILE_HOSTNAME: HOST }));
  if (mode === 'negative') {
    ensure(equal(config.build, { command: 'node scripts/contact-negative/build.mjs --require-negative-ready', cwd: '.' }));
    ensure(equal(config.secrets, { required: ['TURNSTILE_SECRET_KEY'] }));
    if (config.ratelimits !== undefined) {
      const entry = config.ratelimits?.[0];
      ensure(Array.isArray(config.ratelimits) && config.ratelimits.length === 1
        && entry.name === 'CONTACT_RATE_LIMITER' && /^[1-9]\d*$/.test(entry.namespace_id)
        && typeof entry.namespace_id === 'string' && entry.namespace_id !== '31001'
        && equal(entry, { name: 'CONTACT_RATE_LIMITER', namespace_id: entry.namespace_id, simple: { limit: 5, period: 60 } }));
    }
  }
  return config;
}
export function requireNegativeReady(config, env = {}) {
  validateConfig(config, 'negative');
  // Draft has NO namespace. No fabricated ID or secret is used to bypass this blocker.
  ensure(config.ratelimits?.length === 1
    && env.NEGATIVE_NAMESPACE_CONFIRMED === config.ratelimits[0].namespace_id
    && env.NEGATIVE_ACCESS_CONFIRMED_HOSTNAME === HOST
    && env.NEGATIVE_DEPLOYMENT_APPROVED === 'APPROVED_NEGATIVE_ONLY');
  ensure(typeof env.NEGATIVE_TURNSTILE_SITE_KEY === 'string' && /^0x[A-Za-z0-9_-]{20,30}$/.test(env.NEGATIVE_TURNSTILE_SITE_KEY));
  // Actual account uniqueness, Access and registered Secret still require management-side verification.
}
function makeInventory(mode, key) {
  const source = sourceInventory(); ensure(source.files.length === 39);
  const buffers = new Map(source.buffers);
  if (mode === 'negative') {
    let html = buffers.get('contact/index.html').toString();
    ensure(html.split('data-endpoint-ready="false"').length === 2 && html.split('data-sitekey=""').length === 2);
    html = html.replace('data-endpoint-ready="false"', 'data-endpoint-ready="true" data-contact-negative-only="true"')
      .replace('data-sitekey=""', `data-sitekey="${key}"`);
    buffers.set('contact/index.html', Buffer.from(html));
  }
  return { files: source.files, buffers };
}
export function inventory(mode = 'safe', env = {}) {
  ensure(['safe', 'negative'].includes(mode));
  if (mode === 'negative') {
    ensure(env.NEGATIVE_FORM_APPROVED === 'APPROVED_NEGATIVE_FORM' && env.NEGATIVE_HOSTNAME === HOST
      && typeof env.NEGATIVE_TURNSTILE_SITE_KEY === 'string' && /^0x[A-Za-z0-9_-]{20,30}$/.test(env.NEGATIVE_TURNSTILE_SITE_KEY));
  }
  return makeInventory(mode, env.NEGATIVE_TURNSTILE_SITE_KEY);
}
// Test-only in-memory HTML. No writer, configurable key, Worker capability or network is exposed.
export function mockInventory() { return makeInventory('negative', '1x00000000000000000000AA'); }
export function build(mode = 'safe', env = {}) {
  validateConfig(readConfig(mode), mode);
  if (mode === 'negative') requireNegativeReady(readConfig(mode), env);
  const input = inventory(mode, env);
  const parent = checkedPath(ROOT, 'scripts/contact-negative');
  const generated = path.join(parent, '.generated');
  if (!fs.existsSync(generated)) fs.mkdirSync(generated);
  checkedPath(ROOT, 'scripts/contact-negative/.generated');
  const inspect = folder => {
    const s = fs.lstatSync(folder); ensure(s.isDirectory() && !s.isSymbolicLink());
    for (const entry of fs.readdirSync(folder)) {
      const file = path.join(folder, entry), stat = fs.lstatSync(file); ensure(!stat.isSymbolicLink());
      if (stat.isDirectory()) inspect(file); else ensure(stat.isFile());
    }
  };
  const target = path.join(generated, mode);
  try { fs.lstatSync(target); inspect(target); } catch (e) { if (e.code !== 'ENOENT') throw e; }
  const temp = fs.mkdtempSync(path.join(generated, 'build-'));
  try {
    for (const file of input.files) {
      const dest = path.join(temp, file); fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, input.buffers.get(file), { flag: 'wx' });
    }
    verifyOutput(ROOT, input, temp);
    if (fs.existsSync(target)) { inspect(target); fs.rmSync(target, { recursive: true }); }
    fs.renameSync(temp, target); return verifyOutput(ROOT, input, target);
  } finally { if (fs.existsSync(temp)) fs.rmSync(temp, { recursive: true }); }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    if (args.length === 1 && args[0] === '--require-negative-ready') {
      requireNegativeReady(readConfig('negative'), process.env);
      console.log(`Prepared negative files: ${build('negative', process.env).length}`);
    } else {
      ensure(args.length === 0); console.log(`Safe files: ${build().length}; sending disabled`);
    }
  } catch { console.error('NEGATIVE_PREPARATION_REJECTED: approval/configuration incomplete; values not logged'); process.exitCode = 1; }
}
