// Pure candidate transformation: all assets and the public key are explicit inputs.
import { HOST, ORIGIN } from './policy.mjs';
const fail = code => { throw Error(code); };
export function validateCandidateKey(key) {
  if (typeof key !== 'string' || !key) fail('SITE_KEY_MISSING_OR_TYPE');
  // Conservative existing project format, not proof of issuance, ownership or key kind.
  if (!/^0x[A-Za-z0-9_-]{20,30}$/.test(key)) fail('SITE_KEY_FORMAT');
  return key;
}
const replaceOnce = (text, from, to) => {
  if (text.split(from).length !== 2) fail('CANDIDATE_SOURCE_REJECTED');
  return text.replace(from, to);
};
export function candidateInventory({ siteKey, origin, safe } = {}) {
  validateCandidateKey(siteKey);
  if (origin !== ORIGIN) fail('CANDIDATE_ORIGIN_REJECTED');
  if (!safe || !Array.isArray(safe.files) || safe.files.length !== 39
    || new Set(safe.files).size !== 39 || !(safe.buffers instanceof Map)
    || safe.buffers.size !== 39 || !safe.files.every(f => Buffer.isBuffer(safe.buffers.get(f)))) fail('CANDIDATE_SOURCE_REJECTED');
  const buffers = new Map(safe.files.map(f => [f, Buffer.from(safe.buffers.get(f))]));
  const pages = ['index.html', 'about/index.html', 'coffee/index.html', 'contact/index.html', 'access/index.html'];
  if (!pages.every(p => buffers.get(p)?.toString().includes('noindex, nofollow, noarchive'))) fail('CANDIDATE_SOURCE_REJECTED');
  let html = buffers.get('contact/index.html').toString();
  if (!/id="contact-submit"[^>]*disabled/.test(html) || html.includes('data-contact-negative-only')
    || html.includes('data-turnstile-hostname')) fail('CANDIDATE_SOURCE_REJECTED');
  html = replaceOnce(html, 'data-endpoint-ready="false"',
    `data-endpoint-ready="true" data-contact-negative-only="true" data-turnstile-hostname="${HOST}"`);
  html = replaceOnce(html, 'data-sitekey=""', `data-sitekey="${siteKey}"`);
  buffers.set('contact/index.html', Buffer.from(html));
  if (!buffers.has('script.js')) fail('CANDIDATE_SOURCE_REJECTED');
  let js = buffers.get('script.js').toString();
  js = replaceOnce(js, 'const submissionReady = !verificationOnly && contactForm.dataset.endpointReady === "true" && hasSiteKey;',
    `const candidateOriginAllowed = window.location.origin === ${JSON.stringify(ORIGIN)}
      && window.location.hostname === ${JSON.stringify(HOST)}
      && contactForm.dataset.contactNegativeOnly === "true"
      && contactForm.dataset.turnstileHostname === ${JSON.stringify(HOST)};
      const submissionReady = candidateOriginAllowed && !verificationOnly && contactForm.dataset.endpointReady === "true" && hasSiteKey;`);
  js = replaceOnce(js, 'const widgetEnabled = hasSiteKey && (submissionReady || verificationEnabled);',
    'const widgetEnabled = candidateOriginAllowed && hasSiteKey && (submissionReady || verificationEnabled);');
  js = replaceOnce(js, 'if (response.status !== 200 || !response.headers.get("content-type")?.includes("application/json")) {',
    'if (candidateOriginAllowed || response.status !== 200 || !response.headers.get("content-type")?.includes("application/json")) {');
  if (!js.includes('action: "contact"')) fail('CANDIDATE_SOURCE_REJECTED');
  buffers.set('script.js', Buffer.from(js));
  return { files: [...safe.files], buffers };
}
