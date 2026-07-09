/**
 * Hybrid-retrieval primitives (improvement-plan 8.1 + 8.2), kept pure so they
 * are unit-testable and shared between the app (`embeddings.ts`) and the eval
 * harness's mirror.
 *
 * Why hybrid: dense vector search alone misses exact names and nicknames whose
 * embeddings don't cluster near the query — e.g. the zh nickname for Lancome
 * Advanced Genifique (eval ret-036). A lexical channel that literally finds the
 * nickname in a product row's "Also known as: ..." text recovers it; we then
 * fuse the two rankings with Reciprocal Rank Fusion and rerank by a small set
 * of features (dense score + lexical overlap + exact name/alias boost).
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RetrievalCandidate {
  id: string;
  content: string;
  content_type: string;
  metadata: Record<string, unknown>;
  language?: string;
  /** Dense cosine similarity (0..1) when the row came from the vector channel. */
  similarity?: number;
  /** Lexical overlap score (0..1) when the row came from the lexical channel. */
  lexScore?: number;
}

// ---------------------------------------------------------------------------
// Tokenization — Latin word tokens + CJK character n-grams
// ---------------------------------------------------------------------------

// CJK Unified Ideographs (+ Extension A) and Compatibility Ideographs.
const CJK_CLASS = '\\u3400-\\u9fff\\uf900-\\ufaff';
const CJK_RUN_RE = new RegExp(`[${CJK_CLASS}]+`, 'g');
const COMBINING_RE = /[̀-ͯ]/g;

// Common zh particles / stop-syllables that add noise to lexical matching.
const ZH_STOP = new Set(['的', '了', '和', '与', '及', '或', '是', '在', '有', '我', '你', '他']);
// Short English function words that shouldn't drive lexical matches.
const EN_STOP = new Set(['the', 'and', 'for', 'with', 'is', 'are', 'of', 'to', 'in', 'on', 'my', 'me', 'an']);

/**
 * Break a query into lexical terms:
 *  - Latin/number runs -> whole words (>= 2 chars, non-stopword)
 *  - CJK runs -> sliding n-grams of length 2-4 (so a 3-char nickname is a term
 *    inside a longer query)
 * Deduped and capped so the downstream `OR ilike` stays small.
 */
export function queryTerms(query: string, cap = 12): string[] {
  const out: string[] = [];
  const lower = (query || '').toLowerCase();

  for (const m of lower.matchAll(/[a-z0-9]{2,}/g)) {
    const w = m[0];
    if (!EN_STOP.has(w)) out.push(w);
  }

  for (const run of lower.match(CJK_RUN_RE) ?? []) {
    if (run.length === 1) {
      if (!ZH_STOP.has(run)) out.push(run);
      continue;
    }
    for (let n = 2; n <= 4; n++) {
      for (let i = 0; i + n <= run.length; i++) {
        const gram = run.slice(i, i + n);
        if (n === 2 && (ZH_STOP.has(gram[0]) || ZH_STOP.has(gram[1]))) continue;
        out.push(gram);
      }
    }
  }

  const seen = new Set<string>();
  const deduped: string[] = [];
  for (const t of out) {
    if (seen.has(t)) continue;
    seen.add(t);
    deduped.push(t);
  }
  // Prefer longer (more specific) terms when capping.
  deduped.sort((a, b) => b.length - a.length);
  return deduped.slice(0, cap);
}

/**
 * Lexical overlap of a query against a text, 0..1. Weighted by matched term
 * length so matching a specific 3-char nickname counts more than a 2-char gram.
 */
export function lexicalScore(query: string, text: string): number {
  if (!text) return 0;
  const terms = queryTerms(query);
  if (terms.length === 0) return 0;
  const hay = text.toLowerCase();

  let matched = 0;
  let total = 0;
  for (const t of terms) {
    total += t.length;
    if (hay.includes(t)) matched += t.length;
  }
  return total === 0 ? 0 : Math.min(1, matched / total);
}

// ---------------------------------------------------------------------------
// Reciprocal Rank Fusion
// ---------------------------------------------------------------------------

/**
 * Fuse several ranked id lists into one ordering. RRF score for an id is
 * Sum 1/(k + rank) across the lists it appears in (rank is 1-based). k=60 is
 * the standard constant. Returns ids ordered by descending fused score.
 */
export function reciprocalRankFusion(rankedLists: string[][], k = 60): string[] {
  const scores = new Map<string, number>();
  for (const list of rankedLists) {
    list.forEach((id, idx) => {
      scores.set(id, (scores.get(id) ?? 0) + 1 / (k + idx + 1));
    });
  }
  return [...scores.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id);
}

// ---------------------------------------------------------------------------
// Feature-based reranking (stage 2)
// ---------------------------------------------------------------------------

function normalizeName(s: string): string {
  return s.toLowerCase().normalize('NFKD').replace(COMBINING_RE, '').trim();
}

/** Does any query term exactly equal (or sit inside) a name/alias in metadata? */
function exactNameBoost(query: string, metadata: Record<string, unknown>): number {
  const terms = new Set(queryTerms(query).map(normalizeName));
  const names: string[] = [];
  for (const key of ['inci_name', 'name', 'original_name', 'chinese_name', 'title']) {
    const v = metadata?.[key];
    if (typeof v === 'string') names.push(v);
  }
  for (const a of [metadata?.aliases, metadata?.aliases_en, metadata?.aliases_zh]) {
    if (Array.isArray(a)) for (const x of a) if (typeof x === 'string') names.push(x);
  }
  for (const n of names) {
    const nn = normalizeName(n);
    if (terms.has(nn)) return 1;
    for (const t of terms) if (t.length >= 3 && nn.includes(t)) return 0.6;
  }
  return 0;
}

export interface RerankWeights {
  dense: number;
  lexical: number;
  nameBoost: number;
}

export const DEFAULT_RERANK_WEIGHTS: RerankWeights = { dense: 0.6, lexical: 0.4, nameBoost: 0.25 };

/** Combined feature score, also surfaced as `similarity` so callers' thresholds work. */
export function rerankScore(
  query: string,
  c: RetrievalCandidate,
  w: RerankWeights = DEFAULT_RERANK_WEIGHTS,
): number {
  const dense = c.similarity ?? 0;
  const lex = c.lexScore ?? lexicalScore(query, c.content);
  const boost = exactNameBoost(query, c.metadata ?? {});
  return w.dense * dense + w.lexical * lex + w.nameBoost * boost;
}

/** Reorder candidates by descending rerank score (non-mutating). */
export function rerankCandidates(
  query: string,
  candidates: RetrievalCandidate[],
  w: RerankWeights = DEFAULT_RERANK_WEIGHTS,
): Array<RetrievalCandidate & { score: number }> {
  return candidates
    .map((c) => ({ ...c, score: rerankScore(query, c, w) }))
    .sort((a, b) => b.score - a.score);
}
