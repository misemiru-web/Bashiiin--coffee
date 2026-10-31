import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOT, sourceInventory, verifyOutput, checkedPath } from '../build-static.mjs';
import { HOST } from './policy.mjs';
const ensure = (v) => { if (!v) throw Error('E2E_BUILD_REJECTED'); };
export function inventory(mode = 'safe', env = {}) {
  ensure(['safe', 'negative', 'live'].includes(mode));
  const src = sourceInventory();
  ensure(src.files.length === 39);
  const buffers = new Map(src.buffers);
  if (mode !== 'safe') {
    // Public Site Key only. A separate, explicit build is required; no secrets are consumed.
    const key = env.E2E_TURNSTILE_SITE_KEY;
    ensure(env.E2E_HOSTNAME === HOST && env.E2E_FORM_APPROVAL === 'APPROVED_E2E_FORM'
      && typeof key === 'string' && (/^0x[A-Za-z0-9_-]{20,30}$/.test(key)
        || ['1x00000000000000000000AA', '2x00000000000000000000AB'].includes(key)));
    let html = buffers.get('contact/index.html').toString();
    ensure(html.split('data-endpoint-ready="false"').length === 2 && html.split('data-sitekey=""').length === 2);
    html = html.replace('data-endpoint-ready="false"', `data-endpoint-ready="true" data-e2e-mode="${mode}"`)
      .replace('data-sitekey=""', `data-sitekey="${key}"`);
    // The source and generated HTML button remain disabled. Existing JS enables it only with a token.
    buffers.set('contact/index.html', Buffer.from(html));
  }
  return { files: src.files, buffers };
}
export function validateSafeConfig() {
  const config = JSON.parse(fs.readFileSync(checkedPath(ROOT, 'scripts/contact-e2e/wrangler.safe.jsonc'), 'utf8'));
  ensure(config.name === 'bashiiin-coffee-contact-e2e' && config.main === 'worker.mjs'
    && config.workers_dev === false && config.preview_urls === false
    && config.compatibility_date === '2026-10-28');
  ensure(JSON.stringify(config.vars) === JSON.stringify({ E2E_MODE: 'safe', CONTACT_API_ENABLED: 'false', EMAIL_SENDING_ENABLED: 'false' }));
  ensure(JSON.stringify(config.assets) === JSON.stringify({ directory: './.generated/safe', binding: 'ASSETS',
    run_worker_first: ['/api/*'], html_handling: 'force-trailing-slash', not_found_handling: 'none' }));
  ensure(JSON.stringify(config.durable_objects) === JSON.stringify({ bindings: [{ name: 'DELIVERY_GUARD', class_name: 'DeliveryGuard' }] }));
  ensure(JSON.stringify(config.migrations) === JSON.stringify([{ tag: 'e2e-sqlite-v1', new_sqlite_classes: ['DeliveryGuard'] }]));
  ensure(Object.keys(config).every(k => ['$schema', 'name', 'main', 'compatibility_date', 'send_metrics', 'workers_dev',
    'preview_urls', 'assets', 'vars', 'durable_objects', 'migrations', 'observability', 'dev'].includes(k)));
  return config;
}
export function build(mode = 'safe', env = {}) {
  validateSafeConfig();
  const input = inventory(mode, env);
  const directory = path.join(ROOT, 'scripts/contact-e2e');
  const generated = path.join(directory, '.generated');
  if (!fs.existsSync(generated)) fs.mkdirSync(generated);
  checkedPath(ROOT, 'scripts/contact-e2e/.generated');
  const target = path.join(generated, mode);
  const inspect = folder => {
    ensure(!fs.lstatSync(folder).isSymbolicLink() && fs.lstatSync(folder).isDirectory());
    for (const entry of fs.readdirSync(folder)) {
      const f = path.join(folder, entry), s = fs.lstatSync(f);
      ensure(!s.isSymbolicLink());
      if (s.isDirectory()) inspect(f); else ensure(s.isFile());
    }
  };
  try { fs.lstatSync(target); inspect(target); } catch (e) { if (e.code !== 'ENOENT') throw e; }
  const temp = fs.mkdtempSync(path.join(generated, 'build-'));
  try {
    for (const f of input.files) {
      const output = path.join(temp, f);
      fs.mkdirSync(path.dirname(output), { recursive: true });
      fs.writeFileSync(output, input.buffers.get(f), { flag: 'wx' });
    }
    verifyOutput(ROOT, input, temp);
    if (fs.existsSync(target)) { inspect(target); fs.rmSync(target, { recursive: true }); }
    fs.renameSync(temp, target);
    return verifyOutput(ROOT, input, target);
  } finally { if (fs.existsSync(temp)) fs.rmSync(temp, { recursive: true }); }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    ensure(process.argv.length === 2); // CLI intentionally supports safe output ONLY in this step.
    console.log(`E2E safe build: ${build().length} files; API/form/mail disabled; no network`);
  } catch { console.error('E2E_BUILD_REJECTED'); process.exitCode = 1; }
}
