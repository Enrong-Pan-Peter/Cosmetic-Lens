/**
 * Routine conflict checker (improvement-plan 7.1).
 *
 * Pure, deterministic analysis of a multi-product skincare routine against the
 * curated `ingredient-interactions.json` pairs. Reused by both the /api/routine
 * endpoint (dedicated UI) and the `check_routine` agent tool, so the matrix the
 * agent reasons over and the one the page renders are identical.
 *
 * No LLM, no network — everything is a table lookup, which keeps it fast,
 * free, and unit-testable.
 */
import rawInteractions from '../data/ingredient-interactions.json';
import { ALL_INGREDIENTS, type IngredientFull } from './ingredients';
import { productHasIngredient, type Language } from './prompt';

interface InteractionPair {
  ingredients?: string[];
  ingredients_zh?: string[];
  level?: string;
  context?: string;
  warning_en?: string;
  warning_zh?: string;
}

const PAIRS = (rawInteractions as unknown as { pairs: InteractionPair[] }).pairs;

export interface RoutineProductInput {
  name?: string;
  ingredients: string;
}

export type Timing = 'am' | 'pm' | 'either';
export type ConflictLevel = 'avoid' | 'caution' | 'info';

export interface RoutineProductResult {
  name: string;
  recognizedCount: number;
  unmatchedCount: number;
  matchedNames: string[];
  timing: Timing;
}

export interface RoutineConflict {
  level: ConflictLevel;
  /** Product indices (same index on both sides = a within-product conflict). */
  a: number;
  b: number;
  productA: string;
  productB: string;
  termA: string;
  termB: string;
  warning: string;
}

export interface RoutineResult {
  products: RoutineProductResult[];
  conflicts: RoutineConflict[];
  summary: { avoid: number; caution: number; info: number };
  tips: string[];
}

// --- ingredient-group detection for AM/PM placement --------------------------

const GROUP_TERMS: Record<string, string[]> = {
  retinoid: ['retinol', 'retinal', 'retinaldehyde', 'tretinoin', 'adapalene', 'tazarotene', 'retinyl', '视黄醇', '维a酸', '阿达帕林', 'a醇'],
  aha: ['glycolic acid', 'lactic acid', 'mandelic acid', 'citric acid', 'malic acid', '乙醇酸', '果酸', '乳酸', '杏仁酸'],
  bha: ['salicylic acid', '水杨酸'],
  benzoyl_peroxide: ['benzoyl peroxide', '过氧化苯甲酰'],
  vitamin_c: ['ascorbic acid', 'l-ascorbic acid', '抗坏血酸', '维生素c', '维c'],
  spf: ['zinc oxide', 'titanium dioxide', 'octinoxate', 'avobenzone', 'homosalate', 'octisalate', 'octocrylene', 'tinosorb', 'uvinul', 'spf', '防晒', '氧化锌', '二氧化钛'],
};

function tokenize(ingredients: string): string[] {
  return ingredients
    .split(/[,，、\n;]/)
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length > 0)
    .slice(0, 60);
}

function hasGroup(tokens: string[], group: keyof typeof GROUP_TERMS): boolean {
  const terms = GROUP_TERMS[group];
  return tokens.some((tok) => terms.some((term) => tok.includes(term)));
}

/** Match a product's ingredient tokens to curated DB entries (for display + counts). */
function matchDbIngredients(tokens: string[]): IngredientFull[] {
  const matched: IngredientFull[] = [];
  const seen = new Set<string>();
  for (const tok of tokens) {
    if (tok.length < 3) continue;
    for (const ing of ALL_INGREDIENTS) {
      if (seen.has(ing.id)) continue;
      const inci = ing.inci_name.toLowerCase();
      const isMatch =
        inci === tok ||
        ing.chinese_name === tok ||
        ing.aliases_en?.some((a) => a.toLowerCase() === tok) ||
        ing.aliases_zh?.some((a) => a === tok) ||
        tok.includes(inci) ||
        inci.includes(tok);
      if (isMatch) {
        matched.push(ing);
        seen.add(ing.id);
        break;
      }
    }
  }
  return matched;
}

function decideTiming(tokens: string[]): Timing {
  const pm = hasGroup(tokens, 'retinoid') || hasGroup(tokens, 'aha') || hasGroup(tokens, 'bha') || hasGroup(tokens, 'benzoyl_peroxide');
  const am = hasGroup(tokens, 'spf') || hasGroup(tokens, 'vitamin_c');
  if (pm && !am) return 'pm';
  if (am && !pm) return 'am';
  return 'either';
}

function normalizeLevel(level: string | undefined): ConflictLevel {
  if (level === 'avoid') return 'avoid';
  if (level === 'caution') return 'caution';
  return 'info';
}

/**
 * Analyze 2–5 products. Returns per-product timing, a cross-product conflict
 * list (also flags within-product conflicts), a severity summary, and layering
 * tips — all localized to `lang`.
 */
