import { describe, it, expect } from 'vitest';
import { mergeFavoriteIds, mergeRoutineLists } from '../src/lib/cloud-sync-merge';

describe('mergeFavoriteIds', () => {
  it('unions local-first and dedupes', () => {
    expect(mergeFavoriteIds(['a', 'b'], ['b', 'c'])).toEqual(['a', 'b', 'c']);
  });

  it('drops non-strings/blanks and handles junk', () => {
    expect(mergeFavoriteIds(['a', '', 5, null], ['a', 'b'])).toEqual(['a', 'b']);
    expect(mergeFavoriteIds(null, undefined)).toEqual([]);
  });

  it('caps to 200', () => {
    const many = Array.from({ length: 500 }, (_, i) => `i-${i}`);
    expect(mergeFavoriteIds(many, [])).toHaveLength(200);
  });
});

describe('mergeRoutineLists', () => {
  const mk = (id: string, savedAt: number, name = 'n') => ({
    id,
    name,
    products: [{ name: 'P', ingredients: 'Aqua' }],
    isPregnant: false,
    savedAt,
  });

  it('unions by id and sorts newest-first', () => {
    const out = mergeRoutineLists([mk('a', 2)], [mk('b', 1)]);
    expect(out.map((r) => r.id)).toEqual(['a', 'b']);
  });

  it('keeps the newer record when ids collide (regardless of order)', () => {
    const out = mergeRoutineLists([mk('a', 1, 'old')], [mk('a', 5, 'new')]);
    expect(out).toHaveLength(1);
    expect(out[0].name).toBe('new');
  });

  it('drops invalid entries via normalization', () => {
    const out = mergeRoutineLists(
      [{ id: '', name: 'x', products: [{ name: 'p', ingredients: 'Aqua' }], isPregnant: false, savedAt: 1 }],
      [mk('ok', 3)],
    );
    expect(out.map((r) => r.id)).toEqual(['ok']);
  });

  it('caps to 50', () => {
    const many = Array.from({ length: 80 }, (_, i) => mk(`id-${i}`, i));
    expect(mergeRoutineLists(many, [])).toHaveLength(50);
  });

  it('handles junk input', () => {
    expect(mergeRoutineLists(null, 'nope')).toEqual([]);
  });
});
