import { describe, expect, it } from 'vitest';
import { compareProducts } from '../src/lib/compare';

describe('compareProducts', () => {
  it('splits shared vs unique ingredients and flags cross-product conflicts', () => {
    const r = compareProducts(
      { name: 'A', ingredients: 'Aqua, Niacinamide, Retinol' },
      { name: 'B', ingredients: 'Aqua, Niacinamide, Glycolic Acid' },
    );
    expect(r.shared).toContain('Niacinamide');
    expect(r.onlyA).toContain('Retinol');
    expect(r.onlyB).toContain('Glycolic Acid');
    expect(r.onlyA).not.toContain('Niacinamide');
    // Retinol (A) + Glycolic Acid (B) is a known caution pair.
    expect(r.conflicts.length).toBeGreaterThanOrEqual(1);
    expect(r.conflicts.every((c) => c.a !== c.b)).toBe(true);
  });

  it('falls back to default names and handles empty input', () => {
    const r = compareProducts({ ingredients: 'Niacinamide' }, { ingredients: '' });
    expect(r.productA.name).toMatch(/Product A/);
    expect(r.productB.name).toMatch(/Product B/);
    expect(r.onlyB).toEqual([]);
    expect(r.conflicts).toEqual([]);
  });

  it('localizes ingredient names for zh', () => {
    const r = compareProducts(
      { ingredients: 'Niacinamide' },
      { ingredients: 'Niacinamide' },
      'zh',
    );
    expect(r.shared.some((n) => /[一-鿿]/.test(n))).toBe(true);
  });
});
