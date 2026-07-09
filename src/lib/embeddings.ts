import { createServerClient } from './supabase';
import {
  queryTerms,
  lexicalScore,
  reciprocalRankFusion,
  rerankCandidates,
  type RetrievalCandidate,
} from './retrieval';

const EMBEDDING_MODEL = 'text-embedding-3-small';

export async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = import.meta.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY not configured');

  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: text.slice(0, 8000),
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Embedding API error ${response.status}: ${err}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

export interface KnowledgeResult {
  id: string;
  content: string;
  content_type: string;
  metadata: Record<string, any>;
  language?: string;
  similarity: number;
}

export type RetrievalMode = 'dense' | 'hybrid';

export interface SearchOptions {
  matchCount?: number;
  filterType?: string;
  language?: 'en' | 'zh';
  /** Override the retrieval strategy. Defaults to RETRIEVAL_MODE env (or 'hybrid'). */
  mode?: RetrievalMode;
}

function configuredMode(): RetrievalMode {
  const m = String(import.meta.env.RETRIEVAL_MODE ?? 'hybrid').toLowerCase();
  return m === 'dense' ? 'dense' : 'hybrid';
}

/**
 * Retrieve knowledge snippets. Default is a two-stage HYBRID pipeline
 * (improvement-plan 8.1/8.2): dense vector search + lexical search, fused with
 * Reciprocal Rank Fusion, then feature-reranked. Falls back to dense-only on
 * any lexical error, and dense-only is fully available via `mode: 'dense'` or
 * `RETRIEVAL_MODE=dense` — so worst case behaviour equals the previous version.
 */
export async function searchKnowledge(
  query: string,
  options: SearchOptions = {},
): Promise<KnowledgeResult[]> {
  const mode = options.mode ?? configuredMode();
  if (mode === 'hybrid') {
    try {
      return await hybridSearch(query, options);
    } catch (err) {
      console.warn('Hybrid retrieval failed — falling back to dense:', err);
    }
  }
  return denseSearch(query, options);
}

// ---------------------------------------------------------------------------
// Dense channel — pgvector via match_knowledge RPC (unchanged behaviour)
// ---------------------------------------------------------------------------

async function denseSearch(
  query: string,
  options: SearchOptions = {},
): Promise<KnowledgeResult[]> {
  const { matchCount = 5, filterType = undefined, language = undefined } = options;

  try {
    const embedding = await generateEmbedding(query);
    const supabase = createServerClient();

    let { data, error } = await supabase.rpc('match_knowledge', {
      query_embedding: embedding,
      match_count: matchCount,
      filter_type: filterType ?? null,
      ...(language ? { filter_language: language } : {}),
    });

    // Graceful degrade: if the 4-arg RPC isn't deployed yet
    // (20260707_rag_language_telemetry.sql), retry without the language filter.
    if (error && language) {
      console.warn(
        'match_knowledge with filter_language failed (migration missing?) — retrying unfiltered:',
        error.message,
      );
      ({ data, error } = await supabase.rpc('match_knowledge', {
        query_embedding: embedding,
        match_count: matchCount,
        filter_type: filterType ?? null,
      }));
    }

    if (error) {
      console.warn('Knowledge search RPC failed:', error.message);
      return [];
    }

    return (data as KnowledgeResult[]) ?? [];
  } catch (err) {
    console.warn('Knowledge search failed (non-blocking):', err);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Lexical channel — literal term match over `content` (recovers exact names /
// nicknames that dense embeddings miss). No language filter: a zh nickname
// should still find an en-stored product row.
// ---------------------------------------------------------------------------

interface LexicalRow {
  id: string;
  content: string;
  content_type: string;
  metadata: Record<string, any>;
  language?: string;
  lexScore: number;
}

async function lexicalSearch(
  query: string,
  options: SearchOptions = {},
): Promise<LexicalRow[]> {
  const { matchCount = 5, filterType = undefined } = options;
  const terms = queryTerms(query)
    // Strip characters that would break the PostgREST or() filter grammar.
    .map((t) => t.replace(/[,()%*]/g, ' ').trim())
    .filter((t) => t.length >= 2);
  if (terms.length === 0) return [];

  const supabase = createServerClient();
  const orFilter = terms.map((t) => `content.ilike.*${t}*`).join(',');

  let q = supabase
    .from('knowledge_embeddings')
    .select('id,content,content_type,metadata,language')
    .or(orFilter)
    .limit(matchCount);
  if (filterType) q = q.eq('content_type', filterType);

  const { data, error } = await q;
  if (error) {
    console.warn('Lexical search failed:', error.message);
    return [];
  }

  return ((data as Omit<LexicalRow, 'lexScore'>[]) ?? [])
    .map((r) => ({ ...r, lexScore: lexicalScore(query, r.content) }))
    .filter((r) => r.lexScore > 0)
    .sort((a, b) => b.lexScore - a.lexScore);
}

// ---------------------------------------------------------------------------
// Hybrid orchestration: dense + lexical -> RRF -> feature rerank
// ---------------------------------------------------------------------------

async function hybridSearch(
  query: string,
  options: SearchOptions = {},
): Promise<KnowledgeResult[]> {
  const matchCount = options.matchCount ?? 5;
  const over = Math.max(matchCount * 3, 12);

  const [dense, lexical] = await Promise.all([
    denseSearch(query, { ...options, matchCount: over }),
    lexicalSearch(query, { ...options, matchCount: over }),
  ]);

  // No lexical signal -> behave exactly like dense.
  if (lexical.length === 0) return dense.slice(0, matchCount);

  const byId = new Map<string, RetrievalCandidate>();
  for (const d of dense) byId.set(d.id, { ...d });
  for (const l of lexical) {
    const existing = byId.get(l.id);
    if (existing) existing.lexScore = l.lexScore;
    else byId.set(l.id, { ...l, similarity: undefined });
  }

  const fusedIds = reciprocalRankFusion([dense.map((d) => d.id), lexical.map((l) => l.id)]);
  const candidates = fusedIds
    .map((id) => byId.get(id))
    .filter((c): c is RetrievalCandidate => Boolean(c));

  const reranked = rerankCandidates(query, candidates).slice(0, matchCount);

  return reranked.map((c) => ({
    id: c.id,
    content: c.content,
    content_type: c.content_type,
    metadata: c.metadata,
    language: c.language,
    // Preserve dense cosine when present; otherwise surface the blended score
    // so downstream similarity thresholds (e.g. tools.ts 0.3) still work.
    similarity: Math.min(1, Math.max(c.similarity ?? 0, c.score)),
  }));
}

export async function searchDupeProducts(
  query: string,
  matchCount = 5,
): Promise<KnowledgeResult[]> {
  return searchKnowledge(query, { matchCount, filterType: 'product' });
}

export async function indexContent(
  content: string,
  contentType: string,
  metadata: Record<string, any> = {},
  language = 'en',
): Promise<boolean> {
  try {
    const embedding = await generateEmbedding(content);
    const supabase = createServerClient();

    const { error } = await supabase.from('knowledge_embeddings').insert({
      content,
      content_type: contentType,
      metadata,
      language,
      embedding,
    });

    if (error) {
      console.error('Failed to index content:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Indexing failed:', err);
    return false;
  }
}
