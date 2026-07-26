import { describe, expect, it } from 'vitest';
import { sanitizeProfileInput, hasAnyProfileValue } from '../src/lib/profile-store';

describe('sanitizeProfileInput', () => {
  it('keeps valid whitelisted fields', () => {
    const p = sanitizeProfileInput({
      skin_type: 'oily',
      sensitivity: 'high',
      concerns: ['acne', 'redness'],
      is_pregnant: true,
      price_preference: 'budget',
    });
    expect(p).toEqual({
      skin_type: 'oily',
      sensitivity: 'high',
      concerns: ['acne', 'redness'],
      is_pregnant: true,
      price_preference: 'budget',
    });
  });

  it('drops invalid enum values and unknown fields', () => {
    const p = sanitizeProfileInput({
      skin_type: 'purple',
      sensitivity: 'extreme',
      price_preference: 'free',
      is_pregnant: 'yes',
      evil: 'inject',
    });
    expect(p.skin_type).toBeUndefined();
    expect(p.sensitivity).toBeUndefined();
    expect(p.price_preference).toBeUndefined();
    expect(p.is_pregnant).toBeUndefined();
    expect((p as any).evil).toBeUndefined();
  });

  it('coerces non-string concern/allergy entries away and caps length', () => {
    const p = sanitizeProfileInput({ concerns: ['acne', 5, null, 'aging'], allergies: new Array(50).fill('x') });
    expect(p.concerns).toEqual(['acne', 'aging']);
    expect(p.allergies?.length).toBe(20);
  });

  it('handles junk input safely', () => {
    expect(sanitizeProfileInput(null)).toEqual({});
    expect(sanitizeProfileInput('nope')).toEqual({});
  });
});

describe('hasAnyProfileValue', () => {
  it('is false for empty / no-op profiles', () => {
    expect(hasAnyProfileValue(null)).toBe(false);
    expect(hasAnyProfileValue({})).toBe(false);
    expect(hasAnyProfileValue({ price_preference: 'none', concerns: [] })).toBe(false);
  });

  it('is true when any real preference is set', () => {
    expect(hasAnyProfileValue({ skin_type: 'dry' })).toBe(true);
    expect(hasAnyProfileValue({ is_pregnant: true })).toBe(true);
    expect(hasAnyProfileValue({ concerns: ['acne'] })).toBe(true);
  });
});
