/**
 * Two-product comparison (improvement-plan 12.2 / 7.7).
 *
 * Shared vs unique ingredients + cross-product interaction conflicts for two
 * products. Reuses `findIngredientData` (DB matching) and `analyzeRoutine` (the
 * conflict engine) so it stays consistent with the routine checker. Pure +
 * testable; surfaced as the `compare_products` agent tool.
 */
import { findIngredientData, type Language, type MatchedIngredient } from './prompt';
import { analyzeRoutine, type RoutineConflict } from './routine';

export interface CompareProductInput {
  name?: string;
  ingredients: string;
}

export interface CompareResult {
  productA: { name: string; ingredients: string[] };
  productB: { name: string; ingredients: string[] };
  shared: string[];
  onlyA: string[];
  onlyB: string[];
  conflicts: RoutineConflict[];
}

function displayName(m: MatchedIngredient, lang: Language): string {
  return lang === 'zh' ? m.chinese_name || m.inci_name : m.inci_name;
}

export function compareProducts(
  a: CompareProductInput,
  b: CompareProductInput,
  lang: Language = 'en',
): CompareResult {
  const isZh = lang === 'zh';
  const matchA = findIngredientData(a?.ingredients ?? '');
  const matchB = findIngredientData(b?.ingredients ?? '');
  const idsA = new Set(matchA.map((m) => m.id));
  const idsB = new Set(matchB.map((m) => m.id));

  const shared = matchA.filter((m) => idsB.has(m.id)).map((m) => displayName(m, lang));
  const onlyA = matchA.filter((m) => !idsB.has(m.id)).map((m) => displayName(m, lang));
  const onlyB = matchB.filter((m) => !idsA.has(m.id)).map((m) => displayName(m, lang));

  const routine = analyzeRoutine(
    [
      { name: a?.name, ingredients: a?.ingredients ?? '' },
      { name: b?.name, ingredients: b?.ingredients ?? '' },
    ],
    lang,
  );
  // Only cross-product conflicts are meaningful for a comparison.
  const conflicts = routine.conflicts.filter((c) => c.a !== c.b);

  return {
    productA: { name: (a?.name && a.name.trim()) || (isZh ? '产品 A' : 'Product A'), ingredients: matchA.map((m) => displayName(m, lang)) },
    productB: { name: (b?.name && b.name.trim()) || (isZh ? '产品 B' : 'Product B'), ingredients: matchB.map((m) => displayName(m, lang)) },
    shared,
    onlyA,
    onlyB,
    conflicts,
  };
}
