import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ROOT, checkedPath, sourceInventory, verifyOutput } from './build-static.mjs';

export const STAGING_HOSTNAME = 'bashiiin-coffee-staging.misemiruweb.workers.dev';
const ensure = (condition, message) => { if (!condition) throw new Error(message); };

export function stagingInventory(root = ROOT, env = process.env) {
  // Only consume the public Site Key. Never interpolate environment contents into errors.
  const key = env.STAGING_TURNSTILE_SITE_KEY;
  const dummyKeys = ['1x00000000000000000000AA', '2x00000000000000000000AB', '1x00000000000000000000BB', '2x00000000000000000000BB', '3x00000000000000000000FF'];
  ensure(typeof key === 'string' && !/[^A-Za-z0-9_-]/.test(key)
    && (/^0x[A-Za-z0-9_-]{20,30}$/.test(key) || dummyKeys.includes(key)), 'Missing or invalid STAGING_TURNSTILE_SITE_KEY');
  const config = JSON.parse(fs.readFileSync(checkedPath(root, 'wrangler.staging.jsonc'), 'utf8').replace(/^\s*\/\/.*$/gm, ''));
  const normal = JSON.parse(fs.readFileSync(checkedPath(root, 'wrangler.jsonc'), 'utf8').replace(/^\s*\/\/.*$/gm, ''));
  ensure(config.name === STAGING_HOSTNAME.split('.')[0] && config.workers_dev === true && config.preview_urls === false
    && config.main === 'worker/index.mjs' && config.compatibility_date === normal.compatibility_date,
  'Unexpected staging worker configuration');
  ensure(JSON.stringify(config.assets) === JSON.stringify({ ...normal.assets, directory: './dist-staging' }), 'Unexpected staging assets configuration');
  ensure(JSON.stringify(config.vars) === JSON.stringify({ CONTACT_API_ENABLED: 'false', EMAIL_SENDING_ENABLED: 'false' }), 'Staging must keep API and email disabled');
  const allowed = ['$schema', 'name', 'main', 'compatibility_date', 'send_metrics', 'workers_dev', 'preview_urls', 'assets', 'vars', 'observability', 'dev', 'send_email'];
  ensure(Object.keys(config).every(k => allowed.includes(k)), 'Unapproved staging setting or binding');
  ensure(config.assets.binding === 'ASSETS' && config.assets.html_handling === 'force-trailing-slash'
    && config.assets.not_found_handling === 'none' && JSON.stringify(config.assets.run_worker_first) === '["/api/*"]', 'Unsafe staging routing');
  ensure(JSON.stringify(config.send_email) === JSON.stringify([{ name: 'EMAIL', destination_address: 'misemiruweb@gmail.com' }]),
    'Staging email binding must have exactly the approved fixed destination');
  const inventory = sourceInventory(root);
  ensure(inventory.files.length === 39, 'Expected exactly 39 public files');
  const buffers = new Map(inventory.buffers);
  let html = buffers.get('contact/index.html').toString();
  ensure(!html.includes('data-turnstile-mode') && !html.includes('data-turnstile-hostname'), 'Source contains verification configuration');
  for (const [from, to] of [
    ['data-endpoint-ready="false"', `data-endpoint-ready="false" data-turnstile-mode="staging-verify-only" data-turnstile-hostname="${STAGING_HOSTNAME}"`],
    ['data-sitekey=""', `data-sitekey="${key}"`],
  ]) {
    ensure(html.split(from).length === 2, 'Unexpected CONTACT source structure');
    html = html.replace(from, to);
  }
  buffers.set('contact/index.html', Buffer.from(html));
  return { files: inventory.files, buffers };
}

// Inspect existing output before replacing it; never follow symlinks, including dangling links.
function inspect(directory) {
  let stat;
  try { stat = fs.lstatSync(directory); } catch (error) { if (error.code === 'ENOENT') return; throw error; }
  ensure(stat.isDirectory() && !stat.isSymbolicLink(), 'Staging output must be a real directory');
  for (const entry of fs.readdirSync(directory)) {
    const filename = path.join(directory, entry), child = fs.lstatSync(filename);
    ensure(!child.isSymbolicLink(), 'Staging output symlink rejected');
    if (child.isDirectory()) inspect(filename);
    else ensure(child.isFile(), 'Invalid staging output entry');
  }
}
export function verifyStaging(root = ROOT, env = process.env) {
  return verifyOutput(root, stagingInventory(root, env), path.join(root, 'dist-staging'));
}
export function buildStaging(root = ROOT, env = process.env) {
  root = path.resolve(root);
  const inventory = stagingInventory(root, env); // Fail before touching either output directory.
  const target = path.join(root, 'dist-staging');
  inspect(target);
  const temp = fs.mkdtempSync(path.join(root, '.static-build-'));
  try {
    for (const file of inventory.files) {
      const output = path.join(temp, file);
      fs.mkdirSync(path.dirname(output), { recursive: true });
      fs.writeFileSync(output, inventory.buffers.get(file), { flag: 'wx', mode: 0o644 });
    }
    verifyOutput(root, inventory, temp);
    inspect(target);
    if (fs.existsSync(target)) fs.rmSync(target, { recursive: true });
    fs.renameSync(temp, target);
    return verifyStaging(root, env);
  } finally { if (fs.existsSync(temp)) fs.rmSync(temp, { recursive: true }); }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    ensure(process.argv.slice(2).every(arg => arg === '--verify'), 'Only --verify is supported');
    const files = process.argv.includes('--verify') ? verifyStaging() : buildStaging();
    console.log(`${process.argv.includes('--verify') ? 'Verified' : 'Built'} ${files.length} staging-only public files in dist-staging/ (sending disabled)`);
  } catch { console.error('Staging build/verification failed. Check public Site Key, staging configuration, source integrity and output safety. Values are not logged.'); process.exitCode = 1; }
}
