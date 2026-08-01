/** Shared config for the eval harness. Loads ../.env (same file the app uses). */
import 'dotenv/config';

export const CONFIG = {
  baseUrl: process.env.EVAL_BASE_URL || 'http://localhost:4321',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  supabaseUrl: process.env.PUBLIC_SUPABASE_URL || '',
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  rateLimitBypassToken: process.env.RATE_LIMIT_BYPASS_TOKEN || '',
  embeddingModel: 'text-embedding-3-small',
  judgeModel: process.env.EVAL_JUDGE_MODEL || 'gpt-4.1',
};

export const PIPELINES = {
  agentic: '/api/chat-agentic',
  classic: '/api/chat',
};

/**
 * Rough price table (USD per 1M tokens) for cost ESTIMATES only.
 * Chat-side token counts are estimated as chars/4 (the app's SSE stream
 * doesn't expose usage); judge-side counts are exact (from the API).
 * Update when OpenAI pricing changes.
 */
export const PRICES_PER_MTOK = {
  'gpt-5.6-luna': { input: 0.2, output: 1.2 }, // after OpenAI's 2026-07-30 ~80% price cut
  'gpt-4o-mini': { input: 0.15, output: 0.6 },
  'gpt-4.1-mini': { input: 0.4, output: 1.6 },
  'gpt-4.1': { input: 2.0, output: 8.0 },
  'text-embedding-3-small': { input: 0.02, output: 0 },
};

export function estTokens(text) {
  return Math.ceil((text || '').length / 4);
}

export function estOutputCostUsd(model, text) {
  const p = PRICES_PER_MTOK[model];
  if (!p) return null;
  return (estTokens(text) / 1e6) * p.output;
}
