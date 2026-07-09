import type { APIRoute } from 'astro';
import { analyzeProduct } from '../../lib/analyzer';
import { getUserFromRequest } from '../../lib/auth';
import { enforceRateLimit, getClientIp, rateLimitResponse } from '../../lib/rate-limit';
import type { Language } from '../../lib/prompt';

export const POST: APIRoute = async ({ request, clientAddress }) => {
  try {
    const body = await request.json();
    const {
      productName,
      ingredients,
      language = 'en'
    } = body;

    // Identity comes ONLY from the verified JWT — never from the body (IDOR fix).
    const authedUser = await getUserFromRequest(request);
    const userId = authedUser?.id ?? null;

    // Validate input
    if (!productName && !ingredients) {
      return new Response(JSON.stringify({
        success: false,
        error: 'missing_input',
        message: 'Please provide a product name or ingredient list'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Daily rate limit — shares the 'chat' budget with the chat endpoints.
    const lang = (language === 'zh' ? 'zh' : 'en') as 'en' | 'zh';
    const rl = await enforceRateLimit({
      cls: 'chat',
      userId,
      ip: getClientIp(request, clientAddress),
      request,
    });
    if (!rl.allowed) {
      return rateLimitResponse('chat', lang, Boolean(userId));
    }

    // Run analysis (delegates to analyzer.ts — now with smart fallback)
    const result = await analyzeProduct({
      productName,
      ingredients,
      language: language as Language,
      userId
    });

    // Map error codes to HTTP status codes
    // Note: 'product_not_found' is no longer returned — the LLM fallback handles it
    const statusCode = result.success ? 200
      : result.errorCode === 'missing_input' ? 400
      : result.errorCode === 'rate_limit_exceeded' ? 429
      : 500;

    return new Response(JSON.stringify(result), {
      status: statusCode,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Analysis API error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'internal_error',
      message: 'An unexpected error occurred. Please try again.'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// Rate limiting now lives in src/lib/rate-limit.ts (shared across endpoints).
