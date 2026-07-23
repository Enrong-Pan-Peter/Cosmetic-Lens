import { describe, expect, it } from 'vitest';
import { matchConcerns, ingredientsForConcerns, searchByConcern } from '../src/lib/concern-search';

describe('matchConcerns', () => {
  it('maps free-text queries (EN + ZH) to concern ids', () => {
    expect(matchConcerns('what helps with redness?')).toContain('redness');
    expect(matchConcerns('dark spots and pigmentation')).toContain('hyperpigmentation');
    expect(matchConcerns('oily skin')).toContain('oiliness');
    expect(matchConcerns('泛红')).toContain('redness');
    expect(matchConcerns('抗老')).toContain('aging');
  });

  it('returns nothing for empty or unrecognized queries', () => {
    expect(matchConcerns('')).toEqual([]);
    expect(matchConcerns('zzzqqq nonsense')).toEqual([]);
  });
});

describe('ingredientsForConcerns', () => {
  it('returns curated ingredients, best-evidence first', () => {
    const cards = ingredientsForConcerns(['redness'], 'en');
    expect(cards.length).toBeGreaterThan(0);
    // sorted by evidence: no 'strong' entry may appear after a weaker one
    const ranks = cards.map((c) => (c.evidence_level === 'strong' ? 2 : c.evidence_level === 'moderate' ? 1 : 0));
    for (let i = 1; i < ranks.length; i++) expect(ranks[i]).toBeLessThanOrEqual(ranks[i - 1]);
    for (const c of cards) {
      expect(c.slug).toBeTruthy();
      expect(c.inci_name).toBeTruthy();
    }
  });

  it('returns empty for no concerns', () => {
    expect(ingredientsForConcerns([], 'en')).toEqual([]);
  });
});

describe('searchByConcern', () => {
  it('caps results and echoes matched concerns', () => {
    const r = searchByConcern('redness and irritation', 'en');
    expect(r.concerns).toContain('redness');
    expect(r.ingredients.length).toBeGreaterThan(0);
    expect(r.ingredients.length).toBeLessThanOrEqual(12);
  });

  it('uses zh blurbs when lang is zh', () => {
    const r = searchByConcern('美白', 'zh');
    expect(r.concerns).toContain('hyperpigmentation');
    if (r.ingredients[0]?.blurb) expect(/[一-鿿]/.test(r.ingredients[0].blurb)).toBe(true);
  });
});
