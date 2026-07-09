/**
 * Typed access layer over `ingredients-database.json` (100 curated entries).
 *
 * Powers the prerendered ingredient detail pages (/[lang]/ingredients/[id]),
 * the routine checker, and glossary → detail linking. Keeping all reads behind
 * this module means the boundary cast to `IngredientFull` happens once.
 */
import rawIngredientsDatabase from '../data/ingredients-database.json';
import type { Language } from './prompt';

export interface IngredientInteractionNote {
  ingredient?: string;
  ingredient_zh?: string;
  type?: 'info' | 'caution' | 'avoid' | 'synergy' | string;
  details_en?: string;
  details_zh?: string;
}

export interface IngredientFull {
  id: string;
  inci_name: string;
  chinese_name: string;
  aliases_en?: string[];
  aliases_zh?: string[];
  category?: string;
  subcategory?: string;
  functions?: { en?: string[]; zh?: string[] };
  effective_concentration?: Record<string, string | undefined>;
  evidence_level?: string;
  evidence_notes_en?: string;
  evidence_notes_zh?: string;
  skin_types?: {
    suited?: string[];
    caution?: string[];
    notes_en?: string;
    notes_zh?: string;
  };
  concerns_addressed?: string[];
  interactions?: IngredientInteractionNote[];
  irritation_potential?: string;
  comedogenic_rating?: number;
  pregnancy_safe?: boolean;
  pregnancy_notes_en?: string;
  pregnancy_notes_zh?: string;
  vegan?: boolean;
  common_in?: string[];
  price_indicator?: string;
  notes_en?: string;
  notes_zh?: string;
}

export interface IngredientCategory {
  id: string;
  name_en: string;
  name_zh: string;
  description_en?: string;
  description_zh?: string;
}

const db = rawIngredientsDatabase as unknown as {
  categories: IngredientCategory[];
  ingredients: IngredientFull[];
};

export const ALL_INGREDIENTS: IngredientFull[] = db.ingredients;
export const INGREDIENT_CATEGORIES: IngredientCategory[] = db.categories;

const BY_ID = new Map<string, IngredientFull>(db.ingredients.map((i) => [i.id, i]));
const BY_INCI = new Map<string, IngredientFull>(
  db.ingredients.map((i) => [i.inci_name.toLowerCase(), i]),
);

/** URL-safe slug for an ingredient page: `hyaluronic_acid` → `hyaluronic-acid`. */
export function ingredientSlug(id: string): string {
  return id.replace(/_/g, '-');
}

/** Reverse of {@link ingredientSlug}. */
export function slugToId(slug: string): string {
  return slug.replace(/-/g, '_');
}

export function getIngredientById(id: string): IngredientFull | undefined {
  return BY_ID.get(id) ?? BY_ID.get(slugToId(id));
}

/** Match a glossary row (keyed by inci_name) to a detail-page id, if one exists. */
export function idByInci(inciName: string): string | undefined {
  return BY_INCI.get(inciName.toLowerCase())?.id;
}

export function categoryName(categoryId: string | undefined, lang: Language): string {
  if (!categoryId) return '';
  const c = INGREDIENT_CATEGORIES.find((x) => x.id === categoryId);
  if (!c) return categoryId;
  return lang === 'zh' ? c.name_zh : c.name_en;
}

export function ingredientName(ing: IngredientFull, lang: Language): string {
  return lang === 'zh' ? ing.chinese_name || ing.inci_name : ing.inci_name;
}

/**
 * Related ingredients for the "see also" rail: same category first, then any
 * that share at least one addressed concern. Excludes self. Capped at `limit`.
 */
export function relatedIngredients(ing: IngredientFull, limit = 6): IngredientFull[] {
  const concerns = new Set(ing.concerns_addressed ?? []);
  const scored = ALL_INGREDIENTS.filter((o) => o.id !== ing.id).map((o) => {
    let score = 0;
    if (o.category && o.category === ing.category) score += 2;
    if (o.subcategory && o.subcategory === ing.subcategory) score += 1;
    const shared = (o.concerns_addressed ?? []).filter((c) => concerns.has(c)).length;
    score += shared;
    return { o, score };
  });
  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.o);
}

/** Human-readable label for the `type` on an ingredient interaction note. */
export function interactionLevel(type: string | undefined): 'avoid' | 'caution' | 'synergy' | 'info' {
  switch (type) {
    case 'avoid':
      return 'avoid';
    case 'caution':
      return 'caution';
    case 'synergy':
    case 'good':
      return 'synergy';
    default:
      return 'info';
  }
}