export function analyzeRoutine(rawProducts: RoutineProductInput[], lang: Language = 'en'): RoutineResult {
  const isZh = lang === 'zh';

  const products = rawProducts
    .filter((p) => p && typeof p.ingredients === 'string' && p.ingredients.trim().length > 0)
    .slice(0, 5)
    .map((p, i) => ({
      name: (p.name && p.name.trim()) || (isZh ? `产品 ${i + 1}` : `Product ${i + 1}`),
      tokens: tokenize(p.ingredients),
    }));

  const productResults: RoutineProductResult[] = products.map((p) => {
    const matched = matchDbIngredients(p.tokens);
    return {
      name: p.name,
      recognizedCount: matched.length,
      unmatchedCount: Math.max(0, p.tokens.length - matched.length),
      matchedNames: matched.map((m) => (isZh ? m.chinese_name || m.inci_name : m.inci_name)),
      timing: decideTiming(p.tokens),
    };
  });

  const conflicts: RoutineConflict[] = [];
  const seenConflict = new Set<string>();

  for (const pair of PAIRS) {
    if (pair.context) continue; // pregnancy / prolonged-use etc. handled elsewhere, not routine layering
    if (pair.level === 'synergy' || pair.level === 'good') continue; // positive pairs aren't conflicts
    const terms = pair.ingredients ?? [];
    if (terms.length < 2) continue;
    const [termAEn, termBEn] = terms;
    const termsZh = pair.ingredients_zh ?? [];
    const termADisp = isZh ? termsZh[0] || termAEn : termAEn;
    const termBDisp = isZh ? termsZh[1] || termBEn : termBEn;
    const level = normalizeLevel(pair.level);
    const warning = isZh ? pair.warning_zh || pair.warning_en || '' : pair.warning_en || pair.warning_zh || '';

    for (let i = 0; i < products.length; i++) {
      for (let j = i; j < products.length; j++) {
        const iHasA = productHasIngredient(products[i].tokens, termAEn);
        const iHasB = productHasIngredient(products[i].tokens, termBEn);
        const jHasA = productHasIngredient(products[j].tokens, termAEn);
        const jHasB = productHasIngredient(products[j].tokens, termBEn);

        const crossMatch = i !== j && ((iHasA && jHasB) || (iHasB && jHasA));
        const intraMatch = i === j && iHasA && iHasB;
        if (!crossMatch && !intraMatch) continue;

        const key = `${i}-${j}-${termAEn}-${termBEn}`;
        if (seenConflict.has(key)) continue;
        seenConflict.add(key);

        conflicts.push({
          level,
          a: i,
          b: j,
          productA: products[i].name,
          productB: products[j].name,
          termA: termADisp,
          termB: termBDisp,
          warning,
        });
      }
    }
  }

  // Rank avoid > caution > info for display.
  const order: Record<ConflictLevel, number> = { avoid: 0, caution: 1, info: 2 };
  conflicts.sort((x, y) => order[x.level] - order[y.level]);

  const summary = {
    avoid: conflicts.filter((c) => c.level === 'avoid').length,
    caution: conflicts.filter((c) => c.level === 'caution').length,
    info: conflicts.filter((c) => c.level === 'info').length,
  };

  const tips = buildTips(products, productResults, conflicts, isZh);

  return { products: productResults, conflicts, summary, tips };
}

function buildTips(
  products: { name: string; tokens: string[] }[],
  results: RoutineProductResult[],
  conflicts: RoutineConflict[],
  isZh: boolean,
): string[] {
  const tips: string[] = [];

  tips.push(
    isZh
      ? '按质地由薄到厚叠加：爽肤水/精华水 → 精华 → 乳液/面霜 → 面油。'
      : 'Layer thinnest to thickest: toners/essences → serums → moisturizers → oils.',
  );

  const anySpf = products.some((p) => hasGroup(p.tokens, 'spf'));
  if (anySpf) {
    tips.push(
      isZh ? '早晨护肤的最后一步永远是防晒。' : 'Always finish your AM routine with sunscreen (the last step).',
    );
  }

  const pmProducts = results.filter((r) => r.timing === 'pm');
  if (pmProducts.length > 0) {
    tips.push(
      isZh
        ? '视黄醇类和去角质酸类建议晚上使用，白天务必配合防晒。'
        : 'Use retinoids and exfoliating acids at night, and wear SPF during the day.',
    );
  }

  const seriousPm = conflicts.filter((c) => c.a !== c.b && (c.level === 'avoid' || c.level === 'caution'));
  if (seriousPm.length > 0) {
    tips.push(
      isZh
        ? '有冲突的强效成分建议隔天交替使用，而不是同一次叠加。'
        : 'For conflicting active pairs, alternate them on different days rather than layering in the same routine.',
    );
  }

  return tips;
}
