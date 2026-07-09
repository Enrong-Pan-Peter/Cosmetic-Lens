/**
 * Semantic answer cache (improvement-plan 8.4).
 *
 * Embeds the incoming query and, if it's within `CACHE_SIMILARITY_THRESHOLD`
 * of a previously answered query (same language + intent), serves the stored
 * answer instead of running the model — a latency win, surfaced with the
 * existing "Cached" badge.
 *
 * Scope guards (correctness > hit-rate):
 *   - FIRST-TURN ONLY. Follow-ups depend on conversation context, which a
 *     query-only embedding ignores, so we never cache/serve them.
 *   - Cacheable intents only (knowledge / product / dupe). Greetings ("other")
 *     are cheap and too varied to cache.
 *
 * OFF by default. Enable with `SEMANTIC_CACHE=on`. Every path is fail-open:
 * any lookup/store error falls back to the normal model flow. Requires
 * `supabase/migrations/20260709_semantic_cache.sql`.
 */
import { createServerClient } from './supabase';
import { generateEmbedding } from './embeddings';

/** Cosine similarity at/above which a cached answer is considered a match. */
export const CACHE_SIMILARITY_THRESHOLD = 0.93;

const CACHEABLE_INTENTS = new Set(['knowledge', 'product', 'dupe']);

export interface CachedAnswer {
  answer: string;
  source: string | null;
  similarity: number;
}

/** Env flag — cache is opt-in so the default demo path is untouched. */
export function isSemanticCacheEnabled(): boolean {
  const v = String(import.meta.env.SEMANTIC_CACHE ?? '').toLowerCase();
  return v === 'on' || v === '1' || v === 'true';
}

/**
 * Pure decision: is this turn eligible for the semantic cache? Only the very
 * first user turn of a conversation, and only for context-free intents.
 */
export function shouldUseCache(
  messages: Array<{ role: string }>,
  intent: string,
): boolean {
  if (!CACHEABLE_INTENTS.has(intent)) return false;
  let userTurns = 0;
  let assistantTurns = 0;
  for (const m of messages) {
    if (m.role === 'user') userTurns++;
    else if (m.role === 'assistant') assistantTurns++;
  }
  return userTurns === 1 && assistantTurns === 0;
}

/** Look up a cached answer for `query`. Returns null on miss or any error. */
export async function lookupCachedAnswer(
  query: string,
  opts: { language: 'en' | 'zh'; intent: string },
): Promise<CachedAnswer | null> {
  try {
    const embedding = await generateEmbedding(query);
    const supabase = createServerClient();
    const { data, error } = await supabase.rpc('match_chat_cache', {
      query_embedding: embedding,
      similarity_threshold: CACHE_SIMILARITY_THRESHOLD,
      filter_language: opts.language,
      filter_intent: opts.intent,
    });
    if (error) {
      console.warn('[semantic-cache] lookup failed (migration missing?):', error.message);
      return null;
    }
    const row = Array.isArray(data) ? data[0] : null;
    if (!row || typeof row.answer !== 'string' || !row.answer.trim()) return null;
    return { answer: row.answer, source: row.source ?? null, similarity: Number(row.similarity ?? 0) };
  } catch (err) {
    console.warn('[semantic-cache] lookup error (non-blocking):', err instanceof Error ? err.message : err);
    return null;
  }
}

/**
 * Store an answer for future reuse. Fire-and-forget: callers should NOT await
 * this on the request's critical path. Upserts on (query_text, language) so a
 * re-asked question refreshes rather than duplicates.
 */
export function storeCachedAnswer(entry: {
  query: string;
  answer: string;
  language: 'en' | 'zh';
  intent: string;
  source?: string | null;
}): void {
  void (async () => {
    try {
      if (!entry.answer.trim()) return;
      const embedding = await generateEmbedding(entry.query);
      const supabase = createServerClient();
      const { error } = await supabase.from('chat_semantic_cache').upsert(
        {
          query_text: entry.query.slice(0, 2000),
          embedding,
          answer: entry.answer,
          language: entry.language,
          intent: entry.intent,
          source: entry.source ?? null,
        },
        { onConflict: 'query_text,language' },
      );
      if (error) throw new Error(error.message);
    } catch (err) {
      console.warn('[semantic-cache] store failed (non-blocking):', err instanceof Error ? err.message : err);
    }
  })();
}
