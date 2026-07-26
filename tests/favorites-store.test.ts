import { describe, expect, it } from 'vitest';
import { normalizeFavorites } from '../src/lib/favorites-store';

describe('normalizeFavorites', () => {
  it('dedupes and preserves order', () => {
    expect(normalizeFavorites(['retinol', 'niacinamide', 'retinol'])).toEqual(['retinol', 'niacinamide']);
  });

  it('drops non-strings and blanks', () => {
    expect(normalizeFavorites(['retinol', 5, null, '', '  ', 'aha'])).toEqual(['retinol', 'aha']);
  });

  it('handles junk input', () => {
    expect(normalizeFavorites(null)).toEqual([]);
    expect(normalizeFavorites('nope')).toEqual([]);
    expect(normalizeFavorites(undefined)).toEqual([]);
  });

  it('clamps to a sane maximum', () => {
    const many = Array.from({ length: 500 }, (_, i) => `ing-${i}`);
    expect(normalizeFavorites(many).length).toBe(200);
  });
});
