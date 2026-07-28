import { describe, it, expect } from 'vitest';
import {
  sanitizeRoutineInput,
  normalizeSavedRoutines,
  normalizeProducts,
} from '../src/lib/routine-store';

describe('normalizeProducts', () => {
  it('keeps only products with an ingredient list and clamps fields', () => {
    const out = normalizeProducts([
      { name: 'A', ingredients: 'Aqua, Retinol' },
      { name: 'B', ingredients: '   ' }, // dropped — no ingredients
      { name: 'C' }, // dropped — no ingredients
    ]);
    expect(out).toEqual([{ name: 'A', ingredients: 'Aqua, Retinol' }]);
  });

  it('caps to 5 products', () => {
    const many = Array.from({ length: 9 }, (_, i) => ({ name: `P${i}`, ingredients: 'Aqua' }));
    expect(normalizeProducts(many)).toHaveLength(5);
  });

  it('clamps overly long names and ingredient lists', () => {
    const out = normalizeProducts([
      { name: 'x'.repeat(400), ingredients: 'y'.repeat(9000) },
    ]);
    expect(out[0].name.length).toBe(120);
    expect(out[0].ingredients.length).toBe(4000);
  });

  it('handles junk', () => {
    expect(normalizeProducts(null)).toEqual([]);
    expect(normalizeProducts('nope')).toEqual([]);
    expect(normalizeProducts([null, 5, 'x'])).toEqual([]);
  });
});

describe('sanitizeRoutineInput', () => {
  it('normalizes a valid routine and coerces isPregnant', () => {
    const out = sanitizeRoutineInput({
      name: '  Morning  ',
      products: [
        { name: 'Serum', ingredients: 'Aqua, Niacinamide' },
        { name: 'SPF', ingredients: 'Aqua, Zinc Oxide' },
      ],
      isPregnant: 1,
    });
    expect(out).not.toBeNull();
    expect(out!.name).toBe('Morning');
    expect(out!.products).toHaveLength(2);
    expect(out!.isPregnant).toBe(true);
  });

  it('falls back to the first product name when name is blank', () => {
    const out = sanitizeRoutineInput({
      name: '   ',
      products: [{ name: 'Cleanser', ingredients: 'Aqua, Glycerin' }],
    });
    expect(out!.name).toBe('Cleanser');
    expect(out!.isPregnant).toBe(false);
  });

  it('returns null when nothing worth saving', () => {
    expect(sanitizeRoutineInput({ products: [{ name: 'x', ingredients: '' }] })).toBeNull();
    expect(sanitizeRoutineInput({ products: [] })).toBeNull();
    expect(sanitizeRoutineInput(null)).toBeNull();
    expect(sanitizeRoutineInput('nope')).toBeNull();
  });
});

describe('normalizeSavedRoutines', () => {
  const base = {
    id: 'a',
    name: 'R',
    products: [{ name: 'P', ingredients: 'Aqua' }],
    isPregnant: false,
    savedAt: 100,
  };

  it('keeps valid entries and coerces fields', () => {
    const out = normalizeSavedRoutines([{ ...base, isPregnant: 'yes', savedAt: 'x' }]);
    expect(out).toHaveLength(1);
    expect(out[0].isPregnant).toBe(true); // coerced from truthy string
    expect(out[0].savedAt).toBe(0); // non-number → 0
  });

  it('drops entries without an id or without valid products', () => {
    const out = normalizeSavedRoutines([
      { ...base, id: '' }, // no id
      { ...base, id: 'b', products: [{ name: 'x', ingredients: '' }] }, // no valid products
      { ...base, id: 'c' }, // ok
    ]);
    expect(out.map((r) => r.id)).toEqual(['c']);
  });

  it('dedupes by id', () => {
    const out = normalizeSavedRoutines([base, { ...base, name: 'dup' }]);
    expect(out).toHaveLength(1);
    expect(out[0].name).toBe('R');
  });

  it('caps to 50 routines', () => {
    const many = Array.from({ length: 80 }, (_, i) => ({ ...base, id: `id-${i}` }));
    expect(normalizeSavedRoutines(many)).toHaveLength(50);
  });

  it('handles junk', () => {
    expect(normalizeSavedRoutines(null)).toEqual([]);
    expect(normalizeSavedRoutines('nope')).toEqual([]);
  });
});
