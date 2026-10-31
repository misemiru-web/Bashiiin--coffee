// Import-safe offline runtime check. No automatic work except on direct execution.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isolatedEnv, validateConfig } from './email-service-local.mjs';

export async function checkLocalRuntime({ loadRuntime = () => import('wrangler') } = {}) {
  const previous = { ...process.env }, previousFetch = globalThis.fetch;
  let mock, platform, previousDispatcher, restoreDispatcher;
  try {
    for (const key of Object.keys(process.env)) delete process.env[key];
    Object.assign(process.env, isolatedEnv(previous));
    const { MockAgent, setGlobalDispatcher, getGlobalDispatcher } = await import('undici');
    previousDispatcher = getGlobalDispatcher(); restoreDispatcher = setGlobalDispatcher;
    mock = new MockAgent(); mock.disableNetConnect();
    mock.enableNetConnect(/^(127\.0\.0\.1|localhost|\[::1\])(?::\d+)?$/);
    setGlobalDispatcher(mock);
    globalThis.fetch = () => { throw Error('EXTERNAL_FETCH_BLOCKED'); };
    const configPath = fileURLToPath(new URL('./wrangler.email-test.jsonc', import.meta.url));
    validateConfig(JSON.parse(fs.readFileSync(configPath, 'utf8')));
    const { getPlatformProxy } = await loadRuntime();
    platform = await getPlatformProxy({ configPath, remoteBindings: false, persist: false, envFiles: [] });
    if (typeof platform.env.EMAIL?.send !== 'function') throw Error('EMAIL_BINDING_MISSING');
  } finally {
    try { await platform?.dispose(); }
    finally {
      if (restoreDispatcher) restoreDispatcher(previousDispatcher);
      try { await mock?.close(); }
      finally {
        globalThis.fetch = previousFetch;
        for (const key of Object.keys(process.env)) delete process.env[key];
        Object.assign(process.env, previous);
      }
    }
  }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  checkLocalRuntime().then(() => console.log('PASS local Email proxy available; remote=false; send calls=0'))
    .catch(() => { console.error('FAIL LOCAL_RUNTIME_UNAVAILABLE'); process.exitCode = 1; });
}
