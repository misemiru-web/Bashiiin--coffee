import { handleContact } from '../../worker/contact/api.mjs';
import { json } from '../../worker/contact/http.mjs';
import { configured, liveApproved, SLOT } from './policy.mjs';
export { DeliveryGuard } from './guard.mjs';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== '/api/contact') {
      if (url.pathname === '/api' || url.pathname.startsWith('/api/')) return json(404, { ok: false, code: 'NOT_FOUND' });
      return env.ASSETS ? env.ASSETS.fetch(request) : new Response('Not found', { status: 404 });
    }
    // Construct an explicit environment. No client-controlled mode or arbitrary binding injection.
    const base = {
      CONTACT_API_ENABLED: 'false', EMAIL_SENDING_ENABLED: 'false',
      CONTACT_FROM: env.CONTACT_FROM, CONTACT_TO: env.CONTACT_TO,
      CONTACT_ORIGIN: env.CONTACT_ORIGIN, TURNSTILE_HOSTNAME: env.TURNSTILE_HOSTNAME,
      TURNSTILE_SECRET_KEY: env.TURNSTILE_SECRET_KEY, CONTACT_RATE_LIMITER: env.CONTACT_RATE_LIMITER,
    };
    if (configured(env) && env.E2E_MODE === 'negative'
      && env.CONTACT_API_ENABLED === 'true' && env.EMAIL_SENDING_ENABLED === 'true'
      && !env.RAW_EMAIL && !env.EMAIL) {
      // No real mail capability. Valid authentication reaches an explicit failure, never fake success.
      base.CONTACT_API_ENABLED = base.EMAIL_SENDING_ENABLED = 'true';
      base.EMAIL = { send() { throw Error('E2E_NO_MAIL'); } };
    } else if (liveApproved(env) && env.DELIVERY_GUARD) {
      base.CONTACT_API_ENABLED = base.EMAIL_SENDING_ENABLED = 'true';
      base.EMAIL = { async send(message) {
        const id = env.DELIVERY_GUARD.idFromName(SLOT);
        return env.DELIVERY_GUARD.get(id).sendOnce(message);
      } };
    }
    return handleContact(request, base);
  },
};
