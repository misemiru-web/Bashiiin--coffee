import { ApiError, deadline } from './http.mjs';
export const MAX_BODY_BYTES = 48 * 1024;
export const LIMITS = Object.freeze({ name: 100, email: 254, message: 5000, turnstileToken: 2048 });
// HTML email-input grammar; same UTF-16 length units as maxlength / value.length.
export function validEmail(value) {
  return typeof value === 'string' && value.length <= LIMITS.email && !/[\x00-\x20\x7f]/.test(value) &&
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/.test(value);
}
export async function readJson(request, timeout = 4000) {
  if (!/^application\/json(?:\s*;\s*charset=(?:utf-8|"utf-8"))?\s*$/i.test(request.headers.get('Content-Type') || '')
    || request.headers.has('Content-Encoding')) throw new ApiError(415, 'UNSUPPORTED_MEDIA_TYPE');
  const length = request.headers.get('Content-Length');
  if (length !== null && !/^\d+$/.test(length)) throw new ApiError(400, 'INVALID_REQUEST');
  if (length !== null && Number(length) > MAX_BODY_BYTES) throw new ApiError(413, 'PAYLOAD_TOO_LARGE');
  if (!request.body) throw new ApiError(400, 'INVALID_JSON');
  const reader = request.body.getReader(); let finished = false;
  try {
    return await deadline(async signal => {
      signal.addEventListener('abort', () => { void reader.cancel().catch(() => {}); }, { once: true });
      const chunks = []; let total = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) { finished = true; break; }
        total += value.byteLength;
        if (total > MAX_BODY_BYTES) throw new ApiError(413, 'PAYLOAD_TOO_LARGE');
        chunks.push(value);
      }
      const bytes = new Uint8Array(total); let offset = 0;
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
      try { return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); }
      catch { throw new ApiError(400, 'INVALID_JSON'); }
    }, timeout, 'REQUEST_TIMEOUT');
  } finally {
    if (!finished) void reader.cancel().catch(() => {});
    // Do not await cancellation of an untrusted/stalled stream.
  }
}
export function validatePayload(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.keys(value).some(k => !Object.hasOwn(LIMITS, k))) throw new ApiError(400, 'INVALID_STRUCTURE');
  const fields = {}; const clean = {};
  for (const [key, max] of Object.entries(LIMITS)) {
    const v = value[key];
    if (v === undefined || v === null || v === '') fields[key] = 'REQUIRED';
    else if (typeof v !== 'string') fields[key] = 'INVALID_TYPE';
    else if (!v.trim()) fields[key] = 'REQUIRED';
    else if (v.length > max) fields[key] = 'TOO_LONG';
    else if ((key === 'message' ? /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/ : /[\x00-\x1f\x7f]/).test(v)) fields[key] = 'CONTROL_CHARACTERS';
    else if (key === 'email' && !validEmail(v.trim())) fields[key] = 'INVALID_FORMAT';
    else clean[key] = v.trim();
  }
  if (Object.keys(fields).length) throw new ApiError(400, 'VALIDATION_FAILED', fields);
  return clean;
}
