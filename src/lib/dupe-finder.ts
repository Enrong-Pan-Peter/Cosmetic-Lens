import type { Language } from './prompt';
import { searchDupeProducts } from './embeddings';
import { searchProduct } from './openbeautyfacts';

import curatedDupes from '../data/curated-dupes.json';

export interface DupeSuggestion {
  product_name: string;
  brand: string;
  price_tier: string;
  key_similarities: string[];
  notes_en: string;
  notes_zh: string;
}

export interface FindDupesResult {
  source: 'curated' | 'vector' | 'obf';
  dupes: DupeSuggestion[];
}

function normalizeForMatch(s: string): string {
  // Keep CJK — the old [^\w\s] stripped ALL Chinese characters, so a
  // pure-zh query normalized to "" and `nameNorm.includes("")` matched the
  // FIRST curated pair for every Chinese dupe request (eval finding e2e-022).
  return s
    .toLowerCase()
    .replace(/[^\w\s一-鿿]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Exported for unit tests (pure JSON matching; no network). */
export function matchCurated(productQuery: string): FindDupesResult | null {
  const q = normalizeForMatch(productQuery);
  if (!q) return null; // empty query must never match everything
  const words = q.split(/\s+/).filter((w) => w.length > 2);

  for (const pair of curatedDupes.pairs) {
    const orig = pair.original;
    const nameNorm = normalizeForMatch(orig.product_name);
    const brandNorm = normalizeForMatch(orig.brand);
    const combined = `${brandNorm} ${nameNorm}`;
    // zh nicknames like 小黑瓶 / 神仙水 (optional `aliases` field)
    const aliases: string[] = ((orig as { aliases?: string[] }).aliases ?? []).map(normalizeForMatch);

    const nameMatch = nameNorm.includes(q) || q.includes(nameNorm);
    const brandMatch = brandNorm.includes(q) || q.includes(brandNorm);
    const combinedMatch = combined.includes(q) || q.includes(combined);
    const aliasMatch = aliases.some((a) => a && (q.includes(a) || a.includes(q)));
    const wordMatch = words.some((w) => nameNorm.includes(w) || brandNorm.includes(w));

    if (nameMatch || brandMatch || combinedMatch || aliasMatch || wordMatch) {
      const dupes: DupeSuggestion[] = (pair.dupes || []).map((d) => ({
        product_name: d.product_name,
        brand: d.brand,
        price_tier: d.price_tier || 'mid',
        key_similarities: d.key_similarities || [],
        notes_en: d.notes_en || '',
        notes_zh: d.notes_zh || '',
      }));
      if (dupes.length > 0) {
        return { source: 'curated', dupes };
      }
    }
  }

  return null;
}

function lookupCuratedByMetadata(originalName: string, originalBrand: string): DupeSuggestion[] | null {
  const nameNorm = normalizeForMatch(originalName);
  const brandNorm = normalizeForMatch(originalBrand);
  if (!nameNorm && !brandNorm) return null;

  for (const pair of curatedDupes.pairs) {
    const orig = pair.original;
    const pName = normalizeForMatch(orig.product_name);
    const pBrand = normalizeForMatch(orig.brand);
    const nameMatch = pName && nameNorm && (pName.includes(nameNorm) || nameNorm.includes(pName));
    const brandMatch = pBrand && brandNorm && (pBrand.includes(brandNorm) || brandNorm.includes(pBrand));
    if (nameMatch || brandMatch || (nameNorm && pName === nameNorm) || (brandNorm && pBrand === brandNorm)) {
      const dupes = (pair.dupes || []).map((d) => ({
        product_name: d.product_name,
        brand: d.brand,
        price_tier: d.price_tier || 'mid',
        key_similarities: d.key_similarities || [],
        notes_en: d.notes_en || '',
        notes_zh: d.notes_zh || '',
      }));
      if (dupes.length > 0) return dupes;
    }
  }
  return null;
}

export async function findDupes(
  productQuery: string,
  _ingredientList?: string,
  lang: Language = 'en',
): Promise<FindDupesResult | null> {
  const curated = matchCurated(productQuery);
  if (curated) return curated;

  const vectorResults = await searchDupeProducts(`dupe for ${productQuery} similar products alternatives`, 5);
  const SIMILARITY_THRESHOLD = 0.5;

  for (const r of vectorResults) {
    if (r.similarity >= SIMILARITY_THRESHOLD && r.metadata?.pair_id) {
      const pair = curatedDupes.pairs.find((p) => p.id === r.metadata.pair_id);
      if (pair?.dupes?.length) {
        const dupes: DupeSuggestion[] = pair.dupes.map((d) => ({
          product_name: d.product_name,
          brand: d.brand,
          price_tier: d.price_tier || 'mid',
          key_similarities: d.key_similarities || [],
          notes_en: d.notes_en || '',
          notes_zh: d.notes_zh || '',
        }));
        return { source: 'vector', dupes };
      }
    }
    if (r.similarity >= SIMILARITY_THRESHOLD && (r.metadata?.original_name || r.metadata?.original_brand)) {
      const dupes = lookupCuratedByMetadata(
        r.metadata.original_name || '',
        r.metadata.original_brand || '',
      );
      if (dupes?.length) {
        return { source: 'vector', dupes };
      }
    }
  }

  const obfProduct = await searchProduct(productQuery);
  if (obfProduct?.product_name) {
    const dupes = lookupCuratedByMetadata(obfProduct.product_name, obfProduct.brands || '');
    if (dupes?.length) {
      return { source: 'obf', dupes };
    }
  }

  return null;
}
