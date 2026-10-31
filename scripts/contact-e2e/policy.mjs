// Fixed E2E candidate. Not a claim that this Worker/hostname exists.
export const HOST = 'bashiiin-coffee-contact-e2e.misemiruweb.workers.dev';
export const ORIGIN = `https://${HOST}`;
export const FROM = 'bashiiin-staging@misemiruweb.com';
export const TO = 'misemiruweb@gmail.com';
export const SLOT = 'contact-e2e-single-attempt-v1';
export function configured(env) {
  return env.CONTACT_FROM === FROM && env.CONTACT_TO === TO
    && env.CONTACT_ORIGIN === ORIGIN && env.TURNSTILE_HOSTNAME === HOST;
}
export function liveApproved(env) {
  return configured(env) && env.E2E_MODE === 'live'
    && env.E2E_LIVE_APPROVAL === 'APPROVED_ONE_ATTEMPT'
    && env.CONTACT_API_ENABLED === 'true' && env.EMAIL_SENDING_ENABLED === 'true';
}
