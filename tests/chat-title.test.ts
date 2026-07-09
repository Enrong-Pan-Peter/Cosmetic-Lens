import { describe, expect, it } from 'vitest';
import { cleanTitle } from '../src/pages/api/chat-title';

describe('cleanTitle', () => {
  it('strips surrounding quotes (EN + ZH styles)', () => {
    expect(cleanTitle('"CeraVe Pregnancy Safety"')).toBe('CeraVe Pregnancy Safety');
    expect(cleanTitle('「早C晚A搭配」')).toBe('早C晚A搭配');
    expect(cleanTitle('《视黄醇孕期安全》')).toBe('视黄醇孕期安全');
  });

  it('strips trailing punctuation and collapses whitespace', () => {
    expect(cleanTitle('Retinol   vitamin C combo.')).toBe('Retinol vitamin C combo');
    expect(cleanTitle('烟酰胺功效。')).toBe('烟酰胺功效');
  });

  it('clamps to 80 chars', () => {
    expect(cleanTitle('x'.repeat(200))).toHaveLength(80);
  });
});
