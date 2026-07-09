import { describe, expect, it } from 'vitest';
import { matchCurated } from '../src/lib/dupe-finder';

describe('matchCurated (pure curated-pair matching, no network)', () => {
  it('resolves ZH nicknames via aliases (小黑瓶 → Lancôme Advanced Génifique)', () => {
    const r = matchCurated('兰蔻小黑瓶');
    expect(r?.source).toBe('curated');
    expect(r?.dupes.length).toBeGreaterThan(0);
  });

  it('resolves 神仙水 → SK-II Facial Treatment Essence', () => {
    const r = matchCurated('神仙水');
    expect(r?.source).toBe('curated');
    expect(r?.dupes.length).toBeGreaterThan(0);
  });

  it('exact product names still match', () => {
    const r = matchCurated('La Mer Crème de la Mer');
    expect(r?.source).toBe('curated');
    expect(r?.dupes.some((d) => d.brand === 'CeraVe')).toBe(true);
  });

  it('regression: symbol-only zh-stripped queries must NOT match everything', () => {
    // Before the CJK-normalization fix, "！！！" normalized to "" and
    // `nameNorm.includes("")` returned the FIRST curated pair for any query.
    expect(matchCurated('！！！')).toBeNull();
    expect(matchCurated('？')).toBeNull();
  });

  it('unknown products return null (fall through to vector/OBF)', () => {
    expect(matchCurated('自研神秘面霜零零七')).toBeNull();
  });
});
