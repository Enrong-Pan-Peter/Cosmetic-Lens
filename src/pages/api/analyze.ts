import type { APIRoute } from 'astro';
import { analyzeProduct } from '../../lib/analyzer';
import { createServerClient } from '../../lib/supabase';
import type { Language } from '../../lib/prompt';

// Rate limits
const RATE_LIMIT_ANONYMOUS = 5;  // per day
const RATE_LIMIT_AUTHENTICATED = 20;  // per day

export const POST: APIRoute = async ({ request, clientAddress }) => {
  try {
    const body = await request.json();
    const {
      productName,
      ingredients,
      language = 'en',
      userId = null
    } = body;

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

    // Check rate limit (non-blocking — if check fails, allow the request)
    const identifier = userId || hashIP(clientAddress);
    const limit = userId ? RATE_LIMIT_AUTHENTICATED : RATE_LIMIT_ANONYMOUS;

    try {
      const isWithinLimit = await checkRateLimit(identifier, limit);
      if (!isWithinLimit) {
        return new Response(JSON.stringify({
          success: false,
          error: 'rate_limit_exceeded',
          message: userId
            ? 'Daily analysis limit reached. Try again tomorrow!'
            : 'Daily limit reached. Create an account for more analyses!'
        }), {
          status: 429,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    } catch (rateLimitError) {
      console.warn('Rate limit check failed, allowing request:', rateLimitError);
    }

    // Run analysis (delegates to analyzer.ts — now with smart fallback)
    const result = await analyzeProduct({
      productName,
      ingredients,
      language: language as Language,
      userId
    });

    // Increment rate limit on successful analysis (fire-and-forget, never blocks response)
    if (result.success && !result.cached) {
      incrementRateLimit(identifier, userId ? 'user' : 'ip').catch((err) => {
        console.warn('Rate limit increment failed (non-blocking):', err);
      });
    }

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

// ================================
// HELPER FUNCTIONS
// ================================

function hashIP(ip: string): string {
  let hash = 0;
  for (let i = 0; i < ip.length; i++) {
    const char = ip.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `ip_${Math.abs(hash).toString(16)}`;
}

async function checkRateLimit(identifier: string, limit: number): Promise<boolean> {
  try {
    const supabase = createServerClient();
    const today = new Date().toISOString().split('T')[0];

    const { data } = await supabase
      .from('rate_limits')
      .select('request_count')
      .eq('identifier', identifier)
      .eq('date', today)
      .single();

    if (!data) return true;
    return data.request_count < limit;
  } catch {
    // If rate limit check fails, allow the request
    return true;
  }
}

async function incrementRateLimit(identifier: string, identifierType: string): Promise<void> {
  try {
    const supabase = createServerClient();
    const today = new Date().toISOString().split('T')[0];

    // Try RPC first (atomic increment, ideal path)
    const { error: rpcError } = await supabase.rpc('increment_rate_limit', {
      p_identifier: identifier,
      p_identifier_type: identifierType
    });

    if (!rpcError) return; // RPC worked, done

    // Fallback: upsert with request_count = 1 for new rows
    // For existing rows this won't increment, but at least creates the record
    console.warn('RPC increment_rate_limit unavailable, falling back to upsert:', rpcError.message);

    const { error: upsertError } = await supabase
      .from('rate_limits')
      .upsert({
        identifier,
        identifier_type: identifierType,
        date: today,
        request_count: 1
      }, {
        onConflict: 'identifier,date'
      });

    if (upsertError) {
      console.warn('Rate limit upsert failed:', upsertError.message);
    }
  } catch (err) {
    // Non-critical — log and move on, never block the analysis
    console.warn('Rate limit increment error (non-blocking):', err);
  }
}
