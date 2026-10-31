import { handleContact } from '../../worker/contact/api.mjs';
import { json } from '../../worker/contact/http.mjs';
import { permitted } from './policy.mjs';

// Private, immutable, no I/O, no receipt. No binding supplied by a caller is used for mail.
const rejectMail = Object.freeze({ send() { throw Error('NEGATIVE_MAIL_DISABLED'); } });
export default {
  async fetch(request, env) {
    const pathname = new URL(request.url).pathname;
    if (pathname !== '/api/contact') {
      if (pathname === '/api' || pathname.startsWith('/api/')) return json(404, { ok: false, code: 'NOT_FOUND' });
      return env.ASSETS ? env.ASSETS.fetch(request) : new Response('Not found', { status: 404 });
    }
    const enabled = permitted(env);
    // Explicit projection: no environment spreading and no externally supplied mail capability.
    return handleContact(request, {
      CONTACT_API_ENABLED: enabled ? 'true' : 'false',
      EMAIL_SENDING_ENABLED: enabled ? 'true' : 'false',
      CONTACT_FROM: env.CONTACT_FROM, CONTACT_TO: env.CONTACT_TO,
      CONTACT_ORIGIN: env.CONTACT_ORIGIN, TURNSTILE_HOSTNAME: env.TURNSTILE_HOSTNAME,
      TURNSTILE_SECRET_KEY: env.TURNSTILE_SECRET_KEY,
      CONTACT_RATE_LIMITER: env.CONTACT_RATE_LIMITER, EMAIL: rejectMail,
    });
  },
};
