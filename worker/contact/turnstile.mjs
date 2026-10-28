import { ApiError, deadline } from './http.mjs';
export const SITEVERIFY = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
export async function verifyTurnstile(token, secret, hostname, fetchImpl = fetch, timeout = 5000) {
  // Every submission reaches Siteverify. No positive cache, retry or test-token bypass.
  let result;
  try {
    result = await deadline(async signal => {
      const response = await fetchImpl(SITEVERIFY, {
        method: 'POST', redirect: 'error', signal,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ secret, response: token }),
      });
      if (!response.ok) throw new Error('unavailable');
      return await response.json();
    }, timeout);
  } catch { throw new ApiError(503, 'VERIFICATION_UNAVAILABLE'); }
  if (result?.success !== true || result.hostname !== hostname || result.action !== 'contact') {
    throw new ApiError(400, 'VERIFICATION_FAILED');
  }
  // Single-use/expiry is enforced atomically by Cloudflare, including concurrent replays.
}
