import type { APIRoute } from 'astro';
import { searchProduct, extractIngredients } from '../../lib/openbeautyfacts';
import { enforceRateLimit, getClientIp, rateLimitResponse } from '../../lib/rate-limit';

const MAX_QUERY_CHARS = 200;

export const GET: APIRoute = async ({ request, url, clientAddress }) => {
  try {
    const query = url.searchParams.get('q');

    if (!query || query.trim().length < 2 || query.length > MAX_QUERY_CHARS) {
      return new Response(JSON.stringify({
        success: false,
        error: 'invalid_query',
        message: 'Please provide a search query (2–200 characters)'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Per-IP daily cap — no LLM cost, but keeps us a good OBF citizen.
    const rl = await enforceRateLimit({
      cls: 'light',
      ip: getClientIp(request, clientAddress),
      request,
    });
    if (!rl.allowed) {
      return rateLimitResponse('light', 'en', false);
    }

    const product = await searchProduct(query.trim());

    if (!product) {
      return new Response(JSON.stringify({
        success: false,
        error: 'product_not_found',
        message: 'No product found matching your search'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const ingredients = extractIngredients(product, 'en');

    return new Response(JSON.stringify({
      success: true,
      data: {
        name: product.product_name,
        brand: product.brands,
        ingredients: ingredients,
        image: product.image_url,
        categories: product.categories
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Search product error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'internal_error',
      message: 'Failed to search products'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
