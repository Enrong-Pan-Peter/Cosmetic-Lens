/**
 * GET /api/concern-search?q=...&lang=en|zh  (improvement-plan 12.2 / 7.6)
 *
 * Deterministic concern → ingredients lookup over the curated DB. No LLM, no
 * embeddings — a keyword→concern map — so it's cheap (`light` rate-limit) and
 * instant. Results link into the prerendered ingredient pages.
 */
import type { APIRoute } from 'astro';
import { searchByConcern } from '../../lib/concern-search';
import type { Language } from '../../lib/prompt';
import { getUserFromRequest } from '../../lib/auth';
import { enforceRateLimit, getClientIp } from '../../lib/rate-limit';

export const prerender = false;

export const GET: APIRoute = async ({ request, url, clientAddress }) => {
  const q = (url.searchParams.get('q') ?? '').slice(0, 200);
  const lang: Language = url.searchParams.get('lang') === 'zh' ? 'zh' : 'en';

  const authedUser = await getUserFromRequest(request);
  const rl = await enforceRateLimit({
    cls: 'light',
    userId: authedUser?.id ?? null,
    ip: getClientIp(request, clientAddress),
    request,
  });
  if (!rl.allowed) {
    // Non-critical: return an empty result rather than a hard error.
    return new Response(JSON.stringify({ success: true, concerns: [], ingredients: [] }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { concerns, ingredients } = searchByConcern(q, lang);
  return new Response(JSON.stringify({ success: true, concerns, ingredients }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
