/**
 * Conversational query transformation (improvement-plan 8.3).
 *
 * Dense/lexical retrieval both key on the latest user message. Multi-turn
 * follow-ups ("is it safe at night?", "什么浓度合适？") drop the subject, so the
 * query no longer matches the ingredient the user means. This module detects a
 * context-dependent follow-up and prepends the most recent subject(s) from the
 * conversation before retrieval — a standalone-query rewrite without an extra
 * LLM call. Pure + testable; used by classic RAG and the agentic
 * search_knowledge_base tool.
 */
import { findIngredientData } from './prompt';

const EN_PRONOUNS = /\b(it|its|it's|they|them|their|this|that|these|those|one|ones|same)\b/;
const EN_PHRASES = /\b(what about|how about|is it|are they|are these|what if|instead|versus|vs|compared|the same|at night|in the morning|during the day)\b/;
const ZH_MARKERS = /(它|它们|这个|那个|这些|那些|这款|那款|同样|一样|呢|吗|晚上|早上|白天|孕期|浓度)/;
const CJK = /[㐀-鿿]/;

/**
 * Is this query a context-dependent follow-up (short, references a prior
 * subject via pronoun/marker, and doesn't itself name a known ingredient)?
 */
export function isFollowUp(query: string): boolean {
  const q = (query || '').trim();
  if (!q) return false;

  const isCjk = CJK.test(q);
  const short = isCjk ? q.length <= 16 : q.split(/\s+/).filter(Boolean).length <= 8;
  if (!short) return false;

  const lower = q.toLowerCase();
  const hasMarker = EN_PRONOUNS.test(lower) || EN_PHRASES.test(lower) || ZH_MARKERS.test(q);
  if (!hasMarker) return false;

  // If the query already names a known ingredient it is self-contained.
  if (findIngredientData(q).length > 0) return false;

  return true;
}

/**
 * Most-recent-first subjects (INCI ingredient names) mentioned earlier in the
 * conversation. Used to re-attach a subject to a bare follow-up.
 */
export function extractSubjects(priorMessages: string[], max = 2): string[] {
  const subjects: string[] = [];
  const seen = new Set<string>();
  for (let i = priorMessages.length - 1; i >= 0 && subjects.length < max; i--) {
    const matches = findIngredientData(priorMessages[i] || '');
    for (const m of matches) {
      const key = m.inci_name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      subjects.push(m.inci_name);
      if (subjects.length >= max) break;
    }
  }
  return subjects;
}

/**
 * Rewrite a follow-up into a standalone retrieval query by prepending the
 * recent subject(s). Returns the query unchanged when it isn't a follow-up or
 * no subject can be found — so it can be called unconditionally.
 */
export function expandQuery(query: string, priorMessages: string[]): string {
  if (!isFollowUp(query)) return query;
  const subjects = extractSubjects(priorMessages);
  if (subjects.length === 0) return query;
  return `${subjects.join(', ')} — ${query}`;
}
