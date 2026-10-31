// No key reads on import; this CLI never writes assets or starts a transport.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sourceInventory } from '../build-static.mjs';
import { ORIGIN } from './policy.mjs';
import { candidateInventory, validateCandidateKey } from './site-key-candidate.mjs';
export function inspectCandidateInput({ siteKey, safe }) {
  const result = candidateInventory({ siteKey, safe, origin: ORIGIN });
  const changed = safe.files.filter(f => !safe.buffers.get(f).equals(result.buffers.get(f)));
  if (JSON.stringify(changed.slice().sort()) !== JSON.stringify(['contact/index.html', 'script.js'])) throw Error('CANDIDATE_SOURCE_REJECTED');
  return 'SITE_KEY_CANDIDATE_VALID:39_FILES; WIDGET_UNVERIFIED; DEPLOYMENT_BLOCKED';
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv.length !== 2) throw Error('SITE_KEY_ARGUMENTS_REJECTED');
    const siteKey = validateCandidateKey(process.env.NEGATIVE_TURNSTILE_SITE_KEY);
    console.log(inspectCandidateInput({ siteKey, safe: sourceInventory() }));
  } catch (error) {
    const allowed = ['SITE_KEY_ARGUMENTS_REJECTED', 'SITE_KEY_MISSING_OR_TYPE', 'SITE_KEY_FORMAT',
      'CANDIDATE_SOURCE_REJECTED', 'CANDIDATE_ORIGIN_REJECTED'];
    console.error(allowed.includes(error?.message) ? error.message : 'SITE_KEY_CHECK_FAILED');
    process.exitCode = 1;
  }
}
