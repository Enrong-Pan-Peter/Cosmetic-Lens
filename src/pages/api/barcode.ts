/**
 * GET /api/barcode?code=...&lang=en|zh  (improvement-plan 14.6)
 *
 * Looks up a scanned barcode in Open Beauty Facts and returns the product name
 * + ingredient list, so the client can seed the chat composer (same flow as a
 * photo extraction). No LLM — a crowdsourced-DB lookup — so it uses the cheap
 * `light` rate-limit class.
 */
import type { APIRoute } from 'astro';
import { getProductByBarcode, extractIngredients } from '../../lib/openbeautyfacts';
import { getUserFromRequest } from '../../lib/auth';
import { enforceRateLimit, getClientIp } from '../../lib/rate-limit';

export const prerender = false;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const GET: APIRoute = async ({ request, url, clientAddress }) => {
  const code = (url.searchParams.get('code') ?? '').replace(/\D/g, '').slice(0, 14);
  const lang = url.searchParams.get('lang') === 'zh' ? 'zh' : 'en';

  // EAN/UPC barcodes are 8–14 digits.
  if (code.length < 8) {
    return json({ success: false, error: 'invalid_barcode' }, 400);
  }

  const authedUser = await getUserFromRequest(request);
  const rl = await enforceRateLimit({
    cls: 'light',
    userId: authedUser?.id ?? null,
    ip: getClientIp(request, clientAddress),
    request,
  });
  if (!rl.allowed) {
    return json({ success: false, error: 'rate_limited' }, 429);
  }

  try {
    const product = await getProductByBarcode(code);
    if (!product) {
      return json({ success: true, found: false, code });
    }
    const ingredients = extractIngredients(product, lang);
    return json({
      success: true,
      found: true,
      code,
      product_name: product.product_name ?? null,
      brand: product.brands ?? null,
      ingredients_text: ingredients,
    });
  } catch (err) {
    console.error('[barcode] lookup failed:', err instanceof Error ? err.message : err);
    return json({ success: false, error: 'lookup_failed' }, 500);
  }
};
