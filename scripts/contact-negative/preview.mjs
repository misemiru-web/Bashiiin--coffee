// Memory-only test fixtures. No writer, CLI, environment input, build hook or transport.
import { sourceInventory } from '../build-static.mjs';
import { HOST, ORIGIN } from './policy.mjs';

export const PREVIEW_TEST_SITE_KEYS = Object.freeze({
  success: '1x00000000000000000000AA',
  failure: '2x00000000000000000000AB',
});
export const FUTURE_SITE_KEY_INPUT = 'NEGATIVE_TURNSTILE_SITE_KEY'; // Reserved name only; never read here.
const ensure = value => { if (!value) throw Error('NEGATIVE_PREVIEW_REJECTED'); };
function replaceOnce(text, from, to) {
  ensure(text.split(from).length === 2);
  return text.replace(from, to);
}

export function previewInventory({ siteKey, origin } = {}) {
  // Real-looking keys are rejected too: this module is deliberately official-test-key-only.
  ensure(origin === ORIGIN && Object.values(PREVIEW_TEST_SITE_KEYS).includes(siteKey));
  const source = sourceInventory(); ensure(source.files.length === 39);
  const buffers = new Map(source.buffers);
  let html = buffers.get('contact/index.html').toString();
  ensure(!html.includes('data-contact-negative-only') && !html.includes('data-turnstile-hostname'));
  html = replaceOnce(html, 'data-endpoint-ready="false"',
    `data-endpoint-ready="true" data-contact-negative-only="true" data-turnstile-hostname="${HOST}"`);
  html = replaceOnce(html, 'data-sitekey=""', `data-sitekey="${siteKey}"`);
  buffers.set('contact/index.html', Buffer.from(html));

  let script = buffers.get('script.js').toString();
  script = replaceOnce(script,
    'const submissionReady = !verificationOnly && contactForm.dataset.endpointReady === "true" && hasSiteKey;',
    `// Memory-only negative preview: this client check does not replace server validation.
      const previewOriginAllowed = window.location.origin === ${JSON.stringify(ORIGIN)}
        && contactForm.dataset.contactNegativeOnly === "true"
        && contactForm.dataset.turnstileHostname === ${JSON.stringify(HOST)};
      const submissionReady = previewOriginAllowed && !verificationOnly && contactForm.dataset.endpointReady === "true" && hasSiteKey;`);
  script = replaceOnce(script,
    'const widgetEnabled = hasSiteKey && (submissionReady || verificationEnabled);',
    'const widgetEnabled = previewOriginAllowed && hasSiteKey && (submissionReady || verificationEnabled);');
  script = replaceOnce(script,
    'if (response.status !== 200 || !response.headers.get("content-type")?.includes("application/json")) {',
    `// A preview can never claim acceptance, even if a mock mistakenly returns 200.
          if (previewOriginAllowed || response.status !== 200 || !response.headers.get("content-type")?.includes("application/json")) {`);
  buffers.set('script.js', Buffer.from(script));
  return { files: [...source.files], buffers };
}
