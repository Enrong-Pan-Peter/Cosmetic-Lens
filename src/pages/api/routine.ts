/**
 * POST /api/routine
 *
 * Deterministic routine conflict check (improvement-plan 7.1). No LLM spend —
 * a pure lookup against the curated interaction table — so it uses the cheap
 * `light` rate-limit class. Identity (for the per-user tier) comes only from a
 * verified JWT, never the body.
 */
import type { APIRoute } from 'astro';
import { analyzeRoutine, type RoutineProductInput } from '../../lib/routine';
import type { Language } from '../../lib/prompt';
import { getUserFromRequest } from '../../lib/auth';
import { enforceRateLimit, getClientIp, rateLimitResponse } from '../../lib/rate-limit';

export const prerender = false;

const MAX_PRODUCTS = 5;
const MAX_INGREDIENTS_CHARS = 4000;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const POST: APIRoute = async ({ request, clientAddress }) => {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ success: false, error: 'Invalid JSON body' }, 400);
  }

  const language = (body?.language === 'zh' ? 'zh' : 'en') as Language;
  const rawProducts = Array.isArray(body?.products) ? body.products : [];

  const products: RoutineProductInput[] = rawProducts
    .slice(0, MAX_PRODUCTS)
    .map((p: any) => ({
      name: typeof p?.name === 'string' ? p.name.slice(0, 120) : '',
      ingredients: typeof p?.ingredients === 'string' ? p.ingredients.slice(0, MAX_INGREDIENTS_CHARS) : '',
    }))
    .filter((p: RoutineProductInput) => p.ingredients.trim().length > 0);

  if (products.length < 2) {
    return json({ success: false, error: 'need_two_products' }, 400);
  }

  const authedUser = await getUserFromRequest(request);

  const rl = await enforceRateLimit({
    cls: 'light',
    userId: authedUser?.id ?? null,
    ip: getClientIp(request, clientAddress),
    request,
  });
  if (!rl.allowed) {
    return rateLimitResponse('light', language, Boolean(authedUser));
  }

  const result = analyzeRoutine(products, language, { isPregnant: body?.isPregnant === true });
  return json({ success: true, result });
};
