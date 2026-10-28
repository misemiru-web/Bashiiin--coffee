import { ApiError, deadline, failure, json } from './http.mjs';
import { readJson, validatePayload, validEmail } from './validation.mjs';
import { verifyTurnstile } from './turnstile.mjs';
import { notification, sendNotification } from './mail.mjs';

function configuration(env) {
  if (env.CONTACT_API_ENABLED !== 'true' || env.EMAIL_SENDING_ENABLED !== 'true'
    || typeof env.TURNSTILE_SECRET_KEY !== 'string' || !env.TURNSTILE_SECRET_KEY.trim()
    || !validEmail(env.CONTACT_FROM) || !validEmail(env.CONTACT_TO)
    || typeof env.EMAIL?.send !== 'function' || typeof env.CONTACT_RATE_LIMITER?.limit !== 'function') {
    throw new ApiError(503, 'SERVICE_UNAVAILABLE');
  }
  let origin;
  try { origin = new URL(env.CONTACT_ORIGIN); } catch { throw new ApiError(503, 'SERVICE_UNAVAILABLE'); }
  if (origin.protocol !== 'https:' || origin.origin !== env.CONTACT_ORIGIN || origin.username || origin.password
    || origin.hostname !== env.TURNSTILE_HOSTNAME) throw new ApiError(503, 'SERVICE_UNAVAILABLE');
  return { origin: origin.origin, hostname: origin.hostname, from: env.CONTACT_FROM, to: env.CONTACT_TO };
}
// Dependency injection is module-level for unit tests only; HTTP cannot supply dependencies.
export function createContactHandler({ fetchImpl = (...args) => fetch(...args) } = {}) {
  return async function contact(request, env) {
    try {
      if (request.method !== 'POST') throw new ApiError(405, 'METHOD_NOT_ALLOWED');
      const config = configuration(env); // Fail closed before reading PII or contacting upstreams.
      if (new URL(request.url).origin !== config.origin || request.headers.get('Origin') !== config.origin
        || (request.headers.has('Sec-Fetch-Site') && request.headers.get('Sec-Fetch-Site') !== 'same-origin')) {
        throw new ApiError(403, 'ORIGIN_REJECTED');
      }
      // Endpoint-wide, per-location limiter avoids placing names/emails/IPs/tokens in keys.
      // Namespace/thresholds require explicit production configuration; no binding means 503.
      let limited;
      try { limited = await deadline(() => env.CONTACT_RATE_LIMITER.limit({ key: 'contact:submission' }), 1000); }
      catch { throw new ApiError(503, 'SERVICE_UNAVAILABLE'); }
      if (limited?.success === false) throw new ApiError(429, 'RATE_LIMITED');
      if (limited?.success !== true) throw new ApiError(503, 'SERVICE_UNAVAILABLE');
      const payload = validatePayload(await readJson(request));
      await verifyTurnstile(payload.turnstileToken, env.TURNSTILE_SECRET_KEY, config.hostname, fetchImpl);
      await sendNotification(env.EMAIL, notification(payload, config));
      return json(200, { ok: true });
    } catch (error) { return failure(error); }
  };
}
export const handleContact = createContactHandler();
