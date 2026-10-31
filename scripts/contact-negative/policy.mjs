// Candidate hostname only; account availability and Access must be checked in a later approved step.
export const NAME = 'bashiiin-coffee-contact-negative';
export const HOST = `${NAME}.misemiruweb.workers.dev`;
export const ORIGIN = `https://${HOST}`;
export const FROM = 'bashiiin-staging@misemiruweb.com';
export const TO = 'misemiruweb@gmail.com';
const allowed = new Set(['E2E_MODE', 'CONTACT_API_ENABLED', 'EMAIL_SENDING_ENABLED',
  'CONTACT_FROM', 'CONTACT_TO', 'CONTACT_ORIGIN', 'TURNSTILE_HOSTNAME',
  'TURNSTILE_SECRET_KEY', 'CONTACT_RATE_LIMITER', 'ASSETS']);
export function permitted(env) {
  return Object.keys(env).every(k => allowed.has(k)) && env.E2E_MODE === 'negative'
    && env.CONTACT_API_ENABLED === 'true' && env.EMAIL_SENDING_ENABLED === 'true'
    && env.CONTACT_FROM === FROM && env.CONTACT_TO === TO
    && env.CONTACT_ORIGIN === ORIGIN && env.TURNSTILE_HOSTNAME === HOST;
}
