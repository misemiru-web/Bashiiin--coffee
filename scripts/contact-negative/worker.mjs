import { handleContact } from '../../worker/contact/api.mjs';
import { json } from '../../worker/contact/http.mjs';
import { permitted } from './policy.mjs';

// Only fixed, non-sensitive diagnostics. No request data or upstream error is exposed.
function stageFor(status, code, rate, mailCalled) {
  if (status === 403 && code === 'ORIGIN_REJECTED' && rate === 'unused') return 'origin_rejected';
  if (status === 429 && code === 'RATE_LIMITED' && rate === 'denied') return 'rate_rejected';
  if (status === 503 && code === 'SERVICE_UNAVAILABLE'
    && ['pending', 'failed', 'malformed'].includes(rate)) return 'rate_unavailable';
  if (rate !== 'passed') return 'unknown';
  if ([[415, 'UNSUPPORTED_MEDIA_TYPE'], [400, 'INVALID_REQUEST'], [413, 'PAYLOAD_TOO_LARGE'],
    [400, 'INVALID_JSON'], [400, 'INVALID_STRUCTURE'], [400, 'VALIDATION_FAILED'],
    [503, 'REQUEST_TIMEOUT']].some(([s, c]) => status === s && code === c)) return 'input_rejected';
  if (status === 400 && code === 'VERIFICATION_FAILED') return 'siteverify_rejected';
  if (status === 503 && code === 'VERIFICATION_UNAVAILABLE') return 'siteverify_unavailable';
  if (status === 503 && code === 'MAIL_UNAVAILABLE' && mailCalled) return 'siteverify_passed_synthetic_mail_rejected';
  return 'unknown';
}
export default {
  async fetch(request, env) {
    const pathname = new URL(request.url).pathname;
    if (pathname !== '/api/contact') {
      if (pathname === '/api' || pathname.startsWith('/api/')) return json(404, { ok: false, code: 'NOT_FOUND' });
      return env.ASSETS ? env.ASSETS.fetch(request) : new Response('Not found', { status: 404 });
    }
    const enabled = permitted(env);
    // Request-local evidence; the synthetic mail capability cannot be supplied by env/HTTP.
    let rate = 'unused', mailCalled = false;
    const rejectMail = Object.freeze({ send() { mailCalled = true; throw Error('NEGATIVE_MAIL_DISABLED'); } });
    const limiter = env.CONTACT_RATE_LIMITER;
    const observedLimiter = enabled && typeof limiter?.limit === 'function' ? {
      async limit(value) {
        rate = 'pending';
        try {
          const result = await limiter.limit(value);
          rate = result?.success === true ? 'passed' : result?.success === false ? 'denied' : 'malformed';
          return result;
        } catch (error) { rate = 'failed'; throw error; }
      },
    } : limiter;
    // Explicit projection: no environment spreading and no externally supplied mail capability.
    const response = await handleContact(request, {
      CONTACT_API_ENABLED: enabled ? 'true' : 'false',
      EMAIL_SENDING_ENABLED: enabled ? 'true' : 'false',
      CONTACT_FROM: env.CONTACT_FROM, CONTACT_TO: env.CONTACT_TO,
      CONTACT_ORIGIN: env.CONTACT_ORIGIN, TURNSTILE_HOSTNAME: env.TURNSTILE_HOSTNAME,
      TURNSTILE_SECRET_KEY: env.TURNSTILE_SECRET_KEY,
      CONTACT_RATE_LIMITER: observedLimiter, EMAIL: rejectMail,
    });
    if (!enabled) return response; // safe and rejected configurations remain unchanged.
    // Never pass an unexpected success through the negative API. No receipt/lead is possible.
    if (response.status >= 200 && response.status < 300) {
      return json(503, { ok: false, code: 'SERVICE_UNAVAILABLE' }, { 'X-Contact-Negative-Stage': 'unknown' });
    }
    let code;
    try { code = (await response.clone().json()).code; } catch { /* Unknown is deliberate. */ }
    const headers = new Headers(response.headers);
    headers.set('X-Contact-Negative-Stage', stageFor(response.status, code, rate, mailCalled));
    return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
  },
};
