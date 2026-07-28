/**
 * Answer citations (improvement-plan 14.5c).
 *
 * Turns a finished chat answer into a "Further reading" list: for every
 * ingredient the answer actually names, surface the peer-reviewed reviews we
 * already hold for it (Europe PMC literature entries in
 * ingredient-references.json).
 *
 * Design guarantees (why this is interview-defensible, not a hallucination
 * risk):
 *   1. DETERMINISTIC. Citations are matched from the model's text against our
 *      own ingredient catalog — the model never invents a reference, and we
 *      never attach a paper the data file doesn't contain.
 *   2. HONEST FRAMING. We surface reviews that are ABOUT a mentioned ingredient
 *      as "further reading" / provenance. We do NOT claim a given paper proves
 *      a specific sentence — that would need human vetting. The UI labels it so.
 *   3. PURE + TESTED. `extractCitations` is a pure function over an index; the
 *      index can be injected, so the matcher is unit-tested without depending on
 *      which ingredients happen to have literature this week.
 */
import { ALL_INGREDIENTS, getReferences, type IngredientReference } from './ingredients';
import type { Language } from './prompt';

export interface AnswerCitation {
  /** Ingredient id (e.g. `niacinamide`). */
  id: string;
  /** Localized display name for the "Further reading" heading. */
  name: string;
  /** Literature references (already capped), in file order. */
  refs: IngredientReference[];
}

export interface CitationIndexEntry {
  id: string;
  inci: string;
  zh: string;
  /** Match terms (names + aliases), original case. */
  terms: string[];
  refs: IngredientReference[];
}

/** Min length for a Latin match term — avoids ambiguous 2–3 char aliases (B3, C, AHA). */
const MIN_LATIN_TERM = 4;

/** True if the string has any non-ASCII char (a cheap CJK detector). */
function hasNonAscii(s: string): boolean {
  for (let i = 0; i < s.length; i++) {
    if (s.charCodeAt(i) > 127) return true;
  }
  return false;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Build the match index from the real catalog: one entry per ingredient that
 * actually has ≥1 literature reference (nothing to cite otherwise). Terms come
 * from the INCI name, Chinese name, and aliases.
 */
export function buildCitationIndex(): CitationIndexEntry[] {
  const index: CitationIndexEntry[] = [];
  for (const ing of ALL_INGREDIENTS) {
    const refs = getReferences(ing.id).filter((r) => r.type === 'literature');
    if (refs.length === 0) continue;

    const raw = [
      ing.inci_name,
      ing.chinese_name,
      ...(ing.aliases_en ?? []),
      ...(ing.aliases_zh ?? []),
    ];
    const seen = new Set<string>();
    const terms: string[] = [];
    for (const t of raw) {
      if (!t) continue;
      const term = String(t).trim();
      const cjk = hasNonAscii(term);
      if (!cjk && term.length < MIN_LATIN_TERM) continue;
      if (cjk && term.length < 2) continue;
      const key = cjk ? term : term.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      terms.push(term);
    }
    if (terms.length === 0) continue;

    index.push({
      id: ing.id,
      inci: ing.inci_name,
      zh: ing.chinese_name || ing.inci_name,
      terms,
      refs,
    });
  }
  return index;
}

// Built once from real data; injectable in tests via `opts.index`.
let DEFAULT_INDEX: CitationIndexEntry[] | null = null;
function defaultIndex(): CitationIndexEntry[] {
  if (!DEFAULT_INDEX) DEFAULT_INDEX = buildCitationIndex();
  return DEFAULT_INDEX;
}

/** Index of the earliest match of any of `terms` in `text`, or -1. */
function firstMentionIndex(text: string, lower: string, terms: string[]): number {
  let best = -1;
  for (const term of terms) {
    let at = -1;
    if (hasNonAscii(term)) {
      at = text.indexOf(term); // CJK has no word boundaries
    } else {
      const m = lower.match(new RegExp(`\\b${escapeRegex(term.toLowerCase())}\\b`));
      at = m && typeof m.index === 'number' ? m.index : -1;
    }
    if (at >= 0 && (best < 0 || at < best)) best = at;
  }
  return best;
}

export interface ExtractOptions {
  index?: CitationIndexEntry[];
  maxIngredients?: number;
  maxRefsEach?: number;
}

/**
 * Extract "further reading" citations for the ingredients named in `text`,
 * ordered by first mention. Returns [] for empty/whitespace input.
 */
export function extractCitations(
  text: string,
  lang: Language = 'en',
  opts: ExtractOptions = {},
): AnswerCitation[] {
  if (!text || typeof text !== 'string' || !text.trim()) return [];
  const index = opts.index ?? defaultIndex();
  const maxIngredients = opts.maxIngredients ?? 5;
  const maxRefsEach = opts.maxRefsEach ?? 2;
  const lower = text.toLowerCase();

  const hits: Array<{ entry: CitationIndexEntry; at: number }> = [];
  for (const entry of index) {
    const at = firstMentionIndex(text, lower, entry.terms);
    if (at >= 0) hits.push({ entry, at });
  }

  return hits
    .sort((a, b) => a.at - b.at)
    .slice(0, maxIngredients)
    .map(({ entry }) => ({
      id: entry.id,
      name: lang === 'zh' ? entry.zh : entry.inci,
      refs: entry.refs.slice(0, maxRefsEach),
    }));
}
