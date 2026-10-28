import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { ROOT, verifyOutput } from './build-static.mjs';

// No login, remote bindings, tunnel, build upload, or deploy commands.
verifyOutput();
const env = { ...process.env, WRANGLER_SEND_METRICS: 'false', CI: 'true' };
for (const key of Object.keys(env)) if (/^(?:CLOUDFLARE_|CF_API_)/.test(key)) delete env[key];
const cli = fileURLToPath(new URL('../node_modules/wrangler/bin/wrangler.js', import.meta.url));
const child = spawn(process.execPath, [cli, 'dev', '--local', '--ip', '127.0.0.1', '--port', '8787', '--no-show-interactive-dev-session'], {
  cwd: ROOT, env, stdio: 'inherit',
});
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
child.on('error', error => { console.error(`Local Wrangler failed: ${error.message}`); process.exitCode = 1; });
child.on('exit', code => { process.exitCode = code ?? 1; });
