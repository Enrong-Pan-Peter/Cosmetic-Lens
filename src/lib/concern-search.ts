/**
 * Semantic-ish concern search (improvement-plan 12.2 / 7.6).
 *
 * "What helps with redness?" → ingredients whose `concerns_addressed` cover
 * that concern. Deterministic (keyword → concern → curated DB), so it's fast,
 * free, offline-testable, and links straight into the 7.2 ingredient pages.
 * Runs server-side (imports the full DB) behind /api/concern-search; the client
 * component only talks to the endpoint.
 */
import { ALL_INGREDIENTS, ingredientSlug, type IngredientFull } from './ingredients';
import type { Language } from './prompt';

interface ConcernDef {
  /** EN + ZH keywords that map a free-text query to this concern. */
  keywords: string[];
  /** `concerns_addressed` tokens in the ingredient DB this concern covers. */
  dbTokens: string[];
}

// Concern ids align with the app's i18n `concerns` keys where possible.
const CONCERNS: Record<string, ConcernDef> = {
  acne: {
    keywords: ['acne', 'breakout', 'pimple', 'spot', 'blemish', '痘', '痤疮', '闭口', '粉刺'],
    dbTokens: ['acne', 'blackheads', 'clogged_pores', 'oily_skin', 'fungal_acne'],
  },
  redness: {
    keywords: ['redness', 'red ', 'rosacea', 'irritation', 'irritated', 'calm', 'soothe', '泛红', '发红', '红血丝', '舒缓'],
    dbTokens: ['redness', 'inflammation', 'irritation', 'sensitivity', 'sunburn'],
  },
  dryness: {
    keywords: ['dry', 'dryness', 'dehydrat', 'flaky', 'moisture', 'hydrat', '干', '干燥', '缺水', '保湿'],
    dbTokens: ['dryness', 'dehydration', 'cracked_skin', 'barrier_damage'],
  },
  hyperpigmentation: {
    keywords: ['dark spot', 'hyperpigment', 'pigment', 'melasma', 'brighten', 'even tone', 'whiten', '美白', '色斑', '暗沉', '斑', '提亮'],
    dbTokens: ['hyperpigmentation', 'dark_spots', 'melasma', 'sun_damage', 'dullness'],
  },
  aging: {
    keywords: ['aging', 'age', 'anti-age', 'wrinkle', 'fine line', 'firm', 'sagging', 'collagen', '抗老', '衰老', '皱纹', '细纹', '紧致'],
    dbTokens: ['aging', 'fine_lines', 'wrinkles', 'firmness', 'expression_lines'],
  },
  oiliness: {
    keywords: ['oil', 'oily', 'sebum', 'shine', 'greasy', 'mattif', '油', '控油', '出油'],
    dbTokens: ['oiliness', 'oily_skin', 'large_pores'],
  },
  large_pores: {
    keywords: ['pore', 'pores', '毛孔'],
    dbTokens: ['large_pores', 'clogged_pores'],
  },
  texture: {
    keywords: ['texture', 'rough', 'smooth', 'bumpy', 'uneven', 'exfoliat', '肤质', '粗糙', '平滑', '去角质'],
    dbTokens: ['texture', 'rough_texture', 'keratosis_pilaris'],
  },
  sensitivity: {
    keywords: ['sensitive', 'sensitivity', 'barrier', 'reactive', '敏感', '屏障', '耐受'],
    dbTokens: ['sensitivity', 'irritation', 'barrier_damage', 'inflammation', 'skin_repair'],
  },
  dullness: {
    keywords: ['dull', 'glow', 'radian', 'lackluster', 'tired', '暗沉', '光泽', '气色'],
    dbTokens: ['dullness', 'texture'],
  },
};

/** Concern ids whose keywords appear in the query. */
export function matchConcerns(query: string): string[] {
  const q = (query || '').toLowerCase();
  if (!q.trim()) return [];
  const hits: string[] = [];
  for (const [id, def] of Object.entries(CONCERNS)) {
    if (def.keywords.some((k) => q.includes(k))) hits.push(id);
  }
  return hits;
}

export interface ConcernIngredientCard {
  id: string;
  slug: string;
  inci_name: string;
  chinese_name: string;
  blurb: string;
  evidence_level: string | null;
}

const evidenceRank = (lvl: string | undefined): number =>
  lvl === 'strong' ? 2 : lvl === 'moderate' ? 1 : 0;

function toCard(ing: IngredientFull, lang: Language): ConcernIngredientCard {
  return {
    id: ing.id,
    slug: ingredientSlug(ing.id),
    inci_name: ing.inci_name,
    chinese_name: ing.chinese_name,
    blurb: (lang === 'zh' ? ing.functions?.zh?.[0] : ing.functions?.en?.[0]) || '',
    evidence_level: ing.evidence_level ?? null,
  };
}

/** Ingredients addressing any of the given concern ids, best-evidence first. */
export function ingredientsForConcerns(concernIds: string[], lang: Language = 'en'): ConcernIngredientCard[] {
  if (concernIds.length === 0) return [];
  const tokens = new Set<string>();
  for (const id of concernIds) for (const t of CONCERNS[id]?.dbTokens ?? []) tokens.add(t);

  return ALL_INGREDIENTS.filter((i) => (i.concerns_addressed ?? []).some((c) => tokens.has(c)))
    .sort((a, b) => evidenceRank(b.evidence_level) - evidenceRank(a.evidence_level))
    .map((i) => toCard(i, lang));
}

export function searchByConcern(query: string, lang: Language = 'en', limit = 12) {
  const concerns = matchConcerns(query);
  return { concerns, ingredients: ingredientsForConcerns(concerns, lang).slice(0, limit) };
}
