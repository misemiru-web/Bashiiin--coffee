export class ApiError extends Error {
  constructor(status, code, fields) { super(code); this.status = status; this.code = code; this.fields = fields; }
}
export function json(status, body, extra = {}) {
  return new Response(JSON.stringify(body), { status, headers: {
    'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff', ...extra,
  } });
}
export function failure(error) {
  if (!(error instanceof ApiError)) return json(503, { ok: false, code: 'SERVICE_UNAVAILABLE' });
  return json(error.status, { ok: false, code: error.code, ...(error.fields ? { fields: error.fields } : {}) },
    error.status === 405 ? { Allow: 'POST' } : {});
}
// No retries: an upstream may complete after the local timeout. Never log its error/result.
export async function deadline(operation, ms, code = 'UPSTREAM_UNAVAILABLE') {
  const controller = new AbortController(); let timer;
  try {
    return await Promise.race([
      Promise.resolve().then(() => operation(controller.signal)),
      new Promise((_, reject) => { timer = setTimeout(() => { controller.abort(); reject(new ApiError(503, code)); }, ms); }),
    ]);
  } finally { clearTimeout(timer); }
}
