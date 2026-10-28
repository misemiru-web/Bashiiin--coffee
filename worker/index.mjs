import { handleContact } from './contact/api.mjs';
import { json } from './contact/http.mjs';
export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (pathname === '/api/contact') return handleContact(request, env);
    if (pathname === '/api' || pathname.startsWith('/api/')) return json(404, { ok: false, code: 'NOT_FOUND' });
    // Matched static assets bypass this handler; only misses normally arrive here.
    try { return await env.ASSETS.fetch(request); }
    catch { return json(503, { ok: false, code: 'SERVICE_UNAVAILABLE' }); }
  },
};
