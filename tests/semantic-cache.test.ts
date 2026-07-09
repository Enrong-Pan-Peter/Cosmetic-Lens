import { describe, expect, it } from 'vitest';
import { shouldUseCache, CACHE_SIMILARITY_THRESHOLD } from '../src/lib/semantic-cache';

const firstTurn = (content: string) => [{ role: 'user', content }];

describe('shouldUseCache', () => {
  it('allows a first-turn cacheable-intent query', () => {
    expect(shouldUseCache(firstTurn('is niacinamide safe?'), 'knowledge')).toBe(true);
    expect(shouldUseCache(firstTurn('CeraVe cleanser'), 'product')).toBe(true);
    expect(shouldUseCache(firstTurn('dupe for La Mer'), 'dupe')).toBe(true);
  });

  it('rejects non-cacheable intents (greetings / other)', () => {
    expect(shouldUseCache(firstTurn('hi there'), 'other')).toBe(false);
  });

  it('rejects follow-up turns (context the query embedding cannot see)', () => {
    const multi = [
      { role: 'user', content: 'is retinol safe?' },
      { role: 'assistant', content: 'Generally yes...' },
      { role: 'user', content: 'what about at night?' },
    ];
    expect(shouldUseCache(multi, 'knowledge')).toBe(false);
  });

  it('rejects when an assistant turn already exists', () => {
    const withAssistant = [
      { role: 'assistant', content: 'hello' },
      { role: 'user', content: 'is niacinamide safe?' },
    ];
    expect(shouldUseCache(withAssistant, 'knowledge')).toBe(false);
  });

  it('uses a conservative similarity threshold', () => {
    expect(CACHE_SIMILARITY_THRESHOLD).toBeGreaterThanOrEqual(0.9);
    expect(CACHE_SIMILARITY_THRESHOLD).toBeLessThanOrEqual(1);
  });
});
