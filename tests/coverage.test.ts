import { describe, expect, it } from 'vitest';
import { countBy, coverageMatrix } from '../evals/lib/coverage.mjs';

const cases = [
  { expected: 'product', language: 'en' },
  { expected: 'product', language: 'en' },
  { expected: 'product', language: 'zh' },
  { expected: 'dupe', language: 'en' },
];

describe('countBy', () => {
  it('counts by a key function', () => {
    expect(countBy(cases, (c: any) => c.expected)).toEqual({ product: 3, dupe: 1 });
    expect(countBy([], (c: any) => c.expected)).toEqual({});
  });
});

describe('coverageMatrix', () => {
  const m = coverageMatrix(cases, (c: any) => c.expected, (c: any) => c.language);

  it('builds sorted rows/cols and correct cell counts', () => {
    expect(m.rows).toEqual(['dupe', 'product']);
    expect(m.cols).toEqual(['en', 'zh']);
    expect(m.cell('product', 'en')).toBe(2);
    expect(m.cell('product', 'zh')).toBe(1);
    expect(m.cell('dupe', 'en')).toBe(1);
  });

  it('flags gaps (empty cells) as thin', () => {
    // dupe/zh has no cases → a gap
    expect(m.thin).toContainEqual({ row: 'dupe', col: 'zh', count: 0 });
    expect(m.thin.find((t: any) => t.row === 'product' && t.col === 'en')).toBeUndefined();
  });
});
