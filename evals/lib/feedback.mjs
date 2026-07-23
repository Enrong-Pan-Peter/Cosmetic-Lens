/**
 * Feedback → eval-case transformation (improvement-plan 10.1).
 *
 * Turns 👎 rows from the `feedback` table (written by /api/feedback, 7.3) into
 * candidate eval cases for human triage — the flywheel: user feedback → eval
 * set → measured fix. Pure (no I/O) so it's unit-tested; the CLI
 * (feedback-to-cases.mjs) does the Supabase fetch and file writing.
 */

/** Intents whose failures belong in the end-to-end (answer-quality) suite. */
const E2E_INTENTS = new Set(['product', 'dupe', 'knowledge']);

/**
 * Map one feedback row to a triage candidate. `suggested_suite` routes it:
 * substantive answers → e2e (judge answer quality); everything else (incl.
 * misrouted greetings) → intent (was it even classified right?).
 * @param {Record<string, any>} row
 */
export function feedbackRowToCandidate(row) {
  const language = row?.language === 'zh' ? 'zh' : 'en';
  const intent = typeof row?.intent === 'string' ? row.intent : null;
  const query = String(row?.query ?? '').trim();
  const answer = String(row?.answer ?? '').trim();
  const reason = String(row?.reason ?? '').trim();
  const suggested_suite = intent && E2E_INTENTS.has(intent) ? 'e2e' : 'intent';

  return {
    source: 'feedback',
    rating: row?.rating === 'up' ? 'up' : 'down',
    created_at: row?.created_at ?? null,
    language,
    intent,
    pipeline: typeof row?.pipeline === 'string' ? row.pipeline : null,
    reason: reason || null,
    query,
    answer_excerpt: answer.slice(0, 280),
    suggested_suite,
  };
}

function normalizeQuery(q) {
  return String(q ?? '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Collapse candidates that share the same (normalized query + language),
 * keeping the first and counting duplicates — the same complaint from many
 * users is one eval case, but its `count` signals priority.
 * @param {ReturnType<typeof feedbackRowToCandidate>[]} candidates
 */
export function dedupeCandidates(candidates) {
  const byKey = new Map();
  for (const c of candidates) {
    const key = `${c.language}::${normalizeQuery(c.query)}`;
    const existing = byKey.get(key);
    if (existing) {
      existing.count += 1;
      if (c.reason && !existing.reasons.includes(c.reason)) existing.reasons.push(c.reason);
    } else {
      byKey.set(key, { ...c, count: 1, reasons: c.reason ? [c.reason] : [] });
    }
  }
  // Most-reported first.
  return [...byKey.values()].sort((a, b) => b.count - a.count);
}
